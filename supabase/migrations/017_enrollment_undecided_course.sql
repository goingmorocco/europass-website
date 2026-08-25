-- Students who sign up without picking a specific course (the "I'm not
-- sure yet" option, on both the portal and homepage signup forms) were
-- silently generating NO enrollment record at all — ensurePendingEnrollment()
-- correctly bailed out with no course to attach to, and course_id was
-- NOT NULL besides, so there was no valid row to insert even if it hadn't.
-- That made those students invisible to the admin Enrollments tab forever,
-- with no way to ever get a real course assigned. This allows a null
-- course_id so "undecided" is a trackable, visible state instead of a dead end.

alter table public.enrollments alter column course_id drop not null;
