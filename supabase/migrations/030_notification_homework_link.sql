-- ============================================================
-- EuroPass — 030_notification_homework_link.sql
-- notifications.related_homework_id — lets the client jump straight to the
-- exercise (and its grade) that a "Homework graded" / "Revision requested"
-- notification is about, the same way related_post_id already does for
-- community posts (see 007_notification_links_and_post_editing.sql).
-- Safe to re-run any number of times.
-- ============================================================

alter table public.notifications
  add column if not exists related_homework_id uuid references public.homework(id) on delete set null;
