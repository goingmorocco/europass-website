-- ============================================================
-- EuroPass — 007_notification_links_and_post_editing.sql
-- 1. notifications.related_post_id — lets the client jump straight to the
--    post/comment that triggered a like/comment notification, instead of
--    just showing text.
-- 2. Post editing (author can fix a typo; shows "(edited)" once changed).
-- Safe to re-run any number of times.
-- ============================================================

alter table public.notifications add column if not exists related_post_id uuid references public.group_posts(id) on delete set null;
alter table public.group_posts add column if not exists edited_at timestamptz;

-- ---------- Re-point the like/comment triggers to also set related_post_id ----------
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
  insert into public.notifications (from_id, audience_type, audience_id, title, body, related_post_id)
  values (new.user_id, 'user', v_author_id, 'New like on your post', coalesce(v_liker_name, 'Someone') || ' liked your post. \u2764\ufe0f', new.post_id);
  return new;
end;
$$;

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
    insert into public.notifications (from_id, audience_type, audience_id, title, body, related_post_id)
    values (new.author_id, 'user', v_author_id, 'New comment on your post', coalesce(v_commenter_name, 'Someone') || ' commented: ' || left(new.body, 80), new.post_id);
  end if;

  for v_recipient in
    select distinct author_id from public.group_post_comments
    where post_id = new.post_id
      and author_id <> new.author_id
      and author_id <> coalesce(v_author_id, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    insert into public.notifications (from_id, audience_type, audience_id, title, body, related_post_id)
    values (new.author_id, 'user', v_recipient, 'New reply in a post you commented on', coalesce(v_commenter_name, 'Someone') || ' also commented: ' || left(new.body, 80), new.post_id);
  end loop;

  return new;
end;
$$;

-- ---------- Author can edit their own post's text ----------
drop policy if exists "group_posts_update_own" on public.group_posts;
create policy "group_posts_update_own" on public.group_posts
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
