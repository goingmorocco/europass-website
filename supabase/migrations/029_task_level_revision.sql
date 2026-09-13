-- Lets a teacher flag specific tasks within a multi-task submission as
-- needing revision, rather than reopening the entire exercise. A student
-- with, say, a perfect quiz score but a writing task that needs work
-- would otherwise get the whole thing back editable — including the part
-- that was already correct, risking them accidentally changing a good
-- answer while fixing the flagged one.
--
-- Null or empty means "the whole submission needs revision" — the
-- original, simpler behavior, and the only behavior that ever applied to
-- text/file/single-quiz exercises, which have no concept of tasks at all.

alter table public.submissions add column if not exists revision_task_ids jsonb;
