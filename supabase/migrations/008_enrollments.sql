-- ============================================================
-- EuroPass — 008_enrollments.sql
-- Manual/offline enrollment workflow: self-signup now creates a PENDING
-- request instead of instant course access. Admin reviews, records the
-- agreed price and payment status (cash/bank transfer — no payment
-- gateway yet), and activates it. Activating sets profiles.course_id via
-- a trigger, so every existing RLS policy, homework, and community-group
-- rule (all keyed off profiles.course_id) needs zero changes.
--
-- NOTE: this table only applies to public self-signup (signup.html).
-- Admin manually adding a user (Admin → Users → Add User) is unaffected
-- and keeps granting instant course access, same as before — an admin
-- creating the account already *is* the approval step.
-- Safe to re-run any number of times.
-- ============================================================

do $$ begin
  create type enrollment_status as enum ('pending', 'active', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status_key as enum ('unpaid', 'paid', 'waived');
exception when duplicate_object then null;
end $$;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status enrollment_status not null default 'pending',
  payment_status payment_status_key not null default 'unpaid',
  price_mad numeric(10,2),
  notes text,
  requested_at timestamptz not null default now(),
  activated_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

-- A student can't submit two pending requests for the same course, but CAN
-- have a full history (completed one level, later enrolls in the next).
create unique index if not exists uniq_pending_enrollment
  on public.enrollments (student_id, course_id) where status = 'pending';

create index if not exists idx_enrollments_student on public.enrollments (student_id);
create index if not exists idx_enrollments_status on public.enrollments (status);

-- ---------- Activating an enrollment grants real access ----------
create or replace function public.sync_course_on_enrollment_activate()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'active' and (TG_OP = 'INSERT' or old.status is distinct from 'active') then
    update public.profiles set course_id = new.course_id where id = new.student_id;
    new.activated_at = coalesce(new.activated_at, now());
  end if;
  return new;
end;
$$;

create or replace trigger trg_sync_course_on_enrollment_activate
  before insert or update on public.enrollments
  for each row execute function public.sync_course_on_enrollment_activate();

-- ---------- RLS ----------
alter table public.enrollments enable row level security;

drop policy if exists "enrollments_select_own_or_admin" on public.enrollments;
create policy "enrollments_select_own_or_admin" on public.enrollments
  for select using (student_id = auth.uid() or public.current_role() = 'admin');

-- A student can only ever create their own PENDING, UNPAID request — never
-- self-activate or self-mark-paid.
drop policy if exists "enrollments_insert_own_pending" on public.enrollments;
create policy "enrollments_insert_own_pending" on public.enrollments
  for insert with check (student_id = auth.uid() and status = 'pending' and payment_status = 'unpaid');

drop policy if exists "enrollments_admin_insert" on public.enrollments;
create policy "enrollments_admin_insert" on public.enrollments
  for insert with check (public.current_role() = 'admin');

-- A student can withdraw their own pending application — nothing else.
drop policy if exists "enrollments_student_cancel_own" on public.enrollments;
create policy "enrollments_student_cancel_own" on public.enrollments
  for update using (student_id = auth.uid() and status = 'pending')
  with check (student_id = auth.uid() and status = 'cancelled');

drop policy if exists "enrollments_admin_write" on public.enrollments;
create policy "enrollments_admin_write" on public.enrollments
  for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists "enrollments_admin_delete" on public.enrollments;
create policy "enrollments_admin_delete" on public.enrollments
  for delete using (public.current_role() = 'admin');

-- ---------- Realtime ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'enrollments'
  ) then
    execute 'alter publication supabase_realtime add table public.enrollments';
  end if;
end $$;
