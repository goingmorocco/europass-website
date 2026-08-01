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

  // Public self-signup — always creates a 'student' account (enforced by the
  // handle_new_user trigger server-side, not by anything in this file; see
  // supabase/migrations/002_functions_and_triggers.sql). courseId is optional —
  // NOTE: in a real paid product this should NOT grant immediate access to a
  // course's content; it should be confirmed by an admin (or a payment) before
  // course_id is set. This MVP sets it immediately for demo purposes since
  // payments aren't built yet — see supabase/README.md.
  async function signup({ email, password, fullName, courseId }) {
    const client = await db();
    // Resolve relative to wherever this page is actually hosted (GitHub Pages
    // subpath, custom domain, localhost while testing — whatever it is right
    // now) so the confirmation email doesn't send people to the Supabase
    // project's default Site URL (which defaults to localhost:3000 and is
    // easy to forget to change). This still requires the resulting URL to be
    // present in Dashboard → Authentication → URL Configuration → Redirect
    // URLs, or Supabase will reject it and fall back to the Site URL anyway.
    const emailRedirectTo = new URL('login.html', window.location.href).href;
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, course_id: courseId || null }, emailRedirectTo },
    });
    if (error) throw error;
    return { hasSession: !!data.session, user: data.user };
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
  async function addUser({ name, role, courseId }) {
    const client = await db();
    const email = name.toLowerCase().replace(/[^a-z]+/g, '.') + '@europass.demo';
    const { error } = await client.functions.invoke('admin-create-user', {
      body: { email, password: 'Welcome2026!', full_name: name, role, course_id: courseId },
    });
    if (error) throw error;
  }
  async function removeUser(id) {
    const client = await db();
    const { error } = await client.from('profiles').update({ is_active: false }).eq('id', id);
    if (error) throw error;
  }

  // ---- Blog posts ----
  async function posts({ publishedOnly = false } = {}) {
    const client = await db();
    let q = client.from('posts').select('*').order('created_at', { ascending: false });
    if (publishedOnly) q = q.eq('status', 'published');
    const { data, error } = await q;
    if (error) throw error;
    return data;
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
        title: post.title, category: post.category, excerpt: post.excerpt, body: post.body, status: post.status,
      }).eq('id', post.id);
      if (error) throw error;
    } else {
      const { data: { user } } = await client.auth.getUser();
      const { error } = await client.from('posts').insert({
        title: post.title, category: post.category, excerpt: post.excerpt, body: post.body, status: post.status, author_id: user.id,
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
    users, courses, addUser, removeUser, studentsOf, userById, updateProfile, updatePassword, resetPasswordForEmail, onAuthEvent,
    posts, postById, savePost, deletePost,
    homework, homeworkByCourse, addHomework, submissions, submissionFor, submitHomework, gradeSubmission,
    notificationsFor, sendNotification, markRead,
    messagesFor, sendMessage, onChange,
    myGroup, allGroups, groupPosts, createGroupPost, editGroupPost, deleteGroupPost, toggleLike, addComment, deleteComment,
    groupMessages, sendGroupMessage, reportPost, reportsForGroup, dismissReport,
  };
})();
