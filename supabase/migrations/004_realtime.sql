-- ============================================================
-- EuroPass — 004_realtime.sql
-- Turns on Supabase Realtime (live postgres_changes events) for the
-- tables the dashboards need to update live — this is what replaces the
-- old prototype's "same-browser-tab storage event" trick with real
-- cross-device sync.
-- ============================================================

alter publication supabase_realtime add table
  public.posts,
  public.notifications,
  public.notification_reads,
  public.homework,
  public.submissions,
  public.messages,
  public.profiles,
  public.courses;
