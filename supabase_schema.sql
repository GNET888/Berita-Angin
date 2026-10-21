-- =====================================================================
-- BERITA ANGIN - Skema Supabase (v2, cocok dengan index.html terhubung)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
--
-- Jika SEBELUMNYA sudah menjalankan skema versi lama dan belum ada data
-- penting, jalankan dulu baris ini (hapus tabel posts lama):
--   drop table if exists public.posts cascade;
-- =====================================================================

-- 1) PROFIL PENGGUNA (otomatis dibuat saat daftar) ----------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) POSTINGAN ------------------------------------------------------------
-- id = ID yang dibuat situs (mis. "uk3j9a2"), supaya web & HP memakai ID yang sama
create table if not exists public.posts (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null default 'status' check (kind in ('status','artikel')),
  text        text not null default '' check (char_length(text) <= 5000),
  data        jsonb not null default '{}'::jsonb,   -- judul, kategori, waktu baca, lampiran (polling, lokasi, catatan, kutipan, stiker)
  files       jsonb not null default '{}'::jsonb,   -- path file di bucket: {"img":"..","med":"..","mus":".."}
  created_at  timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_user_idx    on public.posts (user_id);

-- 3) ROW LEVEL SECURITY ----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;

drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "posts_read"   on public.posts;
drop policy if exists "posts_insert" on public.posts;
drop policy if exists "posts_update" on public.posts;
drop policy if exists "posts_delete" on public.posts;
create policy "posts_read"   on public.posts for select to authenticated using (true);
create policy "posts_insert" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "posts_update" on public.posts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "posts_delete" on public.posts for delete to authenticated using (user_id = auth.uid());

-- 4) STORAGE: bucket "media" (publik untuk dibaca, upload hanya ke folder sendiri)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 104857600,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif',
        'video/mp4','video/webm','video/quicktime',
        'audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_read"   on storage.objects;
drop policy if exists "media_insert" on storage.objects;
drop policy if exists "media_delete" on storage.objects;
create policy "media_read" on storage.objects for select
  using (bucket_id = 'media');
create policy "media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 5) REALTIME: postingan baru/hapus langsung muncul di web & HP ----------
do $$
begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;
