-- ============================================================
-- EuroPass — 005_community_groups.sql
-- Member area: one social group per program (English/German/French/
-- Nursing & Ausbildung), each with a Facebook-style feed (text + one
-- image under 1MB, likes, comments) and a group chat. Access is implicit:
-- a student/teacher sees the group matching their own course's program —
-- no separate membership table needed, same pattern as course access.
-- Safe to re-run any number of times.
-- ============================================================

do $$ begin
  create type program_key as enum ('english', 'german', 'french', 'nursing');
exception when duplicate_object then null;
end $$;

-- Tag each existing course with its program, so group access can be derived
-- from "what course is this profile in" the same way homework access already is.
alter table public.courses add column if not exists program program_key;
update public.courses set program = 'english' where name in ('Business English — Standard', 'IELTS Prep — Intensive') and program is null;
update public.courses set program = 'german' where name = 'German Program' and program is null;
update public.courses set program = 'french' where name = 'French Program' and program is null;
update public.courses set program = 'nursing' where name = 'Nursing & Ausbildung Placement' and program is null;

-- ---------- Tables ----------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  program program_key not null unique,
  name text not null,
  description text,
  icon text not null default '\u{1F4AC}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  image_url text,
  created_at timestamptz not null default now(),
  constraint group_posts_has_content check (body is not null or image_url is not null)
);

create table if not exists public.group_post_likes (
  post_id uuid not null references public.group_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.group_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_posts_group on public.group_posts (group_id);
create index if not exists idx_group_post_likes_post on public.group_post_likes (post_id);
create index if not exists idx_group_post_comments_post on public.group_post_comments (post_id);
create index if not exists idx_group_messages_group on public.group_messages (group_id);

-- Seed the 4 fixed groups (one per program — admin can rename/describe
-- later, but the set is fixed since it's derived from program_key).
insert into public.groups (program, name, description, icon)
values
  ('english', 'English Community', 'Practice, memes, and moral support for everyone in the English track. 🎉', '\u{1F1EC}\u{1F1E7}'),
  ('german', 'German Community', 'Auf Deutsch, bitte! Share wins, ask questions, laugh at your own mistakes with people who get it. 🙌', '\u{1F1E9}\u{1F1EA}'),
  ('french', 'French Community', 'Un peu de tout — questions, encouragement, and the occasional bad pun. 😄', '\u{1F1EB}\u{1F1F7}'),
  ('nursing', 'Nursing & Ausbildung Community', 'For everyone on the placement track — share progress, ask questions, cheer each other on. 💪', '\u{1FA7A}')
on conflict (program) do nothing;

-- ---------- Helper: which program does the current user belong to ----------
create or replace function public.current_program()
returns program_key
language sql stable security definer set search_path = public
as $$
  select c.program from public.courses c
  join public.profiles p on p.course_id = c.id
  where p.id = auth.uid();
$$;

-- ---------- RLS ----------
alter table public.groups enable row level security;
alter table public.group_posts enable row level security;
alter table public.group_post_likes enable row level security;
alter table public.group_post_comments enable row level security;
alter table public.group_messages enable row level security;

drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups
  for select using (program = public.current_program() or public.current_role() = 'admin');

drop policy if exists "groups_admin_write" on public.groups;
create policy "groups_admin_write" on public.groups
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists "group_posts_select" on public.group_posts;
create policy "group_posts_select" on public.group_posts
  for select using (
    public.current_role() = 'admin'
    or exists (select 1 from public.groups g where g.id = group_posts.group_id and g.program = public.current_program())
  );

drop policy if exists "group_posts_insert" on public.group_posts;
create policy "group_posts_insert" on public.group_posts
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.groups g where g.id = group_posts.group_id and g.program = public.current_program())
  );

drop policy if exists "group_posts_delete" on public.group_posts;
create policy "group_posts_delete" on public.group_posts
  for delete using (author_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "group_post_likes_select" on public.group_post_likes;
create policy "group_post_likes_select" on public.group_post_likes
  for select using (
    exists (
      select 1 from public.group_posts gp join public.groups g on g.id = gp.group_id
      where gp.id = group_post_likes.post_id and (g.program = public.current_program() or public.current_role() = 'admin')
    )
  );

drop policy if exists "group_post_likes_insert" on public.group_post_likes;
create policy "group_post_likes_insert" on public.group_post_likes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_posts gp join public.groups g on g.id = gp.group_id
      where gp.id = group_post_likes.post_id and g.program = public.current_program()
    )
  );

drop policy if exists "group_post_likes_delete" on public.group_post_likes;
create policy "group_post_likes_delete" on public.group_post_likes
  for delete using (user_id = auth.uid());

drop policy if exists "group_post_comments_select" on public.group_post_comments;
create policy "group_post_comments_select" on public.group_post_comments
  for select using (
    exists (
      select 1 from public.group_posts gp join public.groups g on g.id = gp.group_id
      where gp.id = group_post_comments.post_id and (g.program = public.current_program() or public.current_role() = 'admin')
    )
  );

drop policy if exists "group_post_comments_insert" on public.group_post_comments;
create policy "group_post_comments_insert" on public.group_post_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.group_posts gp join public.groups g on g.id = gp.group_id
      where gp.id = group_post_comments.post_id and g.program = public.current_program()
    )
  );

drop policy if exists "group_post_comments_delete" on public.group_post_comments;
create policy "group_post_comments_delete" on public.group_post_comments
  for delete using (author_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "group_messages_select" on public.group_messages;
create policy "group_messages_select" on public.group_messages
  for select using (
    exists (select 1 from public.groups g where g.id = group_messages.group_id and g.program = public.current_program())
  );

drop policy if exists "group_messages_insert" on public.group_messages;
create policy "group_messages_insert" on public.group_messages
  for insert with check (
    from_id = auth.uid()
    and exists (select 1 from public.groups g where g.id = group_messages.group_id and g.program = public.current_program())
  );

-- ---------- Storage: images only, 1MB limit, enforced server-side too ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-images', 'group-images', true, 1048576, array['image/jpeg','image/png','image/gif','image/webp'])
on conflict (id) do update set file_size_limit = 1048576, allowed_mime_types = array['image/jpeg','image/png','image/gif','image/webp'];

drop policy if exists "group_images_public_read" on storage.objects;
create policy "group_images_public_read" on storage.objects
  for select using (bucket_id = 'group-images');

drop policy if exists "group_images_authenticated_upload" on storage.objects;
create policy "group_images_authenticated_upload" on storage.objects
  for insert with check (bucket_id = 'group-images' and auth.role() = 'authenticated');

drop policy if exists "group_images_own_delete" on storage.objects;
create policy "group_images_own_delete" on storage.objects
  for delete using (bucket_id = 'group-images' and auth.uid()::text = owner);

-- ---------- Realtime ----------
do $$
declare
  t text;
begin
  foreach t in array array['groups','group_posts','group_post_likes','group_post_comments','group_messages']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
