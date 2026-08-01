// EuroPass — Community Groups (Feed + Chat), shared by Student & Teacher dashboards.
// Call initCommunity(user, containerId) once the dashboard's user session is known.

async function initCommunity(user, containerId) {
  const group = await EP.myGroup();
  const nameEl = document.getElementById('community-group-name');
  const descEl = document.getElementById('community-group-desc');
  const iconEl = document.getElementById('community-group-icon');
  if (!group) {
    if (nameEl) nameEl.textContent = 'No group yet';
    if (descEl) descEl.textContent = 'You\u2019ll get access once you\u2019re enrolled in a program.';
    return;
  }
  if (nameEl) nameEl.textContent = group.name;
  if (descEl) descEl.textContent = group.description || '';
  if (iconEl) iconEl.textContent = group.icon;

  let currentSubTab = 'feed';
  let selectedImageFile = null;

  function switchSubTab(tab) {
    currentSubTab = tab;
    document.getElementById('community-feed-panel').classList.toggle('hidden', tab !== 'feed');
    document.getElementById('community-chat-panel').classList.toggle('hidden', tab !== 'chat');
    document.querySelectorAll('[data-community-subtab]').forEach(btn => {
      const active = btn.dataset.communitySubtab === tab;
      btn.style.background = active ? 'var(--teal-50)' : '';
      btn.style.color = active ? 'var(--navy-700)' : 'var(--text-secondary)';
      btn.classList.toggle('font-semibold', active);
    });
  }
  document.querySelectorAll('[data-community-subtab]').forEach(btn => {
    btn.addEventListener('click', () => switchSubTab(btn.dataset.communitySubtab));
  });
  switchSubTab('feed');

  // ---- Feed ----
  async function renderFeed() {
    const el = document.getElementById('community-feed-list');
    const posts = await EP.groupPosts(group.id);
    el.innerHTML = posts.map(p => {
      const liked = p.likes.includes(user.id);
      const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      return `
      <div class="card p-5" data-post-id="${p.id}">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style="background:var(--navy-700)">${initials(p._authorName)}</div>
          <div>
            <p class="font-semibold text-sm" style="color:var(--navy-700)">${escapeHtml(p._authorName || 'Someone')}</p>
            <p class="text-xs" style="color:var(--text-disabled)">${EP.timeAgo(p.createdAt)}${p.editedAt ? ' \u00b7 edited' : ''}</p>
          </div>
          <div class="ml-auto flex items-center gap-3">
            ${p.authorId === user.id
              ? `<button onclick="communityEditPost('${p.id}')" class="text-xs" style="color:var(--text-secondary)">Edit</button><button onclick="communityDeletePost('${p.id}')" class="text-xs" style="color:var(--danger-600)">Delete</button>`
              : `<button onclick="communityReportPost('${p.id}')" class="text-xs flex items-center gap-1" style="color:var(--text-disabled)"><i data-lucide="flag" class="w-3.5 h-3.5"></i> Report</button>`}
          </div>
        </div>

        <div id="body-view-${p.id}">
          ${p.body ? `<p class="text-sm mb-3" style="color:var(--text-primary)">${escapeHtml(p.body)}</p>` : ''}
        </div>
        <form id="body-edit-${p.id}" onsubmit="communitySaveEdit(event, '${p.id}')" class="hidden mb-3 space-y-2">
          <textarea class="w-full px-3 py-2 rounded-md border text-sm" style="border-color:var(--border-default)">${escapeHtml(p.body || '')}</textarea>
          <div class="flex gap-2">
            <button type="submit" class="btn btn-teal btn-sm">Save</button>
            <button type="button" onclick="communityCancelEdit('${p.id}')" class="btn btn-secondary btn-sm">Cancel</button>
          </div>
        </form>

        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="" class="rounded-lg w-full max-h-96 object-cover mb-3">` : ''}
        <div class="flex items-center gap-4 pt-2 border-t" style="border-color:var(--border-default)">
          <button onclick="communityToggleLike('${p.id}', ${liked})" class="flex items-center gap-1.5 text-sm font-medium" style="color:${liked ? 'var(--red-600)' : 'var(--text-secondary)'}">
            <i data-lucide="heart" class="w-4 h-4" ${liked ? 'fill="currentColor"' : ''}></i> ${p.likes.length || ''}
          </button>
          <button onclick="communityToggleComments('${p.id}')" class="flex items-center gap-1.5 text-sm font-medium" style="color:var(--text-secondary)">
            <i data-lucide="message-circle" class="w-4 h-4"></i> ${p.comments.length || ''} ${p.comments.length === 1 ? 'Comment' : 'Comments'}
          </button>
        </div>
        <div id="comments-${p.id}" class="hidden mt-3 pt-3 border-t space-y-2" style="border-color:var(--border-default)">
          ${p.comments.map(c => `
            <div class="flex items-center justify-between gap-2 text-xs">
              <p><span class="font-semibold" style="color:var(--navy-700)">${escapeHtml(c._authorName || 'Someone')}</span> <span style="color:var(--text-secondary)">${escapeHtml(c.body)}</span></p>
              ${c.authorId === user.id ? `<button onclick="communityDeleteComment('${c.id}')" class="shrink-0" style="color:var(--danger-600)">Delete</button>` : ''}
            </div>`).join('')}
          <form onsubmit="communityAddComment(event, '${p.id}')" class="flex gap-2 mt-2">
            <input required placeholder="Write a comment..." class="flex-1 px-3 py-1.5 rounded-md border text-xs" style="border-color:var(--border-default)">
            <button type="submit" class="btn btn-secondary btn-sm">Post</button>
          </form>
        </div>
      </div>`;
    }).join('') || `<div class="card p-8 text-center"><p style="color:var(--text-secondary)">No posts yet \u2014 be the first to say hi! \U0001F44B</p></div>`;
    lucide.createIcons();
  }

  // Resolve author names client-side (small group sizes make this cheap and
  // avoids a heavier joined query / extra RLS surface on profiles).
  async function attachAuthorNames(posts) {
    const roster = await EP.users();
    const byId = Object.fromEntries(roster.map(u => [u.id, u.name]));
    posts.forEach(p => { p._authorName = byId[p.authorId]; p.comments.forEach(c => { c._authorName = byId[c.authorId]; }); });
    return posts;
  }
  const originalGroupPosts = EP.groupPosts;
  EP.groupPosts = async (groupId) => attachAuthorNames(await originalGroupPosts(groupId));

  window.communityToggleLike = async (postId, currentlyLiked) => {
    try { await EP.toggleLike(postId, user.id, currentlyLiked); await renderFeed(); } catch (err) { showToast(err.message, 'danger'); }
  };
  window.communityToggleComments = (postId) => document.getElementById(`comments-${postId}`).classList.toggle('hidden');
  window.communityAddComment = async (e, postId) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (!input.value.trim()) return;
    try { await EP.addComment(postId, user.id, input.value.trim()); input.value = ''; await renderFeed(); } catch (err) { showToast(err.message, 'danger'); }
  };
  window.communityDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try { await EP.deleteGroupPost(postId); await renderFeed(); } catch (err) { showToast(err.message, 'danger'); }
  };

  window.communityEditPost = (postId) => {
    document.getElementById(`body-view-${postId}`).classList.add('hidden');
    document.getElementById(`body-edit-${postId}`).classList.remove('hidden');
  };
  window.communityCancelEdit = (postId) => {
    document.getElementById(`body-edit-${postId}`).classList.add('hidden');
    document.getElementById(`body-view-${postId}`).classList.remove('hidden');
  };
  window.communitySaveEdit = async (e, postId) => {
    e.preventDefault();
    const newBody = e.target.querySelector('textarea').value.trim();
    if (!newBody) { showToast('Post can\u2019t be empty', 'danger'); return; }
    try { await EP.editGroupPost(postId, newBody); await renderFeed(); } catch (err) { showToast(err.message, 'danger'); }
  };

  window.communityDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try { await EP.deleteComment(commentId); await renderFeed(); } catch (err) { showToast(err.message, 'danger'); }
  };

  // Called from portal.js when a notification bell item links to a post
  // (a like/comment/reply notification) — brings the user straight to it.
  window.communityJumpToPost = async (postId, { expandComments } = {}) => {
    switchSubTab('feed');
    await renderFeed();
    const el = document.querySelector(`[data-post-id="${postId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight-flash');
    setTimeout(() => el.classList.remove('highlight-flash'), 1700);
    if (expandComments) {
      const c = document.getElementById(`comments-${postId}`);
      if (c) c.classList.remove('hidden');
    }
  };

  window.communityReportPost = (postId) => {
    document.getElementById('report-post-id').value = postId;
    document.getElementById('report-reason').value = '';
    document.getElementById('report-modal').classList.remove('hidden');
  };
  const reportForm = document.getElementById('report-form');
  if (reportForm && !reportForm.dataset.wired) {
    reportForm.dataset.wired = '1'; // community.js runs on both Student and Teacher pages but the modal markup exists once per page
    reportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await EP.reportPost(document.getElementById('report-post-id').value, user.id, document.getElementById('report-reason').value.trim());
        document.getElementById('report-modal').classList.add('hidden');
        showToast('Report submitted \u2014 thanks for flagging it');
      } catch (err) { showToast(err.message, 'danger'); }
    });
  }

  const imageInput = document.getElementById('community-image-input');
  const imagePreviewName = document.getElementById('community-image-name');
  if (imageInput) {
    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (!file) { selectedImageFile = null; imagePreviewName.textContent = ''; return; }
      if (!file.type.startsWith('image/')) { showToast('Only image files are allowed', 'danger'); imageInput.value = ''; return; }
      if (file.size > 1048576) { showToast('Image must be under 1MB', 'danger'); imageInput.value = ''; return; }
      selectedImageFile = file;
      imagePreviewName.textContent = `\U0001F4CE ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    });
  }

  document.getElementById('community-post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bodyInput = document.getElementById('community-post-body');
    if (!bodyInput.value.trim() && !selectedImageFile) { showToast('Write something or add an image first', 'danger'); return; }
    try {
      await EP.createGroupPost({ groupId: group.id, authorId: user.id, body: bodyInput.value.trim(), imageFile: selectedImageFile });
      bodyInput.value = ''; selectedImageFile = null; imageInput.value = ''; imagePreviewName.textContent = '';
      await renderFeed();
      showToast('Posted! \U0001F389');
    } catch (err) { showToast(err.message, 'danger'); }
  });

  // ---- Chat ----
  async function renderChat() {
    const el = document.getElementById('community-chat-messages');
    const roster = await EP.users();
    const byId = Object.fromEntries(roster.map(u => [u.id, u.name]));
    const msgs = await EP.groupMessages(group.id);
    el.innerHTML = msgs.map(m => `
      <div class="flex ${m.fromId === user.id ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[75%]">
          ${m.fromId !== user.id ? `<p class="text-[10px] mb-0.5 px-1" style="color:var(--text-disabled)">${escapeHtml(byId[m.fromId] || 'Someone')}</p>` : ''}
          <div class="px-4 py-2 rounded-xl text-sm" style="background:${m.fromId === user.id ? 'var(--teal-600)' : 'var(--bg-subtle)'}; color:${m.fromId === user.id ? '#fff' : 'var(--text-primary)'}">
            ${escapeHtml(m.body)}<div class="text-[10px] mt-1 opacity-70">${EP.timeAgo(m.createdAt)}</div>
          </div>
        </div>
      </div>`).join('') || `<p class="text-sm text-center" style="color:var(--text-secondary)">No messages yet \u2014 say hi to your classmates! \U0001F44B</p>`;
    el.scrollTop = el.scrollHeight;
  }
  document.getElementById('community-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('community-chat-input');
    if (!input.value.trim()) return;
    try { await EP.sendGroupMessage(group.id, user.id, input.value.trim()); input.value = ''; await renderChat(); }
    catch (err) { showToast(err.message, 'danger'); }
  });

  await Promise.all([renderFeed(), renderChat()]);
  EP.onChange([EP.KEYS.group_posts, EP.KEYS.group_post_likes, EP.KEYS.group_post_comments], renderFeed);
  EP.onChange([EP.KEYS.group_messages], renderChat);
}
