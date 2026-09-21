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

  // ---- CSV export — client-side only, no backend needed ----
  function exportToCsv(filename, rows) {
    if (!rows.length) { showToast('Nothing to export yet', 'danger'); return; }
    const headers = Object.keys(rows[0]);
    const escapeCell = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM so Excel opens Arabic names correctly
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  window.exportUsersCsv = async () => {
    const [rows, courseList, balances] = await Promise.all([EP.users(), EP.courses(), EP.studentBalances()]);
    const courseById = Object.fromEntries(courseList.map((c) => [c.id, c.name]));
    const data = rows.filter((u) => u.role !== 'admin').map((u) => {
      const bal = balances[u.id];
      return {
        Name: u.name, Role: u.role, Course: u.courseId ? (courseById[u.courseId] || '') : '', City: u.city || '', Phone: u.phone || '',
        Balance: u.role === 'student' ? (bal?.hasEnrollment ? (bal.balance || 0) : 'Not enrolled') : '',
        NextPaymentDue: u.role === 'student' && bal?.nextPaymentDueAt ? new Date(bal.nextPaymentDueAt).toISOString().slice(0, 10) : '',
      };
    });
    exportToCsv('europass-users.csv', data);
  };
  window.exportEnrollmentsCsv = async () => {
    const [rows, courseList, roster] = await Promise.all([EP.allEnrollments(), EP.courses(), EP.users()]);
    const courseById = Object.fromEntries(courseList.map((c) => [c.id, c.name]));
    const userById3 = Object.fromEntries(roster.map((u) => [u.id, u.name]));
    const data = rows.map((e) => ({
      Student: userById3[e.studentId] || '', Course: e.courseId ? (courseById[e.courseId] || '') : 'Undecided',
      Status: e.status, Payment: e.paymentStatus, PriceMAD: e.priceMad || '', Requested: e.requestedAt ? new Date(e.requestedAt).toISOString().slice(0, 10) : '',
      PaymentDueDate: e.paymentDueAt ? new Date(e.paymentDueAt).toISOString().slice(0, 10) : '',
    }));
    exportToCsv('europass-enrollments.csv', data);
  };

  // ---- Users page search/filter state ----
  let usersSearchTerm = '';
  let usersFilterRole = '';
  let usersFilterCourse = '';
  let usersFilterStatus = '';
  let usersFilterBalance = '';
  // Bulk-select state for the "assign course/teacher to several students at
  // once" action — courses have exactly one teacher each, so assigning a
  // course to a group of students is how reassigning their teacher works
  // in this schema; there's no separate per-student teacher field.
  let selectedStudentIds = new Set();
  window.toggleUserSelect = (id, checked) => {
    if (checked) selectedStudentIds.add(id); else selectedStudentIds.delete(id);
    updateBulkBar();
  };
  window.toggleSelectAllUsers = (checked) => {
    document.querySelectorAll('.user-select-checkbox').forEach((cb) => {
      cb.checked = checked;
      if (checked) selectedStudentIds.add(cb.dataset.userId); else selectedStudentIds.delete(cb.dataset.userId);
    });
    updateBulkBar();
  };
  async function updateBulkBar() {
    const bar = document.getElementById('users-bulk-bar');
    if (!bar) return;
    if (selectedStudentIds.size === 0) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    document.getElementById('users-bulk-count').textContent = `${selectedStudentIds.size} selected`;
    const courseSelect = document.getElementById('users-bulk-course');
    if (!courseSelect.dataset.populated) {
      const [courseList, roster] = await Promise.all([EP.courses(), EP.users()]);
      const teacherById = Object.fromEntries(roster.filter((u) => u.role === 'teacher').map((u) => [u.id, u.name]));
      courseSelect.innerHTML = courseList.map((c) => `<option value="${c.id}">${escapeHtml(c.name)} — ${escapeHtml(c.teacher_id ? (teacherById[c.teacher_id] || 'No teacher assigned') : 'No teacher assigned')}</option>`).join('');
      courseSelect.dataset.populated = '1';
    }
  }
  document.getElementById('users-bulk-clear')?.addEventListener('click', () => {
    selectedStudentIds.clear();
    renderUsers();
  });
  document.getElementById('users-bulk-apply')?.addEventListener('click', async () => {
    const courseId = document.getElementById('users-bulk-course').value;
    if (!courseId) { showToast('Choose a course first', 'danger'); return; }
    const courseName = document.getElementById('users-bulk-course').selectedOptions[0]?.textContent || 'this course';
    if (!confirm(`Assign ${selectedStudentIds.size} student(s) to ${courseName}? This moves their course access (and creates a billing record for anyone who doesn't have one yet).`)) return;
    try {
      const result = await EP.bulkAssignCourse(Array.from(selectedStudentIds), courseId);
      selectedStudentIds.clear();
      await Promise.all([renderUsers(), renderEnrollments(), renderAnalytics()]);
      const parts = [];
      if (result.moved) parts.push(`${result.moved} moved`);
      if (result.created) parts.push(`${result.created} newly enrolled`);
      if (result.failed.length) parts.push(`${result.failed.length} failed`);
      showToast(`Bulk assign complete — ${parts.join(', ')}`, result.failed.length ? 'danger' : 'success');
    } catch (err) { showToast(err.message, 'danger'); }
  });
  ['users-search', 'users-filter-role', 'users-filter-course', 'users-filter-status', 'users-filter-balance'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      usersSearchTerm = document.getElementById('users-search').value.trim().toLowerCase();
      usersFilterRole = document.getElementById('users-filter-role').value;
      usersFilterCourse = document.getElementById('users-filter-course').value;
      usersFilterStatus = document.getElementById('users-filter-status').value;
      usersFilterBalance = document.getElementById('users-filter-balance').value;
      renderUsers();
    });
  });

  async function renderUsers() {
    const [rows, courseList, balances] = await Promise.all([EP.users(), EP.courses(), EP.studentBalances()]);
    const courseSelect = document.getElementById('users-filter-course');
    if (courseSelect && !courseSelect.dataset.populated) {
      courseSelect.innerHTML = `<option value="">All Courses</option>` + courseList.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      courseSelect.dataset.populated = '1';
    }

    let teachersAndStudents = rows.filter(u => u.role !== 'admin');
    if (usersSearchTerm) {
      teachersAndStudents = teachersAndStudents.filter(u =>
        u.name?.toLowerCase().includes(usersSearchTerm) ||
        u.email?.toLowerCase().includes(usersSearchTerm) ||
        u.phone?.toLowerCase().includes(usersSearchTerm));
    }
    if (usersFilterRole) teachersAndStudents = teachersAndStudents.filter(u => u.role === usersFilterRole);
    if (usersFilterCourse) teachersAndStudents = teachersAndStudents.filter(u => u.courseId === usersFilterCourse);
    if (usersFilterStatus === 'active') teachersAndStudents = teachersAndStudents.filter(u => !u.blockedAt);
    if (usersFilterStatus === 'blocked') teachersAndStudents = teachersAndStudents.filter(u => !!u.blockedAt);
    if (usersFilterBalance === 'owing') teachersAndStudents = teachersAndStudents.filter(u => (balances[u.id]?.balance || 0) > 0);
    if (usersFilterBalance === 'settled') teachersAndStudents = teachersAndStudents.filter(u => !!balances[u.id]?.hasEnrollment && (balances[u.id]?.balance || 0) <= 0);
    if (usersFilterBalance === 'unenrolled') teachersAndStudents = teachersAndStudents.filter(u => u.role === 'student' && !balances[u.id]?.hasEnrollment);

    // Selections only ever apply to students still visible/valid in this
    // render — drop anyone who got filtered out or removed so the bulk bar
    // count never lies about who's actually selected.
    const visibleStudentIds = new Set(teachersAndStudents.filter((u) => u.role === 'student').map((u) => u.id));
    selectedStudentIds.forEach((id) => { if (!visibleStudentIds.has(id)) selectedStudentIds.delete(id); });

    document.getElementById('admin-users-list').innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="px-5 py-3"><input type="checkbox" onchange="toggleSelectAllUsers(this.checked)" aria-label="Select all students"></th>
      <th class="text-left px-5 py-3 text-white font-semibold">Name</th><th class="text-left px-5 py-3 text-white font-semibold">Role</th><th class="text-left px-5 py-3 text-white font-semibold">Course</th><th class="text-left px-5 py-3 text-white font-semibold">City</th><th class="text-left px-5 py-3 text-white font-semibold">Phone</th><th class="text-left px-5 py-3 text-white font-semibold">Joined</th><th class="text-left px-5 py-3 text-white font-semibold">Balance</th><th class="text-left px-5 py-3 text-white font-semibold">Next Payment</th><th class="text-left px-5 py-3 text-white font-semibold">Status</th><th class="px-5 py-3"></th></tr></thead><tbody>
      ${teachersAndStudents.map((u, i) => {
        const balInfo = balances[u.id];
        const bal = balInfo?.balance || 0;
        const balanceHtml = u.role === 'student'
          ? (!balInfo?.hasEnrollment
              ? (u.courseId
                  ? `<span class="badge badge-info">No billing record</span>`
                  : `<span class="badge" style="background:var(--bg-subtle); color:var(--text-secondary)">Not enrolled</span>`)
              : bal > 0 ? `<span class="badge badge-danger">${bal.toLocaleString()} MAD due</span>` : `<span class="badge badge-success">Paid up</span>`)
          : `<span style="color:var(--text-disabled)">\u2014</span>`;
        let nextPaymentHtml = `<span style="color:var(--text-disabled)">\u2014</span>`;
        if (u.role === 'student' && balInfo?.nextPaymentDueAt) {
          const due = new Date(balInfo.nextPaymentDueAt);
          const days = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
          const isUrgent = days <= 7;
          nextPaymentHtml = `<span style="color:${isUrgent ? 'var(--danger-600)' : 'var(--text-secondary)'}; font-weight:${isUrgent ? '600' : '400'}">${due.toLocaleDateString()}${days < 0 ? ' (overdue)' : ''}</span>`;
        }
        return `<tr onclick="openUserDetailModal('${u.id}')" style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}; cursor:pointer">
        <td class="px-5 py-3" onclick="event.stopPropagation()">${u.role === 'student' ? `<input type="checkbox" class="user-select-checkbox" data-user-id="${u.id}" ${selectedStudentIds.has(u.id) ? 'checked' : ''} onchange="toggleUserSelect('${u.id}', this.checked)">` : ''}</td>
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(u.name)}</td>
        <td class="px-5 py-3"><span class="badge ${u.role === 'teacher' ? 'badge-info' : 'badge-amber'}">${u.role}</span></td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(courseList.find(c => c.id === u.courseId)?.name || '\u2014')}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(u.city || '\u2014')}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)" dir="ltr">${escapeHtml(u.phone || '\u2014')}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '\u2014'}</td>
        <td class="px-5 py-3">${balanceHtml}</td>
        <td class="px-5 py-3">${nextPaymentHtml}</td>
        <td class="px-5 py-3">${u.blockedAt ? '<span class="badge badge-danger">Blocked</span>' : '<span class="badge badge-success">Active</span>'}</td>
        <td class="px-5 py-3 text-right"><button onclick="event.stopPropagation(); removeUserConfirm('${u.id}')" class="text-xs font-semibold" style="color:var(--danger-600)">Remove</button></td>
      </tr>`;
      }).join('') || `<tr><td colspan="11" class="px-5 py-8 text-center" style="color:var(--text-secondary)">No users match these filters.</td></tr>`}
    </tbody></table>`;
    await updateBulkBar();
  }

  // ---- User detail modal — shared by both the Users table and the
  // Enrollments list, so it's self-contained and fetches its own data
  // rather than depending on whatever's cached in either view. ----
  let currentUserDetailId = null;
  window.openUserDetailModal = async (userId) => {
    let user, courseList;
    try {
      [user, courseList] = await Promise.all([EP.userById(userId), EP.courses()]);
    } catch (err) { showToast(err.message, 'danger'); return; }
    if (!user) { showToast('Could not find that user', 'danger'); return; }
    currentUserDetailId = userId;

    document.getElementById('user-detail-name').textContent = user.name;
    document.getElementById('user-detail-role').textContent = user.role;
    document.getElementById('user-detail-course').textContent = user.courseId ? (courseList.find(c => c.id === user.courseId)?.name || 'Unknown course') : 'No course assigned';
    document.getElementById('user-detail-city').textContent = user.city || 'Not provided';
    document.getElementById('user-detail-email').textContent = user.email || 'Not available';
    document.getElementById('user-detail-phone').textContent = user.phone || 'Not provided';
    document.getElementById('user-detail-joined').textContent = user.createdAt ? `Joined ${new Date(user.createdAt).toLocaleDateString()}` : 'Join date unknown';

    const roleSelect = document.getElementById('user-detail-role-select');
    roleSelect.value = user.role;
    document.getElementById('user-detail-role-save').onclick = async () => {
      const newRole = roleSelect.value;
      if (newRole === user.role) { showToast('That\u2019s already their current role'); return; }
      const warning = user.courseId
        ? ` They're currently assigned to a course — changing their role will clear that assignment, since it means something different for each role.`
        : '';
      if (!confirm(`Change ${user.name}'s role from ${user.role} to ${newRole}?${warning}`)) return;
      try {
        await EP.changeUserRole(user.id, newRole);
        closeModal('user-detail-modal');
        await renderUsers();
        showToast(`${user.name} is now a ${newRole}`);
      } catch (err) { showToast(err.message, 'danger'); }
    };

    // Balance + full payment history from the real ledger — replaces the
    // old one-click "marked paid" flag, which recorded no amount at all.
    await renderUserDetailPayments(user.id);
    // Wired here (not as an inline onclick) because the id it needs to
    // capture — currentUserDetailId — lives in this closure, not on
    // window; an inline onclick reading it directly threw a silent
    // ReferenceError on click, which is why these two buttons appeared to
    // "do nothing" from the Users page.
    document.getElementById('user-detail-record-payment-btn').onclick = () => openPaymentModal({ studentId: user.id });
    const enrollBtn = document.getElementById('user-detail-enroll-btn');
    enrollBtn.onclick = () => openEnrollStudentModal(user.id);
    if (user.role === 'student') {
      const balances = await EP.studentBalances();
      enrollBtn.classList.toggle('hidden', !!balances[user.id]?.hasEnrollment);
      // Same distinction as the Enrollments page: an admin-added student
      // with course_id already set has real access and just needs a
      // billing record, which reads very differently from "Enroll Student".
      enrollBtn.innerHTML = user.courseId
        ? '<i data-lucide="receipt" class="w-4 h-4 mr-1"></i> Add Billing Record'
        : '<i data-lucide="graduation-cap" class="w-4 h-4 mr-1"></i> Enroll Student';
      lucide.createIcons();
    } else {
      enrollBtn.classList.add('hidden');
    }

    const blockedBanner = document.getElementById('user-detail-blocked-banner');
    const blockBtn = document.getElementById('user-detail-block-btn');
    if (user.blockedAt) {
      blockedBanner.classList.remove('hidden');
      document.getElementById('user-detail-blocked-reason').textContent = user.blockedReason || 'No reason given.';
      blockBtn.innerHTML = '<i data-lucide="unlock" class="w-4 h-4 mr-1"></i> Unblock Access';
      blockBtn.style.background = 'var(--success-50)';
      blockBtn.style.color = 'var(--success-600)';
      blockBtn.onclick = async () => {
        try { await EP.unblockUser(user.id); closeModal('user-detail-modal'); await renderUsers(); showToast('Access restored'); }
        catch (err) { showToast(err.message, 'danger'); }
      };
    } else {
      blockedBanner.classList.add('hidden');
      blockBtn.innerHTML = '<i data-lucide="lock" class="w-4 h-4 mr-1"></i> Block Access';
      blockBtn.style.background = 'var(--danger-50)';
      blockBtn.style.color = 'var(--danger-600)';
      blockBtn.onclick = async () => {
        const reason = prompt(`Block ${user.name}'s access? Optionally add a reason they'll see on their dashboard (e.g. "Payment overdue for October"):`);
        if (reason === null) return; // cancelled
        try { await EP.blockUser(user.id, reason || null); closeModal('user-detail-modal'); await renderUsers(); showToast(`${user.name}'s access has been blocked`); }
        catch (err) { showToast(err.message, 'danger'); }
      };
    }

    const emailBtn = document.getElementById('user-detail-email-btn');
    const waBtn = document.getElementById('user-detail-whatsapp-btn');
    if (user.email) {
      emailBtn.href = `mailto:${user.email}`;
      emailBtn.classList.remove('hidden');
    } else {
      emailBtn.classList.add('hidden');
    }
    if (user.phone) {
      const digitsOnly = user.phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
      waBtn.href = `https://wa.me/${digitsOnly}`;
      waBtn.classList.remove('hidden');
    } else {
      waBtn.classList.add('hidden');
    }

    document.getElementById('user-detail-modal').classList.remove('hidden');
    lucide.createIcons();
  };

  // Balance summary + full payment history for one student, shown inside
  // the User Details modal — this is the ledger, not a flag.
  async function renderUserDetailPayments(userId) {
    const balanceEl = document.getElementById('user-detail-balance');
    const listEl = document.getElementById('user-detail-payments-list');
    const [balances, allPayments] = await Promise.all([EP.studentBalances(), EP.payments()]);
    const bal = balances[userId] || { invoiced: 0, paid: 0, balance: 0, nextPaymentDueAt: null };
    let dueLine = '';
    if (bal.balance > 0 && bal.nextPaymentDueAt) {
      const due = new Date(bal.nextPaymentDueAt);
      const days = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
      const isUrgent = days <= 7;
      const label = days < 0 ? `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}` : `due ${due.toLocaleDateString()}`;
      dueLine = `<div class="text-xs mt-1" style="color:${isUrgent ? 'var(--danger-600)' : 'var(--text-secondary)'}; font-weight:${isUrgent ? '600' : '400'}">Next payment ${label}</div>`;
    }
    balanceEl.innerHTML = (bal.balance > 0
      ? `<span class="font-semibold" style="color:var(--danger-600)">${bal.balance.toLocaleString()} MAD still owed</span> <span style="color:var(--text-secondary)">(${bal.paid.toLocaleString()} of ${bal.invoiced.toLocaleString()} MAD paid)</span>`
      : bal.invoiced > 0
        ? `<span class="font-semibold" style="color:var(--success-600)">Paid up</span> <span style="color:var(--text-secondary)">(${bal.paid.toLocaleString()} of ${bal.invoiced.toLocaleString()} MAD)</span>`
        : `<span style="color:var(--text-secondary)">No priced enrollment on file yet.</span>`) + dueLine;

    const mine = allPayments.filter((p) => p.studentId === userId);
    listEl.innerHTML = mine.map((p) => `
      <div class="p-3 rounded-lg text-sm flex items-center justify-between gap-2" style="background:${p.voidedAt ? 'var(--bg-subtle)' : 'var(--success-50)'}; opacity:${p.voidedAt ? '0.6' : '1'}">
        <div class="min-w-0">
          <p class="font-semibold" style="color:var(--navy-700)">${p.amount.toLocaleString()} ${escapeHtml(p.currency)}${p.voidedAt ? ' <span class="badge badge-danger">Voided</span>' : ''}</p>
          <p class="text-xs mt-0.5" style="color:var(--text-secondary)">${new Date(p.paidAt).toLocaleDateString()} · ${escapeHtml(p.method.replace('_', ' '))}${p.courseName ? ` · ${escapeHtml(p.courseName)}` : ''}</p>
          ${p.notes ? `<p class="text-xs mt-0.5" style="color:var(--text-disabled)">${escapeHtml(p.notes)}</p>` : ''}
        </div>
        <div class="flex flex-col gap-1 items-end shrink-0">
          <button onclick="openPaymentModal({ id: '${p.id}' })" class="text-xs font-semibold" style="color:var(--teal-600)">Edit</button>
          <button onclick="downloadPaymentReceipt('${p.id}', event)" class="text-xs font-semibold" style="color:var(--teal-600)">Receipt</button>
        </div>
      </div>`).join('') || `<p class="text-sm" style="color:var(--text-secondary)">No payments recorded yet.</p>`;
  }

  // ---- Finance: payments & expenses (the ledger behind the Users page
  // balance column and the whole Analytics/Finance hub) ----
  async function refreshFinanceViews() {
    await Promise.all([renderUsers(), renderAnalytics()]);
    if (currentUserDetailId && !document.getElementById('user-detail-modal').classList.contains('hidden')) {
      await renderUserDetailPayments(currentUserDetailId);
    }
  }

  window.openPaymentModal = async ({ id, studentId } = {}) => {
    const [studentList, courseList, allPayments] = await Promise.all([EP.users(), EP.courses(), id ? EP.payments() : Promise.resolve([])]);
    const students = studentList.filter((u) => u.role === 'student');
    const studentSelect = document.getElementById('payment-student');
    studentSelect.innerHTML = students.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    const courseSelect = document.getElementById('payment-course');
    courseSelect.innerHTML = `<option value="">Not linked to a specific course</option>` + courseList.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    const voidBtn = document.getElementById('payment-void-btn');
    const auditNote = document.getElementById('payment-audit-note');
    document.getElementById('payment-form').reset();

    const existing = id ? allPayments.find((p) => p.id === id) : null;
    document.getElementById('payment-id').value = id || '';
    document.getElementById('payment-modal-title').textContent = existing ? 'Edit Payment' : 'Record Payment';

    if (existing) {
      studentSelect.value = existing.studentId;
      courseSelect.value = existing.courseId || '';
      document.getElementById('payment-amount').value = existing.amount;
      document.getElementById('payment-method').value = existing.method;
      document.getElementById('payment-date').value = new Date(existing.paidAt).toISOString().slice(0, 10);
      document.getElementById('payment-notes').value = existing.notes || '';
      voidBtn.classList.remove('hidden');
      voidBtn.textContent = existing.voidedAt ? 'Restore (Unvoid)' : 'Void';
      voidBtn.onclick = async () => {
        try {
          if (existing.voidedAt) { await EP.unvoidPayment(id); showToast('Payment restored'); }
          else {
            const reason = prompt('Why is this payment being voided? (shown in the audit history)');
            if (reason === null) return;
            await EP.voidPayment(id, reason || null);
            showToast('Payment voided');
          }
          closeModal('payment-modal');
          await refreshFinanceViews();
        } catch (err) { showToast(err.message, 'danger'); }
      };
      auditNote.classList.remove('hidden');
      auditNote.textContent = existing.updatedAt && existing.updatedAt !== existing.createdAt
        ? `Recorded ${EP.timeAgo(existing.createdAt)}, last edited ${EP.timeAgo(existing.updatedAt)}. Every change is kept in the audit log.`
        : `Recorded ${EP.timeAgo(existing.createdAt)}. Every change is kept in the audit log.`;
    } else {
      document.getElementById('payment-date').value = new Date().toISOString().slice(0, 10);
      if (studentId) studentSelect.value = studentId;
      voidBtn.classList.add('hidden');
      auditNote.classList.add('hidden');
    }
    document.getElementById('payment-modal').classList.remove('hidden');
  };

  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('payment-id').value;
    const payload = {
      studentId: document.getElementById('payment-student').value,
      courseId: document.getElementById('payment-course').value || null,
      amount: parseFloat(document.getElementById('payment-amount').value),
      method: document.getElementById('payment-method').value,
      paidAt: document.getElementById('payment-date').value,
      notes: document.getElementById('payment-notes').value,
    };
    try {
      if (id) await EP.updatePayment(id, payload);
      else await EP.addPayment(payload);
      closeModal('payment-modal');
      await refreshFinanceViews();
      showToast(id ? 'Payment updated' : 'Payment recorded');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  window.openExpenseModal = async ({ id } = {}) => {
    const allExpenses = id ? await EP.expenses() : [];
    const existing = id ? allExpenses.find((x) => x.id === id) : null;
    document.getElementById('expense-form').reset();
    document.getElementById('expense-id').value = id || '';
    document.getElementById('expense-modal-title').textContent = existing ? 'Edit Expense' : 'Record Expense';
    const voidBtn = document.getElementById('expense-void-btn');
    if (existing) {
      document.getElementById('expense-category').value = existing.category;
      document.getElementById('expense-vendor').value = existing.vendor || '';
      document.getElementById('expense-amount').value = existing.amount;
      document.getElementById('expense-date').value = new Date(existing.incurredAt).toISOString().slice(0, 10);
      document.getElementById('expense-notes').value = existing.notes || '';
      voidBtn.classList.remove('hidden');
      voidBtn.textContent = existing.voidedAt ? 'Restore (Unvoid)' : 'Void';
      voidBtn.onclick = async () => {
        try {
          if (existing.voidedAt) { await EP.unvoidExpense(id); showToast('Expense restored'); }
          else {
            const reason = prompt('Why is this expense being voided? (shown in the audit history)');
            if (reason === null) return;
            await EP.voidExpense(id, reason || null);
            showToast('Expense voided');
          }
          closeModal('expense-modal');
          await renderAnalytics();
        } catch (err) { showToast(err.message, 'danger'); }
      };
    } else {
      document.getElementById('expense-date').value = new Date().toISOString().slice(0, 10);
      voidBtn.classList.add('hidden');
    }
    document.getElementById('expense-modal').classList.remove('hidden');
  };

  document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('expense-id').value;
    const payload = {
      category: document.getElementById('expense-category').value,
      vendor: document.getElementById('expense-vendor').value,
      amount: parseFloat(document.getElementById('expense-amount').value),
      incurredAt: document.getElementById('expense-date').value,
      notes: document.getElementById('expense-notes').value,
    };
    try {
      if (id) await EP.updateExpense(id, payload);
      else await EP.addExpense(payload);
      closeModal('expense-modal');
      await renderAnalytics();
      showToast(id ? 'Expense updated' : 'Expense recorded');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  window.exportPaymentsCsv = async () => {
    const rows = (await EP.payments()).map((p) => ({
      Student: p.studentName, Course: p.courseName || '', Amount: p.amount, Currency: p.currency, Method: p.method,
      Date: new Date(p.paidAt).toISOString().slice(0, 10), Notes: p.notes || '', Voided: p.voidedAt ? 'Yes' : 'No',
    }));
    exportToCsv('europass-payments.csv', rows);
  };
  window.exportExpensesCsv = async () => {
    const rows = (await EP.expenses()).map((x) => ({
      Category: x.category, Vendor: x.vendor || '', Amount: x.amount, Currency: x.currency,
      Date: new Date(x.incurredAt).toISOString().slice(0, 10), Notes: x.notes || '', Voided: x.voidedAt ? 'Yes' : 'No',
    }));
    exportToCsv('europass-expenses.csv', rows);
  };

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
          <p class="text-xs mt-1" style="color:var(--text-secondary)">${escapeHtml(hwCourseName(h.courseId))} \u00b7 ${escapeHtml(hwUserName(h.teacherId))} \u00b7 Due ${h.dueDate ? new Date(h.dueDate).toLocaleString() : '\u2014'}</p>
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
    document.getElementById('hw-detail-meta').textContent = `${hwCourseName(h.courseId)} \u00b7 Assigned by ${hwUserName(h.teacherId)} \u00b7 Due ${h.dueDate ? new Date(h.dueDate).toLocaleString() : 'no due date'}`;
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

  // ---- Analytics ----
  // Chart instances must be declared before renderAll() runs below, same
  // reasoning as the resources-cache fix from earlier in this project —
  // renderAll() calls renderAnalytics() immediately, and a `let` binding
  // isn't accessible until its own declaration line has actually executed.
  let chartRevenue = null, chartExpenses = null;
  let analyticsSelectedYear = new Date().getFullYear();

  // ---- Finance sub-tabs (Overview / Chart of Accounts / General Ledger /
  // Trial Balance / Balance Sheet / P&L / Journal Entry / Payroll) — same
  // pattern as the Enrollments page's Pending/Active/... filter tabs, just
  // switching whole panels instead of filtering one list. ----
  let financeTab = 'overview';
  document.querySelectorAll('[data-finance-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      financeTab = btn.dataset.financeTab;
      document.querySelectorAll('[data-finance-tab]').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      document.querySelectorAll('[data-finance-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.financePanel !== financeTab));
      renderFinanceTab(financeTab);
    });
  });
  async function renderFinanceTab(tab) {
    try {
      if (tab === 'coa') await renderChartOfAccounts();
      else if (tab === 'ledger') await renderGeneralLedger();
      else if (tab === 'trial-balance') await renderTrialBalance();
      else if (tab === 'balance-sheet') await renderBalanceSheet();
      else if (tab === 'pnl') await renderPnl();
      else if (tab === 'journal-entry') await renderJournalEntryTab();
      else if (tab === 'payroll') await renderPayrollTab();
    } catch (err) {
      showToast(err.message, 'danger');
    }
    lucide.createIcons();
  }
  // Sensible defaults so P&L and Balance Sheet aren't empty on first view —
  // current month for P&L, today for the Balance Sheet's "as of" date. Set
  // once here rather than every render, so an admin's own date edits stick.
  (() => {
    const now = new Date();
    const pnlFrom = document.getElementById('pnl-from');
    const pnlTo = document.getElementById('pnl-to');
    const bsTo = document.getElementById('bs-to');
    if (pnlFrom) pnlFrom.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    if (pnlTo) pnlTo.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    if (bsTo) bsTo.value = now.toISOString().slice(0, 10);
  })();

  // ---- Chart of Accounts ----
  let financeAccountsCache = [];
  async function loadFinanceAccounts() {
    financeAccountsCache = await EP.accounts();
    return financeAccountsCache;
  }
  async function populateAccountSelect(selectEl, { includeAll = false } = {}) {
    const accounts = await loadFinanceAccounts();
    const active = accounts.filter((a) => a.isActive);
    const current = selectEl.value;
    selectEl.innerHTML = (includeAll ? '<option value="">All Accounts</option>' : '<option value="">Select account</option>')
      + active.map((a) => `<option value="${a.id}">${escapeHtml(a.code)} — ${escapeHtml(a.name)}</option>`).join('');
    if (current) selectEl.value = current;
    return accounts;
  }
  async function renderChartOfAccounts() {
    const el = document.getElementById('admin-accounts-list');
    if (!el) return;
    const list = await loadFinanceAccounts();
    el.innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-left px-5 py-3 text-white font-semibold">Code</th><th class="text-left px-5 py-3 text-white font-semibold">Name</th><th class="text-left px-5 py-3 text-white font-semibold">Type</th><th class="text-left px-5 py-3 text-white font-semibold">Normal Balance</th><th class="text-left px-5 py-3 text-white font-semibold">Status</th><th class="px-5 py-3"></th></tr></thead><tbody>
      ${list.map((a, i) => `<tr style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}; opacity:${a.isActive ? '1' : '0.55'}">
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(a.code)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(a.name)}${a.isSystem ? ' <span class="badge badge-info">System</span>' : ''}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(a.type)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(a.normalBalance)}</td>
        <td class="px-5 py-3">${a.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
        <td class="px-5 py-3 text-right">${a.isSystem ? '' : `<button onclick="toggleAccountActive('${a.id}', ${a.isActive})" class="text-xs font-semibold" style="color:var(--teal-600)">${a.isActive ? 'Deactivate' : 'Activate'}</button>`}</td>
      </tr>`).join('') || `<tr><td colspan="6" class="px-5 py-8 text-center" style="color:var(--text-secondary)">No accounts yet.</td></tr>`}
    </tbody></table>`;
  }
  window.toggleAccountActive = async (id, currentlyActive) => {
    try {
      await EP.updateAccount(id, { isActive: !currentlyActive });
      await renderChartOfAccounts();
      showToast(currentlyActive ? 'Account deactivated' : 'Account activated');
    } catch (err) { showToast(err.message, 'danger'); }
  };
  window.openAccountModal = () => {
    document.getElementById('account-form').reset();
    document.getElementById('account-modal').classList.remove('hidden');
  };
  document.getElementById('account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.addAccount({
        code: document.getElementById('account-code').value,
        name: document.getElementById('account-name').value,
        type: document.getElementById('account-type').value,
        normalBalance: document.getElementById('account-normal-balance').value,
      });
      closeModal('account-modal');
      await renderChartOfAccounts();
      showToast('Account added');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- General Ledger ----
  async function renderGeneralLedger() {
    const el = document.getElementById('admin-ledger-list');
    if (!el) return;
    const accountSelect = document.getElementById('ledger-account');
    if (!accountSelect.dataset.populated) {
      await populateAccountSelect(accountSelect, { includeAll: true });
      accountSelect.dataset.populated = '1';
    }
    const from = document.getElementById('ledger-from').value || null;
    const to = document.getElementById('ledger-to').value || null;
    const accountId = accountSelect.value || null;
    const rows = await EP.getJournalEntries(from, to, accountId);
    const sourceBadge = { payment: 'badge-success', expense: 'badge-danger', enrollment: 'badge-info', payroll: 'badge-amber', manual: 'badge-info', reversal: 'badge-warning' };
    el.innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-left px-5 py-3 text-white font-semibold">Date</th><th class="text-left px-5 py-3 text-white font-semibold">Account</th><th class="text-left px-5 py-3 text-white font-semibold">Memo</th><th class="text-left px-5 py-3 text-white font-semibold">Debit</th><th class="text-left px-5 py-3 text-white font-semibold">Credit</th><th class="text-left px-5 py-3 text-white font-semibold">Source</th><th class="px-5 py-3"></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}">
        <td class="px-5 py-3" style="color:var(--text-secondary)">${new Date(r.entryDate).toLocaleDateString()}</td>
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(r.accountCode)} — ${escapeHtml(r.accountName)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(r.lineMemo || r.memo || '—')}</td>
        <td class="px-5 py-3" style="color:var(--navy-700)">${r.debit ? r.debit.toLocaleString() : ''}</td>
        <td class="px-5 py-3" style="color:var(--navy-700)">${r.credit ? r.credit.toLocaleString() : ''}</td>
        <td class="px-5 py-3"><span class="badge ${sourceBadge[r.sourceType] || 'badge-info'}">${escapeHtml(r.sourceType)}</span></td>
        <td class="px-5 py-3 text-right">${r.voidedAt ? '<span class="badge badge-danger">Voided</span>' : ''}</td>
      </tr>`).join('') || `<tr><td colspan="7" class="px-5 py-8 text-center" style="color:var(--text-secondary)">No journal entries in this range.</td></tr>`}
    </tbody></table>`;
  }

  // ---- Trial Balance ----
  async function renderTrialBalance() {
    const el = document.getElementById('admin-trial-balance-list');
    if (!el) return;
    const from = document.getElementById('tb-from').value || null;
    const to = document.getElementById('tb-to').value || null;
    const rows = await EP.getAccountBalances(from, to);
    const totalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    el.innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-left px-5 py-3 text-white font-semibold">Code</th><th class="text-left px-5 py-3 text-white font-semibold">Name</th><th class="text-left px-5 py-3 text-white font-semibold">Debit</th><th class="text-left px-5 py-3 text-white font-semibold">Credit</th><th class="text-left px-5 py-3 text-white font-semibold">Balance</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}">
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(r.code)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(r.name)}</td>
        <td class="px-5 py-3" style="color:var(--navy-700)">${r.totalDebit.toLocaleString()}</td>
        <td class="px-5 py-3" style="color:var(--navy-700)">${r.totalCredit.toLocaleString()}</td>
        <td class="px-5 py-3 font-semibold" style="color:var(--navy-700)">${r.balance.toLocaleString()}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="px-5 py-8 text-center" style="color:var(--text-secondary)">No accounts yet.</td></tr>`}
      <tr style="background:var(--navy-50); font-weight:700">
        <td class="px-5 py-3" style="color:var(--navy-700)" colspan="2">Totals</td>
        <td class="px-5 py-3" style="color:var(--navy-700)">${totalDebit.toLocaleString()}</td>
        <td class="px-5 py-3" style="color:var(--navy-700)">${totalCredit.toLocaleString()}</td>
        <td class="px-5 py-3" style="color:${isBalanced ? 'var(--success-600)' : 'var(--danger-600)'}">${isBalanced ? 'Balanced ✓' : 'Out of balance!'}</td>
      </tr>
    </tbody></table>`;
  }

  // ---- Balance Sheet ----
  async function renderBalanceSheet() {
    const el = document.getElementById('admin-balance-sheet');
    if (!el) return;
    const from = document.getElementById('bs-from').value || null;
    const to = document.getElementById('bs-to').value || null;
    const rows = await EP.getAccountBalances(from, to);
    const byType = (type) => rows.filter((r) => r.type === type);
    const renderGroup = (title, list) => {
      const subtotal = list.reduce((s, r) => s + r.balance, 0);
      return `<div class="card p-5">
        <p class="font-semibold mb-3" style="color:var(--navy-700)">${title}</p>
        ${list.map((r) => `<div class="flex justify-between text-sm py-1"><span style="color:var(--text-secondary)">${escapeHtml(r.code)} ${escapeHtml(r.name)}</span><span style="color:var(--navy-700)">${r.balance.toLocaleString()} MAD</span></div>`).join('') || `<p class="text-sm" style="color:var(--text-secondary)">None.</p>`}
        <div class="flex justify-between text-sm font-semibold pt-2 mt-2 border-t" style="border-color:var(--border-default); color:var(--navy-700)"><span>Total ${title}</span><span>${subtotal.toLocaleString()} MAD</span></div>
      </div>`;
    };
    const assets = byType('asset'), liabilities = byType('liability'), equity = byType('equity');
    const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
    const totalLiabEquity = liabilities.reduce((s, r) => s + r.balance, 0) + equity.reduce((s, r) => s + r.balance, 0);
    const diff = totalAssets - totalLiabEquity;
    el.innerHTML = renderGroup('Assets', assets) + renderGroup('Liabilities', liabilities) + renderGroup('Equity', equity)
      + `<div class="card p-5" style="background:var(--navy-50)">
        <div class="flex justify-between text-sm font-semibold"><span style="color:var(--navy-700)">Total Assets</span><span style="color:var(--navy-700)">${totalAssets.toLocaleString()} MAD</span></div>
        <div class="flex justify-between text-sm font-semibold mt-1"><span style="color:var(--navy-700)">Total Liabilities + Equity</span><span style="color:var(--navy-700)">${totalLiabEquity.toLocaleString()} MAD</span></div>
        <div class="flex justify-between text-sm font-semibold mt-1 pt-1 border-t" style="border-color:var(--border-default); color:${Math.abs(diff) < 0.01 ? 'var(--success-600)' : 'var(--danger-600)'}"><span>Difference</span><span>${diff.toLocaleString()} MAD</span></div>
      </div>`;
  }

  // ---- P&L (date-range driven — replaces the old fixed This Month/This
  // Year/All Time buckets so the admin can track any arbitrary range) ----
  async function renderPnl() {
    const el = document.getElementById('admin-pnl');
    if (!el) return;
    const from = document.getElementById('pnl-from').value || null;
    const to = document.getElementById('pnl-to').value || null;
    const rows = await EP.getAccountBalances(from, to);
    const revenue = rows.filter((r) => r.type === 'revenue');
    const expense = rows.filter((r) => r.type === 'expense');
    const totalRevenue = revenue.reduce((s, r) => s + r.balance, 0);
    const totalExpense = expense.reduce((s, r) => s + r.balance, 0);
    const netProfit = totalRevenue - totalExpense;
    el.innerHTML = `
      <div class="card p-5">
        <p class="font-semibold mb-3" style="color:var(--navy-700)">Revenue</p>
        ${revenue.map((r) => `<div class="flex justify-between text-sm py-1"><span style="color:var(--text-secondary)">${escapeHtml(r.code)} ${escapeHtml(r.name)}</span><span style="color:var(--navy-700)">${r.balance.toLocaleString()} MAD</span></div>`).join('') || `<p class="text-sm" style="color:var(--text-secondary)">None.</p>`}
        <div class="flex justify-between text-sm font-semibold pt-2 mt-2 border-t" style="border-color:var(--border-default)"><span style="color:var(--navy-700)">Total Revenue</span><span style="color:var(--navy-700)">${totalRevenue.toLocaleString()} MAD</span></div>
      </div>
      <div class="card p-5">
        <p class="font-semibold mb-3" style="color:var(--navy-700)">Expenses</p>
        ${expense.map((r) => `<div class="flex justify-between text-sm py-1"><span style="color:var(--text-secondary)">${escapeHtml(r.code)} ${escapeHtml(r.name)}</span><span style="color:var(--danger-600)">${r.balance.toLocaleString()} MAD</span></div>`).join('') || `<p class="text-sm" style="color:var(--text-secondary)">None.</p>`}
        <div class="flex justify-between text-sm font-semibold pt-2 mt-2 border-t" style="border-color:var(--border-default)"><span style="color:var(--navy-700)">Total Expenses</span><span style="color:var(--danger-600)">${totalExpense.toLocaleString()} MAD</span></div>
      </div>
      <div class="card p-5" style="background:var(--navy-50)">
        <div class="flex justify-between text-lg font-bold"><span style="color:var(--navy-700)">Net Profit</span><span style="color:${netProfit >= 0 ? 'var(--success-600)' : 'var(--danger-600)'}">${netProfit.toLocaleString()} MAD</span></div>
      </div>`;
  }

  // ---- Journal Entry (manual entries) ----
  let jeLineCounter = 0;
  window.addJournalEntryLineRow = () => {
    const container = document.getElementById('je-lines');
    const rowId = 'je-line-' + (jeLineCounter++);
    const options = financeAccountsCache.filter((a) => a.isActive).map((a) => `<option value="${a.id}">${escapeHtml(a.code)} — ${escapeHtml(a.name)}</option>`).join('');
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center';
    row.id = rowId;
    row.innerHTML = `
      <select class="je-line-account flex-1 px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)"><option value="">Select account</option>${options}</select>
      <input type="number" step="0.01" min="0" placeholder="Debit" class="je-line-debit w-24 px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)">
      <input type="number" step="0.01" min="0" placeholder="Credit" class="je-line-credit w-24 px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)">
      <button type="button" onclick="document.getElementById('${rowId}').remove(); updateJeBalanceIndicator();" class="text-xs font-semibold shrink-0" style="color:var(--danger-600)">Remove</button>`;
    container.appendChild(row);
    row.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', updateJeBalanceIndicator));
    updateJeBalanceIndicator();
  };
  window.updateJeBalanceIndicator = () => {
    const indicator = document.getElementById('je-balance-indicator');
    if (!indicator) return;
    const debits = [...document.querySelectorAll('.je-line-debit')].reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const credits = [...document.querySelectorAll('.je-line-credit')].reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
    const balanced = Math.abs(debits - credits) < 0.005 && debits > 0;
    indicator.textContent = `Debits: ${debits.toFixed(2)} · Credits: ${credits.toFixed(2)}${balanced ? ' — Balanced ✓' : (debits || credits) ? ' — Not balanced yet' : ''}`;
    indicator.style.color = balanced ? 'var(--success-600)' : (debits || credits) ? 'var(--danger-600)' : 'var(--text-secondary)';
  };
  async function renderJournalEntryTab() {
    await loadFinanceAccounts();
    const dateInput = document.getElementById('je-date');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    const linesContainer = document.getElementById('je-lines');
    if (!linesContainer.children.length) {
      addJournalEntryLineRow();
      addJournalEntryLineRow();
    } else {
      linesContainer.querySelectorAll('select.je-line-account').forEach((sel) => {
        const current = sel.value;
        const options = financeAccountsCache.filter((a) => a.isActive).map((a) => `<option value="${a.id}">${escapeHtml(a.code)} — ${escapeHtml(a.name)}</option>`).join('');
        sel.innerHTML = `<option value="">Select account</option>${options}`;
        sel.value = current;
      });
    }
    await renderManualJournalEntries();
  }
  async function renderManualJournalEntries() {
    const el = document.getElementById('admin-manual-entries-list');
    if (!el) return;
    const rows = await EP.getJournalEntries(null, null, null);
    const manual = rows.filter((r) => r.sourceType === 'manual' || r.sourceType === 'reversal');
    const byEntry = {};
    manual.forEach((r) => {
      if (!byEntry[r.entryId]) byEntry[r.entryId] = { ...r, lines: [] };
      byEntry[r.entryId].lines.push(r);
    });
    const entries = Object.values(byEntry).sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
    el.innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-left px-5 py-3 text-white font-semibold">Date</th><th class="text-left px-5 py-3 text-white font-semibold">Memo</th><th class="text-left px-5 py-3 text-white font-semibold">Lines</th><th class="px-5 py-3"></th></tr></thead><tbody>
      ${entries.map((e, i) => `<tr style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}; opacity:${e.voidedAt ? '0.6' : '1'}">
        <td class="px-5 py-3" style="color:var(--text-secondary)">${new Date(e.entryDate).toLocaleDateString()}</td>
        <td class="px-5 py-3" style="color:var(--navy-700)">${escapeHtml(e.memo || '—')}${e.voidedAt ? ' <span class="badge badge-danger">Voided</span>' : ''}${e.sourceType === 'reversal' ? ' <span class="badge badge-warning">Reversal</span>' : ''}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${e.lines.map((l) => `${escapeHtml(l.accountCode)} ${l.debit ? 'Dr ' + l.debit.toLocaleString() : 'Cr ' + l.credit.toLocaleString()}`).join(', ')}</td>
        <td class="px-5 py-3 text-right">${e.sourceType === 'manual' && !e.voidedAt ? `<button onclick="voidManualEntryConfirm('${e.entryId}')" class="text-xs font-semibold" style="color:var(--danger-600)">Void</button>` : ''}</td>
      </tr>`).join('') || `<tr><td colspan="4" class="px-5 py-8 text-center" style="color:var(--text-secondary)">No manual entries yet.</td></tr>`}
    </tbody></table>`;
  }
  window.voidManualEntryConfirm = async (entryId) => {
    const reason = prompt('Why is this journal entry being voided? (shown in the audit history)');
    if (reason === null) return;
    try {
      await EP.voidManualJournalEntry(entryId, reason || null);
      await renderManualJournalEntries();
      showToast('Journal entry voided');
    } catch (err) { showToast(err.message, 'danger'); }
  };
  document.getElementById('journal-entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const lines = [...document.getElementById('je-lines').children].map((row) => ({
      accountId: row.querySelector('.je-line-account').value,
      debit: parseFloat(row.querySelector('.je-line-debit').value) || 0,
      credit: parseFloat(row.querySelector('.je-line-credit').value) || 0,
    })).filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
    if (lines.length < 2) { showToast('Add at least two lines, each with an account and an amount', 'danger'); return; }
    try {
      await EP.createManualJournalEntry(document.getElementById('je-date').value, document.getElementById('je-memo').value, lines);
      document.getElementById('journal-entry-form').reset();
      document.getElementById('je-lines').innerHTML = '';
      addJournalEntryLineRow();
      addJournalEntryLineRow();
      document.getElementById('je-date').value = new Date().toISOString().slice(0, 10);
      await renderManualJournalEntries();
      showToast('Journal entry posted');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- Payroll ----
  async function renderPayrollTab() {
    const el = document.getElementById('admin-payroll-list');
    if (!el) return;
    const rows = await EP.payrollEntries();
    el.innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-left px-5 py-3 text-white font-semibold">Teacher</th><th class="text-left px-5 py-3 text-white font-semibold">Period</th><th class="text-left px-5 py-3 text-white font-semibold">Gross</th><th class="text-left px-5 py-3 text-white font-semibold">Paid</th><th class="px-5 py-3"></th></tr></thead><tbody>
      ${rows.map((p, i) => `<tr onclick="openPayrollModal({ id: '${p.id}' })" style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}; cursor:pointer; opacity:${p.voidedAt ? '0.55' : '1'}">
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(p.teacherName)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${new Date(p.periodStart).toLocaleDateString()} – ${new Date(p.periodEnd).toLocaleDateString()}</td>
        <td class="px-5 py-3 font-semibold" style="color:var(--navy-700)">${p.grossAmount.toLocaleString()} ${escapeHtml(p.currency)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${new Date(p.paidAt).toLocaleDateString()}</td>
        <td class="px-5 py-3 text-right">${p.voidedAt ? '<span class="badge badge-danger">Voided</span>' : ''}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="px-5 py-8 text-center" style="color:var(--text-secondary)">No payroll entries yet.</td></tr>`}
    </tbody></table>`;
  }
  window.openPayrollModal = async ({ id } = {}) => {
    const [teachers, allPayroll] = await Promise.all([EP.users(), id ? EP.payrollEntries() : Promise.resolve([])]);
    const teacherSelect = document.getElementById('payroll-teacher');
    teacherSelect.innerHTML = teachers.filter((u) => u.role === 'teacher').map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    document.getElementById('payroll-form').reset();
    document.getElementById('payroll-currency').value = 'MAD';
    const existing = id ? allPayroll.find((p) => p.id === id) : null;
    document.getElementById('payroll-id').value = id || '';
    document.getElementById('payroll-modal-title').textContent = existing ? 'Edit Payroll Entry' : 'Add Payroll Entry';
    const voidBtn = document.getElementById('payroll-void-btn');
    if (existing) {
      if (existing.teacherId) teacherSelect.value = existing.teacherId;
      document.getElementById('payroll-period-start').value = existing.periodStart;
      document.getElementById('payroll-period-end').value = existing.periodEnd;
      document.getElementById('payroll-amount').value = existing.grossAmount;
      document.getElementById('payroll-currency').value = existing.currency;
      document.getElementById('payroll-paid-at').value = new Date(existing.paidAt).toISOString().slice(0, 10);
      document.getElementById('payroll-notes').value = existing.notes || '';
      voidBtn.classList.remove('hidden');
      voidBtn.textContent = existing.voidedAt ? 'Restore (Unvoid)' : 'Void';
      voidBtn.onclick = async () => {
        try {
          if (existing.voidedAt) { await EP.unvoidPayrollEntry(id); showToast('Payroll entry restored'); }
          else {
            const reason = prompt('Why is this payroll entry being voided? (shown in the audit history)');
            if (reason === null) return;
            await EP.voidPayrollEntry(id, reason || null);
            showToast('Payroll entry voided');
          }
          closeModal('payroll-modal');
          await renderPayrollTab();
        } catch (err) { showToast(err.message, 'danger'); }
      };
    } else {
      document.getElementById('payroll-paid-at').value = new Date().toISOString().slice(0, 10);
      voidBtn.classList.add('hidden');
    }
    document.getElementById('payroll-modal').classList.remove('hidden');
  };
  document.getElementById('payroll-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('payroll-id').value;
    const teacherSelect = document.getElementById('payroll-teacher');
    const teacherName = teacherSelect.selectedOptions[0]?.textContent || '';
    const payload = {
      teacherId: teacherSelect.value,
      teacherName,
      periodStart: document.getElementById('payroll-period-start').value,
      periodEnd: document.getElementById('payroll-period-end').value,
      grossAmount: parseFloat(document.getElementById('payroll-amount').value),
      currency: document.getElementById('payroll-currency').value || 'MAD',
      notes: document.getElementById('payroll-notes').value,
      paidAt: document.getElementById('payroll-paid-at').value,
    };
    try {
      if (id) await EP.updatePayrollEntry(id, payload);
      else await EP.addPayrollEntry(payload);
      closeModal('payroll-modal');
      await renderPayrollTab();
      showToast(id ? 'Payroll entry updated' : 'Payroll entry recorded');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- PDF receipts (jsPDF, loaded via CDN in admin-dashboard.html) ----
  window.downloadPaymentReceipt = async (paymentId, event) => {
    if (event) event.stopPropagation();
    try {
      if (!window.jspdf) { showToast('PDF library failed to load — check your connection and try again', 'danger'); return; }
      const payments = await EP.payments();
      const p = payments.find((x) => x.id === paymentId);
      if (!p) { showToast('Payment not found', 'danger'); return; }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a5' });
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('EuroPass', 14, 18);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Payment Receipt', 14, 26);
      doc.setDrawColor(11, 29, 58);
      doc.setLineWidth(0.4);
      doc.line(14, 30, pageWidth - 14, 30);
      doc.setFontSize(10);
      let y = 42;
      const row = (label, value) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value ?? '—'), 60, y);
        y += 8;
      };
      row('Receipt #:', p.id.slice(0, 8).toUpperCase());
      row('Student:', p.studentName);
      row('Amount:', `${p.amount.toLocaleString()} ${p.currency}`);
      row('Date:', new Date(p.paidAt).toLocaleDateString());
      row('Method:', p.method.replace('_', ' '));
      if (p.courseName) row('Course:', p.courseName);
      if (p.notes) row('Notes:', p.notes);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('EuroPass Language & Nursing School, Khemisset', 14, y + 6);
      doc.save(`receipt-${p.id.slice(0, 8)}.pdf`);
    } catch (err) { showToast(err.message, 'danger'); }
  };

  // ---- Ledger table filter state (Payments + Expenses, on Analytics) ----
  let paymentsSearchTerm = '', paymentsShowVoided = false;
  let expensesSearchTerm = '', expensesShowVoided = false;
  document.getElementById('payments-search')?.addEventListener('input', (e) => { paymentsSearchTerm = e.target.value.trim().toLowerCase(); renderPaymentsLedger(); });
  document.getElementById('payments-show-voided')?.addEventListener('change', (e) => { paymentsShowVoided = e.target.value === 'show'; renderPaymentsLedger(); });
  document.getElementById('expenses-search')?.addEventListener('input', (e) => { expensesSearchTerm = e.target.value.trim().toLowerCase(); renderExpensesLedger(); });
  document.getElementById('expenses-show-voided')?.addEventListener('change', (e) => { expensesShowVoided = e.target.value === 'show'; renderExpensesLedger(); });

  async function renderPaymentsLedger() {
    const el = document.getElementById('admin-payments-list');
    if (!el) return;
    let rows = await EP.payments();
    if (!paymentsShowVoided) rows = rows.filter((p) => !p.voidedAt);
    if (paymentsSearchTerm) rows = rows.filter((p) => p.studentName?.toLowerCase().includes(paymentsSearchTerm) || p.courseName?.toLowerCase().includes(paymentsSearchTerm));
    el.innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-left px-5 py-3 text-white font-semibold">Student</th><th class="text-left px-5 py-3 text-white font-semibold">Course</th><th class="text-left px-5 py-3 text-white font-semibold">Amount</th><th class="text-left px-5 py-3 text-white font-semibold">Method</th><th class="text-left px-5 py-3 text-white font-semibold">Date</th><th class="px-5 py-3"></th></tr></thead><tbody>
      ${rows.map((p, i) => `<tr onclick="openPaymentModal({ id: '${p.id}' })" style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}; cursor:pointer; opacity:${p.voidedAt ? '0.55' : '1'}">
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(p.studentName)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(p.courseName || '—')}</td>
        <td class="px-5 py-3 font-semibold" style="color:var(--navy-700)">${p.amount.toLocaleString()} ${escapeHtml(p.currency)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(p.method.replace('_', ' '))}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${new Date(p.paidAt).toLocaleDateString()}</td>
        <td class="px-5 py-3 text-right">
          ${p.voidedAt ? '<span class="badge badge-danger">Voided</span>' : ''}
          <button onclick="downloadPaymentReceipt('${p.id}', event)" class="text-xs font-semibold ml-2" style="color:var(--teal-600)">Receipt</button>
        </td>
      </tr>`).join('') || `<tr><td colspan="6" class="px-5 py-8 text-center" style="color:var(--text-secondary)">No payments yet.</td></tr>`}
    </tbody></table>`;
  }

  async function renderExpensesLedger() {
    const el = document.getElementById('admin-expenses-list');
    if (!el) return;
    let rows = await EP.expenses();
    if (!expensesShowVoided) rows = rows.filter((x) => !x.voidedAt);
    if (expensesSearchTerm) rows = rows.filter((x) => x.category?.toLowerCase().includes(expensesSearchTerm) || x.vendor?.toLowerCase().includes(expensesSearchTerm));
    el.innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-left px-5 py-3 text-white font-semibold">Category</th><th class="text-left px-5 py-3 text-white font-semibold">Vendor</th><th class="text-left px-5 py-3 text-white font-semibold">Amount</th><th class="text-left px-5 py-3 text-white font-semibold">Date</th><th class="px-5 py-3"></th></tr></thead><tbody>
      ${rows.map((x, i) => `<tr onclick="openExpenseModal({ id: '${x.id}' })" style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}; cursor:pointer; opacity:${x.voidedAt ? '0.55' : '1'}">
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(x.category)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(x.vendor || '—')}</td>
        <td class="px-5 py-3 font-semibold" style="color:var(--danger-600)">${x.amount.toLocaleString()} ${escapeHtml(x.currency)}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${new Date(x.incurredAt).toLocaleDateString()}</td>
        <td class="px-5 py-3 text-right">${x.voidedAt ? '<span class="badge badge-danger">Voided</span>' : ''}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="px-5 py-8 text-center" style="color:var(--text-secondary)">No expenses yet.</td></tr>`}
    </tbody></table>`;
  }

  async function renderAnalytics() {
    if (!document.getElementById('analytics-chart-revenue') || !window.Chart) return;
    const [allEnr, allPayments, allExpenses, balances, needsReview, upcomingDue, roster] = await Promise.all([
      EP.allEnrollments(), EP.payments(), EP.expenses(), EP.studentBalances(), EP.legacyPaymentFlagsNeedingReview(), EP.upcomingPaymentsDue(7), EP.users(),
    ]);
    const userById3 = Object.fromEntries(roster.map((u) => [u.id, u]));
    const livePayments = allPayments.filter((p) => !p.voidedAt);
    const liveExpenses = allExpenses.filter((x) => !x.voidedAt);

    const active = allEnr.filter((e) => e.status === 'active' || e.status === 'completed');
    const now = new Date();

    // Revenue is now real money received (the payments ledger), not just
    // an enrollment's invoiced price regardless of whether it was ever
    // actually paid, which used to inflate this number. Nothing here
    // resets automatically; "This Month"/"This Year" are filtered views
    // over the same permanent records, recalculated fresh on every load.
    const sumSince = (rows, dateField, pred) => rows.filter((r) => r[dateField] && pred(new Date(r[dateField]))).reduce((sum, r) => sum + r.amount, 0);
    const revenueTotal = livePayments.reduce((sum, p) => sum + p.amount, 0);
    const revenueThisYear = sumSince(livePayments, 'paidAt', (d) => d.getFullYear() === now.getFullYear());
    const revenueThisMonth = sumSince(livePayments, 'paidAt', (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth());
    const expensesTotal = liveExpenses.reduce((sum, x) => sum + x.amount, 0);
    const expensesThisMonth = sumSince(liveExpenses, 'incurredAt', (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth());
    const receivableTotal = Object.values(balances).reduce((sum, b) => sum + Math.max(0, b.balance), 0);

    document.getElementById('analytics-revenue-month').textContent = revenueThisMonth.toLocaleString() + ' MAD';
    document.getElementById('analytics-revenue-year').textContent = revenueThisYear.toLocaleString() + ' MAD';
    document.getElementById('analytics-revenue-total').textContent = revenueTotal.toLocaleString() + ' MAD';
    document.getElementById('analytics-expenses-month').textContent = expensesThisMonth.toLocaleString() + ' MAD';
    document.getElementById('analytics-profit-month').textContent = (revenueThisMonth - expensesThisMonth).toLocaleString() + ' MAD';
    document.getElementById('analytics-profit-total').textContent = (revenueTotal - expensesTotal).toLocaleString() + ' MAD';
    document.getElementById('analytics-receivable').textContent = receivableTotal.toLocaleString() + ' MAD';
    document.getElementById('analytics-active-students').textContent = String(active.length);
    document.getElementById('analytics-conversion').textContent = allEnr.length ? Math.round((active.length / allEnr.length) * 100) + '%' : '\u2014';

    // "Payment Due Soon" -- enrollments with a due date within the next
    // week (or overdue) and a balance still owed. Email/WhatsApp buttons
    // reuse the same mailto:/wa.me pattern as the User Details modal —
    // there's no automated email-sending set up, so this is the one-click
    // way to actually reach out.
    const duePanel = document.getElementById('payment-due-panel');
    if (upcomingDue.length) {
      duePanel.classList.remove('hidden');
      document.getElementById('payment-due-list').innerHTML = upcomingDue.map((e) => {
        const student = userById3[e.studentId];
        const name = student?.name || 'Unknown student';
        const bal = balances[e.studentId]?.balance || 0;
        const due = new Date(e.paymentDueAt);
        const isOverdue = due < now;
        const dueLabel = isOverdue ? `overdue since ${due.toLocaleDateString()}` : `due ${due.toLocaleDateString()}`;
        const subject = encodeURIComponent('EuroPass Academy — payment reminder');
        const body = encodeURIComponent(`Hi ${name},\n\nThis is a friendly reminder that your payment of ${bal.toLocaleString()} MAD is ${dueLabel}. Please let us know if you have any questions.\n\nThank you,\nEuroPass Academy`);
        const mailLink = student?.email ? `<a href="mailto:${student.email}?subject=${subject}&body=${body}" class="btn btn-secondary btn-sm shrink-0"><i data-lucide="mail" class="w-3.5 h-3.5 mr-1"></i> Email</a>` : '';
        return `<div class="flex items-center justify-between gap-3 p-2 rounded-md" style="background:#fff">
          <span class="text-sm min-w-0"><a href="#" onclick="event.preventDefault(); openUserDetailModal('${e.studentId}')" class="hover:underline font-medium" style="color:var(--navy-700)">${escapeHtml(name)}</a> — <span style="color:${isOverdue ? 'var(--danger-600)' : 'var(--text-secondary)'}">${bal.toLocaleString()} MAD ${dueLabel}</span></span>
          <div class="flex gap-2 shrink-0">${mailLink}</div>
        </div>`;
      }).join('');
    } else {
      duePanel.classList.add('hidden');
    }

    // "Needs review" -- legacy marked-paid flags with no ledger payment.
    const reviewPanel = document.getElementById('finance-review-panel');
    if (needsReview.length) {
      reviewPanel.classList.remove('hidden');
      document.getElementById('finance-review-list').innerHTML = needsReview.map((r) => `
        <div class="flex items-center justify-between gap-3 p-2 rounded-md" style="background:#fff">
          <span class="text-sm" style="color:var(--navy-700)">${escapeHtml(r.name)} — marked paid ${EP.timeAgo(r.lastPaymentAt)}, no priced enrollment to infer an amount from</span>
          <button onclick="openPaymentModal({ studentId: '${r.id}' })" class="btn btn-secondary btn-sm shrink-0">Add Payment</button>
        </div>`).join('');
    } else {
      reviewPanel.classList.add('hidden');
    }
    renderPaymentsLedger();
    renderExpensesLedger();

    // Year selector for the Revenue by Month chart, populated from the
    // actual years that appear in your payments, so it never shows a year
    // with nothing in it.
    const yearsWithRevenue = [...new Set(livePayments.map((p) => new Date(p.paidAt).getFullYear()))].sort((a, b) => b - a);
    if (!yearsWithRevenue.includes(now.getFullYear())) yearsWithRevenue.unshift(now.getFullYear());
    const yearSelect = document.getElementById('analytics-revenue-year-select');
    if (!yearSelect.dataset.populated) {
      yearSelect.innerHTML = yearsWithRevenue.map((y) => `<option value="${y}">${y}</option>`).join('');
      yearSelect.value = String(analyticsSelectedYear);
      yearSelect.addEventListener('change', () => { analyticsSelectedYear = Number(yearSelect.value); renderAnalytics(); });
      yearSelect.dataset.populated = '1';
    }

    // Revenue by month, for the selected year specifically
    const revenueByMonth = Array(12).fill(0);
    livePayments.forEach((p) => {
      const d = new Date(p.paidAt);
      if (d.getFullYear() === analyticsSelectedYear) revenueByMonth[d.getMonth()] += p.amount;
    });
    const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'short' }));

    // Expenses by category, all time
    const expenseByCategory = {};
    liveExpenses.forEach((x) => { expenseByCategory[x.category] = (expenseByCategory[x.category] || 0) + x.amount; });
    const expenseEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

    const navy = '#0B1D3A', red = '#DC2626', teal = '#0D9488', amber = '#C77D14', grey = '#94A3B8';

    if (chartRevenue) chartRevenue.destroy();
    chartRevenue = new Chart(document.getElementById('analytics-chart-revenue'), {
      type: 'bar',
      data: { labels: monthNames, datasets: [{ label: 'Revenue (MAD)', data: revenueByMonth, backgroundColor: teal }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });

    if (chartExpenses) chartExpenses.destroy();
    chartExpenses = new Chart(document.getElementById('analytics-chart-expenses'), {
      type: 'doughnut',
      data: { labels: expenseEntries.map((e) => e[0]), datasets: [{ data: expenseEntries.map((e) => e[1]), backgroundColor: [red, amber, teal, navy, grey, '#7C3AED', '#DB2777', '#059669'] }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });
    lucide.createIcons();
  }

  async function renderAll() {
    const { allPosts, allNotifs } = await renderKPIs();
    await renderActivity(allNotifs, allPosts);
    renderPosts(allPosts);
    renderNotifHistory(allNotifs);
    await renderUsers();
    await renderHomework();
    await renderResources();
    await renderAnalytics();
    lucide.createIcons();
  }
  await renderAll();
  EP.onChange([EP.KEYS.posts, EP.KEYS.notifications, EP.KEYS.profiles, EP.KEYS.homework, EP.KEYS.submissions, EP.KEYS.enrollments, EP.KEYS.resources, EP.KEYS.payments, EP.KEYS.expenses], renderAll);
  // Accounting sub-tabs (Chart of Accounts / General Ledger / Trial Balance /
  // Balance Sheet / P&L / Journal Entry / Payroll) have their own data that
  // isn't part of renderAll() — refresh whichever one is currently open.
  EP.onChange([EP.KEYS.accounts, EP.KEYS.journal_entries, EP.KEYS.journal_entry_lines, EP.KEYS.payroll_entries], () => renderFinanceTab(financeTab));

  // ---- Fullscreen editor toggle ----
  window.toggleFullscreenEditor = () => {
    const card = document.getElementById('post-modal-card');
    const isFull = card.classList.toggle('is-fullscreen');
    document.getElementById('fullscreen-label').textContent = isFull ? 'Collapse' : 'Expand';
  };

  // ---- Category dropdown (populated from the categories table, filtered
  // by the post's own Language field, with a hardcoded English fallback so
  // the form still works if migration 010 hasn't been run yet) ----
  const FALLBACK_CATEGORIES = ['Career', 'Parenting', 'IELTS', 'Vie Locale', 'Entertainment'];
  async function populateCategoryOptions(selected) {
    const select = document.getElementById('post-category');
    const lang = document.getElementById('post-language').value || 'en';
    let names = lang === 'en' ? FALLBACK_CATEGORIES : [];
    try {
      const cats = await EP.categories(lang);
      if (cats && cats.length) names = cats.map(c => c.name);
    } catch (err) {
      console.error('Could not load categories table (has migration 010_categories.sql been run?), using defaults:', err);
    }
    select.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('');
    if (selected) select.value = selected;
  }
  document.getElementById('post-language').addEventListener('change', () => populateCategoryOptions());

  // ---- Manage categories modal — has its own EN/AR toggle, independent
  // of whatever language the post form currently has selected ----
  let categoryManagerLang = 'en';
  window.loadCategoryManager = async (lang) => {
    if (lang) categoryManagerLang = lang;
    document.querySelectorAll('#category-lang-toggle button').forEach((b) => {
      const active = b.dataset.lang === categoryManagerLang;
      b.classList.toggle('btn-primary', active);
      b.classList.toggle('btn-secondary', !active);
    });
    const list = document.getElementById('category-list');
    list.innerHTML = `<p class="text-xs" style="color:var(--text-secondary)">Loading...</p>`;
    try {
      const cats = await EP.categories(categoryManagerLang);
      list.innerHTML = cats.map(c => `
        <div class="flex items-center justify-between px-3 py-2 rounded-md" style="background:var(--bg-subtle)" ${categoryManagerLang === 'ar' ? 'dir="rtl"' : ''}>
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
      await EP.addCategory(input.value, categoryManagerLang);
      input.value = '';
      await loadCategoryManager();
      showToast('Category added');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- Post modal ----
  window.openPostForm = async () => {
    document.getElementById('post-form').reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-language').value = 'en';
    document.getElementById('post-cover-preview').classList.add('hidden');
    document.getElementById('post-cover-status').classList.add('hidden');
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
    document.getElementById('post-language').value = p.language || 'en';
    await populateCategoryOptions(p.category);
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
  // Uploading a file fills the URL field with the result — the two inputs
  // aren't separate modes, whichever the admin used most recently just wins,
  // same low-friction pattern as the resource PDF upload.
  document.getElementById('post-cover-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = document.getElementById('post-cover-status');
    status.classList.remove('hidden');
    status.style.color = 'var(--text-secondary)';
    status.textContent = 'Uploading...';
    try {
      const url = await EP.uploadPostCover(file);
      document.getElementById('post-cover-url').value = url;
      updateCoverPreview();
      status.textContent = 'Uploaded.';
      status.style.color = 'var(--success-600)';
    } catch (err) {
      status.textContent = err.message;
      status.style.color = 'var(--danger-600)';
      e.target.value = '';
    }
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
  window.generateUserPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    document.getElementById('user-password').value = pwd;
  };
  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const email = document.getElementById('user-email').value;
      const password = document.getElementById('user-password').value;
      await EP.addUser({
        name: document.getElementById('user-name').value,
        email,
        password,
        role: document.getElementById('user-role').value,
        courseId: document.getElementById('user-course').value,
      });
      closeModal('user-modal');
      await renderAll();
      alert(`User created successfully.\n\nLogin email: ${email}\nPassword: ${password}\n\nShare these with them directly — this won't be shown again.`);
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
    const [all, courseList, roster, balances] = await Promise.all([EP.allEnrollments(), EP.courses(), EP.users(), EP.studentBalances()]);
    const courseById = Object.fromEntries(courseList.map(c => [c.id, c.name]));
    const userById2 = Object.fromEntries(roster.map(u => [u.id, u.name]));
    const listEl = document.getElementById('admin-enrollments-list');

    // "No Enrollment" isn't a status on any enrollment row \u2014 it's students
    // with zero rows at all. Two genuinely different situations land here,
    // and they need different framing so this list doesn't look like a
    // pile of mistakes:
    //  - Already has course access (profiles.course_id is set) \u2014 an admin
    //    added them directly with a course picked at creation time, which
    //    grants real access immediately without ever going through the
    //    enrollment table. They're not missing anything to use the
    //    platform; they're only missing a billing/payment record.
    //  - No course access at all \u2014 a self-signup student whose enrollment
    //    request never got created (the historical login()/
    //    ensurePendingEnrollment bug) or someone added without a course.
    //    They can't do anything on the platform yet.
    if (enrollmentFilter === 'unenrolled') {
      const unenrolled = roster.filter(u => u.role === 'student' && !balances[u.id]?.hasEnrollment);
      listEl.innerHTML = unenrolled.map(u => {
        const hasAccess = !!u.courseId;
        const badge = hasAccess
          ? `<span class="badge badge-info">Has course access \u2014 no billing record</span>`
          : `<span class="badge badge-warning">No course access</span>`;
        const courseLine = hasAccess ? `${escapeHtml(courseById[u.courseId] || 'Unknown course')} \u00b7 ` : '';
        return `
        <div class="card p-5 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">${badge}</div>
            <p class="font-semibold truncate" style="color:var(--navy-700)"><a href="#" onclick="event.preventDefault(); openUserDetailModal('${u.id}')" class="hover:underline">${escapeHtml(u.name)}</a></p>
            <p class="text-xs mt-1" style="color:var(--text-secondary)">${courseLine}${escapeHtml(u.email || 'No email on file')}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="openEnrollStudentModal('${u.id}')" class="btn btn-primary btn-sm">${hasAccess ? 'Add Billing Record' : 'Enroll'}</button>
          </div>
        </div>`;
      }).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">Every student has an enrollment record.</p></div>`;
      return;
    }

    const filtered = enrollmentFilter === 'all' ? all : all.filter(e => e.status === enrollmentFilter);
    const statusBadge = { pending: 'badge-warning', active: 'badge-success', completed: 'badge-info', cancelled: 'badge-danger' };
    const now = new Date();
    document.getElementById('admin-enrollments-list').innerHTML = filtered.map(e => {
      const bal = balances[e.studentId]?.balance || 0;
      let dueHtml = '';
      if (e.status === 'active' && e.paymentDueAt && bal > 0) {
        const due = new Date(e.paymentDueAt);
        const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        const isUrgent = days <= 7;
        const dueLabel = days < 0 ? `overdue since ${due.toLocaleDateString()}` : `due ${due.toLocaleDateString()}`;
        dueHtml = ` \u00b7 <span style="color:${isUrgent ? 'var(--danger-600)' : 'var(--text-secondary)'}; font-weight:${isUrgent ? '600' : '400'}">payment ${dueLabel}</span>`;
      }
      return `
      <div class="card p-5 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge ${statusBadge[e.status] || 'badge-info'}">${e.status}</span>
            <span class="badge ${e.paymentStatus === 'paid' ? 'badge-success' : e.paymentStatus === 'waived' ? 'badge-info' : 'badge-warning'}">${e.paymentStatus}</span>
            ${!e.courseId ? `<span class="badge badge-warning">Course undecided</span>` : ''}
          </div>
          <p class="font-semibold truncate" style="color:var(--navy-700)"><a href="#" onclick="event.preventDefault(); openUserDetailModal('${e.studentId}')" class="hover:underline">${escapeHtml(userById2[e.studentId] || 'Unknown student')}</a> \u2192 ${e.courseId ? escapeHtml(courseById[e.courseId] || 'Unknown course') : 'Not yet decided'}</p>
          <p class="text-xs mt-1" style="color:var(--text-secondary)">Requested ${EP.timeAgo(e.requestedAt)}${e.priceMad ? ` \u00b7 ${e.priceMad} MAD` : ''}${dueHtml}</p>
        </div>
        ${e.status === 'pending' ? `
        <div class="flex gap-2 shrink-0">
          <button onclick='openActivateModal(${JSON.stringify(e.id)}, ${JSON.stringify(userById2[e.studentId] || '')}, ${JSON.stringify(e.courseId || '')})' class="btn btn-primary btn-sm">Approve</button>
          <button onclick="rejectEnrollmentConfirm('${e.id}')" class="btn btn-secondary btn-sm" style="color:var(--danger-600); border-color:var(--danger-600)">Reject</button>
        </div>` : ''}
        ${e.status === 'active' ? `
        <div class="flex gap-2 shrink-0">
          <button onclick='openActivateModal(${JSON.stringify(e.id)}, ${JSON.stringify(userById2[e.studentId] || '')}, ${JSON.stringify(e.courseId || '')}, ${JSON.stringify(e.priceMad || '')}, ${JSON.stringify(e.paymentStatus || 'unpaid')}, ${JSON.stringify(e.paymentDueAt || '')})' class="btn btn-secondary btn-sm">Edit</button>
        </div>` : ''}
        ${e.status === 'cancelled' ? `
        <div class="flex gap-2 shrink-0">
          <button onclick="revertEnrollmentConfirm('${e.id}')" class="btn btn-secondary btn-sm">Reinstate</button>
        </div>` : ''}
      </div>`;
    }).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">No ${enrollmentFilter === 'all' ? '' : enrollmentFilter + ' '}enrollments.</p></div>`;
  }
  window.revertEnrollmentConfirm = async (id) => {
    if (!confirm('Move this enrollment back to Pending? You\'ll be able to approve it again from the Pending list.')) return;
    try { await EP.revertEnrollment(id); await renderEnrollments(); showToast('Enrollment reinstated to Pending'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  window.openActivateModal = async (id, studentName, courseId, existingPrice, existingPaymentStatus, existingDueAt) => {
    const isEdit = existingPrice !== undefined;
    document.getElementById('activate-enrollment-id').value = id;
    document.getElementById('activate-student-id').value = '';
    document.getElementById('activate-modal-summary').innerHTML = `<strong>${escapeHtml(studentName)}</strong>`;
    document.getElementById('activate-enrollment-form').reset();
    document.querySelector('#activate-enrollment-modal p.font-serif').textContent = isEdit ? 'Edit Enrollment' : 'Activate Enrollment';
    document.querySelector('#activate-enrollment-form button[type="submit"]').textContent = isEdit ? 'Save Changes' : 'Activate Enrollment';
    const courseSelect = document.getElementById('activate-course');
    const courseList = await EP.courses();
    courseSelect.innerHTML = courseList.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    document.getElementById('activate-course-hint').classList.toggle('hidden', !!courseId);
    if (courseId) courseSelect.value = courseId;
    if (isEdit) {
      document.getElementById('activate-price').value = existingPrice;
      document.getElementById('activate-payment-status').value = existingPaymentStatus || 'unpaid';
      document.getElementById('activate-payment-due').value = existingDueAt ? existingDueAt.slice(0, 10) : '';
    }
    document.getElementById('activate-cancel-link').classList.toggle('hidden', !isEdit);
    document.getElementById('activate-enrollment-modal').classList.remove('hidden');
  };

  // For a student who has no enrollment record at all (typically one added
  // directly via "Add User" rather than through the self-signup request
  // flow) — reuses the same modal, but with no existing enrollment id to
  // edit, so the submit handler below creates a fresh active enrollment
  // instead of updating one.
  window.openEnrollStudentModal = async (studentId) => {
    let user;
    try { user = await EP.userById(studentId); } catch (err) { showToast(err.message, 'danger'); return; }
    if (!user) { showToast('Could not find that user', 'danger'); return; }
    const hasAccess = !!user.courseId;
    document.getElementById('activate-enrollment-id').value = '';
    document.getElementById('activate-student-id').value = studentId;
    document.getElementById('activate-modal-summary').innerHTML = hasAccess
      ? `<strong>${escapeHtml(user.name)}</strong> already has course access (added directly) but no billing record — this creates one without changing their access.`
      : `<strong>${escapeHtml(user.name)}</strong> has no enrollment yet — create one to bill and give course access.`;
    document.getElementById('activate-enrollment-form').reset();
    document.querySelector('#activate-enrollment-modal p.font-serif').textContent = hasAccess ? 'Add Billing Record' : 'Enroll Student';
    document.querySelector('#activate-enrollment-form button[type="submit"]').textContent = hasAccess ? 'Add Billing Record' : 'Create Enrollment';
    const courseSelect = document.getElementById('activate-course');
    const courseList = await EP.courses();
    courseSelect.innerHTML = courseList.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    document.getElementById('activate-course-hint').classList.toggle('hidden', !!user.courseId);
    if (user.courseId) courseSelect.value = user.courseId;
    document.getElementById('activate-payment-status').value = 'unpaid';
    document.getElementById('activate-cancel-link').classList.add('hidden');
    document.getElementById('activate-enrollment-modal').classList.remove('hidden');
  };
  document.getElementById('activate-cancel-link').addEventListener('click', async () => {
    const id = document.getElementById('activate-enrollment-id').value;
    if (!confirm('Cancel this enrollment? Use this for duplicate or incorrect records — the student will lose access to this course.')) return;
    try {
      await EP.rejectEnrollment(id);
      document.getElementById('activate-enrollment-modal').classList.add('hidden');
      await renderEnrollments();
      showToast('Enrollment cancelled');
    } catch (err) { showToast(err.message, 'danger'); }
  });
  window.rejectEnrollmentConfirm = async (id) => {
    if (!confirm('Reject this enrollment request?')) return;
    try { await EP.rejectEnrollment(id); await renderEnrollments(); showToast('Enrollment rejected', 'info'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  document.getElementById('activate-enrollment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const enrollmentId = document.getElementById('activate-enrollment-id').value;
    const studentId = document.getElementById('activate-student-id').value;
    const paymentDueAt = document.getElementById('activate-payment-due').value || null;
    try {
      if (enrollmentId) {
        await EP.activateEnrollment(enrollmentId, {
          priceMad: document.getElementById('activate-price').value,
          paymentStatus: document.getElementById('activate-payment-status').value,
          courseId: document.getElementById('activate-course').value,
          paymentDueAt,
        });
      } else if (studentId) {
        await EP.adminEnrollStudent({
          studentId,
          courseId: document.getElementById('activate-course').value,
          priceMad: document.getElementById('activate-price').value,
          paymentStatus: document.getElementById('activate-payment-status').value,
          paymentDueAt,
        });
      } else {
        throw new Error('Missing enrollment or student reference.');
      }
      document.getElementById('activate-enrollment-modal').classList.add('hidden');
      closeModal('user-detail-modal');
      await Promise.all([renderEnrollments(), refreshFinanceViews()]);
      showToast(enrollmentId ? 'Enrollment activated \u2014 student now has course access' : 'Enrollment created \u2014 student now has a billing record and appears on Enrollments');
    } catch (err) { showToast(err.message, 'danger'); }
  });
  await renderEnrollments();
  // Also re-render on payments/expenses changes, not just enrollment
  // changes — this page shows a per-student balance and "payment due"
  // highlight (both derived from the payments ledger), which used to go
  // stale here until an actual enrollment row changed, even though
  // Analytics and Users already refreshed correctly.
  EP.onChange([EP.KEYS.enrollments, EP.KEYS.payments, EP.KEYS.expenses], renderEnrollments);
});
