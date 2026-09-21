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
        placeholder: 'اكتب تدوينتك...',
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
        item.textContent = v === '1' ? 'مفرد' : v === '1.5' ? '1.5×' : v === '2' ? 'مزدوج' : '2.5×';
      });
      const lhLabel = document.querySelector('.ql-lineheight .ql-picker-label');
      if (lhLabel) lhLabel.setAttribute('aria-label', 'تباعد الأسطر');
      document.getElementById('post-body').classList.add('hidden');
      document.getElementById('post-body').removeAttribute('required');
    } catch (err) {
      console.error('Quill failed to initialize — falling back to plain text body:', err);
      if (typeof showToast === 'function') showToast('محرر النصوص المنسقة غير متاح — سيتم استخدام نص عادي الآن', 'info');
      quill = null;
    }
    return quill;
  }

  async function renderKPIs() {
    const [allUsers, allPosts, allHomework, allNotifs, allEnrollments] = await Promise.all([
      EP.users(), EP.posts(), EP.homework(), EP.notificationsFor(user), EP.allEnrollments(),
    ]);
    const stats = [
      ['clipboard-check', allEnrollments.filter(e => e.status === 'pending').length, 'طلبات التسجيل المعلقة', 'red-600', 'enrollments'],
      ['users', allUsers.length, 'إجمالي المستخدمين', 'navy-700', 'users'],
      ['newspaper', allPosts.filter(p => p.status === 'published').length, 'المقالات المنشورة', 'red-600', 'blog'],
      ['clipboard-list', allHomework.length, 'الواجبات المكلّفة', 'navy-700', 'homework'],
      ['bell', allNotifs.length, 'الإشعارات المرسلة', 'amber-600', 'notifications'],
    ];
    document.getElementById('admin-kpis').innerHTML = stats.map(([icon, val, label, color, tab]) => {
      const tag = tab ? 'button' : 'div';
      const attrs = tab ? `onclick="switchTab('admin-shell','${tab}')"` : '';
      return `
      <${tag} ${attrs} class="card ${tab ? 'card-hover' : ''} p-5 text-start w-full">
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
      ...allNotifs.map(n => ({ t: n.createdAt, text: `تم إرسال إشعار: "${n.title}"` })),
      ...allPosts.map(p => ({ t: p.createdAt, text: `تدوينة ${p.status === 'published' ? 'تم نشرها' : 'حُفظت كمسودة'}: "${p.title}"` })),
    ].sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 6);
    document.getElementById('admin-activity').innerHTML = events.map(e =>
      `<div class="flex items-start gap-2"><i data-lucide="dot" class="w-4 h-4 mt-0.5 shrink-0" style="color:var(--navy-300)"></i><div><p>${escapeHtml(e.text)}</p><p class="text-xs" style="color:var(--text-disabled)">${EP.timeAgo(e.t)}</p></div></div>`
    ).join('') || `<p style="color:var(--text-secondary)">لا يوجد نشاط بعد.</p>`;
  }

  function renderPosts(posts) {
    document.getElementById('admin-posts-list').innerHTML = posts.map(p => `
      <div class="card p-5 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge ${p.status === 'published' ? 'badge-success' : 'badge-warning'}">${p.status === 'published' ? 'منشور' : 'مسودة'}</span>
            <span class="text-xs" style="color:var(--text-secondary)">${escapeHtml(p.category)}</span>
          </div>
          <p class="font-semibold truncate" style="color:var(--navy-700)">${escapeHtml(p.title)}</p>
          <p class="text-xs mt-1" style="color:var(--text-secondary)">${EP.timeAgo(p.createdAt)}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button onclick="editPost('${p.id}')" class="btn btn-secondary btn-sm">تعديل</button>
          <button onclick="deletePostConfirm('${p.id}')" class="btn btn-secondary btn-sm" style="color:var(--danger-600); border-color:var(--danger-600)">حذف</button>
        </div>
      </div>`).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">لا توجد مقالات بعد. اضغط على "مقالة جديدة" لنشر أول مقال لك.</p></div>`;
  }

  function renderNotifHistory(notifs) {
    document.getElementById('admin-notif-list').innerHTML = notifs.map(n => `
      <div class="p-3 rounded-lg" style="background:var(--bg-subtle)">
        <div class="flex items-center gap-2 mb-1"><span class="badge badge-info">${n.audience === 'all' ? 'الجميع' : n.audience}</span><span class="text-xs" style="color:var(--text-disabled)">${EP.timeAgo(n.createdAt)}</span></div>
        <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(n.title)}</p>
        <p class="text-xs mt-1" style="color:var(--text-secondary)">${escapeHtml(n.body)}</p>
      </div>`).join('');
  }

  // ---- CSV export — client-side only, no backend needed ----
  function exportToCsv(filename, rows) {
    if (!rows.length) { showToast('لا يوجد شيء للتصدير بعد', 'danger'); return; }
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
  const ROLE_LABEL = { admin: 'مدير', teacher: 'معلم', student: 'طالب' };
  const ENR_STATUS_LABEL = { pending: 'قيد الانتظار', active: 'نشط', completed: 'مكتمل', cancelled: 'ملغى' };
  const ENR_PAYMENT_LABEL = { paid: 'مدفوع', waived: 'معفى', unpaid: 'غير مدفوع' };
  window.exportUsersCsv = async () => {
    const [rows, courseList] = await Promise.all([EP.users(), EP.courses()]);
    const courseById = Object.fromEntries(courseList.map((c) => [c.id, c.name]));
    const data = rows.filter((u) => u.role !== 'admin').map((u) => ({
      الاسم: u.name, الدور: ROLE_LABEL[u.role] || u.role, الدورة: u.courseId ? (courseById[u.courseId] || '') : '', المدينة: u.city || '', الهاتف: u.phone || '',
    }));
    exportToCsv('europass-users.csv', data);
  };
  window.exportEnrollmentsCsv = async () => {
    const [rows, courseList, roster] = await Promise.all([EP.allEnrollments(), EP.courses(), EP.users()]);
    const courseById = Object.fromEntries(courseList.map((c) => [c.id, c.name]));
    const userById3 = Object.fromEntries(roster.map((u) => [u.id, u.name]));
    const data = rows.map((e) => ({
      الطالب: userById3[e.studentId] || '', الدورة: e.courseId ? (courseById[e.courseId] || '') : 'غير محددة',
      الحالة: ENR_STATUS_LABEL[e.status] || e.status, الدفع: ENR_PAYMENT_LABEL[e.paymentStatus] || e.paymentStatus, 'السعر (درهم)': e.priceMad || '', 'تاريخ الطلب': e.requestedAt ? new Date(e.requestedAt).toISOString().slice(0, 10) : '',
    }));
    exportToCsv('europass-enrollments.csv', data);
  };

  async function renderUsers() {
    const [rows, courseList] = await Promise.all([EP.users(), EP.courses()]);
    const teachersAndStudents = rows.filter(u => u.role !== 'admin');
    document.getElementById('admin-users-list').innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-start px-5 py-3 text-white font-semibold">\u0627\u0644\u0627\u0633\u0645</th><th class="text-start px-5 py-3 text-white font-semibold">\u0627\u0644\u062f\u0648\u0631</th><th class="text-start px-5 py-3 text-white font-semibold">\u0627\u0644\u062f\u0648\u0631\u0629</th><th class="text-start px-5 py-3 text-white font-semibold">\u0627\u0644\u0645\u062f\u064a\u0646\u0629</th><th class="text-start px-5 py-3 text-white font-semibold">\u0627\u0644\u0647\u0627\u062a\u0641</th><th class="text-start px-5 py-3 text-white font-semibold">\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645</th><th class="text-start px-5 py-3 text-white font-semibold">\u0627\u0644\u062d\u0627\u0644\u0629</th><th class="px-5 py-3"></th></tr></thead><tbody>
      ${teachersAndStudents.map((u, i) => `<tr onclick="openUserDetailModal('${u.id}')" style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}; cursor:pointer">
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(u.name)}</td>
        <td class="px-5 py-3"><span class="badge ${u.role === 'teacher' ? 'badge-info' : 'badge-amber'}">${ROLE_LABEL[u.role] || u.role}</span></td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(courseList.find(c => c.id === u.courseId)?.name || '\u2014')}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${escapeHtml(u.city || '\u2014')}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)" dir="ltr">${escapeHtml(u.phone || '\u2014')}</td>
        <td class="px-5 py-3" style="color:var(--text-secondary)">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '\u2014'}</td>
        <td class="px-5 py-3">${u.blockedAt ? '<span class="badge badge-danger">\u0645\u062d\u0638\u0648\u0631</span>' : '<span class="badge badge-success">\u0646\u0634\u0637</span>'}</td>
        <td class="px-5 py-3 text-end"><button onclick="event.stopPropagation(); removeUserConfirm('${u.id}')" class="text-xs font-semibold" style="color:var(--danger-600)">\u0625\u0632\u0627\u0644\u0629</button></td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  // ---- User detail modal — shared by both the Users table and the
  // Enrollments list, so it's self-contained and fetches its own data
  // rather than depending on whatever's cached in either view. ----
  window.openUserDetailModal = async (userId) => {
    let user, courseList;
    try {
      [user, courseList] = await Promise.all([EP.userById(userId), EP.courses()]);
    } catch (err) { showToast(err.message, 'danger'); return; }
    if (!user) { showToast('تعذر العثور على هذا المستخدم', 'danger'); return; }

    document.getElementById('user-detail-name').textContent = user.name;
    document.getElementById('user-detail-role').textContent = ROLE_LABEL[user.role] || user.role;
    document.getElementById('user-detail-course').textContent = user.courseId ? (courseList.find(c => c.id === user.courseId)?.name || 'دورة غير معروفة') : 'لا توجد دورة معيّنة';
    document.getElementById('user-detail-city').textContent = user.city || 'غير متوفر';
    document.getElementById('user-detail-email').textContent = user.email || 'غير متاح';
    document.getElementById('user-detail-phone').textContent = user.phone || 'غير متوفر';
    document.getElementById('user-detail-joined').textContent = user.createdAt ? `تاريخ الانضمام ${new Date(user.createdAt).toLocaleDateString()}` : 'تاريخ الانضمام غير معروف';

    const roleSelect = document.getElementById('user-detail-role-select');
    roleSelect.value = user.role;
    document.getElementById('user-detail-role-save').onclick = async () => {
      const newRole = roleSelect.value;
      if (newRole === user.role) { showToast('\u0647\u0630\u0627 \u0647\u0648 \u062f\u0648\u0631\u0647\u0645 \u0627\u0644\u062d\u0627\u0644\u064a \u0628\u0627\u0644\u0641\u0639\u0644'); return; }
      const warning = user.courseId
        ? ` إنهم مسجلون حالياً في دورة — تغيير دورهم سيؤدي إلى إلغاء هذا التسجيل، لأن الدور يعني شيئاً مختلفاً لكل فئة.`
        : '';
      if (!confirm(`تغيير دور ${user.name} من ${ROLE_LABEL[user.role] || user.role} إلى ${ROLE_LABEL[newRole] || newRole}؟${warning}`)) return;
      try {
        await EP.changeUserRole(user.id, newRole);
        closeModal('user-detail-modal');
        await renderUsers();
        showToast(`${user.name} أصبح الآن ${ROLE_LABEL[newRole] || newRole}`);
      } catch (err) { showToast(err.message, 'danger'); }
    };

    // Payment display — a plain informational marker the admin sets by
    // hand, not an automated calculation of what's actually owed.
    const paymentEl = document.getElementById('user-detail-payment');
    if (user.lastPaymentAt) {
      const daysSince = Math.floor((Date.now() - new Date(user.lastPaymentAt)) / 86400000);
      paymentEl.textContent = `آخر تحديد كمدفوع ${EP.timeAgo(user.lastPaymentAt)}`;
      paymentEl.style.color = daysSince > 30 ? 'var(--danger-600)' : 'var(--text-primary)';
    } else {
      paymentEl.textContent = 'لم يُحدد كمدفوع مطلقاً';
      paymentEl.style.color = 'var(--danger-600)';
    }

    const blockedBanner = document.getElementById('user-detail-blocked-banner');
    const blockBtn = document.getElementById('user-detail-block-btn');
    if (user.blockedAt) {
      blockedBanner.classList.remove('hidden');
      document.getElementById('user-detail-blocked-reason').textContent = user.blockedReason || 'لم يُذكر سبب.';
      blockBtn.innerHTML = '<i data-lucide="unlock" class="w-4 h-4 me-1"></i> إلغاء الحظر';
      blockBtn.style.background = 'var(--success-50)';
      blockBtn.style.color = 'var(--success-600)';
      blockBtn.onclick = async () => {
        try { await EP.unblockUser(user.id); closeModal('user-detail-modal'); await renderUsers(); showToast('تمت استعادة الوصول'); }
        catch (err) { showToast(err.message, 'danger'); }
      };
    } else {
      blockedBanner.classList.add('hidden');
      blockBtn.innerHTML = '<i data-lucide="lock" class="w-4 h-4 me-1"></i> حظر الوصول';
      blockBtn.style.background = 'var(--danger-50)';
      blockBtn.style.color = 'var(--danger-600)';
      blockBtn.onclick = async () => {
        const reason = prompt(`حظر وصول ${user.name}؟ يمكنك إضافة سبب سيظهر له في لوحة التحكم (مثال: "الدفع متأخر لشهر أكتوبر"):`);
        if (reason === null) return; // cancelled
        try { await EP.blockUser(user.id, reason || null); closeModal('user-detail-modal'); await renderUsers(); showToast(`تم حظر وصول ${user.name}`); }
        catch (err) { showToast(err.message, 'danger'); }
      };
    }

    document.getElementById('user-detail-mark-paid').onclick = async () => {
      try { await EP.markPaid(user.id); openUserDetailModal(user.id); showToast('تم تحديده كمدفوع'); }
      catch (err) { showToast(err.message, 'danger'); }
    };

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

  // ---- Homework & Grades (admin view-only — grading itself stays with the
  // owning teacher; RLS only grants admins read access here, by design,
  // so students always know exactly who graded their work) ----
  let hwCache = { homework: [], submissions: [], courses: [], users: [] };
  function hwCourseName(courseId) { return hwCache.courses.find(c => c.id === courseId)?.name || '\u2014'; }
  function hwUserName(userId) { return hwCache.users.find(u => u.id === userId)?.name || '\u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641'; }

  async function renderHomework() {
    const [hw, subs, courseList, userList] = await Promise.all([EP.homework(), EP.submissions(), EP.courses(), EP.users()]);
    hwCache = { homework: hw, submissions: subs, courses: courseList, users: userList };

    const courseFilter = document.getElementById('hw-course-filter');
    const teacherFilter = document.getElementById('hw-teacher-filter');
    if (!courseFilter.dataset.populated) {
      courseFilter.innerHTML = '<option value="">كل الدورات</option>' + courseList.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      const teachers = userList.filter(u => u.role === 'teacher');
      teacherFilter.innerHTML = '<option value="">كل المعلمين</option>' + teachers.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
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
      <button onclick="openHomeworkDetail('${h.id}')" class="card card-hover p-5 flex items-center justify-between gap-4 w-full text-start">
        <div class="min-w-0">
          <p class="font-semibold truncate" style="color:var(--navy-700)">${escapeHtml(h.title)}</p>
          <p class="text-xs mt-1" style="color:var(--text-secondary)">${escapeHtml(hwCourseName(h.courseId))} \u00b7 ${escapeHtml(hwUserName(h.teacherId))}</p>
        </div>
        <div class="shrink-0 text-end">
          <span class="badge ${graded === hwSubs.length && hwSubs.length ? 'badge-success' : 'badge-warning'}">${graded}/${hwSubs.length} مُصحح</span>
          <p class="text-xs mt-1" style="color:var(--text-secondary)">${hwSubs.length} عملية تسليم</p>
        </div>
      </button>`;
    }).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">لا توجد واجبات تطابق هذا الفلتر.</p></div>`;
    lucide.createIcons();
  }

  window.openHomeworkDetail = (id) => {
    const h = hwCache.homework.find(x => x.id === id);
    if (!h) return;
    document.getElementById('hw-detail-title').textContent = h.title;
    document.getElementById('hw-detail-meta').textContent = `${hwCourseName(h.courseId)} \u00b7 \u0643\u0644\u0651\u0641\u0647 ${hwUserName(h.teacherId)}`;
    const subs = hwCache.submissions.filter(s => s.homeworkId === id);
    document.getElementById('hw-detail-submissions').innerHTML = subs.map(s => `
      <div class="p-4 rounded-lg" style="background:var(--bg-subtle)">
        <div class="flex items-center justify-between mb-1">
          <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(hwUserName(s.studentId))}</p>
          <span class="badge ${s.status === 'graded' ? 'badge-success' : 'badge-warning'}">${s.status === 'graded' ? '\u062a\u0645 \u0627\u0644\u062a\u0642\u064a\u064a\u0645' : s.status === 'needs_revision' ? '\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629' : s.status === 'draft' ? '\u0645\u0633\u0648\u062f\u0629' : '\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645'}</span>
        </div>
        ${s.grade != null ? `<p class="text-sm font-semibold mt-1" style="color:var(--navy-700)">\u0627\u0644\u062f\u0631\u062c\u0629: ${escapeHtml(String(s.grade))}</p>` : ''}
        ${s.feedback ? `<p class="text-xs mt-1" style="color:var(--text-secondary)">\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a: ${escapeHtml(s.feedback)}</p>` : ''}
        <p class="text-xs mt-2" style="color:var(--text-disabled)">${s.submittedAt ? '\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645 ' + EP.timeAgo(s.submittedAt) : '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645 \u0628\u0639\u062f'}</p>
      </div>`).join('') || `<p class="text-sm text-center py-6" style="color:var(--text-secondary)">\u0644\u0645 \u064a\u0642\u0645 \u0623\u064a \u0637\u0627\u0644\u0628 \u0628\u062a\u0633\u0644\u064a\u0645 \u0647\u0630\u0627 \u0628\u0639\u062f.</p>`;
    document.getElementById('homework-detail-modal').classList.remove('hidden');
    lucide.createIcons();
  };

  // ---- Resources (admin sends PDFs / video links / other links to teachers) ----
  let resourcesCache = [];
  let teachersCache = [];
  const RES_TYPE_ICON = { pdf: 'file-text', video: 'youtube', link: 'link' };
  const RES_TYPE_LABEL = { pdf: 'PDF', video: 'فيديو', link: 'رابط' };

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
    teacherSelect.innerHTML = '<option value="">\u0643\u0644 \u0627\u0644\u0645\u0639\u0644\u0645\u064a\u0646</option>' + teachersCache.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    teacherSelect.value = '';
    document.getElementById('res-submit-btn').textContent = '\u0625\u0631\u0633\u0627\u0644 \u0644\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0639\u0644\u0645\u064a\u0646';
    document.getElementById('resource-modal').classList.remove('hidden');
  };
  document.getElementById('res-target-teacher').addEventListener('change', (e) => {
    const teacher = teachersCache.find(t => t.id === e.target.value);
    document.getElementById('res-submit-btn').textContent = teacher ? `\u0625\u0631\u0633\u0627\u0644 \u0625\u0644\u0649 ${teacher.name}` : '\u0625\u0631\u0633\u0627\u0644 \u0644\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0639\u0644\u0645\u064a\u0646';
  });
  document.getElementById('res-type').addEventListener('change', (e) => {
    const isPdf = e.target.value === 'pdf';
    document.getElementById('res-pdf-field').classList.toggle('hidden', !isPdf);
    document.getElementById('res-url-field').classList.toggle('hidden', isPdf);
    document.getElementById('res-url-hint').textContent = e.target.value === 'video'
      ? '\u0623\u0644\u0635\u0642 \u0631\u0627\u0628\u0637 \u064a\u0648\u062a\u064a\u0648\u0628 (\u0623\u0648 \u0641\u064a\u062f\u064a\u0648 \u0622\u062e\u0631).' : '\u0623\u0644\u0635\u0642 \u0623\u064a \u0631\u0627\u0628\u0637 \u2014 \u0645\u062c\u0644\u062f \u062c\u0648\u062c\u0644 \u062f\u0631\u0627\u064a\u0641\u060c \u0645\u0642\u0627\u0644\u0629\u060c \u0623\u0648 \u0623\u064a \u0634\u064a\u0621 \u0645\u0641\u064a\u062f.';
  });

  async function renderResources() {
    try {
      resourcesCache = await EP.resources();
      if (!teachersCache.length) teachersCache = (await EP.users()).filter(u => u.role === 'teacher');
    } catch (err) {
      console.error('Could not load resources (has migration 012_teacher_resources.sql and 013_resource_teacher_targeting.sql been run?):', err);
      document.getElementById('admin-resources-list').innerHTML = `<p class="text-sm col-span-full" style="color:var(--danger-600)">تعذر تحميل الموارد. هل تم تشغيل ترحيلات قاعدة البيانات الخاصة بالموارد؟</p>`;
      return;
    }
    const catFilter = document.getElementById('res-category-filter');
    if (!catFilter.dataset.populated) {
      catFilter.addEventListener('change', renderResourcesList);
    }
    const cats = [...new Set(resourcesCache.map(r => r.category))].sort();
    catFilter.innerHTML = '<option value="">كل الفئات</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    catFilter.dataset.populated = '1';
    const suggestions = document.getElementById('res-category-suggestions');
    if (suggestions) suggestions.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
    renderResourcesList();
  }

  function resourceRecipientLabel(r) {
    if (!r.targetTeacherId) return 'جميع المعلمين';
    const t = teachersCache.find(x => x.id === r.targetTeacherId);
    return t ? t.name : 'معلم (تمت إزالته)';
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
          <button onclick="deleteResourceConfirm('${r.id}','${escapeHtml(r.title).replace(/'/g, "\\'")}')" class="shrink-0" aria-label="حذف"><i data-lucide="trash-2" class="w-4 h-4" style="color:var(--danger-600)"></i></button>
        </div>
        ${r.description ? `<p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtml(r.description)}</p>` : ''}
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <span class="badge badge-info">${escapeHtml(r.category)}</span>
          <span class="text-xs" style="color:var(--text-disabled)">${RES_TYPE_LABEL[r.type]}</span>
        </div>
        <div class="flex items-center gap-1.5 mt-2"><i data-lucide="${r.targetTeacherId ? 'user' : 'users'}" class="w-3.5 h-3.5" style="color:var(--text-secondary)"></i><span class="text-xs" style="color:var(--text-secondary)">${escapeHtml(resourceRecipientLabel(r))}</span></div>
        <a href="${r.url}" target="_blank" rel="noopener" class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--red-600)">فتح <i data-lucide="arrow-up-right" class="w-3 h-3"></i></a>
      </div>`).join('') || `<p class="text-sm col-span-full text-center py-10" style="color:var(--text-secondary)">لا توجد موارد في هذه الفئة بعد.</p>`;
    lucide.createIcons();
  }

  window.deleteResourceConfirm = async (id, title) => {
    if (!confirm(`حذف "${title}"؟ لن يعود المعلمون يرونه.`)) return;
    try {
      await EP.deleteResource(id);
      await renderResources();
      showToast('تم حذف المورد');
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
    submitBtn.textContent = type === 'pdf' ? 'جارٍ الرفع...' : 'جارٍ الإرسال...';
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
      showToast(targetTeacher ? `تم إرسال المورد إلى ${targetTeacher.name}` : 'تم إرسال المورد إلى جميع المعلمين');
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
  let chartEnrollments = null, chartStatus = null, chartPrograms = null, chartRevenue = null;
  let analyticsSelectedYear = new Date().getFullYear();

  async function renderAnalytics() {
    if (!document.getElementById('analytics-chart-enrollments') || !window.Chart) return;
    const [allEnr, courseList] = await Promise.all([EP.allEnrollments(), EP.courses()]);

    const active = allEnr.filter((e) => e.status === 'active' || e.status === 'completed');
    const now = new Date();

    // Revenue is attributed to activatedAt (when an enrollment actually
    // became a paying student), not requestedAt (when they first signed
    // up) — those can be weeks apart, and revenue should reflect when the
    // sale actually closed. Nothing here ever resets automatically; "This
    // Month" and "This Year" are just filtered views over the same
    // permanent enrollment records, recalculated fresh on every load.
    const revenueTotal = active.reduce((sum, e) => sum + (Number(e.priceMad) || 0), 0);
    const revenueThisYear = active.filter((e) => e.activatedAt && new Date(e.activatedAt).getFullYear() === now.getFullYear())
      .reduce((sum, e) => sum + (Number(e.priceMad) || 0), 0);
    const revenueThisMonth = active.filter((e) => e.activatedAt && new Date(e.activatedAt).getFullYear() === now.getFullYear() && new Date(e.activatedAt).getMonth() === now.getMonth())
      .reduce((sum, e) => sum + (Number(e.priceMad) || 0), 0);

    document.getElementById('analytics-revenue-month').textContent = revenueThisMonth.toLocaleString() + ' MAD';
    document.getElementById('analytics-revenue-year').textContent = revenueThisYear.toLocaleString() + ' MAD';
    document.getElementById('analytics-revenue-total').textContent = revenueTotal.toLocaleString() + ' MAD';
    document.getElementById('analytics-active-students').textContent = String(active.length);
    document.getElementById('analytics-conversion').textContent = allEnr.length ? Math.round((active.length / allEnr.length) * 100) + '%' : '\u2014';

    // Year selector for the Revenue by Month chart — populated from the
    // actual years that appear in your activated enrollments, so it never
    // shows a year with nothing in it.
    const yearsWithRevenue = [...new Set(active.filter((e) => e.activatedAt).map((e) => new Date(e.activatedAt).getFullYear()))].sort((a, b) => b - a);
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
    active.forEach((e) => {
      if (!e.activatedAt) return;
      const d = new Date(e.activatedAt);
      if (d.getFullYear() === analyticsSelectedYear) revenueByMonth[d.getMonth()] += Number(e.priceMad) || 0;
    });
    const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'short' }));

    // Enrollments over time — group by month of request
    const byMonth = {};
    allEnr.forEach((e) => {
      const d = new Date(e.requestedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const monthKeys = Object.keys(byMonth).sort();
    const monthLabels = monthKeys.map((k) => new Date(k + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }));

    // Status breakdown
    const statusCounts = { pending: 0, active: 0, completed: 0, cancelled: 0 };
    allEnr.forEach((e) => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });

    // Popular programs
    const courseById = Object.fromEntries(courseList.map((c) => [c.id, c.name]));
    const programCounts = {};
    allEnr.forEach((e) => {
      const name = e.courseId ? (courseById[e.courseId] || 'غير معروف') : 'غير محدد';
      programCounts[name] = (programCounts[name] || 0) + 1;
    });
    const programEntries = Object.entries(programCounts).sort((a, b) => b[1] - a[1]);

    const navy = '#0B1D3A', red = '#DC2626', teal = '#0D9488', amber = '#C77D14', grey = '#94A3B8';

    if (chartRevenue) chartRevenue.destroy();
    chartRevenue = new Chart(document.getElementById('analytics-chart-revenue'), {
      type: 'bar',
      data: { labels: monthNames, datasets: [{ label: 'الإيرادات (درهم)', data: revenueByMonth, backgroundColor: teal }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });

    if (chartEnrollments) chartEnrollments.destroy();
    chartEnrollments = new Chart(document.getElementById('analytics-chart-enrollments'), {
      type: 'line',
      data: { labels: monthLabels, datasets: [{ label: 'طلبات التسجيل', data: monthKeys.map((k) => byMonth[k]), borderColor: navy, backgroundColor: navy + '22', tension: 0.3, fill: true }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
    });

    if (chartStatus) chartStatus.destroy();
    chartStatus = new Chart(document.getElementById('analytics-chart-status'), {
      type: 'doughnut',
      data: { labels: ['قيد الانتظار', 'نشط', 'مكتمل', 'ملغى'], datasets: [{ data: [statusCounts.pending, statusCounts.active, statusCounts.completed, statusCounts.cancelled], backgroundColor: [amber, teal, navy, grey] }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });

    if (chartPrograms) chartPrograms.destroy();
    chartPrograms = new Chart(document.getElementById('analytics-chart-programs'), {
      type: 'bar',
      data: { labels: programEntries.map((p) => p[0]), datasets: [{ label: 'التسجيلات', data: programEntries.map((p) => p[1]), backgroundColor: red }] },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
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
  EP.onChange([EP.KEYS.posts, EP.KEYS.notifications, EP.KEYS.profiles, EP.KEYS.homework, EP.KEYS.submissions, EP.KEYS.enrollments, EP.KEYS.resources], renderAll);

  // ---- Fullscreen editor toggle ----
  window.toggleFullscreenEditor = () => {
    const card = document.getElementById('post-modal-card');
    const isFull = card.classList.toggle('is-fullscreen');
    document.getElementById('fullscreen-label').textContent = isFull ? 'تصغير' : 'توسيع';
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
    list.innerHTML = `<p class="text-xs" style="color:var(--text-secondary)">جارٍ التحميل...</p>`;
    try {
      const cats = await EP.categories(categoryManagerLang);
      list.innerHTML = cats.map(c => `
        <div class="flex items-center justify-between px-3 py-2 rounded-md" style="background:var(--bg-subtle)" ${categoryManagerLang === 'ar' ? 'dir="rtl"' : ''}>
          <span class="text-sm">${c.name}</span>
          <button type="button" onclick="deleteCategoryConfirm('${c.id}','${c.name.replace(/'/g, "\\'")}')" class="text-xs font-semibold" style="color:var(--danger-600)">حذف</button>
        </div>`).join('') || `<p class="text-xs" style="color:var(--text-secondary)">لا توجد فئات بعد.</p>`;
    } catch (err) {
      list.innerHTML = `<p class="text-xs" style="color:var(--danger-600)">${err.message}</p>`;
    }
  };
  window.deleteCategoryConfirm = async (id, name) => {
    if (!confirm(`حذف فئة "${name}"؟ المقالات التي تستخدمها حالياً ستحتفظ بها — هذا يزيلها فقط كخيار مستقبلي.`)) return;
    try {
      await EP.deleteCategory(id);
      await loadCategoryManager();
      showToast('تم حذف الفئة', 'info');
    } catch (err) { showToast(err.message, 'danger'); }
  };
  document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('category-name-input');
    try {
      await EP.addCategory(input.value, categoryManagerLang);
      input.value = '';
      await loadCategoryManager();
      showToast('تمت إضافة الفئة');
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
    status.textContent = 'جارٍ الرفع...';
    try {
      const url = await EP.uploadPostCover(file);
      document.getElementById('post-cover-url').value = url;
      updateCoverPreview();
      status.textContent = 'تم الرفع.';
      status.style.color = 'var(--success-600)';
    } catch (err) {
      status.textContent = err.message;
      status.style.color = 'var(--danger-600)';
      e.target.value = '';
    }
  });
  window.deletePostConfirm = async (id) => {
    if (!confirm('حذف هذه المقالة؟')) return;
    try { await EP.deletePost(id); await renderAll(); showToast('تم حذف المقالة', 'info'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  window.removeUserConfirm = async (id) => {
    if (!confirm('إزالة هذا المستخدم؟ سيفقد إمكانية الوصول إلى المنصة.')) return;
    try { await EP.removeUser(id); await renderAll(); showToast('تمت إزالة المستخدم', 'info'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

  document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = e.submitter.dataset.status;
    const bodyHtml = quill ? quill.root.innerHTML : document.getElementById('post-body').value;
    const bodyText = quill ? quill.getText().trim() : bodyHtml.trim();
    if (!bodyText) { showToast('اكتب شيئاً في نص المقالة أولاً', 'danger'); return; }
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
      showToast(status === 'published' ? 'تم نشر المقالة — أصبحت متاحة الآن على المدونة العامة!' : 'تم حفظ المسودة');
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
      showToast('تم إرسال الإشعار');
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
      alert(`تم إنشاء المستخدم بنجاح.\n\nالبريد الإلكتروني لتسجيل الدخول: ${email}\nكلمة المرور: ${password}\n\nشارك هذه المعلومات معه مباشرة — لن تُعرض مرة أخرى.`);
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- Groups moderation ----
  let activeGroupId = null;
  async function renderGroupTabs() {
    const groups = await EP.allGroups();
    if (!activeGroupId && groups.length) activeGroupId = groups[0].id;
    document.getElementById('admin-group-tabs').innerHTML = groups.map(g => `
      <button onclick="selectAdminGroup('${g.id}')" class="persona-tab" ${g.id === activeGroupId ? 'aria-selected="true"' : 'aria-selected="false"'}>
        <span class="me-1">${g.icon}</span> ${escapeHtml(g.name)}
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
          <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(byId[p.authorId] || '\u0634\u062e\u0635 \u0645\u0627')} <span class="font-normal text-xs" style="color:var(--text-disabled)">${EP.timeAgo(p.createdAt)}</span></p>
          <div class="flex items-center gap-3">
            ${reports.length ? `<span class="badge badge-danger">\u{1F6A9} ${reports.length} \u0628\u0644\u0627\u063a</span>` : ''}
            <button onclick="adminDeleteGroupPost('${p.id}')" class="text-xs font-semibold" style="color:var(--danger-600)">\u062d\u0630\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631</button>
          </div>
        </div>
        ${p.body ? `<p class="text-sm mb-2">${escapeHtml(p.body)}</p>` : ''}
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="" class="rounded-lg max-h-64 object-cover mb-2">` : ''}
        <p class="text-xs mb-2" style="color:var(--text-secondary)">${p.likes.length} \u0625\u0639\u062c\u0627\u0628 \u00b7 ${p.comments.length} \u062a\u0639\u0644\u064a\u0642</p>

        ${reports.length ? `
        <div class="mt-2 mb-3 p-3 rounded-lg space-y-1" style="background:var(--danger-50)">
          ${reports.map(r => `
            <div class="flex items-center justify-between text-xs">
              <span style="color:var(--danger-600)">${escapeHtml(byId[r.reporterId] || '\u0634\u062e\u0635 \u0645\u0627')}${r.reason ? ': ' + escapeHtml(r.reason) : ' (\u0644\u0645 \u064a\u064f\u0630\u0643\u0631 \u0633\u0628\u0628)'}</span>
              <button onclick="adminDismissReport('${r.id}')" class="font-semibold shrink-0 ms-2" style="color:var(--text-secondary)">\u062a\u062c\u0627\u0647\u0644</button>
            </div>`).join('')}
        </div>` : ''}

        ${p.comments.length ? `
        <div class="mt-2 pt-2 border-t space-y-1.5" style="border-color:var(--border-default)">
          ${p.comments.map(c => `
            <div class="flex items-center justify-between text-xs">
              <span><span class="font-semibold" style="color:var(--navy-700)">${escapeHtml(byId[c.authorId] || '\u0634\u062e\u0635 \u0645\u0627')}</span> <span style="color:var(--text-secondary)">${escapeHtml(c.body)}</span></span>
              <button onclick="adminDeleteComment('${c.id}')" class="font-semibold shrink-0 ms-2" style="color:var(--danger-600)">\u062d\u0630\u0641</button>
            </div>`).join('')}
        </div>` : ''}
      </div>`;
    }).join('') || `<p style="color:var(--text-secondary)">\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u0634\u0648\u0631\u0627\u062a \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629 \u0628\u0639\u062f.</p>`;
  }
  window.selectAdminGroup = (id) => { activeGroupId = id; renderGroupTabs(); };
  window.adminDeleteGroupPost = async (postId) => {
    if (!confirm('\u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u061f')) return;
    try { await EP.deleteGroupPost(postId); await renderGroupPosts(); } catch (err) { showToast(err.message, 'danger'); }
  };
  window.adminDeleteComment = async (commentId) => {
    if (!confirm('\u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u062a\u0639\u0644\u064a\u0642\u061f')) return;
    try { await EP.deleteComment(commentId); await renderGroupPosts(); } catch (err) { showToast(err.message, 'danger'); }
  };
  window.adminDismissReport = async (reportId) => {
    try { await EP.dismissReport(reportId); await renderGroupPosts(); showToast('تم تجاهل البلاغ'); } catch (err) { showToast(err.message, 'danger'); }
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
    const ENR_FILTER_LABEL = { pending: '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631', active: '\u0646\u0634\u0637\u0629', completed: '\u0645\u0643\u062a\u0645\u0644\u0629', cancelled: '\u0645\u0644\u063a\u0627\u0629' };
    document.getElementById('admin-enrollments-list').innerHTML = filtered.map(e => `
      <div class="card p-5 flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge ${statusBadge[e.status] || 'badge-info'}">${ENR_STATUS_LABEL[e.status] || e.status}</span>
            <span class="badge ${e.paymentStatus === 'paid' ? 'badge-success' : e.paymentStatus === 'waived' ? 'badge-info' : 'badge-warning'}">${ENR_PAYMENT_LABEL[e.paymentStatus] || e.paymentStatus}</span>
            ${!e.courseId ? `<span class="badge badge-warning">\u0627\u0644\u062f\u0648\u0631\u0629 \u063a\u064a\u0631 \u0645\u062d\u062f\u062f\u0629</span>` : ''}
          </div>
          <p class="font-semibold truncate" style="color:var(--navy-700)"><a href="#" onclick="event.preventDefault(); openUserDetailModal('${e.studentId}')" class="hover:underline">${escapeHtml(userById2[e.studentId] || '\u0637\u0627\u0644\u0628 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641')}</a> \u2192 ${e.courseId ? escapeHtml(courseById[e.courseId] || '\u062f\u0648\u0631\u0629 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641\u0629') : '\u0644\u0645 \u064a\u064f\u062d\u062f\u062f \u0628\u0639\u062f'}</p>
          <p class="text-xs mt-1" style="color:var(--text-secondary)">\u062a\u0645 \u0627\u0644\u0637\u0644\u0628 ${EP.timeAgo(e.requestedAt)}${e.priceMad ? ` \u00b7 ${e.priceMad} MAD` : ''}</p>
        </div>
        ${e.status === 'pending' ? `
        <div class="flex gap-2 shrink-0">
          <button onclick='openActivateModal(${JSON.stringify(e.id)}, ${JSON.stringify(userById2[e.studentId] || '')}, ${JSON.stringify(e.courseId || '')})' class="btn btn-primary btn-sm">\u0642\u0628\u0648\u0644</button>
          <button onclick="rejectEnrollmentConfirm('${e.id}')" class="btn btn-secondary btn-sm" style="color:var(--danger-600); border-color:var(--danger-600)">\u0631\u0641\u0636</button>
        </div>` : ''}
        ${e.status === 'active' ? `
        <div class="flex gap-2 shrink-0">
          <button onclick='openActivateModal(${JSON.stringify(e.id)}, ${JSON.stringify(userById2[e.studentId] || '')}, ${JSON.stringify(e.courseId || '')}, ${JSON.stringify(e.priceMad || '')}, ${JSON.stringify(e.paymentStatus || 'unpaid')})' class="btn btn-secondary btn-sm">\u062a\u0639\u062f\u064a\u0644</button>
        </div>` : ''}
        ${e.status === 'cancelled' ? `
        <div class="flex gap-2 shrink-0">
          <button onclick="revertEnrollmentConfirm('${e.id}')" class="btn btn-secondary btn-sm">\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0641\u0639\u064a\u0644</button>
        </div>` : ''}
      </div>`).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0633\u062c\u064a\u0644\u0627\u062a${enrollmentFilter === 'all' ? '' : ' ' + ENR_FILTER_LABEL[enrollmentFilter]}.</p></div>`;
  }
  window.revertEnrollmentConfirm = async (id) => {
    if (!confirm('\u0625\u0639\u0627\u062f\u0629 \u0647\u0630\u0627 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0625\u0644\u0649 \u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631\u061f \u0633\u062a\u062a\u0645\u0643\u0646 \u0645\u0646 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u064a\u0647 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649 \u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631.')) return;
    try { await EP.revertEnrollment(id); await renderEnrollments(); showToast('\u062a\u0645\u062a \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0625\u0644\u0649 \u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  window.openActivateModal = async (id, studentName, courseId, existingPrice, existingPaymentStatus) => {
    const isEdit = existingPrice !== undefined;
    document.getElementById('activate-enrollment-id').value = id;
    document.getElementById('activate-modal-summary').innerHTML = `<strong>${escapeHtml(studentName)}</strong>`;
    document.getElementById('activate-enrollment-form').reset();
    document.querySelector('#activate-enrollment-modal p.font-serif').textContent = isEdit ? '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062a\u0633\u062c\u064a\u0644' : '\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062a\u0633\u062c\u064a\u0644';
    document.querySelector('#activate-enrollment-form button[type="submit"]').textContent = isEdit ? '\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a' : '\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062a\u0633\u062c\u064a\u0644';
    const courseSelect = document.getElementById('activate-course');
    const courseList = await EP.courses();
    courseSelect.innerHTML = courseList.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    document.getElementById('activate-course-hint').classList.toggle('hidden', !!courseId);
    if (courseId) courseSelect.value = courseId;
    if (isEdit) {
      document.getElementById('activate-price').value = existingPrice;
      document.getElementById('activate-payment-status').value = existingPaymentStatus || 'unpaid';
    }
    document.getElementById('activate-cancel-link').classList.toggle('hidden', !isEdit);
    document.getElementById('activate-enrollment-modal').classList.remove('hidden');
  };
  document.getElementById('activate-cancel-link').addEventListener('click', async () => {
    const id = document.getElementById('activate-enrollment-id').value;
    if (!confirm('إلغاء هذا التسجيل؟ استخدم هذا للسجلات المكررة أو غير الصحيحة — سيفقد الطالب إمكانية الوصول إلى هذه الدورة.')) return;
    try {
      await EP.rejectEnrollment(id);
      document.getElementById('activate-enrollment-modal').classList.add('hidden');
      await renderEnrollments();
      showToast('تم إلغاء التسجيل');
    } catch (err) { showToast(err.message, 'danger'); }
  });
  window.rejectEnrollmentConfirm = async (id) => {
    if (!confirm('رفض طلب التسجيل هذا؟')) return;
    try { await EP.rejectEnrollment(id); await renderEnrollments(); showToast('تم رفض التسجيل', 'info'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  document.getElementById('activate-enrollment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.activateEnrollment(document.getElementById('activate-enrollment-id').value, {
        priceMad: document.getElementById('activate-price').value,
        paymentStatus: document.getElementById('activate-payment-status').value,
        courseId: document.getElementById('activate-course').value,
      });
      document.getElementById('activate-enrollment-modal').classList.add('hidden');
      await renderEnrollments();
      showToast('\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u2014 \u0623\u0635\u0628\u062d \u0644\u062f\u0649 \u0627\u0644\u0637\u0627\u0644\u0628 \u0625\u0645\u0643\u0627\u0646\u064a\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u062f\u0648\u0631\u0629');
    } catch (err) { showToast(err.message, 'danger'); }
  });
  await renderEnrollments();
  EP.onChange([EP.KEYS.enrollments], renderEnrollments);
});
