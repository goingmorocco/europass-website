# EuroPass — Website + Real Supabase Backend

> **Major update**: EuroPass is now a multi-program institute — German, French,
> and English language training, plus a Nursing & Ausbildung placement track
> (German language + job placement into German employer contracts). The
> public site was redesigned around this (new homepage, new nav, a unified
> multi-language "Test Your Level" self-test, and dedicated program pages).
> See "New pages in this update" below for exactly what's new and what's
> still on the punch list.

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
- **Students can also self-register** at `signup.html` — real Supabase Auth
  signup, no admin needed. Always creates a `student` account (enforced
  server-side by the database trigger, not just hidden in the UI — see the
  patch note above). They can optionally pick a course during signup.
- Blog posts published from the Admin dashboard go live on the public
  `blog.html` for anyone, including logged-out visitors (with RLS explicitly
  allowing public read of *published* posts only — drafts stay private).

## Pages
Same as before: `index.html`, `about.html`, `courses.html`,
`course-business-english.html`, `pricing.html`, `blog.html` / `blog-post.html`,
`bilan.html`, `contact.html`, `login.html`, `admin-dashboard.html`,
`teacher-dashboard.html`, `student-dashboard.html`, `404.html`, `privacy.html`,
`terms.html`.

## New pages in this update
- **index.html** — redesigned homepage: program switcher (German/French/English/Nursing), a dedicated "Test Your Level" CTA section, updated programs grid, teachers, testimonials, FAQ.
- **test-level.html** — the new unified self-test. Pick German, French, or English (tabs, or `?lang=de|fr|en` in the URL), answer 6 questions, get an estimated CEFR level and a link to the matching program. Replaces the old English-only `bilan.html`, which now redirects here.
- **program-german.html**, **program-french.html** — full program pages (curriculum, teacher, FAQ, related programs), built from a shared template so adding more languages later is cheap.
- **program-nursing-ausbildung.html** — bespoke structure for the placement track: a 4-step "how it works" process (language training → healthcare prep → employer matching → contract/relocation), since this isn't just a language course.
- Nav and footer updated site-wide (Programs dropdown, Test Your Level, new footer columns) — since these are shared functions, every existing page picked up the new navigation automatically.
- New display font (Baloo 2, bold/rounded) for headings site-wide, plus a teal accent color, to match the more modern visual direction — while keeping the Navy/Red brand core from the Design System document, not replacing it.

## What's explicitly NOT done yet (next round)
- **Real photography.** Every image is still the labeled placeholder system — I attempted a stock photo search per your note that you'd handle licensing, but it surfaced other businesses' marketing pages (a nursing recruitment agency, study-abroad consultancies) rather than actual stock photography, and this environment can't verify a hotlinked URL will even render. Safer to have you source specific photos from Unsplash/Pexels and drop them in — I can wire them into the exact right spots once you have them.
- **English course pages** (`course-business-english.html` etc.) still use the older visual pass — they inherited the new fonts/nav automatically, but haven't been rewritten for the new multi-program framing the way the homepage and new program pages have.
- **Pricing page** still reflects only the old English-course pricing structure, not German/French/Nursing pricing.
- **Blog** still has only English-track example content.
- **Teachers can't broadcast to their whole class yet** — only to one student at a time (via the grading flow). The database already supports course-wide notifications (that's how the seed script's "Welcome to the German Program" notification works), but there's no compose UI for it in the Teacher Dashboard, and the RLS policy currently only allows teachers to target a single user, not their whole course, for safety. Cheap to add if you want it next.

## What's done as of this update
- **Settings / Edit Profile**, in all three portals (Admin, Teacher, Student): change your display name, change your password, and log out — all for real, against Supabase Auth, not mocked. Look for "Settings" in the sidebar.
- **German, French, and Nursing & Ausbildung are now real backend courses**, not just marketing pages — see `supabase/seed/seed-new-programs.js`. New teachers (Klaus Weber, Camille Fontaine, Dr. Amina Rachidi) and students are seeded and ready to log into their own dashboards, fully scoped by their own course — the Teacher/Student/Admin dashboards needed zero code changes for this, since they were already built generically around "whatever course this profile belongs to," not hardcoded to English.

## What's still simplified (see `supabase/README.md` for the full list)
- **Self-signup grants course access immediately, with no payment gate.**
  Picking a course at signup gives instant access to that course's homework
  — fine for a demo, not fine for a real paid launch. This goes away
  naturally once the Payments piece is built (a course should only attach to
  a profile after payment/admin confirmation, not at signup).
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
