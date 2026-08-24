document.addEventListener('DOMContentLoaded', async () => {
  const user = await EP.requireRole('student');
  if (!user) return;

  // A student with no course assigned yet either has a pending enrollment
  // request or, in rare cases, none at all (e.g. an admin created the login
  // directly without an enrollment) — either way there's nothing useful to
  // show them yet, so stop before any dashboard UI initializes.
  if (!user.courseId) {
    const enrollments = await EP.myEnrollments(user.id).catch(() => []);
    const isPending = enrollments.length === 0 || enrollments.some((e) => e.status === 'pending');
    if (isPending) {
      document.getElementById('student-shell').classList.add('hidden');
      const screen = document.getElementById('pending-approval-screen');
      screen.classList.remove('hidden');
      document.getElementById('pending-logout').addEventListener('click', async () => {
        await EP.logout();
        window.location.href = 'login.html';
      });
      // If an admin approves this enrollment while the student happens to
      // have this tab open, refresh automatically instead of leaving them
      // stuck on a stale waiting screen until they manually reload.
      EP.onChange([EP.KEYS.enrollments], () => window.location.reload());
      if (window.lucide) lucide.createIcons();
      return;
    }
  }

  initPortalChrome(user, 'student-shell');
  initCommunity(user, 'student-shell');
  wireTabs('student-shell', 'overview');

  const [courseList, allUsers] = await Promise.all([EP.courses(), EP.users()]);
  const course = courseList.find(c => c.id === user.courseId);
  const teacher = allUsers.find(u => u.id === course?.teacher_id);

  async function myHomework() { return EP.homeworkByCourse(user.courseId); }

  function renderCourseInfo() {
    if (!course) {
      document.getElementById('student-course-info').innerHTML = `<p class="text-sm" style="color:var(--text-secondary)">No active course yet \u2014 see your enrollment status above.</p>`;
      return;
    }
    document.getElementById('student-course-info').innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style="background:var(--navy-50)"><i data-lucide="book-open" style="color:var(--navy-700)"></i></div>
        <div><p class="font-semibold" style="color:var(--navy-700)">${escapeHtml(course?.name || '')}</p><p class="text-xs mt-1" style="color:var(--text-secondary)">Teacher: ${escapeHtml(teacher?.name || '')}</p></div>
      </div>`;
  }

  async function renderEnrollmentBanner() {
    const el = document.getElementById('enrollment-status-banner');
    const enrollments = await EP.myEnrollments(user.id);
    const pending = enrollments.filter(e => e.status === 'pending');
    if (!pending.length) { el.innerHTML = ''; return; }
    const courseList = await EP.courses();
    el.innerHTML = pending.map(e => {
      const c = courseList.find(x => x.id === e.courseId);
      return `
      <div class="card p-4 flex items-center justify-between gap-3" style="background:var(--warning-50); border-color:var(--warning-600)">
        <div class="flex items-center gap-3">
          <i data-lucide="clock" class="w-5 h-5 shrink-0" style="color:var(--warning-600)"></i>
          <p class="text-sm" style="color:var(--text-primary)"><span class="font-semibold">Enrollment pending:</span> ${escapeHtml(c?.name || 'a program')} \u2014 an admin will review and confirm it soon.</p>
        </div>
        <button onclick="cancelMyEnrollment('${e.id}')" class="text-xs font-semibold shrink-0" style="color:var(--danger-600)">Withdraw</button>
      </div>`;
    }).join('');
    lucide.createIcons();
  }
  window.cancelMyEnrollment = async (id) => {
    if (!confirm('Withdraw this enrollment request?')) return;
    try { await EP.cancelEnrollment(id); await renderEnrollmentBanner(); showToast('Enrollment request withdrawn'); }
    catch (err) { showToast(err.message, 'danger'); }
  };

  async function renderProgress() {
    const [hw, allSubs] = await Promise.all([myHomework(), EP.submissions()]);
    const mySubs = allSubs.filter(s => s.studentId === user.id);
    const total = hw.length;
    const completed = mySubs.filter(s => hw.some(h => h.id === s.homeworkId)).length; // submitted or graded — both count as "done" by the student
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const circumference = 326.7; // matches the SVG's stroke-dasharray
    const ring = document.getElementById('student-progress-ring-fg');
    if (ring) ring.style.strokeDashoffset = String(circumference - (circumference * percent) / 100);

    document.getElementById('student-progress-title').textContent = total > 0 ? `${percent}%` : 'No homework yet';
    document.getElementById('student-progress-sub').textContent = total > 0 ? `${completed} of ${total} homework completed` : 'Your teacher hasn\u2019t assigned any yet';
  }

  async function renderOverviewLists() {
    const [hw, allSubs] = await Promise.all([myHomework(), EP.submissions()]);
    const mySubs = allSubs.filter(s => s.studentId === user.id);
    const due = hw.filter(h => {
      const s = mySubs.find(x => x.homeworkId === h.id);
      return !s || s.status !== 'graded';
    });
    document.getElementById('student-hw-due').innerHTML = due.map(h => {
      const sub = mySubs.find(x => x.homeworkId === h.id);
      return `<button onclick="switchTab('student-shell','homework')" class="w-full flex items-center justify-between text-left hover:opacity-70 transition"><span>${escapeHtml(h.title)}</span><span class="badge ${sub ? 'badge-warning' : 'badge-danger'}">${sub ? 'Submitted' : 'Due ' + h.dueDate}</span></button>`;
    }).join('') || `<p style="color:var(--text-secondary)">You\u2019re all caught up!</p>`;

    const graded = mySubs.filter(s => s.status === 'graded');
    document.getElementById('student-recent-grades').innerHTML = graded.map(s => {
      const h = hw.find(x => x.id === s.homeworkId);
      return `<button onclick="switchTab('student-shell','homework')" class="w-full flex items-center justify-between text-left hover:opacity-70 transition"><span>${escapeHtml(h?.title)}</span><span class="badge badge-success">${escapeHtml(s.grade)}</span></button>`;
    }).join('') || `<p style="color:var(--text-secondary)">No grades yet.</p>`;
  }

  async function renderHwList() {
    const [hw, allSubs] = await Promise.all([myHomework(), EP.submissions()]);
    const mySubs = allSubs.filter(s => s.studentId === user.id);
    document.getElementById('student-hw-list').innerHTML = hw.map(h => {
      const sub = mySubs.find(x => x.homeworkId === h.id);
      return `<div class="card p-5">
        <div class="flex items-center justify-between mb-2">
          <p class="font-semibold" style="color:var(--navy-700)">${escapeHtml(h.title)}</p>
          <span class="badge ${sub ? (sub.status === 'graded' ? 'badge-success' : 'badge-warning') : 'badge-danger'}">${sub ? sub.status : 'not started'}</span>
        </div>
        <p class="text-sm mb-3" style="color:var(--text-secondary)">${escapeHtml(h.instructions)}</p>
        <p class="text-xs mb-3" style="color:var(--text-disabled)">Due ${h.dueDate}</p>
        ${sub && sub.status === 'graded'
          ? `<div class="p-3 rounded-lg text-sm" style="background:var(--success-50)"><span class="font-semibold" style="color:var(--success-600)">Grade: ${escapeHtml(sub.grade)}</span><p class="mt-1" style="color:var(--text-secondary)">${escapeHtml(sub.feedback)}</p></div>`
          : sub
          ? `<p class="text-xs" style="color:var(--text-secondary)">Submitted ${EP.timeAgo(sub.submittedAt)} \u2014 waiting for your teacher to grade it.</p>`
          : `<button onclick='openSubmitModal(${JSON.stringify(h.id)}, ${JSON.stringify(h.title)}, ${JSON.stringify(h.instructions)})' class="btn btn-primary btn-sm">Submit Homework</button>`}
      </div>`;
    }).join('') || `<p style="color:var(--text-secondary)">No homework assigned yet.</p>`;
  }

  async function renderNotifications() {
    const items = await EP.notificationsFor(user);
    document.getElementById('student-notif-list').innerHTML = items.map(n => `
      <div onclick="EP.markRead('${n.id}', '${user.id}').then(()=>{this.style.opacity=0.6;})" class="card p-4 cursor-pointer">
        <div class="flex items-center justify-between mb-1"><span class="badge badge-info">${n.audience === 'all' ? 'Announcement' : 'Class'}</span><span class="text-xs" style="color:var(--text-disabled)">${EP.timeAgo(n.createdAt)}</span></div>
        <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(n.title)}</p>
        <p class="text-xs mt-1" style="color:var(--text-secondary)">${escapeHtml(n.body)}</p>
      </div>`).join('') || `<p style="color:var(--text-secondary)">No notifications yet.</p>`;
  }

  async function renderChat() {
    if (!teacher) return;
    document.getElementById('student-chat-header').textContent = teacher.name;
    const msgsEl = document.getElementById('student-chat-messages');
    const msgs = await EP.messagesFor(user.id, teacher.id);
    msgsEl.innerHTML = msgs.map(m => `
      <div class="flex ${m.fromId === user.id ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[75%] px-4 py-2 rounded-xl text-sm" style="background:${m.fromId === user.id ? 'var(--navy-700)' : 'var(--bg-subtle)'}; color:${m.fromId === user.id ? '#fff' : 'var(--text-primary)'}">
          ${escapeHtml(m.body)}<div class="text-[10px] mt-1 opacity-70">${EP.timeAgo(m.createdAt)}</div>
        </div>
      </div>`).join('') || `<p class="text-sm text-center" style="color:var(--text-secondary)">No messages yet — say hello to your teacher!</p>`;
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  window.openSubmitModal = (hwId, title, instructions) => {
    document.getElementById('submit-hw-id').value = hwId;
    document.getElementById('submit-modal-title').textContent = title;
    document.getElementById('submit-modal-instructions').textContent = instructions;
    document.getElementById('submit-form').reset();
    document.getElementById('submit-modal').classList.remove('hidden');
  };
  window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

  async function renderAll() {
    renderCourseInfo();
    await Promise.all([renderEnrollmentBanner(), renderProgress(), renderOverviewLists(), renderHwList(), renderNotifications(), renderChat()]);
    lucide.createIcons();
  }
  await renderAll();
  EP.onChange([EP.KEYS.homework, EP.KEYS.submissions, EP.KEYS.notifications, EP.KEYS.messages, EP.KEYS.enrollments], renderAll);

  document.getElementById('submit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.submitHomework(document.getElementById('submit-hw-id').value, user.id, document.getElementById('submit-content').value);
      closeModal('submit-modal');
      await renderAll();
      showToast('Homework submitted!');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  document.getElementById('student-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('student-chat-input');
    if (!input.value.trim() || !teacher) return;
    try { await EP.sendMessage(user.id, teacher.id, input.value.trim()); input.value = ''; await renderChat(); }
    catch (err) { showToast(err.message, 'danger'); }
  });
});
