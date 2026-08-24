-- Attendance tracking — a teacher marks present/absent/late per student,
-- per class date. Genuinely missing from the project until now, despite
-- being core to running an in-person school. Follows the same ownership
-- pattern as homework: a teacher manages attendance only for their own
-- course, students see only their own record, admin sees everything.

create type attendance_status as enum ('present', 'absent', 'late');

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_date date not null,
  status attendance_status not null,
  created_at timestamptz not null default now(),
  unique (course_id, student_id, class_date)
);

create index if not exists idx_attendance_course_date on public.attendance (course_id, class_date);
create index if not exists idx_attendance_student on public.attendance (student_id);

alter table public.attendance enable row level security;

drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance
  for select using (
    public.current_role() = 'admin'
    or teacher_id = auth.uid()
    or student_id = auth.uid()
  );

drop policy if exists "attendance_insert_teacher" on public.attendance;
create policy "attendance_insert_teacher" on public.attendance
  for insert with check (teacher_id = auth.uid() and public.current_role() = 'teacher');

drop policy if exists "attendance_update_teacher" on public.attendance;
create policy "attendance_update_teacher" on public.attendance
  for update using (teacher_id = auth.uid());

drop policy if exists "attendance_delete_teacher" on public.attendance;
create policy "attendance_delete_teacher" on public.attendance
  for delete using (teacher_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance'
  ) then
    alter publication supabase_realtime add table public.attendance;
  end if;
end $$;
