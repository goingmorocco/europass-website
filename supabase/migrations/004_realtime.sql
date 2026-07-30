-- ============================================================
-- EuroPass — 004_realtime.sql
-- Turns on Supabase Realtime (live postgres_changes events) for the
-- tables the dashboards need to update live — this is what replaces the
-- old prototype's "same-browser-tab storage event" trick with real
-- cross-device sync. Safe to re-run any number of times.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['posts','notifications','notification_reads','homework','submissions','messages','profiles','courses']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
