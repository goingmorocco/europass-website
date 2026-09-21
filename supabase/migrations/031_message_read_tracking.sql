-- ============================================================
-- EuroPass — 031_message_read_tracking.sql
-- messages.read_at — lets the client tell which direct messages a
-- teacher/student pair has actually seen, so the portal nav can show an
-- unread-message dot instead of sending a full notification for every
-- chat message (which would flood the Notifications page).
-- Safe to re-run any number of times.
-- ============================================================

alter table public.messages add column if not exists read_at timestamptz;
