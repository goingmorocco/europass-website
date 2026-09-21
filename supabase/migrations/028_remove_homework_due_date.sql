-- Exercises are reused across cohorts of students (a new student is often
-- handed homework that was already assigned to more advanced students
-- earlier), so a fixed due_date set for the first group reads as a stale,
-- often-already-passed deadline to everyone who gets the exercise later.
-- The app no longer collects or shows a due date for homework/exercises —
-- see assets/js/teacher.js, assets/js/student.js, assets/js/admin.js — so
-- the column must stop being required on insert. Left in the table (not
-- dropped) purely so existing historical rows keep their value; nothing
-- reads it anymore.
alter table public.homework alter column due_date drop not null;
