document.addEventListener('DOMContentLoaded', async () => {
  const user = await EP.requireRole('teacher');
  if (!user) return;
  initPortalChrome(user, 'teacher-shell');
  initCommunity(user, 'teacher-shell');
  wireTabs('teacher-shell', 'overview');

  const myCourseId = user.courseId;
  let myStudents = [];
  let activeThreadStudentId = null;

  async function myHomework() { return EP.homeworkByCourse(myCourseId); }
  async function pendingSubs() {
    const hw = await myHomework();
    const hwIds = hw.map(h => h.id);
    return (await EP.submissions()).filter(s => hwIds.includes(s.homeworkId) && s.status === 'submitted');
  }

  async function renderKPIs() {
    const [hw, pending] = await Promise.all([myHomework(), pendingSubs()]);
    document.getElementById('teacher-kpis').innerHTML = [
      ['users', myStudents.length, 'Students', 'students'],
      ['clipboard-list', hw.length, 'Homework Assigned', 'assign'],
      ['check-circle', pending.length, 'Pending Grading', 'grade'],
    ].map(([icon, val, label, tab]) => `
      <button onclick="switchTab('teacher-shell','${tab}')" class="card card-hover p-5 text-left w-full">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style="background:var(--navy-50)"><i data-lucide="${icon}" class="w-4 h-4" style="color:var(--navy-700)"></i></div>
        <p class="text-2xl font-serif font-bold" style="color:var(--navy-700)">${val}</p>
        <p class="text-xs mt-1" style="color:var(--text-secondary)">${label}</p>
      </button>`).join('');
  }

  async function renderPending() {
    const items = await pendingSubs();
    const hw = await myHomework();
    document.getElementById('teacher-pending').innerHTML = items.map(s => {
      const h = hw.find(x => x.id === s.homeworkId);
      const student = myStudents.find(x => x.id === s.studentId);
      return `<div class="flex items-center justify-between p-3 rounded-lg" style="background:var(--bg-subtle)">
        <div><p class="font-medium text-sm" style="color:var(--navy-700)">${escapeHtml(student?.name)} \u2014 ${escapeHtml(h?.title)}</p><p class="text-xs" style="color:var(--text-secondary)">Submitted ${EP.timeAgo(s.submittedAt)}</p></div>
        <button onclick="switchTab('teacher-shell','grade')" class="btn btn-secondary btn-sm">Review</button>
      </div>`;
    }).join('') || `<p class="text-sm" style="color:var(--text-secondary)">Nothing pending \u2014 you\u2019re all caught up.</p>`;
  }

  async function renderStudents() {
    const [hw, allSubs] = await Promise.all([myHomework(), EP.submissions()]);
    document.getElementById('teacher-students-list').innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-left px-5 py-3 text-white font-semibold">Student</th><th class="text-left px-5 py-3 text-white font-semibold">Homework Submitted</th><th class="text-left px-5 py-3 text-white font-semibold">Avg. Grade</th></tr></thead><tbody>
      ${myStudents.map((s, i) => {
        const subs = allSubs.filter(x => x.studentId === s.id);
        const graded = subs.filter(x => x.status === 'graded');
        return `<tr style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}">
          <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(s.name)}</td>
          <td class="px-5 py-3" style="color:var(--text-secondary)">${subs.length} / ${hw.length}</td>
          <td class="px-5 py-3" style="color:var(--text-secondary)">${graded.length ? graded.map(g => g.grade).join(', ') : '\u2014'}</td>
        </tr>`;
      }).join('')}
    </tbody></table>`;
  }

  async function renderHwList() {
    const [hw, allSubs] = await Promise.all([myHomework(), EP.submissions()]);
    document.getElementById('teacher-hw-list').innerHTML = hw.map(h => `
      <div class="card p-4">
        <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(h.title)}</p>
        <p class="text-xs mt-1" style="color:var(--text-secondary)">Due ${h.dueDate} \u00b7 ${allSubs.filter(s => s.homeworkId === h.id).length}/${myStudents.length} submitted</p>
      </div>`).join('') || `<p class="text-sm" style="color:var(--text-secondary)">No homework assigned yet.</p>`;
  }

  async function renderGradeList() {
    const [hw, allSubs] = await Promise.all([myHomework(), EP.submissions()]);
    const hwIds = hw.map(h => h.id);
    const subs = allSubs.filter(s => hwIds.includes(s.homeworkId));
    document.getElementById('teacher-grade-list').innerHTML = subs.map(s => {
      const h = hw.find(x => x.id === s.homeworkId);
      const student = myStudents.find(x => x.id === s.studentId);
      return `<div class="card p-5">
        <div class="flex items-center justify-between mb-2">
          <p class="font-semibold" style="color:var(--navy-700)">${escapeHtml(student?.name)} \u2014 <span class="font-normal">${escapeHtml(h?.title)}</span></p>
          <span class="badge ${s.status === 'graded' ? 'badge-success' : 'badge-warning'}">${s.status}</span>
        </div>
        <p class="text-sm p-3 rounded-lg" style="background:var(--bg-subtle); color:var(--text-secondary)">${escapeHtml(s.content)}</p>
        ${s.status === 'graded'
          ? `<p class="text-sm mt-3"><span class="font-semibold" style="color:var(--navy-700)">Grade: ${escapeHtml(s.grade)}</span> \u2014 ${escapeHtml(s.feedback)}</p>`
          : `<button onclick='openGradeModal(${JSON.stringify(s.id)}, ${JSON.stringify(s.content)}, ${JSON.stringify(student?.name)}, ${JSON.stringify(h?.title)})' class="btn btn-primary btn-sm mt-3">Grade This</button>`}
      </div>`;
    }).join('') || `<p style="color:var(--text-secondary)">No submissions yet.</p>`;
  }

  function renderThreads() {
    document.getElementById('teacher-thread-list').innerHTML = myStudents.map(s => `
      <button onclick="selectThread('${s.id}')" class="w-full text-left px-3 py-3 rounded-lg text-sm flex items-center gap-3" style="background:${s.id === activeThreadStudentId ? 'var(--navy-50)' : 'transparent'}">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style="background:var(--navy-700)">${s.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
        <span style="color:var(--navy-700)">${escapeHtml(s.name)}</span>
      </button>`).join('');
  }

  async function renderChat() {
    const header = document.getElementById('teacher-chat-header');
    const msgsEl = document.getElementById('teacher-chat-messages');
    if (!activeThreadStudentId) { header.textContent = 'Select a student'; msgsEl.innerHTML = ''; return; }
    const student = myStudents.find(s => s.id === activeThreadStudentId);
    header.textContent = student?.name || '';
    const msgs = await EP.messagesFor(user.id, activeThreadStudentId);
    msgsEl.innerHTML = msgs.map(m => `
      <div class="flex ${m.fromId === user.id ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[75%] px-4 py-2 rounded-xl text-sm" style="background:${m.fromId === user.id ? 'var(--navy-700)' : 'var(--bg-subtle)'}; color:${m.fromId === user.id ? '#fff' : 'var(--text-primary)'}">
          ${escapeHtml(m.body)}<div class="text-[10px] mt-1 opacity-70">${EP.timeAgo(m.createdAt)}</div>
        </div>
      </div>`).join('') || `<p class="text-sm text-center" style="color:var(--text-secondary)">No messages yet — say hello!</p>`;
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  window.selectThread = async (studentId) => { activeThreadStudentId = studentId; renderThreads(); await renderChat(); };

  window.openGradeModal = (subId, content, studentName, hwTitle) => {
    document.getElementById('grade-sub-id').value = subId;
    document.getElementById('grade-modal-content').innerHTML = `<strong>${escapeHtml(studentName)}</strong> \u2014 ${escapeHtml(hwTitle)}<br><br>${escapeHtml(content)}`;
    document.getElementById('grade-form').reset();
    document.getElementById('grade-modal').classList.remove('hidden');
  };
  window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

  // ---- Resources (materials the admin has shared) ----
  // These must be declared before renderAll() is called below — renderAll()
  // calls renderTeacherResources(), which reads teacherResourcesCache, and
  // `let`/`const` bindings aren't accessible until their own declaration
  // line runs. Having this block after the renderAll() call threw exactly
  // that error on every load: "Cannot access before initialization."
  let teacherResourcesCache = [];
  const T_RES_TYPE_ICON = { pdf: 'file-text', video: 'youtube', link: 'link' };
  const T_RES_TYPE_LABEL = { pdf: 'PDF', video: 'Video', link: 'Link' };

  // ---- Attendance ----
  let attendanceDraft = {}; // studentId -> status, for the currently-selected date, before saving
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  document.getElementById('attendance-date').value = todayISO();

  async function renderAttendance() {
    const dateInput = document.getElementById('attendance-date');
    const classDate = dateInput.value || todayISO();
    let existing = [];
    try { existing = await EP.attendanceFor(myCourseId, classDate); } catch (e) { console.warn('Could not load attendance:', e); }
    const existingByStudent = Object.fromEntries(existing.map((a) => [a.studentId, a.status]));
    attendanceDraft = { ...existingByStudent };
    renderAttendanceList();
  }
  function renderAttendanceList() {
    const statusOptions = [['present', 'Present', 'success'], ['late', 'Late', 'warning'], ['absent', 'Absent', 'danger']];
    document.getElementById('attendance-list').innerHTML = `<table class="w-full text-sm"><tbody>
      ${myStudents.map((s, i) => `<tr style="background:${i % 2 === 0 ? 'var(--bg-subtle)' : '#fff'}">
        <td class="px-5 py-3 font-medium" style="color:var(--navy-700)">${escapeHtml(s.name)}</td>
        <td class="px-5 py-3 text-right">
          ${statusOptions.map(([val, label, color]) => `<button type="button" data-attendance-student="${s.id}" data-attendance-status="${val}" class="attendance-pill px-3 py-1.5 rounded-full text-xs font-semibold mx-0.5" style="${attendanceDraft[s.id] === val ? `background:var(--${color}-50);color:var(--${color}-600)` : 'background:var(--bg-subtle);color:var(--text-secondary)'}">${label}</button>`).join('')}
        </td>
      </tr>`).join('')}
    </tbody></table>` || `<p class="text-sm text-center py-8" style="color:var(--text-secondary)">No students in this course yet.</p>`;
    document.querySelectorAll('[data-attendance-student]').forEach((btn) => {
      btn.addEventListener('click', () => {
        attendanceDraft[btn.dataset.attendanceStudent] = btn.dataset.attendanceStatus;
        renderAttendanceList();
      });
    });
  }
  document.getElementById('attendance-date').addEventListener('change', renderAttendance);
  document.getElementById('attendance-mark-all-present').addEventListener('click', () => {
    myStudents.forEach((s) => { attendanceDraft[s.id] = 'present'; });
    renderAttendanceList();
  });
  document.getElementById('attendance-save').addEventListener('click', async () => {
    const classDate = document.getElementById('attendance-date').value || todayISO();
    const records = Object.entries(attendanceDraft).map(([studentId, status]) => ({ studentId, status }));
    if (!records.length) { showToast('Mark at least one student first', 'danger'); return; }
    try {
      await EP.markAttendance(myCourseId, user.id, classDate, records);
      showToast('Attendance saved');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- Announcements ----
  async function renderAnnouncements() {
    let list = [];
    try { list = await EP.announcementsFor(myCourseId); } catch (e) { console.warn('Could not load announcements:', e); }
    document.getElementById('teacher-announcements-list').innerHTML = list.map((a) => `
      <div class="card p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold" style="color:var(--navy-700)">${escapeHtml(a.title)}</p>
            <p class="text-sm mt-1" style="color:var(--text-secondary)">${escapeHtml(a.body)}</p>
            <p class="text-xs mt-2" style="color:var(--text-disabled)">${EP.timeAgo(a.createdAt)}</p>
          </div>
          <button onclick="deleteAnnouncementConfirm('${a.id}')" aria-label="Delete" class="shrink-0"><i data-lucide="trash-2" class="w-4 h-4" style="color:var(--danger-600)"></i></button>
        </div>
      </div>`).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">No announcements posted yet.</p></div>`;
    lucide.createIcons();
  }
  window.deleteAnnouncementConfirm = async (id) => {
    if (!confirm('Delete this announcement? Students will no longer see it.')) return;
    try { await EP.deleteAnnouncement(id); await renderAnnouncements(); showToast('Announcement deleted', 'info'); }
    catch (err) { showToast(err.message, 'danger'); }
  };
  document.getElementById('announcement-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.addAnnouncement({
        courseId: myCourseId, teacherId: user.id,
        title: document.getElementById('announcement-title').value,
        body: document.getElementById('announcement-body').value,
      });
      document.getElementById('announcement-modal').classList.add('hidden');
      document.getElementById('announcement-form').reset();
      await renderAnnouncements();
      showToast('Posted to your class');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  async function renderAll() {
    myStudents = await EP.studentsOf(myCourseId);
    if (!activeThreadStudentId && myStudents.length) activeThreadStudentId = myStudents[0].id;
    await Promise.all([renderKPIs(), renderPending(), renderStudents(), renderHwList(), renderGradeList(), renderTeacherResources(), renderAttendance(), renderAnnouncements()]);
    renderThreads();
    await renderChat();
    lucide.createIcons();
  }
  await renderAll();
  EP.onChange([EP.KEYS.homework, EP.KEYS.submissions, EP.KEYS.messages, EP.KEYS.resources, EP.KEYS.attendance, EP.KEYS.announcements], renderAll);

  async function renderTeacherResources() {
    const list = document.getElementById('teacher-resources-list');
    if (!list) return; // resources tab not present on this page
    try {
      teacherResourcesCache = await EP.resources();
    } catch (err) {
      console.error('Could not load resources:', err);
      list.innerHTML = `<p class="text-sm col-span-full" style="color:var(--danger-600)">Could not load resources right now.</p>`;
      return;
    }
    const catFilter = document.getElementById('tres-category-filter');
    if (catFilter && !catFilter.dataset.populated) {
      catFilter.addEventListener('change', renderTeacherResourcesList);
      catFilter.dataset.populated = '1';
    }
    if (catFilter) {
      const cats = [...new Set(teacherResourcesCache.map(r => r.category))].sort();
      const current = catFilter.value;
      catFilter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      catFilter.value = current;
    }
    renderTeacherResourcesList();
  }

  function renderTeacherResourcesList() {
    const list = document.getElementById('teacher-resources-list');
    if (!list) return;
    const filterEl = document.getElementById('tres-category-filter');
    const filter = filterEl ? filterEl.value : '';
    const items = filter ? teacherResourcesCache.filter(r => r.category === filter) : teacherResourcesCache;
    list.innerHTML = items.map(r => `
      <div class="card p-4">
        <div class="flex items-center gap-2">
          <i data-lucide="${T_RES_TYPE_ICON[r.type]}" class="w-4 h-4 shrink-0" style="color:var(--red-600)"></i>
          <p class="font-semibold text-sm truncate" style="color:var(--navy-700)">${escapeHtml(r.title)}</p>
        </div>
        ${r.description ? `<p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtml(r.description)}</p>` : ''}
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <span class="badge badge-info">${escapeHtml(r.category)}</span>
          <span class="text-xs" style="color:var(--text-disabled)">${T_RES_TYPE_LABEL[r.type]}</span>
          ${r.targetTeacherId ? `<span class="badge badge-success">Sent just for you</span>` : ''}
        </div>
        ${r.type === 'pdf'
          ? `<button onclick='openPdfViewer(${JSON.stringify(r.url)}, ${JSON.stringify(r.title)})' class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--red-600)">View PDF <i data-lucide="eye" class="w-3 h-3"></i></button>`
          : `<a href="${r.url}" target="_blank" rel="noopener" class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--red-600)">Open <i data-lucide="arrow-up-right" class="w-3 h-3"></i></a>`}
      </div>`).join('') || `<p class="text-sm col-span-full text-center py-10" style="color:var(--text-secondary)">No resources shared yet.</p>`;
    lucide.createIcons();
  }

  window.openPdfViewer = (url, title) => {
    document.getElementById('pdf-viewer-title').textContent = title;
    document.getElementById('pdf-viewer-frame').src = url;
    document.getElementById('pdf-viewer-download').href = url;
    document.getElementById('pdf-viewer-modal').classList.remove('hidden');
  };

  document.getElementById('hw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.addHomework({
        courseId: myCourseId, teacherId: user.id,
        title: document.getElementById('hw-title').value,
        instructions: document.getElementById('hw-instructions').value,
        dueDate: document.getElementById('hw-due').value,
      });
      e.target.reset();
      await renderAll();
      showToast('Homework assigned to all students in your course');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  document.getElementById('grade-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subId = document.getElementById('grade-sub-id').value;
    const sub = (await EP.submissions()).find(s => s.id === subId);
    try {
      const gradeVal = document.getElementById('grade-value').value;
      await EP.gradeSubmission(subId, gradeVal, document.getElementById('grade-feedback').value);
      if (sub) await EP.sendNotification({ fromId: user.id, audience: 'user', audienceId: sub.studentId, title: 'Homework graded', body: `Your submission was graded: ${gradeVal}` }).catch(() => {});
      closeModal('grade-modal');
      await renderAll();
      showToast('Grade saved and student notified');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  document.getElementById('teacher-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('teacher-chat-input');
    if (!input.value.trim() || !activeThreadStudentId) return;
    try { await EP.sendMessage(user.id, activeThreadStudentId, input.value.trim()); input.value = ''; await renderChat(); }
    catch (err) { showToast(err.message, 'danger'); }
  });

  document.getElementById('announce-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await EP.sendNotification({
        fromId: user.id, audience: 'course', audienceId: myCourseId,
        title: document.getElementById('announce-title').value,
        body: document.getElementById('announce-body').value,
      });
      e.target.reset();
      showToast('Sent to your whole class');
    } catch (err) { showToast(err.message, 'danger'); }
  });
});
