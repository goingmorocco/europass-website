-- One-time backfill: creates a pending "undecided course" enrollment for
-- any student who has no enrollment record at all — catches anyone who
-- signed up while course_id was still NOT NULL (before migration 017),
-- regardless of when they signed up.
--
-- Safe to run more than once — the WHERE NOT EXISTS clause means students
-- who already have an enrollment (of any status) are skipped entirely.

insert into public.enrollments (student_id, course_id, status, payment_status)
select p.id, null, 'pending', 'unpaid'
from public.profiles p
where p.role = 'student'
  and not exists (
    select 1 from public.enrollments e where e.student_id = p.id
  );
