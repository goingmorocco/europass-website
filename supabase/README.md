# EuroPass — Supabase Backend Setup

> **Already deployed this before? Apply this patch first.**
> Self-service Sign Up was added, and it exposed a real bug in the original
> `handle_new_user` trigger: it trusted a `role` field from client-supplied
> signup metadata, which meant anyone could self-signup as `admin` by editing
> a value in their browser's dev tools before submitting. If your project is
> already live, go to SQL Editor and run **just this**, right now:
> ```sql
> create or replace function public.handle_new_user()
> returns trigger
> language plpgsql
> security definer set search_path = public
> as $$
> begin
>   insert into public.profiles (id, full_name, role, course_id, title)
>   values (
>     new.id,
>     coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
>     'student',
>     nullif(new.raw_user_meta_data->>'course_id', '')::uuid,
>     new.raw_user_meta_data->>'title'
>   );
>   return new;
> end;
> $$;
> ```
> Then redeploy the Edge Function (step 3 below) — it now promotes a new
> teacher account with a trusted follow-up update instead of relying on
> signup metadata. New projects following the steps below already get the
> fixed version in `002_functions_and_triggers.sql`, nothing extra needed.

**All four migration files are now safe to re-run, any number of times, in
any combination.** Every `create table`, `create type`, `create trigger`,
`create policy`, and the realtime publication step now check whether the
thing already exists before creating it (or use `create or replace` /
`drop ... if exists` first). If you're ever unsure whether a migration
applied cleanly, just run it again — worst case, nothing happens.

This turns the front-end prototype into a real, multi-user backend: real logins,
a real Postgres database, real row-level security, and live realtime updates
across different browsers/devices — not just tabs in the same browser.

## 1. Create the Supabase project
1. Go to https://supabase.com/dashboard → New Project.
2. Pick a name/region/password (the DB password — save it, you won't need it
   for anything below, but keep it somewhere safe).
3. Wait for the project to finish provisioning (~2 minutes).

## 2. Run the migrations
In the Supabase Dashboard → SQL Editor, run these four files **in order**
(copy-paste each one's contents and click Run):
1. `migrations/001_schema.sql`
2. `migrations/002_functions_and_triggers.sql`
3. `migrations/003_rls_policies.sql`
4. `migrations/004_realtime.sql`

(If you prefer the CLI: `supabase link --project-ref YOUR_REF` then
`supabase db push` from this `supabase/` folder, after installing the
Supabase CLI.)

## 3. Deploy the Edge Function
The Admin dashboard's "Add User" button needs to create a real login, which
requires a secret key that can never live in browser code — that's what this
function is for.

```
npm install -g supabase   # if you don't have the CLI yet
supabase login
supabase link --project-ref YOUR_REF
supabase functions deploy admin-create-user
```

No extra secrets to set — `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
automatically available to Edge Functions in your project.

## 4. Seed demo data (optional but recommended)
This recreates the same demo accounts the old prototype used, as real logins.

```
cd seed
npm install
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node seed.js
```

Find both values in Dashboard → Project Settings → API. **The service role
key is extremely sensitive** — it bypasses every security rule in
`003_rls_policies.sql`. Only ever use it here (local seed script) and inside
the Edge Function (where Supabase injects it automatically). Never put it in
`assets/js/data.js` or anywhere else in the website's code.

After seeding, every demo account logs in with password `EuroPass2026!`
(see the seed script output for the exact list of emails).

## 5. Point the website at your project
Open `assets/js/data.js` and replace the two placeholder values near the top:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
```

Both values are in Dashboard → Project Settings → API. The **anon** key
(labeled "anon public") is the one you want — it's safe to expose in browser
code by design; it grants nothing beyond what the RLS policies in
`003_rls_policies.sql` allow. **Never** put the "service_role" key here.

## 6. Enable email/password auth (usually on by default)
Dashboard → Authentication → Providers → make sure Email is enabled. For a
real launch, also turn off "Confirm email" only if you want instant sign-in
without a confirmation email — otherwise leave it on and set up an email
provider under Authentication → Email Templates / SMTP settings.

## 7. Test it
Push the updated `assets/js/data.js` (and everything else) to GitHub Pages
(or open `login.html` locally), and log in with one of the seeded demo
accounts. Try it in two different browsers at once — a message sent from the
teacher's account in one browser should now appear in the student's account
in a completely different browser, live. That's the real backend working.

## What's simplified vs. the full Software Architecture Document
- **One backend, not two.** The SAD specifies Supabase (transactional data)
  + Directus (content/CMS) as separate systems, aimed at a team with a
  dedicated content editor. This setup keeps everything in Supabase alone —
  simpler to run solo, at the cost of a less polished content-editing UI
  (the Admin dashboard's blog form is functional but plain compared to a
  real CMS). Add Directus later if/when a content team needs it; the `posts`
  table is deliberately structured close to what a Directus `posts`
  collection would look like, so migrating isn't a rebuild.
- **Single role per user**, not the SAD's many-to-many `user_roles` table —
  matches how the front-end prototype already worked. Fine for now; revisit
  if someone needs to be, say, both a teacher and an admin.
- **Soft-delete only.** "Remove user" in the Admin dashboard deactivates the
  profile (`is_active = false`); it doesn't delete the underlying Supabase
  Auth account. A second Edge Function would be needed for hard deletion.
