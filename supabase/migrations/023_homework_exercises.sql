-- Expands homework from plain-text-only into three exercise types a
-- teacher can build: text (write an answer), file (upload a scan,
-- recording, or document), and quiz (multiple-choice, auto-graded).
-- Every type can optionally carry a teacher-attached file — that's what
-- makes a listening exercise possible: attach an audio clip, then set
-- the type to whichever response format fits (a quiz of comprehension
-- questions, or a written response).

-- due_date becomes a full timestamp so assignments can carry a specific
-- time, not just a date. Existing values convert to midnight UTC on the
-- same date — no data is lost, they just don't have a time component yet.
alter table public.homework alter column due_date type timestamptz using due_date::timestamptz;

alter table public.homework
  add column if not exists submission_mode text not null default 'text'
    check (submission_mode in ('text', 'file', 'quiz')),
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists max_points integer not null default 100;

-- Quiz questions belong to a specific homework, in order. options is a
-- plain JSON array of answer strings; correct_index points into that
-- array (0-based) — kept simple deliberately, matching how test-level.js
-- already represents multiple-choice questions elsewhere on the site.
create table if not exists public.homework_questions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_index integer not null,
  position integer not null default 0
);

alter table public.homework_questions enable row level security;

drop policy if exists "homework_questions_select" on public.homework_questions;
create policy "homework_questions_select" on public.homework_questions
  for select using (true);

drop policy if exists "homework_questions_teacher_write" on public.homework_questions;
create policy "homework_questions_teacher_write" on public.homework_questions
  for all using (
    exists (
      select 1 from public.homework h
      join public.profiles p on p.id = auth.uid()
      where h.id = homework_questions.homework_id
        and (p.role = 'admin' or h.teacher_id = auth.uid())
    )
  );

-- Submissions: content is no longer required (a file-only or quiz-only
-- submission may have nothing typed), plus room for a student's own
-- uploaded file, their quiz answers, and an auto-computed quiz score.
alter table public.submissions alter column content drop not null;
alter table public.submissions
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists quiz_answers jsonb,
  add column if not exists auto_score integer;

-- 'draft' lets a student save without submitting; 'needs_revision' lets a
-- teacher send work back with feedback instead of only graded/ungraded.
alter type submission_status add value if not exists 'draft';
alter type submission_status add value if not exists 'needs_revision';

-- ---------- Storage: homework attachments and student-submitted files ----------
-- Public, like every other bucket in this project (blog-covers,
-- group-images) — paths are random and unguessable, and the real privacy
-- boundary is the app only ever showing a link to people who already have
-- table-level access via the homework/submissions RLS above. Using a
-- private bucket here would mean signed URLs, which expire and would be
-- the only place in the codebase using that pattern — not worth the
-- inconsistency for a homework attachment.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homework-files', 'homework-files', true, 15728640, array[
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'
])
on conflict (id) do update set file_size_limit = 15728640, allowed_mime_types = array[
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'
];

drop policy if exists "homework_files_public_read" on storage.objects;
create policy "homework_files_public_read" on storage.objects
  for select using (bucket_id = 'homework-files');

drop policy if exists "homework_files_authenticated_upload" on storage.objects;
create policy "homework_files_authenticated_upload" on storage.objects
  for insert with check (bucket_id = 'homework-files' and auth.role() = 'authenticated');

drop policy if exists "homework_files_own_delete" on storage.objects;
create policy "homework_files_own_delete" on storage.objects
  for delete using (bucket_id = 'homework-files' and owner::text = auth.uid()::text);