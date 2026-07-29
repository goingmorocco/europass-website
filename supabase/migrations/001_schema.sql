-- ============================================================
-- EuroPass — 001_schema.sql
-- Core tables. Run this first (Supabase SQL Editor or `supabase db push`).
-- ============================================================

create extension if not exists pgcrypto;

create type user_role as enum ('admin', 'teacher', 'student');
create type post_status as enum ('draft', 'published');
create type submission_status as enum ('submitted', 'graded');
create type audience_type as enum ('all', 'teachers', 'students', 'course', 'user');

-- Courses first (without teacher_id yet — profiles doesn't exist yet)
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Profiles: one row per auth.users row, created automatically by a trigger (see 002).
-- NOTE: this uses a single `role` + single `course_id` per user — a deliberate
-- simplification of the Software Architecture Document's many-to-many user_roles
-- model, matching how this MVP (and the front-end prototype) actually works: one
-- person, one role, one course. Revisit if you need multi-role users later.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'student',
  course_id uuid references public.courses(id) on delete set null,
  title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Now that profiles exists, add the teacher_id FK to courses.
alter table public.courses
  add column teacher_id uuid references public.profiles(id) on delete set null;

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  instructions text not null,
  due_date date not null,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  status submission_status not null default 'submitted',
  grade text,
  feedback text,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  unique (homework_id, student_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  audience_type audience_type not null,
  audience_id uuid, -- course id or user id; null when audience_type is 'all' | 'teachers' | 'students'
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  excerpt text not null,
  body text not null,
  author_id uuid references public.profiles(id) on delete set null,
  status post_status not null default 'draft',
  created_at timestamptz not null default now(),
  published_at timestamptz
);

-- Indexes for the query patterns the dashboards actually use
create index idx_profiles_course on public.profiles (course_id);
create index idx_homework_course on public.homework (course_id);
create index idx_submissions_student on public.submissions (student_id);
create index idx_submissions_homework on public.submissions (homework_id);
create index idx_notifications_audience on public.notifications (audience_type, audience_id);
create index idx_notification_reads_user on public.notification_reads (user_id);
create index idx_messages_from_to on public.messages (from_id, to_id);
create index idx_messages_to_from on public.messages (to_id, from_id);
create index idx_posts_status on public.posts (status);
