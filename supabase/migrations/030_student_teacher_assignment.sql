-- Until now, a student's "class" was entirely determined by course_id,
-- which assumes one teacher per course. That breaks the moment two
-- teachers teach the same course (e.g. two English teachers) — every
-- query that found "my students" by matching course_id would return
-- every student in that course, regardless of which teacher they
-- actually work with, since there was no way to tell them apart.
--
-- homework, attendance, and announcements already store teacher_id
-- alongside course_id — this was already the intended design for those,
-- it just was never actually filtered on. The missing piece was a
-- teacher_id on the student side to filter *by*.

alter table public.profiles add column if not exists teacher_id uuid references public.profiles(id) on delete set null;
alter table public.enrollments add column if not exists teacher_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_profiles_teacher on public.profiles (teacher_id);

-- Keeps profiles.teacher_id in sync with the enrollment's assigned
-- teacher, the same way course_id already gets synced on activation.
-- Also fires when course_id/teacher_id changes on an enrollment that was
-- already active (e.g. admin reassigns a student to a different teacher
-- later) — the original version only fired on the transition into
-- 'active', which would have silently failed to sync a reassignment made
-- afterward.
create or replace function public.sync_course_on_enrollment_activate()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'active' and (
    TG_OP = 'INSERT'
    or old.status is distinct from 'active'
    or old.course_id is distinct from new.course_id
    or old.teacher_id is distinct from new.teacher_id
  ) then
    update public.profiles set course_id = new.course_id, teacher_id = new.teacher_id where id = new.student_id;
    new.activated_at = coalesce(new.activated_at, now());
  end if;
  return new;
end;
$$;
