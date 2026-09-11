-- Two real fixes to how students can update their own submission:
--
-- 1. The existing policy only allowed updates while status = 'submitted'.
--    That meant the "resubmit after a teacher asks for revision" feature
--    (status = 'needs_revision') and saving a draft again (status =
--    'draft') were both silently blocked at the database level the whole
--    time, regardless of what the client-side code allowed — this was
--    never actually verified against real RLS enforcement before now.
--
-- 2. Adds the actual feature requested: a student can keep editing an
--    already-submitted response right up until the due date, after which
--    it locks — except when a teacher has explicitly sent it back for
--    revision, which stays editable regardless of the deadline, since
--    that's the teacher overriding the normal cutoff on purpose.
--
-- 'graded' is deliberately not in the allowed list at all — once graded,
-- the only way back to an editable state is a teacher choosing
-- requestRevision, not the student unilaterally reopening it.

drop policy if exists "submissions_update_student_own" on public.submissions;
create policy "submissions_update_student_own" on public.submissions
  for update using (
    student_id = auth.uid()
    and status in ('draft', 'submitted', 'needs_revision')
    and (
      status = 'needs_revision'
      or exists (
        select 1 from public.homework h
        where h.id = submissions.homework_id
          and (h.due_date is null or h.due_date > now())
      )
    )
  );
