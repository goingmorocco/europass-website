-- ============================================================
-- EuroPass — 006_reports_and_reply_notifications.sql
-- 1. Post reporting (teachers/students can report a post; admin reviews).
-- 2. Auto-notifications when someone likes/comments on your post, or
--    comments on a post you also commented on — via triggers, not client
--    calls, so no student/teacher needs broad notification-send permission
--    just to make this work.
-- Safe to re-run any number of times.
-- ============================================================

create table if not exists public.group_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);
create index if not exists idx_group_post_reports_post on public.group_post_reports (post_id);

alter table public.group_post_reports enable row level security;

drop policy if exists "group_post_reports_select" on public.group_post_reports;
create policy "group_post_reports_select" on public.group_post_reports
  for select using (public.current_role() = 'admin' or reporter_id = auth.uid());

drop policy if exists "group_post_reports_insert" on public.group_post_reports;
create policy "group_post_reports_insert" on public.group_post_reports
  for insert with check (
    reporter_id = auth.uid()
    and exists (
      select 1 from public.group_posts gp join public.groups g on g.id = gp.group_id
      where gp.id = group_post_reports.post_id and g.program = public.current_program()
    )
  );

drop policy if exists "group_post_reports_delete" on public.group_post_reports;
create policy "group_post_reports_delete" on public.group_post_reports
  for delete using (public.current_role() = 'admin');

-- ---------- Auto-notify on like ----------
create or replace function public.notify_on_group_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_author_id uuid;
  v_liker_name text;
begin
  select author_id into v_author_id from public.group_posts where id = new.post_id;
  if v_author_id is null or v_author_id = new.user_id then
    return new;
  end if;
  select full_name into v_liker_name from public.profiles where id = new.user_id;
  insert into public.notifications (from_id, audience_type, audience_id, title, body)
  values (new.user_id, 'user', v_author_id, 'New like on your post', coalesce(v_liker_name, 'Someone') || ' liked your post. \u2764\ufe0f');
  return new;
end;
$$;

create or replace trigger trg_notify_on_group_like
  after insert on public.group_post_likes
  for each row execute function public.notify_on_group_like();

-- ---------- Auto-notify on comment (post author + other commenters = "replies") ----------
create or replace function public.notify_on_group_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_author_id uuid;
  v_commenter_name text;
  v_recipient uuid;
begin
  select author_id into v_author_id from public.group_posts where id = new.post_id;
  select full_name into v_commenter_name from public.profiles where id = new.author_id;

  if v_author_id is not null and v_author_id <> new.author_id then
    insert into public.notifications (from_id, audience_type, audience_id, title, body)
    values (new.author_id, 'user', v_author_id, 'New comment on your post', coalesce(v_commenter_name, 'Someone') || ' commented: ' || left(new.body, 80));
  end if;

  for v_recipient in
    select distinct author_id from public.group_post_comments
    where post_id = new.post_id
      and author_id <> new.author_id
      and author_id <> coalesce(v_author_id, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    insert into public.notifications (from_id, audience_type, audience_id, title, body)
    values (new.author_id, 'user', v_recipient, 'New reply in a post you commented on', coalesce(v_commenter_name, 'Someone') || ' also commented: ' || left(new.body, 80));
  end loop;

  return new;
end;
$$;

create or replace trigger trg_notify_on_group_comment
  after insert on public.group_post_comments
  for each row execute function public.notify_on_group_comment();

-- ---------- Realtime ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_post_reports'
  ) then
    execute 'alter publication supabase_realtime add table public.group_post_reports';
  end if;
end $$;
