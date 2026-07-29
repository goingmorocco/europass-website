-- ============================================================
-- EuroPass — 003_rls_policies.sql
-- Row Level Security. This is what actually enforces "a student can only
-- see their own grades," "a teacher can only grade their own students,"
-- etc. — the browser's anon key alone grants nothing without these.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.homework enable row level security;
alter table public.submissions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;

-- ---------- PROFILES ----------
-- Everyone signed in can read profiles (needed to show names/teachers in
-- rosters, chat headers, "who sent this notification", etc.) but can only
-- ever UPDATE their own row — and even then, role/course_id changes are
-- blocked by the trg_prevent_role_escalation trigger unless you're admin.
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_update_admin" on public.profiles
  for update using (public.current_role() = 'admin');

-- No client-side INSERT/DELETE policy on purpose: profiles are created only
-- by the handle_new_user trigger (SECURITY DEFINER, bypasses RLS) or the
-- admin-create-user Edge Function (uses the service role key, bypasses RLS).
-- "Removing" a user from the Admin dashboard sets is_active = false instead
-- of deleting anything — see profiles_update_admin above.

-- ---------- COURSES ----------
create policy "courses_select_authenticated" on public.courses
  for select using (auth.role() = 'authenticated');

create policy "courses_admin_write" on public.courses
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------- HOMEWORK ----------
-- Visible to: the teacher who created it, any student enrolled in that
-- course, and admins.
create policy "homework_select" on public.homework
  for select using (
    public.current_role() = 'admin'
    or teacher_id = auth.uid()
    or course_id = public.current_course_id()
  );

create policy "homework_insert_teacher" on public.homework
  for insert with check (teacher_id = auth.uid() and public.current_role() = 'teacher');

create policy "homework_update_teacher" on public.homework
  for update using (teacher_id = auth.uid());

create policy "homework_delete_teacher" on public.homework
  for delete using (teacher_id = auth.uid());

-- ---------- SUBMISSIONS ----------
-- A student sees only their own submissions. A teacher sees submissions
-- for homework THEY assigned (not another teacher's course). Students can
-- create/edit their own submission while it's still 'submitted' (not yet
-- graded); only the owning teacher can move it to 'graded'.
create policy "submissions_select" on public.submissions
  for select using (
    student_id = auth.uid()
    or public.current_role() = 'admin'
    or exists (
      select 1 from public.homework h
      where h.id = submissions.homework_id and h.teacher_id = auth.uid()
    )
  );

create policy "submissions_insert_student" on public.submissions
  for insert with check (student_id = auth.uid());

create policy "submissions_update_student_own" on public.submissions
  for update using (student_id = auth.uid() and status = 'submitted');

create policy "submissions_update_teacher_grade" on public.submissions
  for update using (
    exists (
      select 1 from public.homework h
      where h.id = submissions.homework_id and h.teacher_id = auth.uid()
    )
  );

-- ---------- NOTIFICATIONS ----------
create policy "notifications_select" on public.notifications
  for select using (
    audience_type = 'all'
    or (audience_type = 'teachers' and public.current_role() = 'teacher')
    or (audience_type = 'students' and public.current_role() = 'student')
    or (audience_type = 'course' and audience_id = public.current_course_id())
    or (audience_type = 'user' and audience_id = auth.uid())
    or from_id = auth.uid()
    or public.current_role() = 'admin'
  );

create policy "notifications_insert" on public.notifications
  for insert with check (
    from_id = auth.uid()
    and (
      public.current_role() = 'admin'
      or (public.current_role() = 'teacher' and audience_type = 'user')
    )
  );

create policy "notification_reads_select_own" on public.notification_reads
  for select using (user_id = auth.uid());

create policy "notification_reads_insert_own" on public.notification_reads
  for insert with check (user_id = auth.uid());

-- ---------- MESSAGES ----------
-- Only the two participants in a conversation can read or write it.
create policy "messages_select_own_thread" on public.messages
  for select using (from_id = auth.uid() or to_id = auth.uid());

create policy "messages_insert_own" on public.messages
  for insert with check (from_id = auth.uid());

-- ---------- BLOG POSTS ----------
-- Published posts are public (no auth required — the marketing blog needs
-- to be readable by anonymous visitors). Drafts are admin-only.
create policy "posts_select_published" on public.posts
  for select using (status = 'published');

create policy "posts_select_admin_all" on public.posts
  for select using (public.current_role() = 'admin');

create policy "posts_admin_write" on public.posts
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
