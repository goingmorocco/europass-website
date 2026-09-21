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
      ['users', myStudents.length, 'الطلاب', 'students'],
      ['clipboard-list', hw.length, 'الواجبات المكلّفة', 'assign'],
      ['check-circle', pending.length, 'بانتظار التصحيح', 'grade'],
    ].map(([icon, val, label, tab]) => `
      <button onclick="switchTab('teacher-shell','${tab}')" class="card card-hover p-5 text-start w-full">
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
        <div><p class="font-medium text-sm" style="color:var(--navy-700)">${escapeHtml(student?.name)} \u2014 ${escapeHtml(h?.title)}</p><p class="text-xs" style="color:var(--text-secondary)">\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645 ${EP.timeAgo(s.submittedAt)}</p></div>
        <button onclick="switchTab('teacher-shell','grade')" class="btn btn-secondary btn-sm">\u0645\u0631\u0627\u062c\u0639\u0629</button>
      </div>`;
    }).join('') || `<p class="text-sm" style="color:var(--text-secondary)">\u0644\u0627 \u064a\u0648\u062c\u062f \u0634\u064a\u0621 \u0645\u0639\u0644\u0651\u0642 \u2014 \u0623\u0646\u062a \u0639\u0644\u0649 \u0627\u0637\u0644\u0627\u0639 \u0628\u0643\u0644 \u0634\u064a\u0621.</p>`;
  }

  async function renderStudents() {
    const [hw, allSubs] = await Promise.all([myHomework(), EP.submissions()]);
    document.getElementById('teacher-students-list').innerHTML = `<table class="w-full text-sm"><thead><tr style="background:var(--navy-700)">
      <th class="text-start px-5 py-3 text-white font-semibold">\u0627\u0644\u0637\u0627\u0644\u0628</th><th class="text-start px-5 py-3 text-white font-semibold">\u0627\u0644\u0648\u0627\u062c\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u0644\u0651\u0645\u0629</th><th class="text-start px-5 py-3 text-white font-semibold">\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u062f\u0631\u062c\u0627\u062a</th></tr></thead><tbody>
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
        <p class="text-xs mt-1" style="color:var(--text-secondary)">${allSubs.filter(s => s.homeworkId === h.id).length}/${myStudents.length} تم التسليم</p>
      </div>`).join('') || `<p class="text-sm" style="color:var(--text-secondary)">لا توجد واجبات مكلّف بها بعد.</p>`;
  }

  async function renderGradeList() {
    const [hw, allSubs] = await Promise.all([myHomework(), EP.submissions()]);
    const hwIds = hw.map(h => h.id);
    const subs = allSubs.filter(s => hwIds.includes(s.homeworkId));
    const rows = await Promise.all(subs.map(async (s) => {
      const h = hw.find(x => x.id === s.homeworkId);
      const student = myStudents.find(x => x.id === s.studentId);
      const statusBadge = s.status === 'graded' ? 'badge-success' : s.status === 'needs_revision' ? 'badge-warning' : s.status === 'draft' ? 'badge-info' : 'badge-warning';
      const statusLabel = s.status === 'needs_revision' ? '\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629' : s.status === 'graded' ? '\u062a\u0645 \u0627\u0644\u062a\u0642\u064a\u064a\u0645' : s.status === 'draft' ? '\u0645\u0633\u0648\u062f\u0629' : '\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645';

      let bodyHtml;
      if (h?.submissionMode === 'quiz') {
        const questions = await EP.homeworkQuestions(h.id);
        bodyHtml = `<div class="p-3 rounded-lg" style="background:var(--bg-subtle)">
          <p class="text-sm font-semibold mb-2" style="color:var(--navy-700)">\u062a\u0635\u062d\u064a\u062d \u062a\u0644\u0642\u0627\u0626\u064a: ${s.autoScore}%</p>
          <div class="space-y-2">
            ${questions.map((q, qi) => {
              const picked = Array.isArray(s.quizAnswers) ? s.quizAnswers[qi] : undefined;
              const isRight = picked === q.correctIndex;
              return `<p class="text-xs" style="color:var(--text-secondary)">${qi + 1}. ${escapeHtml(q.questionText)} \u2014 <span style="color:${isRight ? 'var(--success-600)' : 'var(--danger-600)'}">${picked != null ? escapeHtml(q.options[picked] || '?') : '\u0628\u062f\u0648\u0646 \u0625\u062c\u0627\u0628\u0629'}</span>${!isRight ? ` (\u0627\u0644\u0635\u062d\u064a\u062d: ${escapeHtml(q.options[q.correctIndex])})` : ''}</p>`;
            }).join('')}
          </div>
        </div>`;
      } else {
        const isAudio = s.attachmentUrl && /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(s.attachmentUrl);
        bodyHtml = `${s.content ? `<div class="text-sm p-3 rounded-lg post-body-rendered" style="background:var(--bg-subtle); color:var(--text-secondary)">${s.content}</div>` : ''}
          ${s.attachmentUrl ? (isAudio
            ? `<audio controls class="w-full mt-2" src="${escapeHtml(s.attachmentUrl)}"></audio>`
            : `<a href="${escapeHtml(s.attachmentUrl)}" target="_blank" rel="noopener" class="text-xs font-semibold inline-flex items-center gap-1 mt-2" style="color:var(--teal-600)">\u{1F4CE} ${escapeHtml(s.attachmentName || '\u0639\u0631\u0636 \u0627\u0644\u0645\u0644\u0641')}</a>`) : ''}`;
      }

      const canGrade = h?.submissionMode !== 'quiz' && (s.status === 'submitted' || s.status === 'needs_revision');
      const actionHtml = s.status === 'graded'
        ? `<p class="text-sm mt-3"><span class="font-semibold" style="color:var(--navy-700)">\u0627\u0644\u062f\u0631\u062c\u0629: ${escapeHtml(s.grade)}${h?.maxPoints && h.submissionMode !== 'quiz' ? ` / ${h.maxPoints}` : ''}</span>${s.feedback ? ` \u2014 ${escapeHtml(s.feedback)}` : ''}</p>`
        : s.status === 'needs_revision'
        ? `<p class="text-xs mt-2" style="color:var(--text-secondary)">\u0623\u0639\u064a\u062f \u0644\u0644\u0637\u0627\u0644\u0628: ${escapeHtml(s.feedback || '')}</p>${canGrade ? `<button onclick="openGradeModal('${s.id}')" class="btn btn-secondary btn-sm mt-2">\u0642\u064a\u0651\u0645 \u0627\u0644\u0622\u0646</button>` : ''}`
        : canGrade
        ? `<button onclick="openGradeModal('${s.id}')" class="btn btn-primary btn-sm mt-3">\u062a\u0642\u064a\u064a\u0645 \u0647\u0630\u0627</button>`
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
    document.getElementById('teacher-grade-list').innerHTML = rows.filter((_, i) => subs[i].status !== 'draft').join('') || `<p style="color:var(--text-secondary)">لا توجد تسليمات بعد.</p>`;
  }

  function renderThreads() {
    document.getElementById('teacher-thread-list').innerHTML = myStudents.map(s => `
      <button onclick="selectThread('${s.id}')" class="w-full text-start px-3 py-3 rounded-lg text-sm flex items-center gap-3" style="background:${s.id === activeThreadStudentId ? 'var(--navy-50)' : 'transparent'}">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style="background:var(--navy-700)">${s.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
        <span style="color:var(--navy-700)">${escapeHtml(s.name)}</span>
      </button>`).join('');
  }

  async function renderChat() {
    const header = document.getElementById('teacher-chat-header');
    const msgsEl = document.getElementById('teacher-chat-messages');
    if (!activeThreadStudentId) { header.textContent = 'اختر طالباً'; msgsEl.innerHTML = ''; return; }
    const student = myStudents.find(s => s.id === activeThreadStudentId);
    header.textContent = student?.name || '';
    const msgs = await EP.messagesFor(user.id, activeThreadStudentId);
    msgsEl.innerHTML = msgs.map(m => `
      <div class="flex ${m.fromId === user.id ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[75%] px-4 py-2 rounded-xl text-sm" style="background:${m.fromId === user.id ? 'var(--navy-700)' : 'var(--bg-subtle)'}; color:${m.fromId === user.id ? '#fff' : 'var(--text-primary)'}">
          ${escapeHtml(m.body)}<div class="text-[10px] mt-1 opacity-70">${EP.timeAgo(m.createdAt)}</div>
        </div>
      </div>`).join('') || `<p class="text-sm text-center" style="color:var(--text-secondary)">لا توجد رسائل بعد — قل مرحباً!</p>`;
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  window.selectThread = async (studentId) => { activeThreadStudentId = studentId; renderThreads(); await renderChat(); };

  window.openViewExerciseModal = async (hwId) => {
    const h = (await myHomework()).find(x => x.id === hwId);
    if (!h) return;
    const subs = (await EP.submissions()).filter(s => s.homeworkId === hwId);

    document.getElementById('view-exercise-title').textContent = h.title;
    const modeLabel = { text: 'إجابة كتابية', file: 'رفع ملف', quiz: 'اختبار', multi: 'متعدد المهام' }[h.submissionMode] || 'إجابة كتابية';
    document.getElementById('view-exercise-meta').innerHTML = `
      <span class="badge badge-info">${modeLabel}</span>
      <span class="badge badge-success">${h.maxPoints} نقطة</span>
      <span class="text-xs" style="color:var(--text-secondary)">${subs.length}/${myStudents.length} تم التسليم</span>`;

    const body = document.getElementById('view-exercise-body');
    let html = h.instructions
      ? `<div class="post-body-rendered text-sm p-3 rounded-lg" dir="${h.instructionsDirection === 'rtl' ? 'rtl' : 'ltr'}" style="background:var(--bg-subtle); color:var(--text-primary)">${h.instructions}</div>`
      : '';

    if (h.attachmentUrl) {
      const isAudio = /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(h.attachmentUrl);
      html += isAudio
        ? `<audio controls class="w-full" src="${escapeHtml(h.attachmentUrl)}"></audio>`
        : `<a href="${escapeHtml(h.attachmentUrl)}" target="_blank" rel="noopener" class="text-sm font-semibold inline-flex items-center gap-1" style="color:var(--teal-600)">\u{1F4CE} ${escapeHtml(h.attachmentName || 'عرض المرفق')}</a>`;
    }

    if (h.submissionMode === 'quiz') {
      const questions = await EP.homeworkQuestions(hwId);
      html += questions.map((q, qi) => `
        <div class="p-3 rounded-lg border" style="border-color:var(--border-default)">
          <p class="text-sm font-medium mb-2" style="color:var(--navy-700)">${qi + 1}. ${escapeHtml(q.questionText)}</p>
          ${q.options.map((opt, oi) => `<p class="text-xs ps-3 ${oi === q.correctIndex ? 'font-semibold' : ''}" style="color:${oi === q.correctIndex ? 'var(--success-600)' : 'var(--text-secondary)'}">${oi === q.correctIndex ? '\u2713' : '\u25cb'} ${escapeHtml(opt)}</p>`).join('')}
        </div>`).join('');
    } else if (h.submissionMode === 'multi') {
      const tasks = await EP.homeworkTasks(hwId);
      html += tasks.map((t, ti) => {
        let inner = '';
        if (t.type === 'writing') {
          inner = t.instructions ? `<div class="post-body-rendered text-xs" dir="${t.direction === 'rtl' ? 'rtl' : 'ltr'}" style="color:var(--text-secondary)">${t.instructions}</div>` : `<p class="text-xs" style="color:var(--text-secondary)">يكتب الطلاب إجابة حرة.</p>`;
        } else if (t.type === 'quiz') {
          inner = (t.questions || []).map((q, qi) => `
            <p class="text-xs font-medium mt-2" style="color:var(--navy-700)">${qi + 1}. ${escapeHtml(q.questionText)}</p>
            ${q.options.map((opt, oi) => `<p class="text-xs ps-3 ${oi === q.correctIndex ? 'font-semibold' : ''}" style="color:${oi === q.correctIndex ? 'var(--success-600)' : 'var(--text-secondary)'}">${oi === q.correctIndex ? '\u2713' : '\u25cb'} ${escapeHtml(opt)}</p>`).join('')}`).join('');
        } else {
          inner = (t.mediaItems || []).map((item) => `<p class="text-xs" style="color:var(--text-secondary)">\u2022 ${escapeHtml(item.kind)}: ${escapeHtml(item.name || item.url)}</p>`).join('');
        }
        return `<div class="p-3 rounded-lg border" style="border-color:var(--border-default)">
          <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:var(--teal-600)">${escapeHtml(t.title || `\u0645\u0647\u0645\u0629 ${ti + 1}`)} \u00b7 ${{writing:'\u0643\u062a\u0627\u0628\u0629',quiz:'\u0627\u062e\u062a\u0628\u0627\u0631',media:'\u0648\u0633\u0627\u0626\u0637'}[t.type] || t.type}</p>
          ${inner}
        </div>`;
      }).join('');
    }

    body.innerHTML = html || `<p class="text-sm" style="color:var(--text-secondary)">\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0641\u0627\u0635\u064a\u0644 \u0625\u0636\u0627\u0641\u064a\u0629.</p>`;
    document.getElementById('view-exercise-modal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  };


  window.openGradeModal = async (subId) => {
    const sub = (await EP.submissions()).find(s => s.id === subId);
    const h = (await myHomework()).find(x => x.id === sub?.homeworkId);
    const student = myStudents.find(x => x.id === sub?.studentId);

    document.getElementById('grade-sub-id').value = subId;
    document.getElementById('grade-modal-content').innerHTML = `<strong>${escapeHtml(student?.name)}</strong> \u2014 ${escapeHtml(h?.title)}${sub?.content ? `<br><br><div class="post-body-rendered">${sub.content}</div>` : ''}`;
    document.getElementById('grade-value-label').textContent = h?.maxPoints ? `الدرجة (من ${h.maxPoints})` : 'الدرجة';
    document.getElementById('grade-value').placeholder = h?.maxPoints ? `مثال: ${Math.round(h.maxPoints * 0.8)}` : 'مثال: B+ أو 8/10';

    const isAudio = sub?.attachmentUrl && /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(sub.attachmentUrl);
    document.getElementById('grade-modal-attachment').innerHTML = sub?.attachmentUrl
      ? isAudio
        ? `<audio controls class="w-full" src="${escapeHtml(sub.attachmentUrl)}"></audio>`
        : `<a href="${escapeHtml(sub.attachmentUrl)}" target="_blank" rel="noopener" class="text-xs font-semibold" style="color:var(--teal-600)">\u{1F4CE} ${escapeHtml(sub.attachmentName || 'عرض الملف المُسلَّم')}</a>`
      : '';

    document.getElementById('grade-form').reset();
    document.getElementById('grade-modal').classList.remove('hidden');
  };
  window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

  document.getElementById('grade-revision-btn').addEventListener('click', async () => {
    const subId = document.getElementById('grade-sub-id').value;
    const feedback = document.getElementById('grade-feedback').value;
    if (!feedback) { showToast('أضف ملاحظة توضح ما يحتاج إلى مراجعة', 'danger'); return; }
    const sub = (await EP.submissions()).find(s => s.id === subId);
    try {
      await EP.requestRevision(subId, feedback);
      if (sub) await EP.sendNotification({ fromId: user.id, audience: 'user', audienceId: sub.studentId, title: 'طُلبت مراجعة', body: feedback }).catch(() => {});
      closeModal('grade-modal');
      await renderAll();
      showToast('تمت إعادته إلى الطالب للمراجعة');
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
  const T_RES_TYPE_LABEL = { pdf: 'PDF', video: 'فيديو', link: 'رابط' };

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
          <button onclick="deleteAnnouncementConfirm('${a.id}')" aria-label="حذف" class="shrink-0"><i data-lucide="trash-2" class="w-4 h-4" style="color:var(--danger-600)"></i></button>
        </div>
      </div>`).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">لا توجد إعلانات منشورة بعد.</p></div>`;
    lucide.createIcons();
  }
  window.deleteAnnouncementConfirm = async (id) => {
    if (!confirm('حذف هذا الإعلان؟ لن يعود الطلاب يرونه.')) return;
    try { await EP.deleteAnnouncement(id); await renderAnnouncements(); showToast('تم حذف الإعلان', 'info'); }
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
      showToast('تم النشر لفصلك');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  async function renderAll() {
    myStudents = await EP.studentsOf(myCourseId);
    if (!activeThreadStudentId && myStudents.length) activeThreadStudentId = myStudents[0].id;
    await Promise.all([renderKPIs(), renderPending(), renderStudents(), renderHwList(), renderGradeList(), renderTeacherResources(), renderAnnouncements(), renderClassroom()]);
    renderThreads();
    await renderChat();
    lucide.createIcons();
  }
  await renderAll();
  EP.onChange([EP.KEYS.homework, EP.KEYS.submissions, EP.KEYS.messages, EP.KEYS.resources, EP.KEYS.announcements, EP.KEYS.classroomResources], renderAll);

  async function renderTeacherResources() {
    const list = document.getElementById('teacher-resources-list');
    if (!list) return; // resources tab not present on this page
    try {
      teacherResourcesCache = await EP.resources();
    } catch (err) {
      console.error('Could not load resources:', err);
      list.innerHTML = `<p class="text-sm col-span-full" style="color:var(--danger-600)">تعذر تحميل الموارد الآن.</p>`;
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
      catFilter.innerHTML = '<option value="">كل الفئات</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
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
          ${r.targetTeacherId ? `<span class="badge badge-success">أُرسل لك خصيصاً</span>` : ''}
        </div>
        ${r.type === 'pdf'
          ? `<button onclick='openPdfViewer(${JSON.stringify(r.url)}, ${JSON.stringify(r.title)})' class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--red-600)">عرض PDF <i data-lucide="eye" class="w-3 h-3"></i></button>`
          : `<a href="${r.url}" target="_blank" rel="noopener" class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--red-600)">فتح <i data-lucide="arrow-up-right" class="w-3 h-3"></i></a>`}
      </div>`).join('') || `<p class="text-sm col-span-full text-center py-10" style="color:var(--text-secondary)">لا توجد موارد مشتركة بعد.</p>`;
    lucide.createIcons();
  }

  window.openPdfViewer = (url, title) => {
    document.getElementById('pdf-viewer-title').textContent = title;
    document.getElementById('pdf-viewer-frame').src = url;
    document.getElementById('pdf-viewer-download').href = url;
    document.getElementById('pdf-viewer-modal').classList.remove('hidden');
  };

  // ---- Classroom (this teacher sharing PDFs / images / video & other
  // links directly with their own students — the learning hub) ----
  // Files (pdf/image/link) and Videos are two separate sub-tabs, since a
  // teacher building out either a document library or a video playlist
  // wants to browse just that, not a mixed grid.
  let classroomResourcesCache = [];
  let classroomSubtab = 'files';
  const CRES_TYPE_ICON = { pdf: 'file-text', image: 'image', link: 'link' };
  const CRES_TYPE_LABEL = { pdf: 'PDF', image: 'صورة', link: 'رابط' };

  // Pulls the video id out of any common YouTube URL shape so we can show
  // its official thumbnail on the card without an extra network call.
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

  window.switchClassroomSubtab = (tab) => {
    classroomSubtab = tab;
    document.querySelectorAll('[data-classroom-subtab]').forEach((btn) => {
      const active = btn.dataset.classroomSubtab === tab;
      btn.style.background = active ? 'var(--teal-50)' : '';
      btn.style.color = active ? 'var(--navy-700)' : 'var(--text-secondary)';
    });
    document.getElementById('classroom-files-panel').classList.toggle('hidden', tab !== 'files');
    document.getElementById('classroom-videos-panel').classList.toggle('hidden', tab !== 'videos');
    renderClassroomList();
  };

  window.openClassroomResourceForm = () => {
    document.getElementById('classroom-resource-form').reset();
    document.getElementById('cres-type').value = classroomSubtab === 'videos' ? 'video' : 'pdf';
    document.getElementById('cres-type').dispatchEvent(new Event('change'));
    document.getElementById('classroom-resource-modal').classList.remove('hidden');
  };
  document.getElementById('cres-type').addEventListener('change', (e) => {
    const type = e.target.value;
    const isFile = type === 'pdf' || type === 'image';
    document.getElementById('cres-file-field').classList.toggle('hidden', !isFile);
    document.getElementById('cres-url-field').classList.toggle('hidden', isFile);
    if (isFile) document.getElementById('cres-file').setAttribute('accept', type === 'pdf' ? 'application/pdf' : 'image/*');
    document.getElementById('cres-url-hint').textContent = type === 'video'
      ? 'ألصق رابط يوتيوب (أو فيديو آخر).' : 'ألصق أي رابط — مجلد جوجل درايف، مقالة، أو أي شيء مفيد.';
  });

  async function renderClassroom() {
    const list = document.getElementById('classroom-files-list');
    if (!list) return; // classroom tab not present on this page
    try {
      classroomResourcesCache = await EP.classroomResourcesByCourse(myCourseId);
    } catch (err) {
      console.error('Could not load classroom resources:', err);
      list.innerHTML = `<p class="text-sm col-span-full" style="color:var(--danger-600)">تعذر تحميل الفصل الدراسي الآن.</p>`;
      return;
    }
    const catFilter = document.getElementById('cres-category-filter');
    if (catFilter && !catFilter.dataset.populated) {
      catFilter.addEventListener('change', renderClassroomList);
      catFilter.dataset.populated = '1';
    }
    if (catFilter) {
      const cats = [...new Set(classroomResourcesCache.map(r => r.category))].sort();
      const current = catFilter.value;
      catFilter.innerHTML = '<option value="">كل الفئات</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      catFilter.value = current;
      const suggestions = document.getElementById('cres-category-suggestions');
      if (suggestions) suggestions.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
    }
    renderClassroomList();
  }

  function classroomDeleteBtn(r) {
    return `<button onclick="deleteClassroomResourceConfirm('${r.id}','${escapeHtml(r.title).replace(/'/g, "\\'")}')" class="shrink-0" aria-label="حذف"><i data-lucide="trash-2" class="w-4 h-4" style="color:var(--danger-600)"></i></button>`;
  }

  function renderClassroomList() {
    const filterEl = document.getElementById('cres-category-filter');
    const filter = filterEl ? filterEl.value : '';
    const scoped = filter ? classroomResourcesCache.filter(r => r.category === filter) : classroomResourcesCache;

    const files = scoped.filter(r => r.type !== 'video');
    document.getElementById('classroom-files-list').innerHTML = files.map(r => `
      <div class="card p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <i data-lucide="${CRES_TYPE_ICON[r.type]}" class="w-4 h-4 shrink-0" style="color:var(--red-600)"></i>
            <p class="font-semibold text-sm truncate" style="color:var(--navy-700)">${escapeHtml(r.title)}</p>
          </div>
          ${classroomDeleteBtn(r)}
        </div>
        ${r.type === 'image' ? `<img src="${escapeHtml(r.url)}" alt="${escapeHtml(r.title)}" class="w-full rounded-md mt-3 object-cover" style="max-height:10rem">` : ''}
        ${r.description ? `<p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtml(r.description)}</p>` : ''}
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <span class="badge badge-info">${escapeHtml(r.category)}</span>
          <span class="text-xs" style="color:var(--text-disabled)">${CRES_TYPE_LABEL[r.type]}</span>
        </div>
        ${r.type === 'pdf'
          ? `<button onclick='openPdfViewer(${JSON.stringify(r.url)}, ${JSON.stringify(r.title)})' class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--red-600)">عرض PDF <i data-lucide="eye" class="w-3 h-3"></i></button>`
          : r.type === 'image'
          ? ''
          : `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="text-xs font-semibold mt-3 inline-flex items-center gap-1" style="color:var(--red-600)">فتح <i data-lucide="arrow-up-right" class="w-3 h-3"></i></a>`}
      </div>`).join('') || `<p class="text-sm col-span-full text-center py-10" style="color:var(--text-secondary)">لا توجد ملفات أو روابط مشتركة بعد.</p>`;

    const videos = scoped.filter(r => r.type === 'video');
    document.getElementById('classroom-videos-list').innerHTML = videos.map(r => {
      const thumb = youtubeThumbnail(r.url);
      return `
      <div class="card overflow-hidden">
        <div class="relative cursor-pointer" onclick='window.open(${JSON.stringify(r.url)}, "_blank")'>
          ${thumb
            ? `<img src="${thumb}" alt="${escapeHtml(r.title)}" class="w-full object-cover" style="aspect-ratio:16/9">`
            : `<div class="w-full flex items-center justify-center" style="aspect-ratio:16/9; background:var(--bg-subtle)"><i data-lucide="youtube" class="w-8 h-8" style="color:var(--red-600)"></i></div>`}
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background:rgba(11,29,58,.6)"><i data-lucide="play" class="w-5 h-5 text-white"></i></div>
          </div>
        </div>
        <div class="p-4">
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold text-sm truncate" style="color:var(--navy-700)">${escapeHtml(r.title)}</p>
            ${classroomDeleteBtn(r)}
          </div>
          ${r.description ? `<p class="text-xs mt-2" style="color:var(--text-secondary)">${escapeHtml(r.description)}</p>` : ''}
          <span class="badge badge-info mt-3 inline-block">${escapeHtml(r.category)}</span>
        </div>
      </div>`;
    }).join('') || `<p class="text-sm col-span-full text-center py-10" style="color:var(--text-secondary)">لا توجد مقاطع فيديو مشتركة بعد.</p>`;

    lucide.createIcons();
  }

  window.deleteClassroomResourceConfirm = async (id, title) => {
    if (!confirm(`إزالة "${title}"؟ لن يعود الطلاب يرونها.`)) return;
    try {
      await EP.deleteClassroomResource(id);
      await renderClassroom();
      showToast('تمت الإزالة من الفصل الدراسي', 'info');
    } catch (err) { showToast(err.message, 'danger'); }
  };

  document.getElementById('classroom-resource-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('cres-submit-btn');
    const type = document.getElementById('cres-type').value;
    const isFile = type === 'pdf' || type === 'image';
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = isFile ? 'جارٍ الرفع...' : 'جارٍ المشاركة...';
    try {
      await EP.addClassroomResource({
        courseId: myCourseId, teacherId: user.id,
        title: document.getElementById('cres-title').value,
        description: document.getElementById('cres-description').value,
        type,
        category: document.getElementById('cres-category').value,
        file: isFile ? document.getElementById('cres-file').files[0] : null,
        externalUrl: isFile ? null : document.getElementById('cres-url').value,
      });
      closeModal('classroom-resource-modal');
      await renderClassroom();
      showToast('تمت المشاركة مع فصلك');
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

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
      placeholder: 'اكتب التعليمات...',
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
      const applyDirection = () => {
        el.querySelector('.ql-editor').style.direction = checkbox.checked ? 'rtl' : 'ltr';
        el.querySelector('.ql-editor').style.textAlign = checkbox.checked ? 'right' : 'left';
      };
      checkbox.addEventListener('change', applyDirection);
      applyDirection();
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

  function addQuestionRow(container) {
    const qId = ++hwQuestionCount;
    const row = document.createElement('div');
    row.className = 'p-4 rounded-md border';
    row.style.borderColor = 'var(--border-default)';
    row.dataset.qrow = qId;
    row.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs font-semibold" style="color:var(--text-secondary)">السؤال ${qId}</label>
        <button type="button" class="text-xs" style="color:var(--danger-600)" onclick="this.closest('[data-qrow]').remove()">إزالة</button>
      </div>
      <input class="hw-q-text w-full px-3 py-2 rounded-md border text-sm mb-2" style="border-color:var(--border-default)" placeholder="نص السؤال" required>
      <div class="space-y-2">
        ${[0, 1, 2, 3].map(i => `
          <div class="flex items-center gap-2">
            <input type="radio" name="hw-correct-${qId}" value="${i}" ${i === 0 ? 'checked' : ''} class="hw-q-correct">
            <input class="hw-q-option flex-1 px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)" placeholder="الخيار ${i + 1}${i >= 2 ? ' (اختياري)' : ''}" ${i < 2 ? 'required' : ''}>
          </div>`).join('')}
      </div>
      <p class="text-xs mt-1" style="color:var(--text-secondary)">اختر الزر الدائري بجانب الإجابة الصحيحة.</p>`;
    container.appendChild(row);
  }
  document.getElementById('hw-add-question').addEventListener('click', () => addQuestionRow(document.getElementById('hw-questions-list')));

  function collectQuestions(container) {
    return [...container.querySelectorAll('[data-qrow]')].map((row) => {
      const options = [...row.querySelectorAll('.hw-q-option')].map((i) => i.value.trim()).filter(Boolean);
      const correctInput = row.querySelector('.hw-q-correct:checked');
      return {
        questionText: row.querySelector('.hw-q-text').value.trim(),
        options,
        correctIndex: correctInput ? parseInt(correctInput.value, 10) : 0,
      };
    });
  }

  // ---- Multi-task builder ----
  function addMediaItemRow(container) {
    const row = document.createElement('div');
    row.className = 'flex items-start gap-2 p-3 rounded-md';
    row.style.background = 'var(--bg-subtle)';
    row.dataset.mediaRow = '1';
    row.innerHTML = `
      <div class="flex-1 space-y-2">
        <select class="hw-media-kind w-full px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)">
          <option value="video">\u0641\u064a\u062f\u064a\u0648 (\u0623\u0644\u0635\u0642 \u0631\u0627\u0628\u0637 \u064a\u0648\u062a\u064a\u0648\u0628/\u0641\u064a\u062f\u064a\u0648)</option>
          <option value="link">\u0631\u0627\u0628\u0637 \u062e\u0627\u0631\u062c\u064a</option>
          <option value="pdf">\u0631\u0641\u0639 PDF</option>
          <option value="audio">\u0631\u0641\u0639 \u0645\u0644\u0641 \u0635\u0648\u062a\u064a</option>
          <option value="image">\u0631\u0641\u0639 \u0635\u0648\u0631\u0629</option>
          <option value="file">\u0631\u0641\u0639 \u0645\u0644\u0641 \u0622\u062e\u0631</option>
        </select>
        <input class="hw-media-label w-full px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)" placeholder="\u0627\u0644\u062a\u0633\u0645\u064a\u0629 (\u0645\u062b\u0627\u0644: \u2018\u0645\u0642\u0637\u0639 \u0627\u0633\u062a\u0645\u0627\u0639\u2019)">
        <input class="hw-media-url w-full px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)" placeholder="\u0623\u0644\u0635\u0642 \u0627\u0644\u0631\u0627\u0628\u0637">
        <input class="hw-media-file hidden w-full text-sm" type="file">
        <p class="hw-media-status text-xs" style="color:var(--text-secondary)"></p>
      </div>
      <button type="button" class="text-xs shrink-0" style="color:var(--danger-600)" onclick="this.closest('[data-media-row]').remove()">\u0625\u0632\u0627\u0644\u0629</button>`;
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
    syncKind();
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      statusEl.textContent = 'جارٍ الرفع...';
      try {
        const uploaded = await EP.uploadHomeworkFile(file);
        row.dataset.uploadedUrl = uploaded.url;
        statusEl.textContent = `تم الرفع: ${uploaded.name}`;
        statusEl.style.color = 'var(--success-600)';
      } catch (err) {
        statusEl.textContent = err.message;
        statusEl.style.color = 'var(--danger-600)';
      }
    });
    container.appendChild(row);
  }

  function addTaskCard(type) {
    const taskId = ++hwTaskCount;
    const card = document.createElement('div');
    card.className = 'p-4 rounded-md border';
    card.style.borderColor = 'var(--border-default)';
    card.dataset.taskCard = taskId;
    card.dataset.taskType = type;
    const typeLabel = { writing: '\u0643\u062a\u0627\u0628\u0629', quiz: '\u0627\u062e\u062a\u0628\u0627\u0631', media: '\u0648\u0633\u0627\u0626\u0637' }[type];
    const bodyId = `hw-task-body-${taskId}`;
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="badge badge-info">${typeLabel}</span>
        <button type="button" class="text-xs" style="color:var(--danger-600)" onclick="this.closest('[data-task-card]').remove()">\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0645\u0647\u0645\u0629</button>
      </div>
      <input class="hw-task-title w-full px-3 py-2 rounded-md border text-sm mb-3" style="border-color:var(--border-default)" placeholder="\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0647\u0645\u0629 (\u0645\u062b\u0627\u0644: \u2018\u0627\u0644\u062c\u0632\u0621 1: \u0627\u0633\u062a\u0645\u0627\u0639\u2019)">
      <div id="${bodyId}"></div>`;
    document.getElementById('hw-tasks-list').appendChild(card);
    document.getElementById('hw-tasks-empty').classList.add('hidden');

    const body = document.getElementById(bodyId);
    if (type === 'writing') {
      const editorId = `hw-task-editor-${taskId}`;
      const rtlId = `hw-task-rtl-${taskId}`;
      body.innerHTML = `
        <label class="text-xs flex items-center gap-1 justify-end mb-1" style="color:var(--text-secondary)"><input type="checkbox" id="${rtlId}" checked> من اليمين إلى اليسار (عربي)</label>
        <div id="${editorId}" style="min-height:100px"></div>`;
      initQuillEditor(editorId, rtlId);
      card.dataset.editorId = editorId;
    } else if (type === 'quiz') {
      body.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold" style="color:var(--text-secondary)">الأسئلة</label>
          <button type="button" class="hw-task-add-question text-xs font-semibold" style="color:var(--teal-600)">+ إضافة سؤال</button>
        </div>
        <div class="hw-task-questions space-y-3"></div>`;
      const list = body.querySelector('.hw-task-questions');
      body.querySelector('.hw-task-add-question').addEventListener('click', () => addQuestionRow(list));
      addQuestionRow(list);
    } else if (type === 'media') {
      body.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold" style="color:var(--text-secondary)">عناصر الوسائط</label>
          <button type="button" class="hw-task-add-media text-xs font-semibold" style="color:var(--teal-600)">+ إضافة عنصر</button>
        </div>
        <div class="hw-task-media space-y-2"></div>`;
      const list = body.querySelector('.hw-task-media');
      body.querySelector('.hw-task-add-media').addEventListener('click', () => addMediaItemRow(list));
      addMediaItemRow(list);
    }
  }
  document.querySelectorAll('#hw-multi-builder [data-add-task]').forEach((btn) => {
    btn.addEventListener('click', () => addTaskCard(btn.dataset.addTask));
  });


  let pendingAttachment = null;
  document.getElementById('hw-attachment').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const statusEl = document.getElementById('hw-attachment-status');
    if (!file) { pendingAttachment = null; statusEl.textContent = ''; return; }
    statusEl.textContent = 'جارٍ الرفع...';
    try {
      pendingAttachment = await EP.uploadHomeworkFile(file);
      statusEl.textContent = `تم الإرفاق: ${pendingAttachment.name}`;
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
      if (!questions.length) { showToast('أضف سؤالاً واحداً على الأقل لتمرين الاختبار', 'danger'); return; }
      if (questions.some((q) => !q.questionText || q.options.length < 2)) {
        showToast('كل سؤال يحتاج نصاً وخيارين على الأقل', 'danger');
        return;
      }
    }
    if (mode === 'multi') {
      const cards = [...document.querySelectorAll('#hw-tasks-list [data-task-card]')];
      if (!cards.length) { showToast('أضف مهمة واحدة على الأقل', 'danger'); return; }
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
            showToast(`\u0623\u0635\u0644\u062d \u0645\u0647\u0645\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631 "${title || '\u0628\u062f\u0648\u0646 \u0639\u0646\u0648\u0627\u0646'}" \u2014 \u0643\u0644 \u0633\u0624\u0627\u0644 \u064a\u062d\u062a\u0627\u062c \u0646\u0635\u0627\u064b \u0648\u062e\u064a\u0627\u0631\u064a\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644`, 'danger');
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
          if (!items.length) { showToast(`أضف عنصر وسائط صالحاً واحداً على الأقل إلى "${title || 'بدون عنوان'}"`, 'danger'); return; }
          tasks.push({ type, title, mediaItems: items });
        }
      }
    }
    try {
      await EP.addHomework({
        courseId: myCourseId, teacherId: user.id,
        title: document.getElementById('hw-title').value,
        instructions: quillHtml('hw-instructions-editor'),
        instructionsDirection: document.getElementById('hw-instructions-rtl').checked ? 'rtl' : 'ltr',
        submissionMode: mode,
        attachmentUrl: pendingAttachment?.url,
        attachmentName: pendingAttachment?.name,
        maxPoints: parseInt(document.getElementById('hw-points').value, 10) || 100,
        questions,
        tasks,
      });
      e.target.reset();
      pendingAttachment = null;
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
      await renderAll();
      showToast('تم تكليف التمرين لجميع الطلاب في دورتك');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  document.getElementById('grade-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subId = document.getElementById('grade-sub-id').value;
    const sub = (await EP.submissions()).find(s => s.id === subId);
    try {
      const gradeVal = document.getElementById('grade-value').value;
      await EP.gradeSubmission(subId, gradeVal, document.getElementById('grade-feedback').value);
      if (sub) await EP.sendNotification({ fromId: user.id, audience: 'user', audienceId: sub.studentId, title: 'تم تقييم الواجب', body: `تم تقييم تسليمك: ${gradeVal}` }).catch(() => {});
      closeModal('grade-modal');
      await renderAll();
      showToast('تم حفظ الدرجة وإشعار الطالب');
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
      showToast('تم الإرسال لكامل فصلك');
    } catch (err) { showToast(err.message, 'danger'); }
  });
});
