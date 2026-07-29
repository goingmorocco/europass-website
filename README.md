# EuroPass — Website + Real Supabase Backend

The public marketing site plus fully working Admin, Teacher, and Student portals —
now backed by a real Supabase project (Postgres + Auth + Realtime), not a
localStorage mock. Set up once (see `supabase/README.md`), and this is a real,
multi-user, multi-device online school.

## Setup (do this first)
Everything backend-related lives in the `supabase/` folder. Follow
**`supabase/README.md`** step by step — create a Supabase project, run the
SQL migrations, deploy the one Edge Function, seed demo accounts, then paste
your project's URL + anon key into `assets/js/data.js`. Takes about 15 minutes.

Until you do that, the site's public pages work fine, but the login page and
all three dashboards won't load any data (`data.js` will throw, since the
placeholder Supabase URL doesn't exist).

## How to view it
Open `index.html` in any browser. To try the portals, click **Portal Login**
and sign in with a seeded demo account (see `supabase/README.md` step 4 for
credentials) or a real account you create.

## What's real now
- **Real authentication** — Supabase Auth, email/password. No more "pick an
  account" — you actually log in.
- **Real multi-user data** — a teacher grading homework in one browser shows
  up for the student in a completely different browser, live, via Supabase
  Realtime. Not a same-tab trick anymore.
- **Real access control** — Row Level Security policies (see
  `supabase/migrations/003_rls_policies.sql`) enforce who can see and change
  what: a student can't read another student's grades even if they know the
  URL; a teacher can only grade their own students' work.
- **Admin can create real logins** for teachers/students, via a secure Edge
  Function (the only place the sensitive service-role key is ever used).
- Blog posts published from the Admin dashboard go live on the public
  `blog.html` for anyone, including logged-out visitors (with RLS explicitly
  allowing public read of *published* posts only — drafts stay private).

## Pages
Same as before: `index.html`, `about.html`, `courses.html`,
`course-business-english.html`, `pricing.html`, `blog.html` / `blog-post.html`,
`bilan.html`, `contact.html`, `login.html`, `admin-dashboard.html`,
`teacher-dashboard.html`, `student-dashboard.html`, `404.html`, `privacy.html`,
`terms.html`.

## What's still simplified (see `supabase/README.md` for the full list)
- One Supabase backend instead of the Software Architecture Document's
  Supabase + Directus split — simpler to run solo; upgrade path is documented.
- Single role per user (no multi-role accounts yet).
- "Remove user" deactivates access rather than deleting the account outright.
- Photography is still labeled placeholder blocks, not real photos — swap
  these per Section 6 of the Design System before a real launch.
- Tailwind still loads via CDN for iteration speed; compile it properly for
  production performance per the Software Architecture Document.

## Next step
This is now a genuinely deployable small school platform. From here, the
highest-value next steps are: real photography, a payment gateway wired into
the (currently unbuilt) subscriptions/payments tables from the Software
Architecture Document, and — once you outgrow the SQL Editor for content
editing — adding Directus per that same document.
