-- Adds a language tag to blog posts so the admin can publish Arabic posts
-- (rendered RTL) alongside English ones. Defaults existing posts to 'en'.

alter table public.posts
  add column if not exists language text not null default 'en'
  check (language in ('en', 'ar'));

create index if not exists idx_posts_language on public.posts (language);
