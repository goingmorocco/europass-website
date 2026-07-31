document.addEventListener('DOMContentLoaded', async () => {
  const user = await EP.requireRole('admin');
  if (!user) return;
  initPortalChrome(user);
  wireTabs('admin-shell', 'overview');

  async function renderKPIs() {
    const [allUsers, allPosts, allHomework, allNotifs] = await Promise.all([
      EP.users(), EP.posts(), EP.homework(), EP.notificationsFor(user),
    ]);
    const stats = [
      ['users', allUsers.length, 'Total Users', 'navy-700', 'users'],
      ['newspaper', allPosts.filter(p => p.status === 'published').length, 'Published Posts', 'red-600', 'blog'],
      ['clipboard-list', allHomework.length, 'Homework Assigned', 'navy-700', null],
      ['bell', allNotifs.length, 'Notifications Sent', 'amber-600', 'notifications'],
    ];
    document.getElementById('admin-kpis').innerHTML = stats.map(([icon, val, label, color, tab]) => {
      const tag = tab ? 'button' : 'div';
      const attrs = tab ? `onclick="switchTab('admin-shell','${tab}')"` : '';
      return `
      <${tag} ${attrs} class="card ${tab ? 'card-hover' : ''} p-5 text-left w-full">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style="background:var(--${color === 'navy-700' ? 'navy-50' : color === 'red-600' ? 'red-50' : 'amber-100'})">
          <i data-lucide="${icon}" class="w-4 h-4" style="color:var(--${color})"></i>
        </div>
        <p class="text-2xl font-serif font-bold" style="color:var(--navy-700)">${val}</p>
        <p class="text-xs mt-1" style="color:var(--text-secondary)">${label}</p>
      </${tag}>`;
    }).join('');
    return { allPosts, allNotifs };
  }

  async function renderActivity(allNotifs, allPosts) {
    const graded = (await EP.submissions()).filter(s => s.status === 'graded');
    const events = [
      ...allNotifs.map(n => ({ t: n.createdAt, text: `Notification sent: "${n.title}"` })),
      ...allPosts.map(p => ({ t: p.createdAt, text: `Blog post ${p.status === 'published' ? 'published' : 'drafted'}: "${p.title}"` })),
    ].sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 6);
    document.getElementById('admin-activity').innerHTML = events.map(e =>
      `<div class="flex items-start gap-2"><i data-lucide="dot" class="w-4 h-4 mt-0.5 shrink-0" style="color:var(--navy-300)"></i><div><p>${escapeHtml(e.text)}</p><p class="text-xs" style="color:var(--text-disabled)">${EP.timeAgo(e.t)}</p></div></div>`
    ).join('') || `<p style="color:var(--text-secondary)">No activity yet.</p>`;
  }

  function renderPosts(posts) {
    document.getElementById('admin-posts-list').innerHTML = posts.map(p => `
      <div class="card p-5 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge ${p.status === 'published' ? 'badge-success' : 'badge-warning'}">${p.status}</span>
            <span class="text-xs" style="color:var(--text-secondary)">${escapeHtml(p.category)}</span>
          </div>
          <p class="font-semibold truncate" style="color:var(--navy-700)">${escapeHtml(p.title)}</p>
          <p class="text-xs mt-1" style="color:var(--text-secondary)">${EP.timeAgo(p.createdAt)}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button onclick="editPost('${p.id}')" class="btn btn-secondary btn-sm">Edit</button>
          <button onclick="deletePostConfirm('${p.id}')" class="btn btn-secondary btn-sm" style="color:var(--danger-600); border-color:var(--danger-600)">Delete</button>
        </div>
      </div>`).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">No posts yet. Click "New Post" to publish your first article.</p></div>`;
  }

  function renderNotifHistory(notifs) {
    document.getElementById('admin-notif-list').innerHTML = notifs.map(n => `
      <div class="p-3 rounded-lg" style="background:var(--bg-subtle)">
        <div class="flex items-center gap-2 mb-1"><span class="badge badge-info">${n.audience === 'all' ? 'Everyone' : n.audience}</span><span class="text-xs" style="color:var(--text-disabled)">${EP.timeAgo(n.createdAt)}</span></div>
        <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(n.title)}</p>
        <p class="text-xs mt-1" style="color:var(--text-secondary)">${escapeHtml(n.body)}</p>
      </div>`).join('');
  }

  async function renderUsers() {
    const [rows, courseList] = await Promise.all([EP.users(), EP.courses()]);
    const teachersAndStudents = rows.filter(u => u.role !== 'admin');
    document.getElementById('admin-users-list').innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-left px-5 py-3 text-white font-semibold">Name</th><th class="text-left px-5 py-3 text-white font-semibold">Role</th><th class="text-left px-5 py-3 text-white font-semibold">Course</th><th class="px-5 py-3"></th></tr></thead><tbody>
      ${teachersAndStudents.map((u, i) => `<tr style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}">
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(u.name)}</td>
        <td class="px-5 py-3"><span class="badge ${u.role === 'teacher' ? 'badge-info' : 'badge-amber'}">${u.role}</span></td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(courseList.find(c => c.id === u.courseId)?.name || '\u2014')}</td>
        <td class="px-5 py-3 text-right"><button onclick="removeUserConfirm('${u.id}')" class="text-xs font-semibold" style="color:var(--danger-600)">Remove</button></td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  async function renderAll() {
    const { allPosts, allNotifs } = await renderKPIs();
    await renderActivity(allNotifs, allPosts);
    renderPosts(allPosts);
    renderNotifHistory(allNotifs);
    await renderUsers();
    lucide.createIcons();
  }
  await renderAll();
  EP.onChange([EP.KEYS.posts, EP.KEYS.notifications, EP.KEYS.profiles, EP.KEYS.submissions], renderAll);

  // ---- Post modal ----
  window.openPostForm = () => {
    document.getElementById('post-form').reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-modal').classList.remove('hidden');
  };
  window.editPost = async (id) => {
    const p = (await EP.posts()).find(x => x.id === id);
    if (!p) return;
    document.getElementById('post-id').value = p.id;
    document.getElementById('post-title').value = p.title;
    document.getElementById('post-category').value = p.category;
    document.getElementById('post-excerpt').value = p.excerpt;
    document.getElementById('post-body').value = p.body;
    document.getElementById('post-modal').classList.remove('hidden');
  };
  window.deletePostConfirm = async (id) => {
    if (!confirm('Delete this post?')) return;
    try { await EP.deletePost(id); await renderAll(); showToast('Post deleted', 'info'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  window.removeUserConfirm = async (id) => {
    if (!confirm('Remove this user? They will lose portal access.')) return;
    try { await EP.removeUser(id); await renderAll(); showToast('User removed', 'info'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

  document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = e.submitter.dataset.status;
    try {
      await EP.savePost({
        id: document.getElementById('post-id').value || null,
        title: document.getElementById('post-title').value,
        category: document.getElementById('post-category').value,
        excerpt: document.getElementById('post-excerpt').value,
        body: document.getElementById('post-body').value,
        status,
      });
      closeModal('post-modal');
      await renderAll();
      showToast(status === 'published' ? 'Post published — now live on the public blog!' : 'Draft saved');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  document.getElementById('notif-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.sendNotification({
        fromId: user.id,
        audience: document.getElementById('notif-audience').value,
        title: document.getElementById('notif-title').value,
        body: document.getElementById('notif-body').value,
      });
      e.target.reset();
      await renderAll();
      showToast('Notification sent');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- User modal ----
  window.openUserForm = async () => {
    const courseSel = document.getElementById('user-course');
    courseSel.innerHTML = (await EP.courses()).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    document.getElementById('user-form').reset();
    document.getElementById('user-modal').classList.remove('hidden');
  };
  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.addUser({
        name: document.getElementById('user-name').value,
        role: document.getElementById('user-role').value,
        courseId: document.getElementById('user-course').value,
      });
      closeModal('user-modal');
      await renderAll();
      showToast('User added — check the browser console/Edge Function logs for their login email.');
    } catch (err) { showToast(err.message, 'danger'); }
  });
});
