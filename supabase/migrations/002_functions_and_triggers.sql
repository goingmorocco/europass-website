-- ============================================================
-- EuroPass — 002_functions_and_triggers.sql
-- Auto-create a profile row whenever someone signs up, plus helper
-- functions the RLS policies (003) depend on.
-- ============================================================

-- Runs after every new auth.users row (real signup, or admin-created via
-- the Edge Function). Reads full_name/course_id/title from the user's
-- metadata, but role is ALWAYS forced to 'student' here — this trigger is
-- also what fires for public self-signup (assets/js/data.js's EP.signup(),
-- using the anon key), and metadata is client-supplied, so trusting a
-- "role" field from it would let anyone self-signup as admin. Promoting a
-- user to 'teacher' happens as a separate, trusted, server-side step in
-- the admin-create-user Edge Function (see below) — never at signup time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, course_id, title)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    'student',
    nullif(new.raw_user_meta_data->>'course_id', '')::uuid,
    new.raw_user_meta_data->>'title'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reads the caller's own role/course without going back through RLS on
-- profiles (which would recurse). SECURITY DEFINER + a pinned search_path
-- keeps this safe to call from inside policies.
create or replace function public.current_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_course_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select course_id from public.profiles where id = auth.uid();
$$;

-- Prevents a student or teacher from editing their OWN role or course_id
-- (privilege escalation) while still allowing them to update the rest of
-- their profile, and still allowing admins to change anyone's role/course.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.course_id is distinct from old.course_id)
     and public.current_role() <> 'admin' then
    raise exception 'Not authorized to change role or course assignment';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Auto-stamp published_at the first time a post's status is/becomes 'published'
-- (covers both creating a post as already-published, and later editing one
-- from draft to published).
create or replace function public.set_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and (TG_OP = 'INSERT' or old.status is distinct from 'published') then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_set_published_at
  before insert or update on public.posts
  for each row execute function public.set_published_at();
