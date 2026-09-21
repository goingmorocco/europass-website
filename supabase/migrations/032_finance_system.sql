-- ============================================================
-- EuroPass — 032_finance_system.sql
-- A real accounting layer: a payments ledger (many payments per student —
-- installments, corrections, refunds all fit) and an expenses ledger, both
-- admin-editable with an automatic audit trail, plus a trigger that keeps
-- the Enrollments tab's price/payment_status in sync with the ledger going
-- forward so this gap can't reopen. Finishes with a one-time backfill of
-- existing data (enrollment prices already marked paid, and the legacy
-- profiles.last_payment_at flags) so historical totals stay meaningful.
-- Safe to re-run any number of times.
-- ============================================================

do $$ begin
  create type payment_method as enum ('cash', 'bank_transfer', 'card', 'check', 'online', 'other');
exception when duplicate_object then null;
end $$;

-- ---------- payments (the source of truth for revenue) ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete set null,
  -- Snapshotted so a payment's history stays readable even if the student
  -- is later removed (is_active = false) or, in principle, deleted.
  student_name text not null,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  course_name text,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'MAD',
  method payment_method not null default 'cash',
  paid_at timestamptz not null default now(),
  notes text,
  -- A payment is corrected by voiding it (keeping the record, for the
  -- audit trail) and/or editing its fields directly — never hard-deleted.
  voided_at timestamptz,
  void_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_student on public.payments (student_id);
create index if not exists idx_payments_enrollment on public.payments (enrollment_id);
create index if not exists idx_payments_paid_at on public.payments (paid_at);

-- ---------- expenses (the other half of profit & loss) ----------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  vendor text,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'MAD',
  incurred_at timestamptz not null default now(),
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_expenses_incurred_at on public.expenses (incurred_at);
create index if not exists idx_expenses_category on public.expenses (category);

-- ---------- finance_audit_log (automatic, tamper-evident history) ----------
-- Never written to directly by the client — only by the SECURITY DEFINER
-- trigger below, so every create/edit/void of a payment or expense is
-- captured regardless of which screen it happened from.
create table if not exists public.finance_audit_log (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('payment', 'expense')),
  record_id uuid not null,
  action text not null check (action in ('create', 'update', 'void', 'unvoid')),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  before jsonb,
  after jsonb
);
create index if not exists idx_finance_audit_record on public.finance_audit_log (record_type, record_id);

-- ---------- updated_at bookkeeping ----------
create or replace function public.finance_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_payments_touch on public.payments;
create trigger trg_payments_touch before update on public.payments
  for each row execute function public.finance_touch_updated_at();
drop trigger if exists trg_expenses_touch on public.expenses;
create trigger trg_expenses_touch before update on public.expenses
  for each row execute function public.finance_touch_updated_at();

-- ---------- automatic audit trail ----------
create or replace function public.finance_audit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_type text := tg_argv[0];
  v_action text;
begin
  if tg_op = 'INSERT' then
    insert into public.finance_audit_log (record_type, record_id, action, changed_by, before, after)
    values (v_type, new.id, 'create', auth.uid(), null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    v_action := case
      when new.voided_at is not null and old.voided_at is null then 'void'
      when new.voided_at is null and old.voided_at is not null then 'unvoid'
      else 'update'
    end;
    insert into public.finance_audit_log (record_type, record_id, action, changed_by, before, after)
    values (v_type, new.id, v_action, auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_payments_audit on public.payments;
create trigger trg_payments_audit after insert or update on public.payments
  for each row execute function public.finance_audit('payment');
drop trigger if exists trg_expenses_audit on public.expenses;
create trigger trg_expenses_audit after insert or update on public.expenses
  for each row execute function public.finance_audit('expense');

-- ---------- RLS ----------
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.finance_audit_log enable row level security;

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_all" on public.expenses
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists "finance_audit_admin_select" on public.finance_audit_log;
create policy "finance_audit_admin_select" on public.finance_audit_log
  for select using (public.current_role() = 'admin');
-- No insert/update/delete policy on finance_audit_log for clients — the
-- SECURITY DEFINER trigger is the only writer, by design.

-- ---------- realtime, so the dashboards update live (see 004_realtime.sql) ----------
do $$
declare
  t text;
begin
  foreach t in array array['payments', 'expenses']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- keep the Enrollments tab's Approve/Edit flow in sync ----------
-- When an enrollment is (or becomes) payment_status = 'paid', auto-record a
-- matching payment — so admins using the Approve/Edit flow on the
-- Enrollments tab can never again silently produce a payment that doesn't
-- show up in the ledger, the way the old profile-only "Mark Paid" flag did.
-- Fires once per enrollment (guarded by the NOT EXISTS check) — later price
-- corrections belong in the payments ledger itself, not here.
create or replace function public.sync_payment_on_enrollment_paid()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
  v_course_name text;
begin
  if new.payment_status = 'paid'
     and (tg_op = 'INSERT' or old.payment_status is distinct from 'paid')
     and new.price_mad is not null and new.price_mad > 0 then
    if not exists (select 1 from public.payments where enrollment_id = new.id) then
      select full_name into v_name from public.profiles where id = new.student_id;
      select name into v_course_name from public.courses where id = new.course_id;
      insert into public.payments (student_id, student_name, enrollment_id, course_id, course_name, amount, currency, method, paid_at, notes, created_by)
      values (new.student_id, coalesce(v_name, 'Unknown student'), new.id, new.course_id, v_course_name, new.price_mad, 'MAD', 'other', now(),
        'Auto-recorded when this enrollment was marked paid from the Enrollments tab.', new.reviewed_by);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enrollment_sync_payment on public.enrollments;
create trigger trg_enrollment_sync_payment after insert or update on public.enrollments
  for each row execute function public.sync_payment_on_enrollment_paid();

-- ============================================================
-- One-time backfill — safe to re-run: every insert below is guarded by a
-- NOT EXISTS check, so running this migration twice never duplicates rows.
-- ============================================================

-- Part A — every enrollment already marked payment_status = 'paid' with a
-- price on it becomes a payment record, dated to when it was activated.
insert into public.payments (student_id, student_name, enrollment_id, course_id, course_name, amount, currency, method, paid_at, notes, created_by)
select
  e.student_id,
  coalesce(p.full_name, 'Unknown student'),
  e.id,
  e.course_id,
  c.name,
  e.price_mad,
  'MAD',
  'other',
  coalesce(e.activated_at, e.requested_at, now()),
  'Migrated automatically from the enrollment record when the finance system was introduced.',
  null
from public.enrollments e
left join public.profiles p on p.id = e.student_id
left join public.courses c on c.id = e.course_id
where e.payment_status = 'paid'
  and e.price_mad is not null and e.price_mad > 0
  and not exists (select 1 from public.payments pay where pay.enrollment_id = e.id);

-- Part B — legacy profiles.last_payment_at flags (the old one-click
-- "Mark Paid" button on the Users page, which recorded no amount) for a
-- student who still has ZERO payments after Part A. We infer the amount
-- from their most recent priced active/completed enrollment; the note
-- flags it for admin review since the real amount wasn't actually
-- recorded at the time. A student whose flag can't be matched to any
-- priced enrollment is intentionally left alone — see the "needs review"
-- list the admin app surfaces instead of guessing a number here.
insert into public.payments (student_id, student_name, enrollment_id, course_id, course_name, amount, currency, method, paid_at, notes, created_by)
select
  p.id,
  p.full_name,
  e.id,
  e.course_id,
  c.name,
  e.price_mad,
  'MAD',
  'other',
  p.last_payment_at,
  'Migrated automatically from the legacy "marked paid" flag — amount inferred from this student''s enrollment price. Please verify this is correct.',
  null
from public.profiles p
join lateral (
  select * from public.enrollments en
  where en.student_id = p.id and en.status in ('active', 'completed')
    and en.price_mad is not null and en.price_mad > 0
  order by en.activated_at desc nulls last, en.requested_at desc
  limit 1
) e on true
left join public.courses c on c.id = e.course_id
where p.last_payment_at is not null
  and not exists (select 1 from public.payments pay where pay.student_id = p.id);
