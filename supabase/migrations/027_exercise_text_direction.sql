-- Lets a teacher mark instructions as right-to-left when writing in
-- Arabic — at the whole-exercise level (the main instructions field) and
-- per-task, since a multi-task exercise could reasonably mix an English
-- writing prompt with an Arabic-language media task, or vice versa.

alter table public.homework
  add column if not exists instructions_direction text not null default 'ltr'
  check (instructions_direction in ('ltr', 'rtl'));

alter table public.homework_tasks
  add column if not exists direction text not null default 'ltr'
  check (direction in ('ltr', 'rtl'));
