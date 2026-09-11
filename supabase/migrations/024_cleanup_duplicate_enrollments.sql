-- One-time cleanup for the duplicate-enrollment bug: ensurePendingEnrollment()
-- was matching on desired_course_id (a static signup-time value) to decide
-- whether a student already had an enrollment. The moment an admin
-- approved a request, that same row's course_id changed to the real
-- assigned course, so the match broke — and the student's very next
-- login created a brand new duplicate "pending" enrollment. This could
-- repeat on every login, so some students may have several stray pending
-- rows behind one legitimate active enrollment.
--
-- This cancels any 'pending' enrollment belonging to a student who
-- already has an 'active' one — those pending rows are leftover noise
-- from the bug, not real separate requests. Safe to run more than once;
-- there's nothing left to cancel on a second pass.

update public.enrollments e
set status = 'cancelled'
where e.status = 'pending'
  and exists (
    select 1 from public.enrollments a
    where a.student_id = e.student_id
      and a.status = 'active'
  );

-- A student could also have ended up with several duplicate pending,
-- no-course rows without ever having been approved yet at all — migration
-- 025 adds a database-level constraint that only allows one such row per
-- student, so any leftover duplicates here need cleaning up first or that
-- constraint will fail to create. Keeps the oldest (first requested) row
-- for each student, cancels the rest.
with ranked as (
  select id, row_number() over (partition by student_id order by requested_at asc) as rn
  from public.enrollments
  where status = 'pending' and course_id is null
)
update public.enrollments e
set status = 'cancelled'
from ranked
where e.id = ranked.id and ranked.rn > 1;
