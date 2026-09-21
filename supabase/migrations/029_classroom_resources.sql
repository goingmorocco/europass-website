-- "Classroom" learning hub: lets a teacher share PDFs, images, and links
-- (including YouTube videos) with their own students. This is deliberately
-- a separate table from `resources` (which is admin -> teacher only, a
-- different audience and a different set of RLS rules) rather than
-- overloading that table with a second, unrelated audience.
--
-- Scoped by course_id, the same way homework and announcements already are
-- (see homework_select / announcements_select policies) — that's what lets
-- current_course_id() give every student in the course access with no
-- per-student assignment step, and keeps this consistent with how the rest
-- of the app already scopes teacher -> student content.

create table public.classroom_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('pdf', 'image', 'video', 'link')),
  file_path text,
  external_url text,
  category text not null default 'General',
  created_at timestamptz not null default now()
);

alter table public.classroom_resources enable row level security;

create policy classroom_resources_select on public.classroom_resources
  for select using (
    "current_role"() = 'admin'::user_role
    or teacher_id = auth.uid()
    or course_id = current_course_id()
  );

create policy classroom_resources_insert_teacher on public.classroom_resources
  for insert with check (
    teacher_id = auth.uid() and "current_role"() = 'teacher'::user_role
  );

create policy classroom_resources_update_teacher on public.classroom_resources
  for update using (teacher_id = auth.uid());

create policy classroom_resources_delete_teacher on public.classroom_resources
  for delete using (teacher_id = auth.uid());

alter publication supabase_realtime add table public.classroom_resources;

-- Storage: PDFs and images the teacher uploads directly. YouTube/other
-- links don't need storage — they're stored as external_url on the row.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'classroom-resources', 'classroom-resources', true, 15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

create policy classroom_resources_public_read on storage.objects
  for select using (bucket_id = 'classroom-resources');

create policy classroom_resources_teacher_upload on storage.objects
  for insert with check (
    bucket_id = 'classroom-resources' and "current_role"() = 'teacher'::user_role
  );

create policy classroom_resources_owner_delete on storage.objects
  for delete using (
    bucket_id = 'classroom-resources' and owner = auth.uid()
  );
