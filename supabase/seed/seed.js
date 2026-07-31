/**
 * EuroPass — demo data seed script
 * ---------------------------------
 * Creates real Supabase Auth users (matching the old prototype's demo
 * accounts) plus courses, homework, a submission, a notification, and a
 * message — so the live site has something to look at immediately.
 *
 * Run once, locally, after running the migrations:
 *   npm install @supabase/supabase-js
 *   SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node seed.js
 *
 * The service role key is in Supabase Dashboard → Project Settings → API.
 * NEVER commit it, never put it in the website's front-end code — this
 * script is meant to be run from your own machine, once.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const DEMO_PASSWORD = 'EuroPass2026!'; // change after first login, or per-user in production

async function createDemoUser({ email, full_name, role, course_id, title }) {
  const { data, error } = await sb.auth.admin.createUser({
    email, password: DEMO_PASSWORD, email_confirm: true,
    user_metadata: { full_name, role, course_id, title },
  });
  if (error) throw error;
  // handle_new_user() always inserts new profiles as role='student' (a
  // deliberate security fix — see migrations/002 — so client-supplied
  // metadata can never grant a role). Promote here instead, using the
  // service role key, same pattern as the admin-create-user Edge Function.
  if (role !== 'student') {
    const { error: promoteErr } = await sb.from('profiles').update({ role, course_id, title }).eq('id', data.user.id);
    if (promoteErr) throw promoteErr;
  }
  console.log(`Created ${role}: ${full_name} <${email}>`);
  return data.user.id;
}

async function main() {
  console.log('--- Seeding courses ---');
  const { data: bizCourse, error: e1 } = await sb.from('courses').insert({ name: 'Business English — Standard' }).select().single();
  if (e1) throw e1;
  const { data: ieltsCourse, error: e2 } = await sb.from('courses').insert({ name: 'IELTS Prep — Intensive' }).select().single();
  if (e2) throw e2;

  console.log('--- Creating demo users ---');
  const adminId = await createDemoUser({ email: 'admin@europass.demo', full_name: 'Hicham Bennani', role: 'admin' });
  const teacher1Id = await createDemoUser({ email: 'sara@europass.demo', full_name: 'Sara El Amrani', role: 'teacher', course_id: bizCourse.id, title: 'Business English' });
  const teacher2Id = await createDemoUser({ email: 'marc@europass.demo', full_name: 'Marc Dubois', role: 'teacher', course_id: ieltsCourse.id, title: 'IELTS / TOEFL Prep' });
  const student1Id = await createDemoUser({ email: 'yassine@europass.demo', full_name: 'Yassine B.', role: 'student', course_id: bizCourse.id });
  const student2Id = await createDemoUser({ email: 'amina@europass.demo', full_name: 'Amina T.', role: 'student', course_id: bizCourse.id });
  const student3Id = await createDemoUser({ email: 'karim@europass.demo', full_name: 'Karim L.', role: 'student', course_id: ieltsCourse.id });

  console.log('--- Linking teachers to courses ---');
  await sb.from('courses').update({ teacher_id: teacher1Id }).eq('id', bizCourse.id);
  await sb.from('courses').update({ teacher_id: teacher2Id }).eq('id', ieltsCourse.id);

  console.log('--- Seeding homework ---');
  const { data: hw1 } = await sb.from('homework').insert({
    course_id: bizCourse.id, teacher_id: teacher1Id,
    title: 'Unit 4 — Professional Email Writing',
    instructions: 'Write a 150-word email requesting a meeting reschedule. Focus on polite, professional tone.',
    due_date: '2026-08-02',
  }).select().single();
  const { data: hw2 } = await sb.from('homework').insert({
    course_id: bizCourse.id, teacher_id: teacher1Id,
    title: 'Speaking Journal #3',
    instructions: 'Describe your weekend in English in a few sentences.',
    due_date: '2026-07-29',
  }).select().single();
  await sb.from('homework').insert({
    course_id: ieltsCourse.id, teacher_id: teacher2Id,
    title: 'Writing Task 2 — Practice Essay',
    instructions: 'Write a 250-word argumentative essay on: "Technology has made people less social." Use the 4-paragraph structure from class.',
    due_date: '2026-08-05',
  });

  console.log('--- Seeding a graded submission ---');
  await sb.from('submissions').insert({
    homework_id: hw2.id, student_id: student1Id,
    content: 'This weekend I visited my family in Casablanca and we cooked together...',
    status: 'graded', grade: 'B+',
    feedback: 'Great structure! Watch your past tense verb forms — keep that consistency throughout.',
    graded_at: new Date().toISOString(),
  });

  console.log('--- Seeding a welcome notification ---');
  await sb.from('notifications').insert({
    from_id: adminId, audience_type: 'all',
    title: 'Welcome to the new Student & Teacher Portal',
    body: 'You can now track homework, message your teacher/students, and see announcements right here.',
  });

  console.log('--- Seeding a starter message ---');
  await sb.from('messages').insert({
    from_id: teacher1Id, to_id: student1Id,
    body: 'Hi Yassine — great work on your last submission. Keep it up!',
  });

  console.log('\nDone. Demo login password for every account: ' + DEMO_PASSWORD);
  console.log('Emails: admin@europass.demo, sara@europass.demo, marc@europass.demo, yassine@europass.demo, amina@europass.demo, karim@europass.demo');
}

main().catch((err) => { console.error(err); process.exit(1); });
