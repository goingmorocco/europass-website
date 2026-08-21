document.addEventListener('DOMContentLoaded', async () => {
  const user = await EP.requireRole('admin');
  if (!user) return;
  initPortalChrome(user, 'admin-shell');
  wireTabs('admin-shell', 'overview');

  // ---- Rich text editor (Quill) for blog posts ----
  // Initialized lazily (on first modal open, not on page load) because the
  // editor container starts hidden inside #post-modal — some browsers throw
  // when Quill measures a display:none element, and an uncaught error here
  // would previously stop this entire script, silently breaking every
  // button defined below it (including "Add Post"). Wrapped in try/catch
  // as a second safety net regardless of cause.
  let quill = null;
  function ensureQuill() {
    if (quill || !window.Quill || !document.getElementById('post-body-editor')) return quill;
    try {
      const Parchment = Quill.import('parchment');
      const LineHeightStyle = new Parchment.StyleAttributor('lineheight', 'line-height', {
        scope: Parchment.Scope.BLOCK,
        whitelist: ['1', '1.5', '2', '2.5'],
      });
      Quill.register(LineHeightStyle, true);

      quill = new Quill('#post-body-editor', {
        theme: 'snow',
        placeholder: 'Write your post...',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ lineheight: ['1', '1.5', '2', '2.5'] }],
            [{ align: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'link', 'image', 'video'],
            ['clean'],
          ],
        },
      });
      document.querySelectorAll('.ql-lineheight .ql-picker-item').forEach((item) => {
        const v = item.dataset.value;
        item.textContent = v === '1' ? 'Single' : v === '1.5' ? '1.5×' : v === '2' ? 'Double' : '2.5×';
      });
      const lhLabel = document.querySelector('.ql-lineheight .ql-picker-label');
      if (lhLabel) lhLabel.setAttribute('aria-label', 'Line spacing');
      document.getElementById('post-body').classList.add('hidden');
      document.getElementById('post-body').removeAttribute('required');
    } catch (err) {
      console.error('Quill failed to initialize — falling back to plain text body:', err);
      if (typeof showToast === 'function') showToast('Rich text editor unavailable — using plain text for now', 'info');
      quill = null;
    }
    return quill;
  }

  async function renderKPIs() {
    const [allUsers, allPosts, allHomework, allNotifs, allEnrollments] = await Promise.all([
      EP.users(), EP.posts(), EP.homework(), EP.notificationsFor(user), EP.allEnrollments(),
    ]);
    const stats = [
      ['clipboard-check', allEnrollments.filter(e => e.status === 'pending').length, 'Pending Enrollments', 'red-600', 'enrollments'],
      ['users', allUsers.length, 'Total Users', 'navy-700', 'users'],
      ['newspaper', allPosts.filter(p => p.status === 'published').length, 'Published Posts', 'red-600', 'blog'],
      ['clipboard-list', allHomework.length, 'Homework Assigned', 'navy-700', 'homework'],
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

  // ---- Homework & Grades (admin view-only — grading itself stays with the
  // owning teacher; RLS only grants admins read access here, by design,
  // so students always know exactly who graded their work) ----
  let hwCache = { homework: [], submissions: [], courses: [], users: [] };
  function hwCourseName(courseId) { return hwCache.courses.find(c => c.id === courseId)?.name || '\u2014'; }
  function hwUserName(userId) { return hwCache.users.find(u => u.id === userId)?.name || 'Unknown'; }

  async function renderHomework() {
    const [hw, subs, courseList, userList] = await Promise.all([EP.homework(), EP.submissions(), EP.courses(), EP.users()]);
    hwCache = { homework: hw, submissions: subs, courses: courseList, users: userList };

    const courseFilter = document.getElementById('hw-course-filter');
    const teacherFilter = document.getElementById('hw-teacher-filter');
    if (!courseFilter.dataset.populated) {
      courseFilter.innerHTML = '<option value="">All Courses</option>' + courseList.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      const teachers = userList.filter(u => u.role === 'teacher');
      teacherFilter.innerHTML = '<option value="">All Teachers</option>' + teachers.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
      courseFilter.dataset.populated = '1';
      courseFilter.addEventListener('change', renderHomeworkList);
      teacherFilter.addEventListener('change', renderHomeworkList);
    }
    renderHomeworkList();
  }

  function renderHomeworkList() {
    const courseId = document.getElementById('hw-course-filter').value;
    const teacherId = document.getElementById('hw-teacher-filter').value;
    let list = hwCache.homework;
    if (courseId) list = list.filter(h => h.courseId === courseId);
    if (teacherId) list = list.filter(h => h.teacherId === teacherId);

    document.getElementById('admin-homework-list').innerHTML = list.map(h => {
      const hwSubs = hwCache.submissions.filter(s => s.homeworkId === h.id);
      const graded = hwSubs.filter(s => s.status === 'graded').length;
      return `
      <button onclick="openHomeworkDetail('${h.id}')" class="card card-hover p-5 flex items-center justify-between gap-4 w-full text-left">
        <div class="min-w-0">
          <p class="font-semibold truncate" style="color:var(--navy-700)">${escapeHtml(h.title)}</p>
          <p class="text-xs mt-1" style="color:var(--text-secondary)">${escapeHtml(hwCourseName(h.courseId))} \u00b7 ${escapeHtml(hwUserName(h.teacherId))} \u00b7 Due ${h.dueDate ? new Date(h.dueDate).toLocaleDateString() : '\u2014'}</p>
        </div>
        <div class="shrink-0 text-right">
          <span class="badge ${graded === hwSubs.length && hwSubs.length ? 'badge-success' : 'badge-warning'}">${graded}/${hwSubs.length} graded</span>
          <p class="text-xs mt-1" style="color:var(--text-secondary)">${hwSubs.length} submission${hwSubs.length === 1 ? '' : 's'}</p>
        </div>
      </button>`;
    }).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">No homework matches this filter.</p></div>`;
    lucide.createIcons();
  }

  window.openHomeworkDetail = (id) => {
    const h = hwCache.homework.find(x => x.id === id);
    if (!h) return;
    document.getElementById('hw-detail-title').textContent = h.title;
    document.getElementById('hw-detail-meta').textContent = `${hwCourseName(h.courseId)} \u00b7 Assigned by ${hwUserName(h.teacherId)} \u00b7 Due ${h.dueDate ? new Date(h.dueDate).toLocaleDateString() : 'no due date'}`;
    const subs = hwCache.submissions.filter(s => s.homeworkId === id);
    document.getElementById('hw-detail-submissions').innerHTML = subs.map(s => `
      <div class="p-4 rounded-lg" style="background:var(--bg-subtle)">
        <div class="flex items-center justify-between mb-1">
          <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(hwUserName(s.studentId))}</p>
          <span class="badge ${s.status === 'graded' ? 'badge-success' : 'badge-warning'}">${s.status}</span>
        </div>
        ${s.grade != null ? `<p class="text-sm font-semibold mt-1" style="color:var(--navy-700)">Grade: ${escapeHtml(String(s.grade))}</p>` : ''}
        ${s.feedback ? `<p class="text-xs mt-1" style="color:var(--text-secondary)">Feedback: ${escapeHtml(s.feedback)}</p>` : ''}
        <p class="text-xs mt-2" style="color:var(--text-disabled)">${s.submittedAt ? 'Submitted ' + EP.timeAgo(s.submittedAt) : 'Not yet submitted'}</p>
      </div>`).join('') || `<p class="text-sm text-center py-6" style="color:var(--text-secondary)">No students have submitted this yet.</p>`;
    document.getElementById('homework-detail-modal').classList.remove('hidden');
    lucide.createIcons();
  };

  // ---- Resources (admin sends PDFs / video links / other links to teachers) ----
  let resourcesCache = [];
  let teachersCache = [];
  const RES_TYPE_ICON = { pdf: 'file-text', video: 'youtube', link: 'link' };
  const RES_TYPE_LABEL = { pdf: 'PDF', video: 'Video', link: 'Link' };

  window.openResourceForm = async () => {
    document.getElementById('resource-form').reset();
    document.getElementById('res-pdf-field').classList.remove('hidden');
    document.getElementById('res-url-field').classList.add('hidden');
    const teacherSelect = document.getElementById('res-target-teacher');
    if (!teachersCache.length) {
      teachersCache = (await EP.users()).filter(u => u.role === 'teacher');
    }
    // Always rebuild the dropdown's options here, even when teachersCache
    // was already populated by something else (renderResources() fills it
    // on every dashboard load) — the fetch is what's worth caching, not
    // this cheap, idempotent HTML population. Skipping it when the cache
    // was already warm was the actual bug: the select silently kept only
    // its static default option and never showed any teacher names.
    teacherSelect.innerHTML = '<option value="">All Teachers</option>' + teachersCache.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    teacherSelect.value = '';
    document.getElementById('res-submit-btn').textContent = 'Send to All Teachers';
    document.getElementById('resource-modal').classList.remove('hidden');
  };
  document.getElementById('res-target-teacher').addEventListener('change', (e) => {
    const teacher = teachersCache.find(t => t.id === e.target.value);
    document.getElementById('res-submit-btn').textContent = teacher ? `Send to ${teacher.name}` : 'Send to All Teachers';
  });
  document.getElementById('res-type').addEventListener('change', (e) => {
    const isPdf = e.target.value === 'pdf';
    document.getElementById('res-pdf-field').classList.toggle('hidden', !isPdf);
    document.getElementById('res-url-field').classList.toggle('hidden', isPdf);
    document.getElementById('res-url-hint').textContent = e.target.value === 'video'
      ? 'Paste a YouTube (or other video) URL.' : 'Paste any link \u2014 a Google Drive folder, an article, anything useful.';
  });

  async function renderResources() {
    try {
      resourcesCache = await EP.resources();
      if (!teachersCache.length) teachersCache = (await EP.users()).filter(u => u.role === 'teacher');
    } catch (err) {
      console.error('Could not load resources (has migration 012_teacher_resources.sql and 013_resource_teacher_targeting.sql been run?):', err);
      document.getElementById('admin-resources-list').innerHTML = `<p class="text-sm col-span-full" style="color:var(--danger-600)">Could not load resources. Have the resources migrations been run yet?</p>`;
      return;
    }
    const catFilter = document.getElementById('res-category-filter');
    if (!catFilter.dataset.populated) {
      catFilter.addEventListener('change', renderResourcesList);
    }
    const cats = [...new Set(resourcesCache.map(r => r.category))].sort();
    catFilter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    catFilter.dataset.populated = '1';
    const suggestions = document.getElementById('res-category-suggestions');
    if (suggestions) suggestions.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
    renderResourcesList();
  }

  function resourceRecipientLabel(r) {
    if (!r.targetTeacherId) return 'All Teachers';
    const t = teachersCache.find(x => x.id === r.targetTeacherId);
    return t ? t.name : 'A teacher (removed)';
  }

  function renderResourcesList() {
    const filter = document.getElementById('res-category-filter').value;
    const list = filter ? resourcesCache.filter(r => r.category === filter) : resourcesCache;
    document.getElementById('admin-resources-list').innerHTML = list.map(r => `
      <div class="card p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <i data-lucide="${RES_TYPE_ICON[r.type]}" class="w-4 h-4 shrink-0" style="color:var(--red-600)"></i>
            <p class="font-semibold text-sm truncate" style="color:var(--navy-700)">${escapeHtml(r.title)}</p>
          </div>
          <button onclick="deleteResourceConfirm('${r.id}','${escapeHtml(r.title).replace(/'/g, "\\'")}')" class="shrink-0" aria-label="Delete"><i data-lucide="trash-2" class="w-4 h-4" style="color:var(--danger-600)"></i></button>
        </div>
        ${r.description ? `<p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtml(r.description)}</p>` : ''}
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <span class="badge badge-info">${escapeHtml(r.category)}</span>
          <span class="text-xs" style="color:var(--text-disabled)">${RES_TYPE_LABEL[r.type]}</span>
        </div>
        <div class="flex items-center gap-1.5 mt-2"><i data-lucide="${r.targetTeacherId ? 'user' : 'users'}" class="w-3.5 h-3.5" style="color:var(--text-secondary)"></i><span class="text-xs" style="color:var(--text-secondary)">${escapeHtml(resourceRecipientLabel(r))}</span></div>
        <a href="${r.url}" target="_blank" rel="noopener" class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--red-600)">Open <i data-lucide="arrow-up-right" class="w-3 h-3"></i></a>
      </div>`).join('') || `<p class="text-sm col-span-full text-center py-10" style="color:var(--text-secondary)">No resources in this category yet.</p>`;
    lucide.createIcons();
  }

  window.deleteResourceConfirm = async (id, title) => {
    if (!confirm(`Delete "${title}"? Teachers will no longer see it.`)) return;
    try {
      await EP.deleteResource(id);
      await renderResources();
      showToast('Resource deleted');
    } catch (err) { showToast(err.message, 'danger'); }
  };

  document.getElementById('resource-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('res-submit-btn');
    const type = document.getElementById('res-type').value;
    const targetTeacherId = document.getElementById('res-target-teacher').value;
    const targetTeacher = teachersCache.find(t => t.id === targetTeacherId);
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = type === 'pdf' ? 'Uploading...' : 'Sending...';
    try {
      await EP.addResource({
        title: document.getElementById('res-title').value,
        description: document.getElementById('res-description').value,
        type,
        category: document.getElementById('res-category').value,
        file: type === 'pdf' ? document.getElementById('res-file').files[0] : null,
        externalUrl: type !== 'pdf' ? document.getElementById('res-url').value : null,
        targetTeacherId: targetTeacherId || null,
      });
      closeModal('resource-modal');
      await renderResources();
      showToast(targetTeacher ? `Resource sent to ${targetTeacher.name}` : 'Resource sent to all teachers');
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  async function renderAll() {
    const { allPosts, allNotifs } = await renderKPIs();
    await renderActivity(allNotifs, allPosts);
    renderPosts(allPosts);
    renderNotifHistory(allNotifs);
    await renderUsers();
    await renderHomework();
    await renderResources();
    lucide.createIcons();
  }
  await renderAll();
  EP.onChange([EP.KEYS.posts, EP.KEYS.notifications, EP.KEYS.profiles, EP.KEYS.homework, EP.KEYS.submissions, EP.KEYS.enrollments, EP.KEYS.resources], renderAll);

  // ---- Fullscreen editor toggle ----
  window.toggleFullscreenEditor = () => {
    const card = document.getElementById('post-modal-card');
    const isFull = card.classList.toggle('is-fullscreen');
    document.getElementById('fullscreen-label').textContent = isFull ? 'Collapse' : 'Expand';
  };

  // ---- Category dropdown (populated from the categories table, with a
  // hardcoded fallback so the form still works if migration 010 hasn't
  // been run yet — an empty dropdown was a real way "Publish" could look
  // broken even though the actual submit code was fine) ----
  const FALLBACK_CATEGORIES = ['Career', 'Parenting', 'IELTS', 'Vie Locale', 'Entertainment'];
  async function populateCategoryOptions(selected) {
    const select = document.getElementById('post-category');
    let names = FALLBACK_CATEGORIES;
    try {
      const cats = await EP.categories();
      if (cats && cats.length) names = cats.map(c => c.name);
    } catch (err) {
      console.error('Could not load categories table (has migration 010_categories.sql been run?), using defaults:', err);
    }
    select.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('');
    if (selected) select.value = selected;
  }

  // ---- Manage categories modal ----
  window.loadCategoryManager = async () => {
    const list = document.getElementById('category-list');
    list.innerHTML = `<p class="text-xs" style="color:var(--text-secondary)">Loading...</p>`;
    try {
      const cats = await EP.categories();
      list.innerHTML = cats.map(c => `
        <div class="flex items-center justify-between px-3 py-2 rounded-md" style="background:var(--bg-subtle)">
          <span class="text-sm">${c.name}</span>
          <button type="button" onclick="deleteCategoryConfirm('${c.id}','${c.name.replace(/'/g, "\\'")}')" class="text-xs font-semibold" style="color:var(--danger-600)">Delete</button>
        </div>`).join('') || `<p class="text-xs" style="color:var(--text-secondary)">No categories yet.</p>`;
    } catch (err) {
      list.innerHTML = `<p class="text-xs" style="color:var(--danger-600)">${err.message}</p>`;
    }
  };
  window.deleteCategoryConfirm = async (id, name) => {
    if (!confirm(`Delete the "${name}" category? Existing posts already using it keep it — this only removes it as a future option.`)) return;
    try {
      await EP.deleteCategory(id);
      await loadCategoryManager();
      showToast('Category deleted', 'info');
    } catch (err) { showToast(err.message, 'danger'); }
  };
  document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('category-name-input');
    try {
      await EP.addCategory(input.value);
      input.value = '';
      await loadCategoryManager();
      showToast('Category added');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- Post modal ----
  window.openPostForm = async () => {
    document.getElementById('post-form').reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-cover-preview').classList.add('hidden');
    await populateCategoryOptions();
    document.getElementById('post-modal').classList.remove('hidden');
    const q = ensureQuill();
    if (q) q.setContents([]);
  };
  window.editPost = async (id) => {
    const p = (await EP.posts()).find(x => x.id === id);
    if (!p) return;
    document.getElementById('post-id').value = p.id;
    document.getElementById('post-title').value = p.title;
    await populateCategoryOptions(p.category);
    document.getElementById('post-language').value = p.language || 'en';
    document.getElementById('post-excerpt').value = p.excerpt;
    document.getElementById('post-cover-url').value = p.cover_image_url || '';
    updateCoverPreview();
    document.getElementById('post-modal').classList.remove('hidden');
    const q = ensureQuill();
    if (q) q.root.innerHTML = p.body || '';
    else document.getElementById('post-body').value = p.body;
  };
  function updateCoverPreview() {
    const url = document.getElementById('post-cover-url').value.trim();
    const img = document.getElementById('post-cover-preview');
    if (!url) { img.classList.add('hidden'); img.src = ''; return; }
    img.src = url;
    img.classList.remove('hidden');
  }
  document.getElementById('post-cover-url').addEventListener('input', updateCoverPreview);
  document.getElementById('post-cover-preview').addEventListener('error', () => {
    document.getElementById('post-cover-preview').classList.add('hidden');
  });
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
    const bodyHtml = quill ? quill.root.innerHTML : document.getElementById('post-body').value;
    const bodyText = quill ? quill.getText().trim() : bodyHtml.trim();
    if (!bodyText) { showToast('Write something in the post body first', 'danger'); return; }
    try {
      await EP.savePost({
        id: document.getElementById('post-id').value || null,
        title: document.getElementById('post-title').value,
        category: document.getElementById('post-category').value,
        language: document.getElementById('post-language').value,
        excerpt: document.getElementById('post-excerpt').value,
        coverImageUrl: document.getElementById('post-cover-url').value.trim(),
        body: bodyHtml,
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
    document.getElementById('user-email').dataset.autofilled = 'true';
    document.getElementById('user-modal').classList.remove('hidden');
  };
  // Auto-suggests an email as the admin types a name, but stops the moment
  // they edit the email field directly — so a deliberate fix for a
  // collision is never silently overwritten by the next keystroke in Name.
  document.getElementById('user-name').addEventListener('input', (e) => {
    const emailField = document.getElementById('user-email');
    if (emailField.dataset.autofilled === 'true') {
      emailField.value = EP.suggestEmail(e.target.value);
    }
  });
  document.getElementById('user-email').addEventListener('input', (e) => {
    e.target.dataset.autofilled = 'false';
  });
  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.addUser({
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        role: document.getElementById('user-role').value,
        courseId: document.getElementById('user-course').value,
      });
      closeModal('user-modal');
      await renderAll();
      showToast('User added \u2014 login email: ' + document.getElementById('user-email').value);
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- Groups moderation ----
  let activeGroupId = null;
  async function renderGroupTabs() {
    const groups = await EP.allGroups();
    if (!activeGroupId && groups.length) activeGroupId = groups[0].id;
    document.getElementById('admin-group-tabs').innerHTML = groups.map(g => `
      <button onclick="selectAdminGroup('${g.id}')" class="persona-tab" ${g.id === activeGroupId ? 'aria-selected="true"' : 'aria-selected="false"'}>
        <span class="mr-1">${g.icon}</span> ${escapeHtml(g.name)}
      </button>`).join('');
    await renderGroupPosts();
  }
  async function renderGroupPosts() {
    if (!activeGroupId) return;
    const [posts, roster, reportsByPost] = await Promise.all([
      EP.groupPosts(activeGroupId), EP.users(), EP.reportsForGroup(activeGroupId),
    ]);
    const byId = Object.fromEntries(roster.map(u => [u.id, u.name]));
    document.getElementById('admin-group-posts').innerHTML = posts.map(p => {
      const reports = reportsByPost[p.id] || [];
      return `
      <div class="card p-5" style="${reports.length ? 'border-color:var(--danger-600); border-width:1.5px' : ''}">
        <div class="flex items-center justify-between mb-2">
          <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(byId[p.authorId] || 'Someone')} <span class="font-normal text-xs" style="color:var(--text-disabled)">${EP.timeAgo(p.createdAt)}</span></p>
          <div class="flex items-center gap-3">
            ${reports.length ? `<span class="badge badge-danger">\u{1F6A9} ${reports.length} report${reports.length > 1 ? 's' : ''}</span>` : ''}
            <button onclick="adminDeleteGroupPost('${p.id}')" class="text-xs font-semibold" style="color:var(--danger-600)">Delete Post</button>
          </div>
        </div>
        ${p.body ? `<p class="text-sm mb-2">${escapeHtml(p.body)}</p>` : ''}
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="" class="rounded-lg max-h-64 object-cover mb-2">` : ''}
        <p class="text-xs mb-2" style="color:var(--text-secondary)">${p.likes.length} likes \u00b7 ${p.comments.length} comments</p>

        ${reports.length ? `
        <div class="mt-2 mb-3 p-3 rounded-lg space-y-1" style="background:var(--danger-50)">
          ${reports.map(r => `
            <div class="flex items-center justify-between text-xs">
              <span style="color:var(--danger-600)">${escapeHtml(byId[r.reporterId] || 'Someone')}${r.reason ? ': ' + escapeHtml(r.reason) : ' (no reason given)'}</span>
              <button onclick="adminDismissReport('${r.id}')" class="font-semibold shrink-0 ml-2" style="color:var(--text-secondary)">Dismiss</button>
            </div>`).join('')}
        </div>` : ''}

        ${p.comments.length ? `
        <div class="mt-2 pt-2 border-t space-y-1.5" style="border-color:var(--border-default)">
          ${p.comments.map(c => `
            <div class="flex items-center justify-between text-xs">
              <span><span class="font-semibold" style="color:var(--navy-700)">${escapeHtml(byId[c.authorId] || 'Someone')}</span> <span style="color:var(--text-secondary)">${escapeHtml(c.body)}</span></span>
              <button onclick="adminDeleteComment('${c.id}')" class="font-semibold shrink-0 ml-2" style="color:var(--danger-600)">Delete</button>
            </div>`).join('')}
        </div>` : ''}
      </div>`;
    }).join('') || `<p style="color:var(--text-secondary)">No posts in this group yet.</p>`;
  }
  window.selectAdminGroup = (id) => { activeGroupId = id; renderGroupTabs(); };
  window.adminDeleteGroupPost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try { await EP.deleteGroupPost(postId); await renderGroupPosts(); } catch (err) { showToast(err.message, 'danger'); }
  };
  window.adminDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try { await EP.deleteComment(commentId); await renderGroupPosts(); } catch (err) { showToast(err.message, 'danger'); }
  };
  window.adminDismissReport = async (reportId) => {
    try { await EP.dismissReport(reportId); await renderGroupPosts(); showToast('Report dismissed'); } catch (err) { showToast(err.message, 'danger'); }
  };
  await renderGroupTabs();
  EP.onChange([EP.KEYS.group_posts, EP.KEYS.group_post_comments, EP.KEYS.group_post_reports], renderGroupPosts);

  // ---- Enrollments ----
  let enrollmentFilter = 'pending';
  document.querySelectorAll('[data-enrollment-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      enrollmentFilter = btn.dataset.enrollmentFilter;
      document.querySelectorAll('[data-enrollment-filter]').forEach(b => b.setAttribute('aria-selected', String(b === btn)));
      renderEnrollments();
    });
  });
  async function renderEnrollments() {
    const [all, courseList, roster] = await Promise.all([EP.allEnrollments(), EP.courses(), EP.users()]);
    const courseById = Object.fromEntries(courseList.map(c => [c.id, c.name]));
    const userById2 = Object.fromEntries(roster.map(u => [u.id, u.name]));
    const filtered = enrollmentFilter === 'all' ? all : all.filter(e => e.status === enrollmentFilter);
    const statusBadge = { pending: 'badge-warning', active: 'badge-success', completed: 'badge-info', cancelled: 'badge-danger' };
    document.getElementById('admin-enrollments-list').innerHTML = filtered.map(e => `
      <div class="card p-5 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge ${statusBadge[e.status] || 'badge-info'}">${e.status}</span>
            <span class="badge ${e.paymentStatus === 'paid' ? 'badge-success' : e.paymentStatus === 'waived' ? 'badge-info' : 'badge-warning'}">${e.paymentStatus}</span>
          </div>
          <p class="font-semibold truncate" style="color:var(--navy-700)">${escapeHtml(userById2[e.studentId] || 'Unknown student')} \u2192 ${escapeHtml(courseById[e.courseId] || 'Unknown course')}</p>
          <p class="text-xs mt-1" style="color:var(--text-secondary)">Requested ${EP.timeAgo(e.requestedAt)}${e.priceMad ? ` \u00b7 ${e.priceMad} MAD` : ''}</p>
        </div>
        ${e.status === 'pending' ? `
        <div class="flex gap-2 shrink-0">
          <button onclick='openActivateModal(${JSON.stringify(e.id)}, ${JSON.stringify(userById2[e.studentId] || '')}, ${JSON.stringify(courseById[e.courseId] || '')})' class="btn btn-primary btn-sm">Approve</button>
          <button onclick="rejectEnrollmentConfirm('${e.id}')" class="btn btn-secondary btn-sm" style="color:var(--danger-600); border-color:var(--danger-600)">Reject</button>
        </div>` : ''}
      </div>`).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">No ${enrollmentFilter === 'all' ? '' : enrollmentFilter + ' '}enrollments.</p></div>`;
  }
  window.openActivateModal = (id, studentName, courseName) => {
    document.getElementById('activate-enrollment-id').value = id;
    document.getElementById('activate-modal-summary').innerHTML = `<strong>${escapeHtml(studentName)}</strong> \u2192 ${escapeHtml(courseName)}`;
    document.getElementById('activate-enrollment-form').reset();
    document.getElementById('activate-enrollment-modal').classList.remove('hidden');
  };
  window.rejectEnrollmentConfirm = async (id) => {
    if (!confirm('Reject this enrollment request?')) return;
    try { await EP.rejectEnrollment(id); await renderEnrollments(); showToast('Enrollment rejected', 'info'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  document.getElementById('activate-enrollment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.activateEnrollment(document.getElementById('activate-enrollment-id').value, {
        priceMad: document.getElementById('activate-price').value,
        paymentStatus: document.getElementById('activate-payment-status').value,
      });
      document.getElementById('activate-enrollment-modal').classList.add('hidden');
      await renderEnrollments();
      showToast('Enrollment activated \u2014 student now has course access');
    } catch (err) { showToast(err.message, 'danger'); }
  });
  await renderEnrollments();
  EP.onChange([EP.KEYS.enrollments], renderEnrollments);
});
