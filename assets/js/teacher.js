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
      <div class="card p-4" onclick="openViewExerciseModal('${h.id}')" style="cursor:pointer">
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
        // s.autoScore is a snapshot frozen at the moment the student
        // submitted — if the teacher edits the quiz afterward (e.g. to
        // fix a wrong answer key), that stored number goes stale and can
        // disagree with the live, correct comparison right below it. This
        // recomputes the percentage from the same per-question checks
        // used for the breakdown, so the two can never contradict each
        // other again.
        const liveCorrect = questions.reduce((sum, q, qi) => {
          const picked = Array.isArray(s.quizAnswers) ? s.quizAnswers[qi] : undefined;
          return sum + (picked === q.correctIndex ? 1 : 0);
        }, 0);
        const livePct = questions.length ? Math.round((liveCorrect / questions.length) * 100) : 0;
        bodyHtml = `<div class="p-3 rounded-lg" style="background:var(--bg-subtle)">
          <p class="text-sm font-semibold mb-2" style="color:var(--navy-700)">Auto-graded: ${livePct}%</p>
          <div class="space-y-2">
            ${questions.map((q, qi) => {
              const picked = Array.isArray(s.quizAnswers) ? s.quizAnswers[qi] : undefined;
              const isRight = picked === q.correctIndex;
              return `<p class="text-xs" style="color:var(--text-secondary)">${qi + 1}. ${escapeHtml(q.questionText)} \u2014 <span style="color:${isRight ? 'var(--success-600)' : 'var(--danger-600)'}">${picked != null ? escapeHtml(q.options[picked] || '?') : 'no answer'}</span>${!isRight ? ` (correct: ${escapeHtml(q.options[q.correctIndex])})` : ''}</p>`;
            }).join('')}
          </div>
        </div>`;
      } else if (h?.submissionMode === 'multi') {
        // Multi-task submissions store one response per task in
        // task_responses, not the flat content/attachmentUrl fields those
        // only apply to single-mode exercises — this was previously
        // falling through to the generic branch below, which checks
        // exactly those flat fields and found nothing, so the teacher saw
        // no response at all for any multi-task exercise.
        const tasks = await EP.homeworkTasks(h.id);
        const responseByTask = new Map((s.taskResponses || []).map((tr) => [tr.taskId, tr]));
        bodyHtml = tasks.map((t, ti) => {
          const tr = responseByTask.get(t.id);
          let inner;
          if (t.type === 'quiz') {
            const answers = tr?.answers || [];
            const liveCorrect = (t.questions || []).reduce((sum, q, qi) => sum + (answers[qi] === q.correctIndex ? 1 : 0), 0);
            const livePct = t.questions?.length ? Math.round((liveCorrect / t.questions.length) * 100) : 0;
            inner = (t.questions || []).map((q, qi) => {
              const picked = answers[qi];
              const isRight = picked === q.correctIndex;
              return `<p class="text-xs" style="color:var(--text-secondary)">${qi + 1}. ${escapeHtml(q.questionText)} \u2014 <span style="color:${isRight ? 'var(--success-600)' : 'var(--danger-600)'}">${picked != null ? escapeHtml(q.options[picked] || '?') : 'no answer'}</span>${!isRight ? ` (correct: ${escapeHtml(q.options[q.correctIndex])})` : ''}</p>`;
            }).join('');
            inner = `${tr ? `<p class="text-xs font-semibold mb-1" style="color:var(--navy-700)">Auto-graded: ${livePct}%</p>` : ''}${inner || '<p class="text-xs" style="color:var(--text-secondary)">Not answered.</p>'}`;
          } else {
            // writing or media — both store their answer as HTML/plain
            // text in tr.content (rendered as HTML since student writing
            // responses come from the same rich text editor as instructions).
            inner = tr?.content
              ? `<div class="text-xs post-body-rendered" style="color:var(--text-secondary)">${tr.content}</div>`
              : '<p class="text-xs" style="color:var(--text-secondary)">No response.</p>';
          }
          return `<div class="p-3 rounded-lg border mb-2" style="border-color:var(--border-default)">
            <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:var(--teal-600)">${escapeHtml(t.title || `Task ${ti + 1}`)} \u00b7 ${t.type}</p>
            ${inner}
          </div>`;
        }).join('');
      } else {
        const isAudio = s.attachmentUrl && /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(s.attachmentUrl);
        bodyHtml = `${s.content ? `<div class="text-sm p-3 rounded-lg post-body-rendered" style="background:var(--bg-subtle); color:var(--text-secondary)">${s.content}</div>` : ''}
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

  window.openViewExerciseModal = async (hwId) => {
    const h = (await myHomework()).find(x => x.id === hwId);
    if (!h) return;
    const subs = (await EP.submissions()).filter(s => s.homeworkId === hwId);

    document.getElementById('view-exercise-title').textContent = h.title;
    const modeLabel = { text: 'Written Answer', file: 'File Upload', quiz: 'Quiz', multi: 'Multi-Task' }[h.submissionMode] || 'Written Answer';
    document.getElementById('view-exercise-meta').innerHTML = `
      <span class="badge badge-info">${modeLabel}</span>
      <span class="badge badge-success">${h.maxPoints} pts</span>
      <span class="text-xs" style="color:var(--text-secondary)">Due ${h.dueDate ? new Date(h.dueDate).toLocaleString() : '\u2014'}</span>
      <span class="text-xs" style="color:var(--text-secondary)">\u00b7 ${subs.length}/${myStudents.length} submitted</span>`;

    const body = document.getElementById('view-exercise-body');
    let html = h.instructions
      ? `<div class="post-body-rendered text-sm p-3 rounded-lg" dir="${h.instructionsDirection === 'rtl' ? 'rtl' : 'ltr'}" style="background:var(--bg-subtle); color:var(--text-primary)">${h.instructions}</div>`
      : '';

    if (h.attachmentUrl) {
      const isAudio = /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(h.attachmentUrl);
      html += isAudio
        ? `<audio controls class="w-full" src="${escapeHtml(h.attachmentUrl)}"></audio>`
        : `<a href="${escapeHtml(h.attachmentUrl)}" target="_blank" rel="noopener" class="text-sm font-semibold inline-flex items-center gap-1" style="color:var(--teal-600)">\u{1F4CE} ${escapeHtml(h.attachmentName || 'View attachment')}</a>`;
    }

    if (h.submissionMode === 'quiz') {
      const questions = await EP.homeworkQuestions(hwId);
      html += questions.map((q, qi) => `
        <div class="p-3 rounded-lg border" style="border-color:var(--border-default)">
          <p class="text-sm font-medium mb-2" style="color:var(--navy-700)">${qi + 1}. ${escapeHtml(q.questionText)}</p>
          ${q.options.map((opt, oi) => `<p class="text-xs pl-3 ${oi === q.correctIndex ? 'font-semibold' : ''}" style="color:${oi === q.correctIndex ? 'var(--success-600)' : 'var(--text-secondary)'}">${oi === q.correctIndex ? '\u2713' : '\u25cb'} ${escapeHtml(opt)}</p>`).join('')}
        </div>`).join('');
    } else if (h.submissionMode === 'multi') {
      const tasks = await EP.homeworkTasks(hwId);
      html += tasks.map((t, ti) => {
        let inner = '';
        if (t.type === 'writing') {
          inner = t.instructions ? `<div class="post-body-rendered text-xs" dir="${t.direction === 'rtl' ? 'rtl' : 'ltr'}" style="color:var(--text-secondary)">${t.instructions}</div>` : `<p class="text-xs" style="color:var(--text-secondary)">Students write a free-form answer.</p>`;
        } else if (t.type === 'quiz') {
          inner = (t.questions || []).map((q, qi) => `
            <p class="text-xs font-medium mt-2" style="color:var(--navy-700)">${qi + 1}. ${escapeHtml(q.questionText)}</p>
            ${q.options.map((opt, oi) => `<p class="text-xs pl-3 ${oi === q.correctIndex ? 'font-semibold' : ''}" style="color:${oi === q.correctIndex ? 'var(--success-600)' : 'var(--text-secondary)'}">${oi === q.correctIndex ? '\u2713' : '\u25cb'} ${escapeHtml(opt)}</p>`).join('')}`).join('');
        } else {
          inner = (t.mediaItems || []).map((item) => `<p class="text-xs" style="color:var(--text-secondary)">\u2022 ${escapeHtml(item.kind)}: ${escapeHtml(item.name || item.url)}</p>`).join('');
        }
        return `<div class="p-3 rounded-lg border" style="border-color:var(--border-default)">
          <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:var(--teal-600)">${escapeHtml(t.title || `Task ${ti + 1}`)} \u00b7 ${t.type}</p>
          ${inner}
        </div>`;
      }).join('');
    }

    body.innerHTML = html || `<p class="text-sm" style="color:var(--text-secondary)">No additional details.</p>`;
    document.getElementById('view-exercise-edit-btn').onclick = () => {
      closeModal('view-exercise-modal');
      populateFormForEdit(hwId);
    };
    document.getElementById('view-exercise-modal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  };


  window.openGradeModal = async (subId) => {
    const sub = (await EP.submissions()).find(s => s.id === subId);
    const h = (await myHomework()).find(x => x.id === sub?.homeworkId);
    const student = myStudents.find(x => x.id === sub?.studentId);

    document.getElementById('grade-sub-id').value = subId;
    let contentPreview = sub?.content ? `<br><br><div class="post-body-rendered">${sub.content}</div>` : '';
    if (h?.submissionMode === 'multi' && Array.isArray(sub?.taskResponses)) {
      const tasks = await EP.homeworkTasks(h.id);
      const responseByTask = new Map(sub.taskResponses.map((tr) => [tr.taskId, tr]));
      contentPreview = '<br>' + tasks.map((t, ti) => {
        const tr = responseByTask.get(t.id);
        let inner;
        if (t.type === 'quiz') {
          const answers = tr?.answers || [];
          const liveCorrect = (t.questions || []).reduce((sum, q, qi) => sum + (answers[qi] === q.correctIndex ? 1 : 0), 0);
          const livePct = t.questions?.length ? Math.round((liveCorrect / t.questions.length) * 100) : 0;
          inner = (t.questions || []).map((q, qi) => {
            const picked = answers[qi];
            const isRight = picked === q.correctIndex;
            return `<p class="text-xs" style="color:var(--text-secondary)">${qi + 1}. ${escapeHtml(q.questionText)} \u2014 <span style="color:${isRight ? 'var(--success-600)' : 'var(--danger-600)'}">${picked != null ? escapeHtml(q.options[picked] || '?') : 'no answer'}</span>${!isRight ? ` (correct: ${escapeHtml(q.options[q.correctIndex])})` : ''}</p>`;
          }).join('');
          inner = `${tr ? `<p class="text-xs font-semibold mb-1" style="color:var(--navy-700)">Auto-graded: ${livePct}%</p>` : ''}${inner || '<p class="text-xs" style="color:var(--text-secondary)">Not answered.</p>'}`;
        } else {
          inner = tr?.content ? `<div class="text-xs post-body-rendered" style="color:var(--text-secondary)">${tr.content}</div>` : '<p class="text-xs" style="color:var(--text-secondary)">No response.</p>';
        }
        return `<div class="p-2 rounded-md mb-2" style="background:var(--bg-subtle)">
          <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:var(--teal-600)">${escapeHtml(t.title || `Task ${ti + 1}`)} \u00b7 ${t.type}</p>
          ${inner}
        </div>`;
      }).join('');
    }
    document.getElementById('grade-modal-content').innerHTML = `<strong>${escapeHtml(student?.name)}</strong> \u2014 ${escapeHtml(h?.title)}${contentPreview}`;
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

  // ---- Exercise builder: mode tabs, rich text, dynamic quiz questions, tasks ----
  // Blog posts only ever need one Quill editor, so admin.js just keeps a
  // single global instance. An exercise can have several rich text fields
  // at once (the main instructions, plus one per writing task in a
  // multi-task exercise), so this keeps a named collection instead.
  const quillEditors = new Map();
  function initQuillEditor(elementId, rtlCheckboxId) {
    const el = document.getElementById(elementId);
    if (!el || !window.Quill) return null;
    const editor = new Quill(el, {
      theme: 'snow',
      placeholder: 'Write instructions...',
      modules: { toolbar: [
        [{ header: [1, 2, 3, false] }],
        [{ size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link', 'image'],
        ['clean'],
      ] },
    });
    quillEditors.set(elementId, editor);
    if (rtlCheckboxId) {
      const checkbox = document.getElementById(rtlCheckboxId);
      checkbox.addEventListener('change', () => {
        el.querySelector('.ql-editor').style.direction = checkbox.checked ? 'rtl' : 'ltr';
        el.querySelector('.ql-editor').style.textAlign = checkbox.checked ? 'right' : 'left';
      });
    }
    return editor;
  }
  function quillHtml(elementId) {
    const editor = quillEditors.get(elementId);
    if (!editor) return '';
    return editor.getText().trim() ? editor.root.innerHTML : '';
  }
  initQuillEditor('hw-instructions-editor', 'hw-instructions-rtl');

  let hwQuestionCount = 0;
  let hwTaskCount = 0;
  let editingHomeworkId = null;
  document.querySelectorAll('#hw-mode-tabs [data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#hw-mode-tabs [data-mode]').forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      const mode = btn.dataset.mode;
      document.getElementById('hw-mode').value = mode;
      document.getElementById('hw-quiz-builder').classList.toggle('hidden', mode !== 'quiz');
      document.getElementById('hw-multi-builder').classList.toggle('hidden', mode !== 'multi');
      // A multi-task exercise handles its own media per task, so the
      // single whole-exercise attachment field doesn't apply there.
      document.getElementById('hw-single-attachment').classList.toggle('hidden', mode === 'multi');
    });
  });

  function addQuestionRow(container, existing) {
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
            <input type="radio" name="hw-correct-${qId}" value="${i}" ${(existing ? existing.correctIndex === i : i === 0) ? 'checked' : ''} class="hw-q-correct">
            <input class="hw-q-option flex-1 px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)" placeholder="Option ${i + 1}${i >= 2 ? ' (optional)' : ''}" ${i < 2 ? 'required' : ''}>
          </div>`).join('')}
      </div>
      <p class="text-xs mt-1" style="color:var(--text-secondary)">Select the radio button next to the correct answer.</p>`;
    if (existing) {
      row.querySelector('.hw-q-text').value = existing.questionText || '';
      const optionInputs = row.querySelectorAll('.hw-q-option');
      (existing.options || []).forEach((opt, i) => { if (optionInputs[i]) optionInputs[i].value = opt; });
    }
    container.appendChild(row);
  }
  document.getElementById('hw-add-question').addEventListener('click', () => addQuestionRow(document.getElementById('hw-questions-list')));

  function collectQuestions(container) {
    return [...container.querySelectorAll('[data-qrow]')].map((row) => {
      const optionInputs = [...row.querySelectorAll('.hw-q-option')];
      const correctInput = row.querySelector('.hw-q-correct:checked');
      const correctSlot = correctInput ? parseInt(correctInput.value, 10) : 0;
      // Building the options array and figuring out where the correct
      // answer actually lands has to happen in the same pass — filtering
      // blank slots first and looking up the original slot index
      // afterward silently shifts everything once any slot before the
      // correct one is left empty, which pointed the stored answer at the
      // wrong option (this was a real, confirmed bug: leaving slot 0
      // blank while marking slot 1 correct stored slot 1's *neighbor* as
      // the correct answer instead).
      const options = [];
      let correctIndex = 0;
      optionInputs.forEach((input, slotIndex) => {
        const val = input.value.trim();
        if (!val) return;
        if (slotIndex === correctSlot) correctIndex = options.length;
        options.push(val);
      });
      return {
        questionText: row.querySelector('.hw-q-text').value.trim(),
        options,
        correctIndex,
      };
    });
  }

  // ---- Multi-task builder ----
  function addMediaItemRow(container, existing) {
    const row = document.createElement('div');
    row.className = 'flex items-start gap-2 p-3 rounded-md';
    row.style.background = 'var(--bg-subtle)';
    row.dataset.mediaRow = '1';
    row.innerHTML = `
      <div class="flex-1 space-y-2">
        <select class="hw-media-kind w-full px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)">
          <option value="video">Video (paste a YouTube/video link)</option>
          <option value="link">External Link</option>
          <option value="pdf">Upload PDF</option>
          <option value="audio">Upload Audio</option>
          <option value="image">Upload Image</option>
          <option value="file">Upload Other File</option>
        </select>
        <input class="hw-media-label w-full px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)" placeholder="Label (e.g. \u2018Listening clip\u2019)">
        <input class="hw-media-url w-full px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)" placeholder="Paste URL">
        <input class="hw-media-file hidden w-full text-sm" type="file">
        <p class="hw-media-status text-xs" style="color:var(--text-secondary)"></p>
      </div>
      <button type="button" class="text-xs shrink-0" style="color:var(--danger-600)" onclick="this.closest('[data-media-row]').remove()">Remove</button>`;
    const kindSelect = row.querySelector('.hw-media-kind');
    const urlInput = row.querySelector('.hw-media-url');
    const fileInput = row.querySelector('.hw-media-file');
    const statusEl = row.querySelector('.hw-media-status');
    function syncKind() {
      const needsUpload = ['pdf', 'audio', 'image', 'file'].includes(kindSelect.value);
      urlInput.classList.toggle('hidden', needsUpload);
      fileInput.classList.toggle('hidden', !needsUpload);
    }
    kindSelect.addEventListener('change', syncKind);
    if (existing) {
      kindSelect.value = existing.kind;
      row.querySelector('.hw-media-label').value = existing.name || '';
      if (['pdf', 'audio', 'image', 'file'].includes(existing.kind)) {
        row.dataset.uploadedUrl = existing.url;
        statusEl.textContent = `Current: ${existing.name || 'uploaded file'} (choose a new file to replace it)`;
      } else {
        urlInput.value = existing.url || '';
      }
    }
    syncKind();
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      statusEl.textContent = 'Uploading...';
      try {
        const uploaded = await EP.uploadHomeworkFile(file);
        row.dataset.uploadedUrl = uploaded.url;
        statusEl.textContent = `Uploaded: ${uploaded.name}`;
        statusEl.style.color = 'var(--success-600)';
      } catch (err) {
        statusEl.textContent = err.message;
        statusEl.style.color = 'var(--danger-600)';
      }
    });
    container.appendChild(row);
  }

  function addTaskCard(type, existing) {
    const taskId = ++hwTaskCount;
    const card = document.createElement('div');
    card.className = 'p-4 rounded-md border';
    card.style.borderColor = 'var(--border-default)';
    card.dataset.taskCard = taskId;
    card.dataset.taskType = type;
    const typeLabel = { writing: 'Writing', quiz: 'Quiz', media: 'Media' }[type];
    const bodyId = `hw-task-body-${taskId}`;
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="badge badge-info">${typeLabel}</span>
        <button type="button" class="text-xs" style="color:var(--danger-600)" onclick="this.closest('[data-task-card]').remove()">Remove Task</button>
      </div>
      <input class="hw-task-title w-full px-3 py-2 rounded-md border text-sm mb-3" style="border-color:var(--border-default)" placeholder="Task title (e.g. \u2018Part 1: Listening\u2019)">
      <div id="${bodyId}"></div>`;
    card.querySelector('.hw-task-title').value = existing?.title || '';
    document.getElementById('hw-tasks-list').appendChild(card);
    document.getElementById('hw-tasks-empty').classList.add('hidden');

    const body = document.getElementById(bodyId);
    if (type === 'writing') {
      const editorId = `hw-task-editor-${taskId}`;
      const rtlId = `hw-task-rtl-${taskId}`;
      body.innerHTML = `
        <label class="text-xs flex items-center gap-1 justify-end mb-1" style="color:var(--text-secondary)"><input type="checkbox" id="${rtlId}" ${existing?.direction === 'rtl' ? 'checked' : ''}> Right-to-left (Arabic)</label>
        <div id="${editorId}" style="min-height:100px"></div>`;
      const editor = initQuillEditor(editorId, rtlId);
      if (existing?.instructions && editor) {
        editor.root.innerHTML = existing.instructions;
        if (existing.direction === 'rtl') {
          editor.root.style.direction = 'rtl';
          editor.root.style.textAlign = 'right';
        }
      }
      card.dataset.editorId = editorId;
    } else if (type === 'quiz') {
      body.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold" style="color:var(--text-secondary)">Questions</label>
          <button type="button" class="hw-task-add-question text-xs font-semibold" style="color:var(--teal-600)">+ Add Question</button>
        </div>
        <div class="hw-task-questions space-y-3"></div>`;
      const list = body.querySelector('.hw-task-questions');
      body.querySelector('.hw-task-add-question').addEventListener('click', () => addQuestionRow(list));
      if (existing?.questions?.length) {
        existing.questions.forEach((q) => addQuestionRow(list, q));
      } else {
        addQuestionRow(list);
      }
    } else if (type === 'media') {
      body.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold" style="color:var(--text-secondary)">Media Items</label>
          <button type="button" class="hw-task-add-media text-xs font-semibold" style="color:var(--teal-600)">+ Add Item</button>
        </div>
        <div class="hw-task-media space-y-2"></div>`;
      const list = body.querySelector('.hw-task-media');
      body.querySelector('.hw-task-add-media').addEventListener('click', () => addMediaItemRow(list));
      if (existing?.mediaItems?.length) {
        existing.mediaItems.forEach((item) => addMediaItemRow(list, item));
      } else {
        addMediaItemRow(list);
      }
    }
  }
  document.querySelectorAll('#hw-multi-builder [data-add-task]').forEach((btn) => {
    btn.addEventListener('click', () => addTaskCard(btn.dataset.addTask));
  });

  window.populateFormForEdit = async (homeworkId) => {
    const h = (await myHomework()).find(x => x.id === homeworkId);
    if (!h) return;
    editingHomeworkId = homeworkId;
    switchTab('teacher-shell', 'assign');
    document.getElementById('hw-form-heading').textContent = 'Edit Exercise';
    document.querySelector('#hw-form button[type="submit"]').textContent = 'Save Changes';

    document.getElementById('hw-title').value = h.title;
    if (h.dueDate) {
      const d = new Date(h.dueDate);
      const pad = (n) => String(n).padStart(2, '0');
      document.getElementById('hw-due').value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    document.getElementById('hw-points').value = h.maxPoints || 100;
    document.getElementById('hw-instructions-rtl').checked = h.instructionsDirection === 'rtl';
    const instrEditor = quillEditors.get('hw-instructions-editor');
    if (instrEditor) {
      instrEditor.root.innerHTML = h.instructions || '';
      if (h.instructionsDirection === 'rtl') {
        instrEditor.root.style.direction = 'rtl';
        instrEditor.root.style.textAlign = 'right';
      }
    }

    // Reset the builder areas before repopulating, same as after a fresh submit.
    document.getElementById('hw-questions-list').innerHTML = '';
    document.getElementById('hw-tasks-list').innerHTML = '';
    document.getElementById('hw-tasks-empty').classList.remove('hidden');

    document.querySelectorAll('#hw-mode-tabs [data-mode]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === h.submissionMode));
    document.getElementById('hw-mode').value = h.submissionMode;
    document.getElementById('hw-quiz-builder').classList.toggle('hidden', h.submissionMode !== 'quiz');
    document.getElementById('hw-multi-builder').classList.toggle('hidden', h.submissionMode !== 'multi');
    document.getElementById('hw-single-attachment').classList.toggle('hidden', h.submissionMode === 'multi');

    existingAttachment = h.attachmentUrl ? { url: h.attachmentUrl, name: h.attachmentName } : null;
    document.getElementById('hw-attachment-status').textContent = existingAttachment ? `Current: ${existingAttachment.name || 'attached file'} (choose a new file to replace it)` : '';

    if (h.submissionMode === 'quiz') {
      const questions = await EP.homeworkQuestions(homeworkId);
      const list = document.getElementById('hw-questions-list');
      questions.forEach((q) => addQuestionRow(list, q));
    } else if (h.submissionMode === 'multi') {
      const tasks = await EP.homeworkTasks(homeworkId);
      tasks.forEach((t) => addTaskCard(t.type, t));
    }
    document.getElementById('hw-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };


  let pendingAttachment = null;
  let existingAttachment = null; // set during populateFormForEdit — the attachment already on the exercise, kept unless a new file replaces it
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
    let tasks;
    if (mode === 'quiz') {
      questions = collectQuestions(document.getElementById('hw-questions-list'));
      if (!questions.length) { showToast('Add at least one question for a quiz exercise', 'danger'); return; }
      if (questions.some((q) => !q.questionText || q.options.length < 2)) {
        showToast('Every question needs text and at least 2 options', 'danger');
        return;
      }
    }
    if (mode === 'multi') {
      const cards = [...document.querySelectorAll('#hw-tasks-list [data-task-card]')];
      if (!cards.length) { showToast('Add at least one task', 'danger'); return; }
      tasks = [];
      for (const card of cards) {
        const type = card.dataset.taskType;
        const title = card.querySelector('.hw-task-title').value.trim();
        if (type === 'writing') {
          const rtlChecked = document.getElementById(`hw-task-rtl-${card.dataset.taskCard}`)?.checked;
          tasks.push({ type, title, instructions: quillHtml(card.dataset.editorId), direction: rtlChecked ? 'rtl' : 'ltr' });
        } else if (type === 'quiz') {
          const qs = collectQuestions(card.querySelector('.hw-task-questions'));
          if (!qs.length || qs.some((q) => !q.questionText || q.options.length < 2)) {
            showToast(`Fix the quiz task "${title || 'Untitled'}" \u2014 every question needs text and at least 2 options`, 'danger');
            return;
          }
          tasks.push({ type, title, questions: qs });
        } else if (type === 'media') {
          const rows = [...card.querySelectorAll('[data-media-row]')];
          const items = rows.map((row) => {
            const kind = row.querySelector('.hw-media-kind').value;
            const label = row.querySelector('.hw-media-label').value.trim();
            const needsUpload = ['pdf', 'audio', 'image', 'file'].includes(kind);
            const url = needsUpload ? row.dataset.uploadedUrl : row.querySelector('.hw-media-url').value.trim();
            return url ? { kind, url, name: label } : null;
          }).filter(Boolean);
          if (!items.length) { showToast(`Add at least one working media item to "${title || 'Untitled'}"`, 'danger'); return; }
          tasks.push({ type, title, mediaItems: items });
        }
      }
    }
    try {
      const payload = {
        courseId: myCourseId, teacherId: user.id,
        title: document.getElementById('hw-title').value,
        instructions: quillHtml('hw-instructions-editor'),
        instructionsDirection: document.getElementById('hw-instructions-rtl').checked ? 'rtl' : 'ltr',
        dueDate: document.getElementById('hw-due').value,
        submissionMode: mode,
        // A teacher editing without touching the attachment field must not
        // accidentally wipe out the existing one — only fall back to it
        // when actually editing and no new file was chosen this time.
        attachmentUrl: pendingAttachment?.url ?? (editingHomeworkId ? existingAttachment?.url : undefined),
        attachmentName: pendingAttachment?.name ?? (editingHomeworkId ? existingAttachment?.name : undefined),
        maxPoints: parseInt(document.getElementById('hw-points').value, 10) || 100,
        questions,
        tasks,
      };
      if (editingHomeworkId) {
        await EP.updateHomework(editingHomeworkId, payload);
      } else {
        await EP.addHomework(payload);
      }
      e.target.reset();
      pendingAttachment = null;
      existingAttachment = null;
      document.getElementById('hw-attachment-status').textContent = '';
      document.getElementById('hw-questions-list').innerHTML = '';
      document.getElementById('hw-quiz-builder').classList.add('hidden');
      document.getElementById('hw-tasks-list').innerHTML = '';
      document.getElementById('hw-tasks-empty').classList.remove('hidden');
      document.getElementById('hw-multi-builder').classList.add('hidden');
      document.getElementById('hw-single-attachment').classList.remove('hidden');
      quillEditors.get('hw-instructions-editor')?.setText('');
      quillEditors.forEach((editor, id) => { if (id !== 'hw-instructions-editor') quillEditors.delete(id); });
      document.querySelectorAll('#hw-mode-tabs [data-mode]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === 'text'));
      document.getElementById('hw-mode').value = 'text';
      const wasEditing = !!editingHomeworkId;
      editingHomeworkId = null;
      document.querySelector('#hw-form button[type="submit"]').textContent = 'Assign Exercise';
      document.getElementById('hw-form-heading').textContent = 'Assign New Exercise';
      await renderAll();
      showToast(wasEditing ? 'Exercise updated' : 'Exercise assigned to all students in your course');
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
