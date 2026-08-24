-- Class-wide announcements — a teacher posts one message that every
-- student in their course can see, separate from the existing 1-to-1
-- Messages feature (which doesn't fit "tell my whole class about Friday's
-- schedule change" without sending the same message N times by hand).

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_announcements_course on public.announcements (course_id, created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements
  for select using (
    public.current_role() = 'admin'
    or teacher_id = auth.uid()
    or course_id = public.current_course_id()
  );

drop policy if exists "announcements_insert_teacher" on public.announcements;
create policy "announcements_insert_teacher" on public.announcements
  for insert with check (teacher_id = auth.uid() and public.current_role() = 'teacher');

drop policy if exists "announcements_update_teacher" on public.announcements;
create policy "announcements_update_teacher" on public.announcements
  for update using (teacher_id = auth.uid());

drop policy if exists "announcements_delete_teacher" on public.announcements;
create policy "announcements_delete_teacher" on public.announcements
  for delete using (teacher_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;
end $$;
