-- Fitur BALAS KOMENTAR. Jalankan SEKALI di Supabase > SQL Editor,
-- SEBELUM memakai index.html yang baru.

do $$
declare t text;
begin
  select format_type(atttypid, atttypmod) into t
  from pg_attribute
  where attrelid = 'public.bs_comments'::regclass and attname = 'id';

  execute format(
    'alter table public.bs_comments
       add column if not exists parent_id %s
       references public.bs_comments(id) on delete cascade', t);
end $$;

create index if not exists bs_comments_parent_idx on public.bs_comments(parent_id);

-- muat ulang skema API
notify pgrst, 'reload schema';
