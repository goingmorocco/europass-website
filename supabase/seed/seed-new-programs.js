/**
 * EuroPass — German / French / Nursing & Ausbildung demo data
 * -------------------------------------------------------------
 * Additive seed: creates the 3 new teacher accounts, 3 new courses, and 3
 * new student accounts for the new programs, without touching or duplicating
 * anything from the original seed.js. Safe to run once, after seed.js.
 *
 * Run:
 *   cd supabase/seed
 *   npm install   (skip if you already ran this for seed.js)
 *   SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node seed-new-programs.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const DEMO_PASSWORD = 'EuroPass2026!';

async function createDemoUser({ email, full_name, role, course_id, title }) {
  const { data, error } = await sb.auth.admin.createUser({
    email, password: DEMO_PASSWORD, email_confirm: true,
    user_metadata: { full_name, role, course_id, title },
  });
  if (error) throw error;
  console.log(`Created ${role}: ${full_name} <${email}>`);
  return data.user.id;
}

async function main() {
  console.log('--- Seeding new program courses ---');
  const { data: germanCourse, error: e1 } = await sb.from('courses').insert({ name: 'German Program' }).select().single();
  if (e1) throw e1;
  const { data: frenchCourse, error: e2 } = await sb.from('courses').insert({ name: 'French Program' }).select().single();
  if (e2) throw e2;
  const { data: nursingCourse, error: e3 } = await sb.from('courses').insert({ name: 'Nursing & Ausbildung Placement' }).select().single();
  if (e3) throw e3;

  console.log('--- Creating new teacher accounts ---');
  const klausId = await createDemoUser({ email: 'klaus@europass.demo', full_name: 'Klaus Weber', role: 'teacher', course_id: germanCourse.id, title: 'German & Ausbildung Prep' });
  const camilleId = await createDemoUser({ email: 'camille@europass.demo', full_name: 'Camille Fontaine', role: 'teacher', course_id: frenchCourse.id, title: 'French Program' });
  const aminaId = await createDemoUser({ email: 'amina.rachidi@europass.demo', full_name: 'Dr. Amina Rachidi', role: 'teacher', course_id: nursingCourse.id, title: 'Ausbildung Placement Advisor' });

  console.log('--- Linking teachers to their courses ---');
  await sb.from('courses').update({ teacher_id: klausId }).eq('id', germanCourse.id);
  await sb.from('courses').update({ teacher_id: camilleId }).eq('id', frenchCourse.id);
  await sb.from('courses').update({ teacher_id: aminaId }).eq('id', nursingCourse.id);

  console.log('--- Creating new student accounts ---');
  const fatimaId = await createDemoUser({ email: 'fatima@europass.demo', full_name: 'Fatima Z.', role: 'student', course_id: germanCourse.id });
  await createDemoUser({ email: 'nadia@europass.demo', full_name: 'Nadia H.', role: 'student', course_id: frenchCourse.id });
  await createDemoUser({ email: 'omar.s@europass.demo', full_name: 'Omar S.', role: 'student', course_id: nursingCourse.id });

  console.log('--- Seeding starter homework ---');
  await sb.from('homework').insert({
    course_id: germanCourse.id, teacher_id: klausId,
    title: 'A1 Unit 2 — Introducing Yourself',
    instructions: 'Write 5 sentences introducing yourself in German: name, where you\u2019re from, your job/study, and one hobby.',
    due_date: '2026-08-10',
  });
  await sb.from('homework').insert({
    course_id: nursingCourse.id, teacher_id: aminaId,
    title: 'Healthcare Vocabulary — Unit 1',
    instructions: 'Match the 15 healthcare terms from class to their English translations, then write one example sentence for each.',
    due_date: '2026-08-12',
  });

  console.log('--- Seeding a welcome notification for the new courses ---');
  await sb.from('notifications').insert({
    from_id: klausId, audience_type: 'course', audience_id: germanCourse.id,
    title: 'Welcome to the German Program',
    body: 'Looking forward to our first session! Check your homework tab for your first assignment.',
  });

  console.log('\nDone. New demo accounts (password for all: ' + DEMO_PASSWORD + '):');
  console.log('Teachers: klaus@europass.demo (German), camille@europass.demo (French), amina.rachidi@europass.demo (Nursing & Ausbildung)');
  console.log('Students: fatima@europass.demo (German), nadia@europass.demo (French), omar.s@europass.demo (Nursing & Ausbildung)');
}

main().catch((err) => { console.error(err); process.exit(1); });
