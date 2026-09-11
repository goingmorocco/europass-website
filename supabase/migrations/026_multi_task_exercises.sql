-- Lets one exercise contain several tasks of different types — a writing
-- prompt, a quiz, and a media item (embedded video, external link, or
-- uploaded PDF/file) all within the same assignment. Existing single-type
-- exercises from the previous migration keep working exactly as they are
-- (submission_mode text/file/quiz, one attachment, flat submission
-- fields) — this is purely additive. A new exercise built with the task
-- editor uses submission_mode='multi' and its real structure lives in
-- homework_tasks instead.

alter table public.homework drop constraint if exists homework_submission_mode_check;
alter table public.homework add constraint homework_submission_mode_check
  check (submission_mode in ('text', 'file', 'quiz', 'multi'));

create table if not exists public.homework_tasks (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  type text not null check (type in ('writing', 'quiz', 'media')),
  position integer not null default 0,
  title text,
  -- Rich HTML prompt/context for 'writing' and 'media' tasks (what a
  -- student sees above the response area or the media items).
  instructions text,
  -- For 'media' tasks only: an ordered array of
  -- {kind: 'video'|'link'|'pdf'|'audio'|'image'|'file', url, name}.
  -- Video/link entries are just URLs the teacher pastes in (e.g. a
  -- YouTube link, rendered as an embed where possible); pdf/audio/
  -- image/file entries point at an uploaded homework-files object,
  -- same bucket the rest of this feature already uses.
  media_items jsonb
);

alter table public.homework_tasks enable row level security;

drop policy if exists "homework_tasks_select" on public.homework_tasks;
create policy "homework_tasks_select" on public.homework_tasks
  for select using (true);

drop policy if exists "homework_tasks_teacher_write" on public.homework_tasks;
create policy "homework_tasks_teacher_write" on public.homework_tasks
  for all using (
    exists (
      select 1 from public.homework h
      join public.profiles p on p.id = auth.uid()
      where h.id = homework_tasks.homework_id
        and (p.role = 'admin' or h.teacher_id = auth.uid())
    )
  );

-- Quiz questions now belong to a task (for multi-task exercises) as well
-- as directly to a homework (for the original single-quiz exercises).
-- homework_id is kept and back-filled from the task's parent for every
-- new row too, so any existing query filtering by homework_id alone
-- keeps working unchanged for both shapes.
alter table public.homework_questions add column if not exists task_id uuid references public.homework_tasks(id) on delete cascade;

-- Submissions gain one JSONB column holding an answer per task, for
-- multi-task exercises: [{taskId, type, content, attachmentUrl,
-- attachmentName, quizAnswers, autoScore}, ...]. The original flat
-- columns (content, attachment_url, quiz_answers, auto_score) are
-- untouched and keep serving single-type exercises exactly as before.
alter table public.submissions add column if not exists task_responses jsonb;
