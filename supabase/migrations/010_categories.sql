-- Blog categories as a real, admin-manageable table instead of a hardcoded
-- list baked into the HTML. Seeded with the categories already in use so
-- nothing changes for existing posts (posts.category stays free text, not
-- a foreign key — deleting a category here only removes it as a future
-- option, it never touches posts that already used that name).

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.categories (name)
values ('Career'), ('Parenting'), ('IELTS'), ('Vie Locale'), ('Entertainment')
on conflict (name) do nothing;

alter table public.categories enable row level security;

drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public" on public.categories
  for select using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
