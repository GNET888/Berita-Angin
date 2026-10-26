-- ============================================================
-- Berita Angin: SUKA & KOMENTAR lintas pengguna (aman dijalankan berulang)
-- Jalankan di Supabase: SQL Editor -> New query -> tempel -> Run
-- Hanya menambah tabel baru (bs_*), tidak mengubah tabel yang sudah ada.
-- ============================================================
create table if not exists public.bs_likes (
  post_id    text        not null,
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.bs_comments (
  id          uuid        primary key default gen_random_uuid(),
  post_id     text        not null,
  user_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text        not null default 'Pengguna' check (char_length(author_name) <= 80),
  body        text        not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists bs_comments_post_idx on public.bs_comments (post_id, created_at);

alter table public.bs_likes    enable row level security;
alter table public.bs_comments enable row level security;

-- Semua akun yang sudah login boleh MELIHAT; hanya pemilik yang boleh menambah/menghapus miliknya.
drop policy if exists bs_likes_read    on public.bs_likes;
drop policy if exists bs_likes_add     on public.bs_likes;
drop policy if exists bs_likes_del     on public.bs_likes;
create policy bs_likes_read on public.bs_likes for select to authenticated using (true);
create policy bs_likes_add  on public.bs_likes for insert to authenticated with check (user_id = auth.uid());
create policy bs_likes_del  on public.bs_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists bs_comments_read on public.bs_comments;
drop policy if exists bs_comments_add  on public.bs_comments;
drop policy if exists bs_comments_del  on public.bs_comments;
create policy bs_comments_read on public.bs_comments for select to authenticated using (true);
create policy bs_comments_add  on public.bs_comments for insert to authenticated with check (user_id = auth.uid());
create policy bs_comments_del  on public.bs_comments for delete to authenticated using (user_id = auth.uid());

-- Tamu (belum login) tidak punya akses sama sekali.
revoke all on public.bs_likes, public.bs_comments from anon;

-- Jumlah suka & komentar per postingan (dibaca feed dalam satu permintaan)
create or replace view public.bs_stats as
select coalesce(l.post_id, c.post_id) as post_id,
       coalesce(l.n, 0)::int          as likes,
       coalesce(c.n, 0)::int          as comments
from      (select post_id, count(*) n from public.bs_likes    group by 1) l
full join (select post_id, count(*) n from public.bs_comments group by 1) c on c.post_id = l.post_id;
revoke all    on public.bs_stats from anon;
grant  select on public.bs_stats to authenticated;
