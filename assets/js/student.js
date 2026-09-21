document.addEventListener('DOMContentLoaded', async () => {
  const user = await EP.requireRole('student');
  if (!user) return;

  // A blocked account is checked before anything else — even before the
  // pending-approval screen — since blocking should override every other
  // dashboard state, including an otherwise-approved, active student.
  if (user.blockedAt) {
    document.getElementById('student-shell').classList.add('hidden');
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
    // If the student already has a real course assignment, any lingering
    // 'pending' record is a stale leftover, not something they still need
    // to act on or be told about — showing it anyway is exactly the
    // "enrollment pending" banner that kept appearing even after a
    // student was already approved and looking at their actual course.
    if (user.courseId) { el.innerHTML = ''; return; }
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

  // A simple countdown to the next payment due date, read straight off the
  // student's own active enrollment row (readable under their own RLS
  // policy) rather than the payments ledger, which only admins can query.
  // Turns red inside the last week, exactly like the admin-side views.
  async function renderPaymentDue() {
    const el = document.getElementById('student-payment-due-banner');
    if (!el) return;
    const enrollments = await EP.myEnrollments(user.id).catch(() => []);
    const mine = enrollments.find((e) => (e.status === 'active' || e.status === 'completed')
      && e.paymentDueAt && e.paymentStatus !== 'paid' && e.paymentStatus !== 'waived');
    if (!mine) { el.innerHTML = ''; return; }
    const due = new Date(mine.paymentDueAt);
    const days = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
    const isUrgent = days <= 7; // includes overdue (negative days)
    const label = days < 0
      ? `Payment overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`
      : days === 0
        ? 'Payment due today'
        : `Payment due in ${days} day${days === 1 ? '' : 's'}`;
    el.innerHTML = `
      <div class="card p-4 flex items-center gap-3" style="background:${isUrgent ? 'var(--danger-50)' : 'var(--bg-subtle)'}; border-color:${isUrgent ? 'var(--danger-600)' : 'var(--border-default)'}">
        <i data-lucide="calendar-clock" class="w-5 h-5 shrink-0" style="color:${isUrgent ? 'var(--danger-600)' : 'var(--text-secondary)'}"></i>
        <p class="text-sm" style="color:${isUrgent ? 'var(--danger-600)' : 'var(--text-primary)'}"><span class="font-semibold">${label}</span> — ${due.toLocaleDateString()}</p>
      </div>`;
  }

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
      return `<button onclick="switchTab('student-shell','homework')" class="w-full flex items-center justify-between text-left hover:opacity-70 transition"><span>${escapeHtml(h.title)}</span><span class="badge ${sub ? 'badge-warning' : 'badge-info'}">${sub ? 'Submitted' : 'Not started'}</span></button>`;
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
      const modeLabel = { text: 'Written', file: 'File Upload', quiz: 'Quiz', multi: 'Multi-Task' }[h.submissionMode] || 'Written';
      const statusBadge = !sub ? 'badge-danger'
        : sub.status === 'graded' ? 'badge-success'
        : sub.status === 'needs_revision' ? 'badge-warning'
        : sub.status === 'draft' ? 'badge-info'
        : 'badge-warning';
      const statusLabel = !sub ? 'not started' : sub.status === 'needs_revision' ? 'needs revision' : sub.status;

      const isAudio = h.attachmentUrl && /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(h.attachmentUrl);
      const attachmentHtml = h.attachmentUrl
        ? isAudio
          ? `<div class="mb-3"><p class="text-xs font-semibold mb-1" style="color:var(--text-secondary)">Listen:</p><audio controls class="w-full" src="${escapeHtml(h.attachmentUrl)}"></audio></div>`
          : `<a href="${escapeHtml(h.attachmentUrl)}" target="_blank" rel="noopener" class="text-xs font-semibold inline-flex items-center gap-1 mb-3" style="color:var(--teal-600)"><i data-lucide="paperclip" class="w-3.5 h-3.5"></i> ${escapeHtml(h.attachmentName || 'Download attachment')}</a>`
        : '';

      let actionHtml;
      if (sub && sub.status === 'graded') {
        actionHtml = `<div class="p-3 rounded-lg text-sm" style="background:var(--success-50)"><span class="font-semibold" style="color:var(--success-600)">Grade: ${escapeHtml(sub.grade)} ${h.maxPoints && h.submissionMode !== 'quiz' ? `/ ${h.maxPoints}` : ''}</span>${sub.feedback ? `<p class="mt-1" style="color:var(--text-secondary)">${escapeHtml(sub.feedback)}</p>` : ''}</div>`;
      } else if (sub && sub.status === 'needs_revision') {
        actionHtml = `<div class="p-3 rounded-lg text-sm mb-3" style="background:var(--amber-100)"><span class="font-semibold" style="color:var(--amber-600)">Needs revision</span><p class="mt-1" style="color:var(--text-secondary)">${escapeHtml(sub.feedback || '')}</p></div>
          <button onclick='openSubmitModal(${JSON.stringify(h.id)})' class="btn btn-primary btn-sm">Resubmit</button>`;
      } else if (sub && sub.status === 'draft') {
        actionHtml = `<button onclick='openSubmitModal(${JSON.stringify(h.id)})' class="btn btn-secondary btn-sm">Continue Draft</button>`;
      } else if (sub) {
        actionHtml = `<p class="text-xs" style="color:var(--text-secondary)">Submitted ${EP.timeAgo(sub.submittedAt)} \u2014 waiting for your teacher to grade it.</p>`;
      } else {
        actionHtml = `<button onclick='openSubmitModal(${JSON.stringify(h.id)})' class="btn btn-primary btn-sm">${h.submissionMode === 'quiz' ? 'Take Quiz' : 'Submit'}</button>`;
      }

      return `<div class="card p-5" id="hw-card-${h.id}">
        <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <p class="font-semibold" style="color:var(--navy-700)">${escapeHtml(h.title)}</p>
          <div class="flex items-center gap-2 shrink-0">
            <span class="badge badge-info">${modeLabel}</span>
            <span class="badge ${statusBadge}">${statusLabel}</span>
          </div>
        </div>
        <div class="text-sm mb-3 post-body-rendered" dir="${h.instructionsDirection === 'rtl' ? 'rtl' : 'ltr'}" style="color:var(--text-secondary)">${h.instructions || ''}</div>
        ${attachmentHtml}
        ${actionHtml}
      </div>`;
    }).join('') || `<p style="color:var(--text-secondary)">No homework assigned yet.</p>`;
    if (window.lucide) lucide.createIcons();
  }

  const NOTIF_AUDIENCE_LABEL = { all: 'Announcement', teachers: 'Announcement', students: 'Announcement', course: 'Class', user: 'Personal' };

  async function renderNotifications() {
    const items = await EP.notificationsFor(user);
    document.getElementById('student-notif-list').innerHTML = items.map(n => `
      <div onclick="handleNotificationClick('${n.id}', 'student-shell', '${user.id}')" class="card p-4 cursor-pointer">
        <div class="flex items-center justify-between mb-1"><span class="badge badge-info">${NOTIF_AUDIENCE_LABEL[n.audience] || 'Class'}</span><span class="text-xs" style="color:var(--text-disabled)">${EP.timeAgo(n.createdAt)}</span></div>
        <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(n.title)}</p>
        <p class="text-xs mt-1" style="color:var(--text-secondary)">${escapeHtml(n.body)}</p>
      </div>`).join('') || `<p style="color:var(--text-secondary)">No notifications yet.</p>`;
  }

  // Jumps from a "Homework graded" / "Revision requested" notification
  // straight to that exercise's card on the Homework tab, and briefly
  // highlights it so the student can find it at a glance.
  window.jumpToHomework = (homeworkId) => {
    const card = document.getElementById(`hw-card-${homeworkId}`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const prevTransition = card.style.transition;
    const prevShadow = card.style.boxShadow;
    card.style.transition = 'box-shadow .3s ease';
    card.style.boxShadow = '0 0 0 3px var(--teal-600)';
    setTimeout(() => { card.style.boxShadow = prevShadow; setTimeout(() => { card.style.transition = prevTransition; }, 300); }, 1600);
  };

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

  // Red dot on the Messages nav item (drawer + sidebar) whenever the
  // teacher has sent something the student hasn't opened yet.
  async function renderMessagesDot() {
    const hasUnread = (await EP.unreadMessages(user.id).catch(() => [])).length > 0;
    ['messages-nav-dot-drawer', 'messages-nav-dot-sidebar'].forEach((id) => {
      document.getElementById(id)?.classList.toggle('hidden', !hasUnread);
    });
  }
  // The student only has one thread (their teacher), so opening the
  // Messages tab at all means they've seen everything in it.
  async function markMessagesReadFromTeacher() {
    if (!teacher) return;
    await EP.markMessagesRead(teacher.id, user.id).catch(() => {});
    await renderMessagesDot();
  }
  document.querySelectorAll('[data-tab-trigger="messages"], button[onclick*="\'messages\'"]').forEach((el) => {
    el.addEventListener('click', markMessagesReadFromTeacher);
  });
  // A "New message" notification always points at the one thread this
  // student has (their teacher) — just get them there, already-read.
  window.jumpToThread = () => markMessagesReadFromTeacher();

  // Same reusable Quill manager as the teacher side — a multi-task
  // exercise can have more than one writing response open at once, so
  // this can't be a single global editor the way the old plain textarea
  // was.
  const quillEditors = new Map();
  function initQuillEditor(elementId, rtlCheckboxId, initialHtml) {
    const el = document.getElementById(elementId);
    if (!el || !window.Quill) return null;
    const editor = new Quill(el, {
      theme: 'snow',
      placeholder: 'Write your answer...',
      modules: { toolbar: [
        [{ header: [1, 2, 3, false] }],
        [{ size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link'],
        ['clean'],
      ] },
    });
    if (initialHtml) editor.root.innerHTML = initialHtml;
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

  function youtubeEmbedUrl(url) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }
  function renderMediaItem(item) {
    if (item.kind === 'video') {
      const embed = youtubeEmbedUrl(item.url);
      return embed
        ? `<div class="mb-2"><p class="text-xs font-semibold mb-1" style="color:var(--text-secondary)">${escapeHtml(item.name || 'Video')}</p><iframe src="${escapeHtml(embed)}" class="w-full rounded-lg" style="aspect-ratio:16/9" allowfullscreen></iframe></div>`
        : `<div class="mb-2"><p class="text-xs font-semibold mb-1" style="color:var(--text-secondary)">${escapeHtml(item.name || 'Video')}</p><video controls class="w-full rounded-lg" src="${escapeHtml(item.url)}"></video></div>`;
    }
    if (item.kind === 'audio') {
      return `<div class="mb-2"><p class="text-xs font-semibold mb-1" style="color:var(--text-secondary)">${escapeHtml(item.name || 'Audio')}</p><audio controls class="w-full" src="${escapeHtml(item.url)}"></audio></div>`;
    }
    if (item.kind === 'image') {
      return `<div class="mb-2"><img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name || '')}" class="w-full rounded-lg"></div>`;
    }
    return `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="text-sm font-semibold inline-flex items-center gap-1 mb-2" style="color:var(--teal-600)">\u{1F4CE} ${escapeHtml(item.name || (item.kind === 'pdf' ? 'View PDF' : item.kind === 'link' ? 'Open Link' : 'Open File'))}</a>`;
  }

  window.openSubmitModal = async (hwId) => {
    const h = (await myHomework()).find(x => x.id === hwId);
    if (!h) return;
    const existing = await EP.submissionFor(hwId, user.id).catch(() => null);

    document.getElementById('submit-hw-id').value = hwId;
    document.getElementById('submit-modal-title').textContent = h.title;
    document.getElementById('submit-modal-instructions').innerHTML = h.instructions || '';
    document.getElementById('submit-modal-instructions').dir = h.instructionsDirection === 'rtl' ? 'rtl' : 'ltr';
    document.getElementById('submit-modal-instructions').classList.add('post-body-rendered');
    document.getElementById('submit-form').reset();

    const isAudio = h.attachmentUrl && /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(h.attachmentUrl);
    document.getElementById('submit-modal-attachment').innerHTML = h.attachmentUrl
      ? isAudio
        ? `<audio controls class="w-full mb-2" src="${escapeHtml(h.attachmentUrl)}"></audio>`
        : `<a href="${escapeHtml(h.attachmentUrl)}" target="_blank" rel="noopener" class="text-xs font-semibold" style="color:var(--teal-600)">\u{1F4CE} ${escapeHtml(h.attachmentName || 'View attachment')}</a>`
      : '';

    const revisionNote = document.getElementById('submit-modal-revision-note');
    if (existing && existing.status === 'needs_revision' && existing.feedback) {
      revisionNote.textContent = `Your teacher asked for a revision: ${existing.feedback}`;
      revisionNote.classList.remove('hidden');
    } else {
      revisionNote.classList.add('hidden');
    }

    const body = document.getElementById('submit-modal-body');
    const draftBtn = document.getElementById('submit-draft-btn');

    if (h.submissionMode === 'multi') {
      draftBtn.classList.remove('hidden');
      const tasks = await EP.homeworkTasks(hwId);
      const savedByTask = new Map((existing?.taskResponses || []).map((tr) => [tr.taskId, tr]));
      body.innerHTML = tasks.map((t, ti) => {
        const saved = savedByTask.get(t.id);
        const taskInstructions = t.instructions
          ? `<div class="post-body-rendered text-sm mb-2" dir="${t.direction === 'rtl' ? 'rtl' : 'ltr'}" style="color:var(--text-secondary)">${t.instructions}</div>` : '';
        let responseHtml;
        if (t.type === 'writing') {
          responseHtml = `
            <label class="text-xs flex items-center gap-1 justify-end mb-1" style="color:var(--text-secondary)"><input type="checkbox" id="task-rtl-${t.id}"> Right-to-left (Arabic)</label>
            <div id="task-editor-${t.id}" data-writing-task="${t.id}"></div>`;
        } else if (t.type === 'quiz') {
          responseHtml = t.questions.map((q, qi) => `
            <div class="mb-3">
              <p class="text-sm font-medium mb-1" style="color:var(--navy-700)">${qi + 1}. ${escapeHtml(q.questionText)}</p>
              <div class="space-y-1">
                ${q.options.map((opt, oi) => `
                  <label class="flex items-center gap-2 text-sm">
                    <input type="radio" name="task-${t.id}-q-${qi}" value="${oi}" required class="task-quiz-answer" data-task-id="${t.id}" data-question="${qi}" ${saved?.answers?.[qi] === oi ? 'checked' : ''}>
                    ${escapeHtml(opt)}
                  </label>`).join('')}
              </div>
            </div>`).join('');
        } else {
          const mediaHtml = (t.mediaItems || []).map(renderMediaItem).join('');
          responseHtml = `${mediaHtml}<textarea class="task-response w-full px-3 py-2 rounded-md border text-sm mt-2" data-task-id="${t.id}" data-task-type="media" rows="2" placeholder="Add a note (optional)">${escapeHtml(saved?.content || '')}</textarea>`;
        }
        return `<div class="p-4 rounded-lg border" style="border-color:var(--border-default)">
          <p class="text-xs font-semibold uppercase tracking-wide mb-2" style="color:var(--teal-600)">${escapeHtml(t.title || `Task ${ti + 1}`)}</p>
          ${taskInstructions}
          ${responseHtml}
        </div>`;
      }).join('');
      // Quill needs a real element in the DOM to bind to, so writing-task
      // editors are created after the HTML above is actually inserted.
      tasks.filter((t) => t.type === 'writing').forEach((t) => {
        const saved = savedByTask.get(t.id);
        initQuillEditor(`task-editor-${t.id}`, `task-rtl-${t.id}`, saved?.content || '');
      });
    } else if (h.submissionMode === 'quiz') {
      draftBtn.classList.add('hidden'); // quizzes auto-grade instantly — no draft concept
      const questions = await EP.homeworkQuestions(hwId);
      body.innerHTML = questions.map((q, qi) => `
        <div class="mb-4">
          <p class="text-sm font-semibold mb-2" style="color:var(--navy-700)">${qi + 1}. ${escapeHtml(q.questionText)}</p>
          <div class="space-y-2">
            ${q.options.map((opt, oi) => `
              <label class="flex items-center gap-2 text-sm">
                <input type="radio" name="quiz-q-${qi}" value="${oi}" required class="quiz-answer" data-question="${qi}">
                ${escapeHtml(opt)}
              </label>`).join('')}
          </div>
        </div>`).join('');
    } else if (h.submissionMode === 'file') {
      draftBtn.classList.remove('hidden');
      body.innerHTML = `
        <input id="submit-file" type="file" accept=".pdf,.doc,.docx,image/*,audio/*" class="w-full text-sm">
        <p id="submit-file-status" class="text-xs mt-1" style="color:var(--text-secondary)">${existing?.attachmentName ? `Current: ${escapeHtml(existing.attachmentName)}` : ''}</p>
        <textarea id="submit-content" rows="3" placeholder="Add a note (optional)" class="w-full px-4 py-3 rounded-md border text-sm mt-3" style="border-color:var(--border-default)">${escapeHtml(existing?.content || '')}</textarea>`;
    } else {
      draftBtn.classList.remove('hidden');
      body.innerHTML = `
        <label class="text-xs flex items-center gap-1 justify-end mb-1" style="color:var(--text-secondary)"><input type="checkbox" id="submit-content-rtl"> Right-to-left (Arabic)</label>
        <div id="submit-content-editor" data-writing-task="single"></div>`;
      initQuillEditor('submit-content-editor', 'submit-content-rtl', existing?.content || '');
    }

    document.getElementById('submit-modal').classList.remove('hidden');
  };
  window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

  async function renderStudentAnnouncements() {
    const el = document.getElementById('student-announcements-list');
    if (!el) return;
    let list = [];
    try { list = await EP.myAnnouncements(user.courseId); } catch (e) { console.warn('Could not load announcements:', e); }
    el.innerHTML = list.map((a) => `
      <div class="card p-5">
        <p class="font-semibold" style="color:var(--navy-700)">${escapeHtml(a.title)}</p>
        <p class="text-sm mt-1" style="color:var(--text-secondary)">${escapeHtml(a.body)}</p>
        <p class="text-xs mt-2" style="color:var(--text-disabled)">${EP.timeAgo(a.createdAt)}</p>
      </div>`).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">No announcements from your teacher yet.</p></div>`;
  }

  // ---- Classroom (PDFs / images / video & other links the teacher has
  // shared with this student's course — the learning hub) ----
  let classroomResourcesCache = [];
  const SCLASS_TYPE_ICON = { pdf: 'file-text', image: 'image', link: 'link' };
  const SCLASS_TYPE_LABEL = { pdf: 'PDF', image: 'Image', link: 'Link' };

  // Turns a YouTube watch/share/shorts URL into its embeddable form. Any
  // other video host's URL is passed straight into the iframe as-is, since
  // most (Vimeo, etc.) already hand out embeddable links directly.
  function toEmbeddableVideoUrl(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
      if (u.hostname.includes('youtube.com')) {
        if (u.pathname.startsWith('/shorts/')) return `https://www.youtube.com/embed/${u.pathname.split('/')[2]}`;
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    } catch (e) { /* not a valid URL — fall through */ }
    return url;
  }

  // Pulls the video id out of any common YouTube URL shape so the card can
  // show its official thumbnail with no extra network call.
  function youtubeThumbnail(url) {
    try {
      const u = new URL(url);
      let id = null;
      if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
      else if (u.hostname.includes('youtube.com')) {
        if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2];
        else id = u.searchParams.get('v');
      }
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    } catch (e) { return null; }
  }

  async function renderClassroom() {
    const list = document.getElementById('classroom-list');
    if (!list) return; // classroom tab not present on this page
    try {
      classroomResourcesCache = await EP.classroomResourcesByCourse(user.courseId);
    } catch (err) {
      console.error('Could not load classroom resources:', err);
      list.innerHTML = `<p class="text-sm col-span-full" style="color:var(--danger-600)">Could not load your classroom right now.</p>`;
      return;
    }
    const catFilter = document.getElementById('sclass-category-filter');
    if (catFilter && !catFilter.dataset.populated) {
      catFilter.addEventListener('change', renderClassroomList);
      catFilter.dataset.populated = '1';
    }
    if (catFilter) {
      const cats = [...new Set(classroomResourcesCache.map(r => r.category))].sort();
      const current = catFilter.value;
      catFilter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      catFilter.value = current;
    }
    renderClassroomList();
  }

  function renderClassroomList() {
    const filterEl = document.getElementById('sclass-category-filter');
    const filter = filterEl ? filterEl.value : '';
    const scoped = filter ? classroomResourcesCache.filter(r => r.category === filter) : classroomResourcesCache;

    document.getElementById('classroom-list').innerHTML = scoped.map(r => {
      if (r.type === 'video') {
        const thumb = youtubeThumbnail(r.url);
        return `
        <div class="card overflow-hidden">
          <div class="relative cursor-pointer" onclick='openVideoViewer(${JSON.stringify(r.url)}, ${JSON.stringify(r.title)})'>
            ${thumb
              ? `<img src="${thumb}" alt="${escapeHtml(r.title)}" class="w-full object-cover" style="aspect-ratio:16/9">`
              : `<div class="w-full flex items-center justify-center" style="aspect-ratio:16/9; background:var(--bg-subtle)"><i data-lucide="youtube" class="w-8 h-8" style="color:var(--teal-600)"></i></div>`}
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background:rgba(11,29,58,.6)"><i data-lucide="play" class="w-5 h-5 text-white"></i></div>
            </div>
          </div>
          <div class="p-4">
            <p class="font-semibold text-sm truncate" style="color:var(--navy-700)">${escapeHtml(r.title)}</p>
            ${r.description ? `<p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtml(r.description)}</p>` : ''}
            <span class="badge badge-info mt-3 inline-block">${escapeHtml(r.category)}</span>
          </div>
        </div>`;
      }
      return `
      <div class="card p-4">
        <div class="flex items-center gap-2">
          <i data-lucide="${SCLASS_TYPE_ICON[r.type]}" class="w-4 h-4 shrink-0" style="color:var(--teal-600)"></i>
          <p class="font-semibold text-sm truncate" style="color:var(--navy-700)">${escapeHtml(r.title)}</p>
        </div>
        ${r.type === 'image' ? `<img src="${escapeHtml(r.url)}" alt="${escapeHtml(r.title)}" class="w-full rounded-md mt-3 object-cover cursor-pointer" style="max-height:10rem" onclick='window.open(${JSON.stringify(r.url)}, "_blank")'>` : ''}
        ${r.description ? `<p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtml(r.description)}</p>` : ''}
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <span class="badge badge-info">${escapeHtml(r.category)}</span>
          <span class="text-xs" style="color:var(--text-disabled)">${SCLASS_TYPE_LABEL[r.type]}</span>
        </div>
        ${r.type === 'pdf'
          ? `<button onclick='openPdfViewer(${JSON.stringify(r.url)}, ${JSON.stringify(r.title)})' class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--teal-600)">View PDF <i data-lucide="eye" class="w-3 h-3"></i></button>`
          : r.type === 'image'
          ? ''
          : `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--teal-600)">Open <i data-lucide="arrow-up-right" class="w-3 h-3"></i></a>`}
      </div>`;
    }).join('') || `<p class="text-sm col-span-full text-center py-10" style="color:var(--text-secondary)">Nothing shared yet.</p>`;

    if (window.lucide) lucide.createIcons();
  }

  window.openPdfViewer = (url, title) => {
    document.getElementById('pdf-viewer-title').textContent = title;
    document.getElementById('pdf-viewer-frame').src = url;
    document.getElementById('pdf-viewer-download').href = url;
    document.getElementById('pdf-viewer-modal').classList.remove('hidden');
  };
  window.openVideoViewer = (url, title) => {
    document.getElementById('video-viewer-title').textContent = title;
    document.getElementById('video-viewer-frame').src = toEmbeddableVideoUrl(url);
    document.getElementById('video-viewer-modal').classList.remove('hidden');
  };

  async function renderAll() {
    renderCourseInfo();
    await Promise.all([renderEnrollmentBanner(), renderPaymentDue(), renderProgress(), renderOverviewLists(), renderHwList(), renderNotifications(), renderChat(), renderStudentAnnouncements(), renderClassroom(), renderMessagesDot()]);
    lucide.createIcons();
  }
  await renderAll();
  EP.onChange([EP.KEYS.homework, EP.KEYS.submissions, EP.KEYS.notifications, EP.KEYS.messages, EP.KEYS.enrollments, EP.KEYS.announcements, EP.KEYS.classroomResources], renderAll);

  async function collectSubmissionPayload(hwId, isDraft = false) {
    const h = (await myHomework()).find(x => x.id === hwId);
    if (h.submissionMode === 'multi') {
      const tasks = await EP.homeworkTasks(hwId);
      const taskResponses = [];
      for (const t of tasks) {
        if (t.type === 'quiz') {
          const answers = t.questions.map((_, qi) => {
            const checked = document.querySelector(`input[name="task-${t.id}-q-${qi}"]:checked`);
            return checked ? parseInt(checked.value, 10) : -1;
          });
          if (!isDraft && answers.some((a) => a === -1)) throw new Error(`Answer every question in "${t.title || 'the quiz task'}".`);
          taskResponses.push({ taskId: t.id, type: 'quiz', answers });
        } else if (t.type === 'writing') {
          const writingContent = quillHtml(`task-editor-${t.id}`);
          if (!isDraft && !writingContent) throw new Error(`Write an answer for "${t.title || 'the writing task'}" before submitting.`);
          taskResponses.push({ taskId: t.id, type: t.type, content: writingContent });
        } else {
          const textarea = document.querySelector(`.task-response[data-task-id="${t.id}"]`);
          taskResponses.push({ taskId: t.id, type: t.type, content: textarea?.value || '' });
        }
      }
      return { taskResponses };
    }
    if (h.submissionMode === 'quiz') {
      const questions = await EP.homeworkQuestions(hwId);
      const answers = questions.map((_, qi) => {
        const checked = document.querySelector(`input[name="quiz-q-${qi}"]:checked`);
        return checked ? parseInt(checked.value, 10) : -1;
      });
      if (answers.some((a) => a === -1)) throw new Error('Please answer every question.');
      return { answers };
    }
    if (h.submissionMode === 'file') {
      const fileInput = document.getElementById('submit-file');
      const content = document.getElementById('submit-content')?.value || '';
      const file = fileInput?.files[0];
      if (file) {
        const statusEl = document.getElementById('submit-file-status');
        statusEl.textContent = 'Uploading...';
        const uploaded = await EP.uploadHomeworkFile(file);
        return { content, attachmentUrl: uploaded.url, attachmentName: uploaded.name };
      }
      const existing = await EP.submissionFor(hwId, user.id).catch(() => null);
      if (!existing?.attachmentUrl && !content) throw new Error('Attach a file or add a note.');
      return { content, attachmentUrl: existing?.attachmentUrl, attachmentName: existing?.attachmentName };
    }
    const finalContent = quillHtml('submit-content-editor');
    if (!isDraft && !finalContent) throw new Error('Write your answer before submitting.');
    return { content: finalContent };
  }

  document.getElementById('submit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const hwId = document.getElementById('submit-hw-id').value;
    try {
      const payload = await collectSubmissionPayload(hwId);
      await EP.submitHomework(hwId, user.id, payload);
      closeModal('submit-modal');
      await renderAll();
      showToast('Submitted!');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  document.getElementById('submit-draft-btn').addEventListener('click', async () => {
    const hwId = document.getElementById('submit-hw-id').value;
    try {
      const payload = await collectSubmissionPayload(hwId, true);
      await EP.saveDraft(hwId, user.id, payload);
      closeModal('submit-modal');
      await renderAll();
      showToast('Draft saved — come back anytime to finish it');
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
