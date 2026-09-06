-- Adds email directly to profiles. Email has only ever lived in
-- auth.users, which the client can't query for anyone but the currently
-- signed-in user — meaning the admin dashboard had no way to actually see
-- or contact a student/teacher by email, despite showing their name, city,
-- and phone. This denormalizes a copy of email onto profiles, kept in sync
-- at signup time, plus a one-time backfill for accounts that already exist.

alter table public.profiles add column if not exists email text;

-- Backfill existing profiles from auth.users (a one-time join only possible
-- here, with full database privileges — not something the client can do).
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Keep it in sync for every new signup going forward.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, course_id, title, city, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    'student',
    nullif(new.raw_user_meta_data->>'course_id', '')::uuid,
    new.raw_user_meta_data->>'title',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'phone',
    new.email
  );
  return new;
end;
$$;
