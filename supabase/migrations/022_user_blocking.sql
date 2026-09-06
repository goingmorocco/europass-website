-- Gives the admin real control over access: a manual block/unblock switch
-- (separate from is_active, which means "removed" — blocking is meant to
-- be temporary, e.g. "suspended pending payment", not a deletion), plus a
-- simple last-payment marker the admin sets by hand. This deliberately
-- doesn't try to be a full recurring-billing system — it's a manual tool
-- that gives the admin the information and the switch, not automation
-- that could wrongly lock someone out on its own.

alter table public.profiles
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text,
  add column if not exists last_payment_at timestamptz;
