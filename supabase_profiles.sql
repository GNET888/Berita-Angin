-- =====================================================================
-- BERITA ANGIN - profil pengguna (nama + foto) agar sama di komputer & aplikasi
-- Jalankan di Supabase: SQL Editor > New query > paste > Run.
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

-- 1) Tabel profil
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  avatar_url  text,
  created_at  timestamptz default now()
);
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists avatar_url text;

-- 2) RLS: semua orang boleh melihat profil, hanya pemilik yang boleh mengubah
alter table public.profiles enable row level security;

drop policy if exists ba_profiles_select on public.profiles;
create policy ba_profiles_select on public.profiles for select using (true);

drop policy if exists ba_profiles_insert on public.profiles;
create policy ba_profiles_insert on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists ba_profiles_update on public.profiles;
create policy ba_profiles_update on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- 3) Profil dibuat otomatis saat akun baru terdaftar
create or replace function public.ba_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ba_on_auth_user_created on auth.users;
create trigger ba_on_auth_user_created
  after insert on auth.users
  for each row execute function public.ba_handle_new_user();

-- 4) Isi profil untuk akun yang sudah terlanjur ada
insert into public.profiles (id, name)
select u.id, coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- 5) Bucket foto/media (publik untuk dibaca) + aturan unggah per-folder pengguna
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists ba_media_read on storage.objects;
create policy ba_media_read on storage.objects for select using (bucket_id = 'media');

drop policy if exists ba_media_insert on storage.objects;
create policy ba_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists ba_media_update on storage.objects;
create policy ba_media_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists ba_media_delete on storage.objects;
create policy ba_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
