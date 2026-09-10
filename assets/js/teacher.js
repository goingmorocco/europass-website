document.addEventListener('DOMContentLoaded', async () => {
  const user = await EP.requireRole('teacher');
  if (!user) return;

  if (user.blockedAt) {
    document.getElementById('teacher-shell').classList.add('hidden');
    const screen = document.getElementById('blocked-screen');
    if (user.blockedReason) {
      document.getElementById('blocked-reason-text').textContent = user.blockedReason;
    }
    screen.classList.remove('hidden');
    document.getElementById('blocked-logout').addEventListener('click', async () => {
      await EP.logout();
      window.location.href = 'login.html';
    });
    if (window.lucide) lucide.createIcons();
    return;
  }

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
        <p class="text-xs mt-1" style="color:var(--text-secondary)">Due ${h.dueDate ? new Date(h.dueDate).toLocaleString() : '\u2014'} \u00b7 ${allSubs.filter(s => s.homeworkId === h.id).length}/${myStudents.length} submitted</p>
      </div>`).join('') || `<p class="text-sm" style="color:var(--text-secondary)">No homework assigned yet.</p>`;
  }

  async function renderGradeList() {
    const [hw, allSubs] = await Promise.all([myHomework(), EP.submissions()]);
    const hwIds = hw.map(h => h.id);
    const subs = allSubs.filter(s => hwIds.includes(s.homeworkId));
    const rows = await Promise.all(subs.map(async (s) => {
      const h = hw.find(x => x.id === s.homeworkId);
      const student = myStudents.find(x => x.id === s.studentId);
      const statusBadge = s.status === 'graded' ? 'badge-success' : s.status === 'needs_revision' ? 'badge-warning' : s.status === 'draft' ? 'badge-info' : 'badge-warning';
      const statusLabel = s.status === 'needs_revision' ? 'needs revision' : s.status;

      let bodyHtml;
      if (h?.submissionMode === 'quiz') {
        const questions = await EP.homeworkQuestions(h.id);
        bodyHtml = `<div class="p-3 rounded-lg" style="background:var(--bg-subtle)">
          <p class="text-sm font-semibold mb-2" style="color:var(--navy-700)">Auto-graded: ${s.autoScore}%</p>
          <div class="space-y-2">
            ${questions.map((q, qi) => {
              const picked = Array.isArray(s.quizAnswers) ? s.quizAnswers[qi] : undefined;
              const isRight = picked === q.correctIndex;
              return `<p class="text-xs" style="color:var(--text-secondary)">${qi + 1}. ${escapeHtml(q.questionText)} \u2014 <span style="color:${isRight ? 'var(--success-600)' : 'var(--danger-600)'}">${picked != null ? escapeHtml(q.options[picked] || '?') : 'no answer'}</span>${!isRight ? ` (correct: ${escapeHtml(q.options[q.correctIndex])})` : ''}</p>`;
            }).join('')}
          </div>
        </div>`;
      } else {
        const isAudio = s.attachmentUrl && /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(s.attachmentUrl);
        bodyHtml = `${s.content ? `<p class="text-sm p-3 rounded-lg" style="background:var(--bg-subtle); color:var(--text-secondary)">${escapeHtml(s.content)}</p>` : ''}
          ${s.attachmentUrl ? (isAudio
            ? `<audio controls class="w-full mt-2" src="${escapeHtml(s.attachmentUrl)}"></audio>`
            : `<a href="${escapeHtml(s.attachmentUrl)}" target="_blank" rel="noopener" class="text-xs font-semibold inline-flex items-center gap-1 mt-2" style="color:var(--teal-600)">\u{1F4CE} ${escapeHtml(s.attachmentName || 'View file')}</a>`) : ''}`;
      }

      const canGrade = h?.submissionMode !== 'quiz' && (s.status === 'submitted' || s.status === 'needs_revision');
      const actionHtml = s.status === 'graded'
        ? `<p class="text-sm mt-3"><span class="font-semibold" style="color:var(--navy-700)">Grade: ${escapeHtml(s.grade)}${h?.maxPoints && h.submissionMode !== 'quiz' ? ` / ${h.maxPoints}` : ''}</span>${s.feedback ? ` \u2014 ${escapeHtml(s.feedback)}` : ''}</p>`
        : s.status === 'needs_revision'
        ? `<p class="text-xs mt-2" style="color:var(--text-secondary)">Sent back: ${escapeHtml(s.feedback || '')}</p>${canGrade ? `<button onclick="openGradeModal('${s.id}')" class="btn btn-secondary btn-sm mt-2">Grade Now</button>` : ''}`
        : canGrade
        ? `<button onclick="openGradeModal('${s.id}')" class="btn btn-primary btn-sm mt-3">Grade This</button>`
        : '';

      return `<div class="card p-5">
        <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <p class="font-semibold" style="color:var(--navy-700)">${escapeHtml(student?.name)} \u2014 <span class="font-normal">${escapeHtml(h?.title)}</span></p>
          <span class="badge ${statusBadge}">${statusLabel}</span>
        </div>
        ${bodyHtml}
        ${actionHtml}
      </div>`;
    }));
    document.getElementById('teacher-grade-list').innerHTML = rows.filter((_, i) => subs[i].status !== 'draft').join('') || `<p style="color:var(--text-secondary)">No submissions yet.</p>`;
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

  window.openGradeModal = async (subId) => {
    const sub = (await EP.submissions()).find(s => s.id === subId);
    const h = (await myHomework()).find(x => x.id === sub?.homeworkId);
    const student = myStudents.find(x => x.id === sub?.studentId);

    document.getElementById('grade-sub-id').value = subId;
    document.getElementById('grade-modal-content').innerHTML = `<strong>${escapeHtml(student?.name)}</strong> \u2014 ${escapeHtml(h?.title)}${sub?.content ? `<br><br>${escapeHtml(sub.content)}` : ''}`;
    document.getElementById('grade-value-label').textContent = h?.maxPoints ? `Grade (out of ${h.maxPoints})` : 'Grade';
    document.getElementById('grade-value').placeholder = h?.maxPoints ? `e.g. ${Math.round(h.maxPoints * 0.8)}` : 'e.g. B+ or 8/10';

    const isAudio = sub?.attachmentUrl && /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(sub.attachmentUrl);
    document.getElementById('grade-modal-attachment').innerHTML = sub?.attachmentUrl
      ? isAudio
        ? `<audio controls class="w-full" src="${escapeHtml(sub.attachmentUrl)}"></audio>`
        : `<a href="${escapeHtml(sub.attachmentUrl)}" target="_blank" rel="noopener" class="text-xs font-semibold" style="color:var(--teal-600)">\u{1F4CE} ${escapeHtml(sub.attachmentName || 'View submitted file')}</a>`
      : '';

    document.getElementById('grade-form').reset();
    document.getElementById('grade-modal').classList.remove('hidden');
  };
  window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

  document.getElementById('grade-revision-btn').addEventListener('click', async () => {
    const subId = document.getElementById('grade-sub-id').value;
    const feedback = document.getElementById('grade-feedback').value;
    if (!feedback) { showToast('Add a note explaining what needs revising', 'danger'); return; }
    const sub = (await EP.submissions()).find(s => s.id === subId);
    try {
      await EP.requestRevision(subId, feedback);
      if (sub) await EP.sendNotification({ fromId: user.id, audience: 'user', audienceId: sub.studentId, title: 'Revision requested', body: feedback }).catch(() => {});
      closeModal('grade-modal');
      await renderAll();
      showToast('Sent back to the student for revision');
    } catch (err) { showToast(err.message, 'danger'); }
  });

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

  // ---- Exercise builder: mode tabs, dynamic quiz questions, file attach ----
  let hwQuestionCount = 0;
  document.querySelectorAll('#hw-mode-tabs [data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#hw-mode-tabs [data-mode]').forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      document.getElementById('hw-mode').value = btn.dataset.mode;
      document.getElementById('hw-quiz-builder').classList.toggle('hidden', btn.dataset.mode !== 'quiz');
    });
  });

  function addQuestionRow() {
    const qId = ++hwQuestionCount;
    const row = document.createElement('div');
    row.className = 'p-4 rounded-md border';
    row.style.borderColor = 'var(--border-default)';
    row.dataset.qrow = qId;
    row.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs font-semibold" style="color:var(--text-secondary)">Question ${qId}</label>
        <button type="button" class="text-xs" style="color:var(--danger-600)" onclick="this.closest('[data-qrow]').remove()">Remove</button>
      </div>
      <input class="hw-q-text w-full px-3 py-2 rounded-md border text-sm mb-2" style="border-color:var(--border-default)" placeholder="Question text" required>
      <div class="space-y-2">
        ${[0, 1, 2, 3].map(i => `
          <div class="flex items-center gap-2">
            <input type="radio" name="hw-correct-${qId}" value="${i}" ${i === 0 ? 'checked' : ''} class="hw-q-correct">
            <input class="hw-q-option flex-1 px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)" placeholder="Option ${i + 1}${i >= 2 ? ' (optional)' : ''}" ${i < 2 ? 'required' : ''}>
          </div>`).join('')}
      </div>
      <p class="text-xs mt-1" style="color:var(--text-secondary)">Select the radio button next to the correct answer.</p>`;
    document.getElementById('hw-questions-list').appendChild(row);
  }
  document.getElementById('hw-add-question').addEventListener('click', addQuestionRow);

  let pendingAttachment = null;
  document.getElementById('hw-attachment').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const statusEl = document.getElementById('hw-attachment-status');
    if (!file) { pendingAttachment = null; statusEl.textContent = ''; return; }
    statusEl.textContent = 'Uploading...';
    try {
      pendingAttachment = await EP.uploadHomeworkFile(file);
      statusEl.textContent = `Attached: ${pendingAttachment.name}`;
      statusEl.style.color = 'var(--success-600)';
    } catch (err) {
      pendingAttachment = null;
      statusEl.textContent = err.message;
      statusEl.style.color = 'var(--danger-600)';
    }
  });

  document.getElementById('hw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('hw-mode').value;
    let questions;
    if (mode === 'quiz') {
      const rows = [...document.querySelectorAll('#hw-questions-list [data-qrow]')];
      if (!rows.length) { showToast('Add at least one question for a quiz exercise', 'danger'); return; }
      questions = rows.map((row) => {
        const options = [...row.querySelectorAll('.hw-q-option')].map((i) => i.value.trim()).filter(Boolean);
        const correctInput = row.querySelector('.hw-q-correct:checked');
        return {
          questionText: row.querySelector('.hw-q-text').value.trim(),
          options,
          correctIndex: correctInput ? parseInt(correctInput.value, 10) : 0,
        };
      });
      if (questions.some((q) => !q.questionText || q.options.length < 2)) {
        showToast('Every question needs text and at least 2 options', 'danger');
        return;
      }
    }
    try {
      await EP.addHomework({
        courseId: myCourseId, teacherId: user.id,
        title: document.getElementById('hw-title').value,
        instructions: document.getElementById('hw-instructions').value,
        dueDate: document.getElementById('hw-due').value,
        submissionMode: mode,
        attachmentUrl: pendingAttachment?.url,
        attachmentName: pendingAttachment?.name,
        maxPoints: parseInt(document.getElementById('hw-points').value, 10) || 100,
        questions,
      });
      e.target.reset();
      pendingAttachment = null;
      document.getElementById('hw-attachment-status').textContent = '';
      document.getElementById('hw-questions-list').innerHTML = '';
      document.getElementById('hw-quiz-builder').classList.add('hidden');
      document.querySelectorAll('#hw-mode-tabs [data-mode]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === 'text'));
      document.getElementById('hw-mode').value = 'text';
      await renderAll();
      showToast('Exercise assigned to all students in your course');
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
