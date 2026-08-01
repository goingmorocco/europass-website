/**
 * EuroPass — separate Nursing from Ausbildung Training & Placement
 * --------------------------------------------------------------------
 * Renames the existing "Nursing & Ausbildung Placement" course to
 * "Ausbildung Training & Placement" (same course, same teacher — just a
 * rename to match the reframed positioning), and adds a brand new,
 * standalone "Nursing Program" course with its own teacher and demo
 * student. Safe to run once, any time after seed-new-programs.js.
 *
 * Run:
 *   cd supabase/seed
 *   SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node seed-separate-nursing.js
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
  if (role !== 'student') {
    const { error: promoteErr } = await sb.from('profiles').update({ role, course_id, title }).eq('id', data.user.id);
    if (promoteErr) throw promoteErr;
  }
  console.log(`Created ${role}: ${full_name} <${email}>`);
  return data.user.id;
}

async function main() {
  console.log('--- Renaming the existing course ---');
  const { data: renamed, error: renameErr } = await sb
    .from('courses')
    .update({ name: 'Ausbildung Training & Placement' })
    .eq('name', 'Nursing & Ausbildung Placement')
    .select();
  if (renameErr) throw renameErr;
  if (!renamed.length) {
    console.warn('No course named "Nursing & Ausbildung Placement" found — it may already be renamed, or seed-new-programs.js hasn\u2019t been run yet.');
  } else {
    console.log('Renamed to: Ausbildung Training & Placement');
  }

  console.log('--- Adding the new standalone Nursing course ---');
  const { data: nursingCourse, error: courseErr } = await sb
    .from('courses')
    .insert({ name: 'Nursing Program', program: 'nursing' })
    .select()
    .single();
  if (courseErr) throw courseErr;

  console.log('--- Creating the Nursing instructor ---');
  const nadiaId = await createDemoUser({
    email: 'nadia.fassi@europass.demo', full_name: 'Nadia Fassi', role: 'teacher',
    course_id: nursingCourse.id, title: 'Registered Nurse Educator',
  });
  await sb.from('courses').update({ teacher_id: nadiaId }).eq('id', nursingCourse.id);

  console.log('--- Creating a demo Nursing student ---');
  await createDemoUser({ email: 'hind@europass.demo', full_name: 'Hind K.', role: 'student', course_id: nursingCourse.id });

  console.log('\nDone. New accounts (password: ' + DEMO_PASSWORD + '):');
  console.log('Teacher: nadia.fassi@europass.demo (Nursing Program)');
  console.log('Student: hind@europass.demo (Nursing Program)');
  console.log('\nNote: existing accounts on the old "Nursing & Ausbildung Placement" course');
  console.log('(amina.rachidi@europass.demo, omar.s@europass.demo) now belong to the renamed');
  console.log('"Ausbildung Training & Placement" course — same course row, no action needed.');
}

main().catch((err) => { console.error(err); process.exit(1); });
