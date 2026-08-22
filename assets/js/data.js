/* ============================================================
   EuroPass — Supabase-backed data layer
   ------------------------------------------------------------
   Same EP.* interface the dashboards already use, now backed by a real
   Supabase project instead of localStorage. Every function is async now —
   callers must `await` them (see admin.js / teacher.js / student.js).

   SETUP: fill in your project URL + anon key below. The anon key is safe
   to expose in browser code by design — it grants nothing on its own;
   what a signed-in user can actually read/write is entirely controlled by
   the Row Level Security policies in supabase/migrations/003_rls_policies.sql.
   NEVER put the service_role key anywhere in this file or any browser code.
   ============================================================ */

const SUPABASE_URL = 'https://pqwjtgqkkpcgadlqroid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd2p0Z3Fra3BjZ2FkbHFyb2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNzQ5MDcsImV4cCI6MjEwMDg1MDkwN30.Xkqu820L1mlDY8tJsFBP-8OhyVMFiNPPoDmYrUCHh00';

const EP = (() => {
  let sb = null;
  const ready = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });
  async function db() { await ready; return sb; }

  const KEYS = {
    profiles: 'profiles', courses: 'courses', posts: 'posts',
    homework: 'homework', submissions: 'submissions',
    notifications: 'notifications', notification_reads: 'notification_reads', messages: 'messages',
    groups: 'groups', group_posts: 'group_posts', group_post_likes: 'group_post_likes',
    group_post_comments: 'group_post_comments', group_messages: 'group_messages', group_post_reports: 'group_post_reports',
    enrollments: 'enrollments', resources: 'resources',
  };

  function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  // ---- Session / auth ----
  async function getSession() {
    const client = await db();
    const { data: { session } } = await client.auth.getSession();
    if (!session) return null;
    const { data: profile, error } = await client.from('profiles').select('*').eq('id', session.user.id).single();
    if (error || !profile || !profile.is_active) return null;
    return { id: profile.id, name: profile.full_name, role: profile.role, courseId: profile.course_id, title: profile.title, email: session.user.email };
  }

  async function requireRole(role, redirectTo = 'login.html') {
    const user = await getSession();
    if (!user || user.role !== role) { window.location.href = redirectTo; return null; }
    return user;
  }

  async function login(email, password) {
    const client = await db();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return getSession();
  }

  // Public self-signup — always creates a 'student' account with NO course
  // access yet (enforced server-side by handle_new_user, which only ever
  // reads a 'course_id' metadata key — deliberately NOT the key used below).
  // The chosen course becomes a pending enrollment request instead; an
  // admin must review and activate it before it grants real access. See
  // supabase/migrations/008_enrollments.sql.
  async function signup({ email, password, fullName, courseId }) {
    const client = await db();
    const emailRedirectTo = new URL('login.html', window.location.href).href;
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, desired_course_id: courseId || null }, emailRedirectTo },
    });
    if (error) throw error;
    if (data.session && courseId) {
      await ensurePendingEnrollment().catch((e) => console.warn('Could not create enrollment request:', e));
    }
    return { hasSession: !!data.session, user: data.user };
  }

  // Called after any successful login/signup-with-immediate-session. Reads
  // the desired_course_id chosen at signup time (carried in the user's own
  // auth metadata, unaffected by email-confirmation timing) and creates the
  // pending enrollment on first opportunity, if one doesn't already exist.
  async function ensurePendingEnrollment() {
    const client = await db();
    const { data: { user: authUser } } = await client.auth.getUser();
    if (!authUser) return;
    const desiredCourseId = authUser.user_metadata?.desired_course_id;
    if (!desiredCourseId) return;
    const { data: existing } = await client.from('enrollments').select('id').eq('student_id', authUser.id).eq('course_id', desiredCourseId).limit(1);
    if (existing && existing.length) return;
    await requestEnrollment(desiredCourseId, authUser.id);
  }

  async function requestEnrollment(courseId, studentId) {
    const client = await db();
    const { error } = await client.from('enrollments').insert({ course_id: courseId, student_id: studentId, status: 'pending', payment_status: 'unpaid' });
    if (error && error.code !== '23505') throw error; // 23505 = already has a pending request for this course, fine
  }
  async function myEnrollments(studentId) {
    const client = await db();
    const { data, error } = await client.from('enrollments').select('*').eq('student_id', studentId).order('requested_at', { ascending: false });
    if (error) throw error;
    return data.map(mapEnrollment);
  }
  async function cancelEnrollment(id) {
    const client = await db();
    const { error } = await client.from('enrollments').update({ status: 'cancelled' }).eq('id', id);
    if (error) throw error;
  }
  async function allEnrollments() {
    const client = await db();
    const { data, error } = await client.from('enrollments').select('*').order('requested_at', { ascending: false });
    if (error) throw error;
    return data.map(mapEnrollment);
  }
  async function activateEnrollment(id, { priceMad, paymentStatus }) {
    const client = await db();
    const { error } = await client.from('enrollments').update({ status: 'active', price_mad: priceMad || null, payment_status: paymentStatus }).eq('id', id);
    if (error) throw error;
  }
  async function rejectEnrollment(id) {
    const client = await db();
    const { error } = await client.from('enrollments').update({ status: 'cancelled' }).eq('id', id);
    if (error) throw error;
  }
  function mapEnrollment(e) {
    return { id: e.id, studentId: e.student_id, courseId: e.course_id, status: e.status, paymentStatus: e.payment_status, priceMad: e.price_mad, requestedAt: e.requested_at, activatedAt: e.activated_at };
  }

  async function logout() {
    const client = await db();
    await client.auth.signOut();
  }

  // ---- Users / Courses ----
  async function users() {
    const client = await db();
    const { data, error } = await client.from('profiles').select('*').eq('is_active', true);
    if (error) throw error;
    return data.map(mapProfile);
  }
  function mapProfile(p) { return { id: p.id, name: p.full_name, role: p.role, courseId: p.course_id, title: p.title }; }

  async function courses() {
    const client = await db();
    const { data, error } = await client.from('courses').select('*');
    if (error) throw error;
    return data;
  }

  async function userById(id) { return (await users()).find(u => u.id === id); }
  async function studentsOf(courseId) { return (await users()).filter(u => u.role === 'student' && u.courseId === courseId); }

  // Self-service profile editing — any signed-in user can update their own name/password.
  async function updateProfile({ fullName }) {
    const client = await db();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await client.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    if (error) throw error;
  }
  async function updatePassword(newPassword) {
    const client = await db();
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  // Sends a password-reset email; the link in that email lands the user on
  // reset-password.html with a recovery session already active.
  async function resetPasswordForEmail(email) {
    const client = await db();
    const redirectTo = new URL('reset-password.html', window.location.href).href;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  // Thin wrapper so pages can react to auth events (specifically
  // PASSWORD_RECOVERY, used by reset-password.html) without needing direct
  // access to the private Supabase client instance.
  async function onAuthEvent(callback) {
    const client = await db();
    client.auth.onAuthStateChange((event, session) => callback(event, session));
  }

  // Creates a real login via the admin-create-user Edge Function (needs the
  // service role key server-side — see supabase/functions/admin-create-user).
  // Email is now supplied by the admin (visible, editable in the form)
  // instead of silently auto-generated — a removed user is deactivated, not
  // deleted (their homework/grades history stays intact), so their original
  // email stays permanently taken in Supabase Auth. Silent generation gave
  // the admin no way to see or work around that collision.
  async function addUser({ name, email, role, courseId }) {
    const client = await db();
    const { error } = await client.functions.invoke('admin-create-user', {
      body: { email, password: 'Welcome2026!', full_name: name, role, course_id: courseId },
    });
    if (error) throw await unwrapFunctionError(error);
  }
  function suggestEmail(name) {
    return name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@europass.demo';
  }

  // The Supabase client's default error for a failed Edge Function call is
  // just "Edge Function returned a non-2xx status code" — the actual reason
  // (missing env var, duplicate email, RLS rejection, etc.) is sitting in
  // the function's own response body and never gets read. This pulls it out
  // so errors are actually diagnosable instead of always showing the same
  // generic message regardless of what really went wrong.
  async function unwrapFunctionError(error) {
    try {
      if (error && error.context && typeof error.context.json === 'function') {
        const body = await error.context.clone().json();
        if (body && (body.error || body.message)) {
          return new Error(body.error || body.message);
        }
      }
    } catch (_) { /* body wasn't JSON or already consumed — fall through */ }
    return error;
  }
  async function removeUser(id) {
    const client = await db();
    const { error } = await client.from('profiles').update({ is_active: false }).eq('id', id);
    if (error) throw error;
  }

  // ---- Blog posts ----
  async function posts({ publishedOnly = false, language = null } = {}) {
    const client = await db();
    let q = client.from('posts').select('*').order('created_at', { ascending: false });
    if (publishedOnly) q = q.eq('status', 'published');
    if (language) q = q.eq('language', language);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }
  async function categories() {
    const client = await db();
    const { data, error } = await client.from('categories').select('*').order('name');
    if (error) throw error;
    return data;
  }
  async function addCategory(name) {
    const client = await db();
    const { error } = await client.from('categories').insert({ name: name.trim() });
    if (error) throw error;
  }
  async function deleteCategory(id) {
    const client = await db();
    const { error } = await client.from('categories').delete().eq('id', id);
    if (error) throw error;
  }
  const MAX_PDF_BYTES = 10485760; // 10MB, matches the storage bucket's own limit
  const MAX_COVER_BYTES = 5242880; // 5MB, matches the storage bucket's own limit
  async function uploadPostCover(file) {
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > MAX_COVER_BYTES) throw new Error('Image must be under 5MB.');
    const client = await db();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`.replace(/\s+/g, '_');
    const { error } = await client.storage.from('blog-covers').upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data } = client.storage.from('blog-covers').getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadResourcePdf(file) {
    if (file.type !== 'application/pdf') throw new Error('Only PDF files are allowed.');
    if (file.size > MAX_PDF_BYTES) throw new Error('PDF must be under 10MB.');
    const client = await db();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`.replace(/\s+/g, '_');
    const { error } = await client.storage.from('teacher-resources').upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data } = client.storage.from('teacher-resources').getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }

  async function resources() {
    const client = await db();
    const { data, error } = await client.from('resources').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(r => ({
      id: r.id, title: r.title, description: r.description, type: r.type, category: r.category,
      url: r.type === 'pdf' ? r.file_path : r.external_url, createdBy: r.created_by, createdAt: r.created_at,
      targetTeacherId: r.target_teacher_id,
    }));
  }

  async function addResource({ title, description, type, category, file, externalUrl, targetTeacherId }) {
    const client = await db();
    const { data: { user } } = await client.auth.getUser();
    let filePath = null;
    if (type === 'pdf') {
      if (!file) throw new Error('Choose a PDF file to upload.');
      const uploaded = await uploadResourcePdf(file);
      filePath = uploaded.publicUrl; // store the public URL directly — simplest to read back and render
    } else {
      if (!externalUrl || !externalUrl.trim()) throw new Error('Add a link for this resource.');
    }
    const { error } = await client.from('resources').insert({
      title, description: description || null, type, category: category || 'General',
      file_path: type === 'pdf' ? filePath : null,
      external_url: type !== 'pdf' ? externalUrl.trim() : null,
      target_teacher_id: targetTeacherId || null,
      created_by: user.id,
    });
    if (error) throw error;
  }

  async function deleteResource(id) {
    const client = await db();
    const { error } = await client.from('resources').delete().eq('id', id);
    if (error) throw error;
  }

  async function postById(id) {
    const client = await db();
    const { data, error } = await client.from('posts').select('*').eq('id', id).eq('status', 'published').single();
    if (error) return null;
    return data;
  }
  async function savePost(post) {
    const client = await db();
    if (post.id) {
      const { error } = await client.from('posts').update({
        title: post.title, category: post.category, language: post.language || 'en', excerpt: post.excerpt, body: post.body, status: post.status, cover_image_url: post.coverImageUrl || null,
      }).eq('id', post.id);
      if (error) throw error;
    } else {
      const { data: { user } } = await client.auth.getUser();
      const { error } = await client.from('posts').insert({
        title: post.title, category: post.category, language: post.language || 'en', excerpt: post.excerpt, body: post.body, status: post.status, author_id: user.id, cover_image_url: post.coverImageUrl || null,
      });
      if (error) throw error;
    }
  }
  async function deletePost(id) {
    const client = await db();
    const { error } = await client.from('posts').delete().eq('id', id);
    if (error) throw error;
  }

  // ---- Homework / Submissions ----
  async function homework() {
    const client = await db();
    const { data, error } = await client.from('homework').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapHomework);
  }
  function mapHomework(h) { return { id: h.id, courseId: h.course_id, teacherId: h.teacher_id, title: h.title, instructions: h.instructions, dueDate: h.due_date, createdAt: h.created_at }; }
  async function homeworkByCourse(courseId) { return (await homework()).filter(h => h.courseId === courseId); }

  async function addHomework({ courseId, teacherId, title, instructions, dueDate }) {
    const client = await db();
    const { error } = await client.from('homework').insert({ course_id: courseId, teacher_id: teacherId, title, instructions, due_date: dueDate });
    if (error) throw error;
  }

  async function submissions() {
    const client = await db();
    const { data, error } = await client.from('submissions').select('*');
    if (error) throw error;
    return data.map(mapSubmission);
  }
  function mapSubmission(s) { return { id: s.id, homeworkId: s.homework_id, studentId: s.student_id, content: s.content, status: s.status, grade: s.grade, feedback: s.feedback, submittedAt: s.submitted_at, gradedAt: s.graded_at }; }
  async function submissionFor(homeworkId, studentId) { return (await submissions()).find(s => s.homeworkId === homeworkId && s.studentId === studentId); }

  async function submitHomework(homeworkId, studentId, content) {
    const client = await db();
    const { error } = await client.from('submissions').upsert(
      { homework_id: homeworkId, student_id: studentId, content, status: 'submitted', submitted_at: new Date().toISOString() },
      { onConflict: 'homework_id,student_id' }
    );
    if (error) throw error;
  }
  async function gradeSubmission(subId, grade, feedback) {
    const client = await db();
    const { error } = await client.from('submissions').update({ status: 'graded', grade, feedback, graded_at: new Date().toISOString() }).eq('id', subId);
    if (error) throw error;
  }

  // ---- Notifications ----
  async function notificationsFor(user) {
    const client = await db();
    const { data, error } = await client.from('notifications').select('*, notification_reads(user_id)').order('created_at', { ascending: false });
    if (error) throw error;
    return data
      .filter(n =>
        n.audience_type === 'all' ||
        (n.audience_type === 'teachers' && user.role === 'teacher') ||
        (n.audience_type === 'students' && user.role === 'student') ||
        (n.audience_type === 'course' && n.audience_id === user.courseId) ||
        (n.audience_type === 'user' && n.audience_id === user.id) ||
        n.from_id === user.id
      )
      .map(n => ({ id: n.id, fromId: n.from_id, audience: n.audience_type, title: n.title, body: n.body, createdAt: n.created_at, readBy: (n.notification_reads || []).map(r => r.user_id), relatedPostId: n.related_post_id }));
  }
  async function sendNotification({ fromId, audience, audienceId, title, body }) {
    const client = await db();
    const { error } = await client.from('notifications').insert({ from_id: fromId, audience_type: audience, audience_id: audienceId || null, title, body });
    if (error) throw error;
  }
  async function markRead(notificationId, userId) {
    const client = await db();
    await client.from('notification_reads').upsert({ notification_id: notificationId, user_id: userId }, { onConflict: 'notification_id,user_id' });
  }

  // ---- Messages ----
  async function messagesFor(userA, userB) {
    const client = await db();
    const { data, error } = await client.from('messages').select('*')
      .or(`and(from_id.eq.${userA},to_id.eq.${userB}),and(from_id.eq.${userB},to_id.eq.${userA})`)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(m => ({ id: m.id, fromId: m.from_id, toId: m.to_id, body: m.body, createdAt: m.created_at }));
  }
  async function sendMessage(fromId, toId, body) {
    const client = await db();
    const { error } = await client.from('messages').insert({ from_id: fromId, to_id: toId, body });
    if (error) throw error;
  }

  // ---- Community Groups (feed + chat, one group per program) ----
  async function myGroup() {
    const client = await db();
    const { data, error } = await client.from('groups').select('*').limit(1).single();
    if (error) return null; // no group visible (e.g. user has no course yet)
    return data;
  }
  async function allGroups() {
    const client = await db();
    const { data, error } = await client.from('groups').select('*').order('program');
    if (error) throw error;
    return data;
  }

  async function groupPosts(groupId) {
    const client = await db();
    const [{ data: posts, error: e1 }, { data: likes, error: e2 }, { data: comments, error: e3 }] = await Promise.all([
      client.from('group_posts').select('*').eq('group_id', groupId).order('created_at', { ascending: false }),
      client.from('group_post_likes').select('*'),
      client.from('group_post_comments').select('*').order('created_at', { ascending: true }),
    ]);
    if (e1) throw e1; if (e2) throw e2; if (e3) throw e3;
    return posts.map(p => ({
      id: p.id, groupId: p.group_id, authorId: p.author_id, body: p.body, imageUrl: p.image_url, createdAt: p.created_at, editedAt: p.edited_at,
      likes: likes.filter(l => l.post_id === p.id).map(l => l.user_id),
      comments: comments.filter(c => c.post_id === p.id).map(c => ({ id: c.id, authorId: c.author_id, body: c.body, createdAt: c.created_at })),
    }));
  }

  const MAX_IMAGE_BYTES = 1048576; // 1MB, matches the storage bucket's own limit
  async function uploadGroupImage(groupId, file) {
    if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be under 1MB.');
    const client = await db();
    const path = `${groupId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`.replace(/\s+/g, '_');
    const { error } = await client.storage.from('group-images').upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data } = client.storage.from('group-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function createGroupPost({ groupId, authorId, body, imageFile }) {
    const client = await db();
    let imageUrl = null;
    if (imageFile) imageUrl = await uploadGroupImage(groupId, imageFile);
    const { error } = await client.from('group_posts').insert({ group_id: groupId, author_id: authorId, body: body || null, image_url: imageUrl });
    if (error) throw error;
  }
  async function deleteGroupPost(postId) {
    const client = await db();
    const { error } = await client.from('group_posts').delete().eq('id', postId);
    if (error) throw error;
  }
  async function editGroupPost(postId, newBody) {
    const client = await db();
    const { error } = await client.from('group_posts').update({ body: newBody, edited_at: new Date().toISOString() }).eq('id', postId);
    if (error) throw error;
  }
  async function toggleLike(postId, userId, currentlyLiked) {
    const client = await db();
    if (currentlyLiked) {
      const { error } = await client.from('group_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await client.from('group_post_likes').insert({ post_id: postId, user_id: userId });
      if (error) throw error;
    }
  }
  async function addComment(postId, authorId, body) {
    const client = await db();
    const { error } = await client.from('group_post_comments').insert({ post_id: postId, author_id: authorId, body });
    if (error) throw error;
  }

  async function groupMessages(groupId) {
    const client = await db();
    const { data, error } = await client.from('group_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(m => ({ id: m.id, fromId: m.from_id, body: m.body, createdAt: m.created_at }));
  }
  async function sendGroupMessage(groupId, fromId, body) {
    const client = await db();
    const { error } = await client.from('group_messages').insert({ group_id: groupId, from_id: fromId, body });
    if (error) throw error;
  }

  async function deleteComment(commentId) {
    const client = await db();
    const { error } = await client.from('group_post_comments').delete().eq('id', commentId);
    if (error) throw error;
  }

  async function reportPost(postId, reporterId, reason) {
    const client = await db();
    const { error } = await client.from('group_post_reports').upsert(
      { post_id: postId, reporter_id: reporterId, reason: reason || null },
      { onConflict: 'post_id,reporter_id' }
    );
    if (error) throw error;
  }
  // Admin-only: all reports for posts in a given group, grouped by post id.
  async function reportsForGroup(groupId) {
    const client = await db();
    const { data: posts, error: e1 } = await client.from('group_posts').select('id').eq('group_id', groupId);
    if (e1) throw e1;
    const postIds = posts.map(p => p.id);
    if (!postIds.length) return {};
    const { data: reports, error: e2 } = await client.from('group_post_reports').select('*').in('post_id', postIds);
    if (e2) throw e2;
    const byPost = {};
    reports.forEach(r => { (byPost[r.post_id] ||= []).push({ id: r.id, reporterId: r.reporter_id, reason: r.reason, createdAt: r.created_at }); });
    return byPost;
  }
  async function dismissReport(reportId) {
    const client = await db();
    const { error } = await client.from('group_post_reports').delete().eq('id', reportId);
    if (error) throw error;
  }

  // ---- Realtime (replaces the old cross-tab localStorage 'storage' event) ----
  const channels = [];
  async function onChange(tableNames, callback) {
    const client = await db();
    const channel = client.channel('ep-changes-' + Math.random().toString(36).slice(2));
    tableNames.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => callback());
    });
    channel.subscribe();
    channels.push(channel);
  }

  return {
    KEYS, timeAgo,
    getSession, requireRole, login, signup, logout,
    users, courses, addUser, removeUser, suggestEmail, studentsOf, userById, updateProfile, updatePassword, resetPasswordForEmail, onAuthEvent,
    posts, postById, savePost, deletePost,
    categories, addCategory, deleteCategory,
    resources, addResource, deleteResource, uploadPostCover,
    homework, homeworkByCourse, addHomework, submissions, submissionFor, submitHomework, gradeSubmission,
    notificationsFor, sendNotification, markRead,
    messagesFor, sendMessage, onChange,
    myGroup, allGroups, groupPosts, createGroupPost, editGroupPost, deleteGroupPost, toggleLike, addComment, deleteComment,
    groupMessages, sendGroupMessage, reportPost, reportsForGroup, dismissReport,
    ensurePendingEnrollment, requestEnrollment, myEnrollments, cancelEnrollment, allEnrollments, activateEnrollment, rejectEnrollment,
  };
})();
