/**
 * EuroPass — Kids English, Communication English, and the 3 Online programs
 * ---------------------------------------------------------------------------
 * Additive seed: adds 5 more real, enrollable courses (each with a teacher
 * and a demo student), on top of whatever seed.js and seed-new-programs.js
 * already created. Safe to run once, any time after those two.
 *
 * Run:
 *   cd supabase/seed
 *   SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node seed-more-programs.js
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
  // handle_new_user() always inserts new profiles as role='student' — promote
  // here instead, same pattern as the other seed scripts and the Edge Function.
  if (role !== 'student') {
    const { error: promoteErr } = await sb.from('profiles').update({ role, course_id, title }).eq('id', data.user.id);
    if (promoteErr) throw promoteErr;
  }
  console.log(`Created ${role}: ${full_name} <${email}>`);
  return data.user.id;
}

async function addCourse(name, program) {
  const { data, error } = await sb.from('courses').insert({ name, program }).select().single();
  if (error) throw error;
  return data;
}

async function main() {
  console.log('--- Adding courses ---');
  const kids = await addCourse('Kids English', 'english');
  const comm = await addCourse('Communication English', 'english');
  const engOnline = await addCourse('English Online', 'english');
  const deOnline = await addCourse('German Online', 'german');
  const frOnline = await addCourse('French Online', 'french');

  console.log('--- Creating teachers ---');
  const laylaId = await createDemoUser({ email: 'layla@europass.demo', full_name: 'Layla Idrissi', role: 'teacher', course_id: kids.id, title: 'Child Education Specialist' });
  const omarId = await createDemoUser({ email: 'omar.z@europass.demo', full_name: 'Omar Ziani', role: 'teacher', course_id: comm.id, title: 'Conversation Coach' });
  const noraId = await createDemoUser({ email: 'nora@europass.demo', full_name: 'Nora Benali', role: 'teacher', course_id: engOnline.id, title: 'Online English Coach' });
  const annaId = await createDemoUser({ email: 'anna@europass.demo', full_name: 'Anna Hoffmann', role: 'teacher', course_id: deOnline.id, title: 'Online German Coach' });
  const lucasId = await createDemoUser({ email: 'lucas@europass.demo', full_name: 'Lucas Moreau', role: 'teacher', course_id: frOnline.id, title: 'Online French Coach' });

  console.log('--- Linking teachers to their courses ---');
  await sb.from('courses').update({ teacher_id: laylaId }).eq('id', kids.id);
  await sb.from('courses').update({ teacher_id: omarId }).eq('id', comm.id);
  await sb.from('courses').update({ teacher_id: noraId }).eq('id', engOnline.id);
  await sb.from('courses').update({ teacher_id: annaId }).eq('id', deOnline.id);
  await sb.from('courses').update({ teacher_id: lucasId }).eq('id', frOnline.id);

  console.log('--- Creating demo students ---');
  await createDemoUser({ email: 'youssef@europass.demo', full_name: 'Youssef K.', role: 'student', course_id: kids.id });
  await createDemoUser({ email: 'salma@europass.demo', full_name: 'Salma R.', role: 'student', course_id: comm.id });
  await createDemoUser({ email: 'mehdi@europass.demo', full_name: 'Mehdi T.', role: 'student', course_id: engOnline.id });
  await createDemoUser({ email: 'imane@europass.demo', full_name: 'Imane B.', role: 'student', course_id: deOnline.id });
  await createDemoUser({ email: 'rachid@europass.demo', full_name: 'Rachid A.', role: 'student', course_id: frOnline.id });

  console.log('\nDone. Password for all new accounts: ' + DEMO_PASSWORD);
  console.log('Teachers: layla@europass.demo (Kids English), omar.z@europass.demo (Communication English),');
  console.log('          nora@europass.demo (English Online), anna@europass.demo (German Online), lucas@europass.demo (French Online)');
  console.log('Students: youssef@europass.demo, salma@europass.demo, mehdi@europass.demo, imane@europass.demo, rachid@europass.demo');
}

main().catch((err) => { console.error(err); process.exit(1); });
