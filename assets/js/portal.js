/* Shared helpers for the three portal dashboards (Supabase-backed) */
function initPortalChrome(user) {
  const nameEl = document.getElementById('portal-user-name');
  const roleEl = document.getElementById('portal-user-role');
  const initialsEl = document.getElementById('portal-user-initials');
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  if (initialsEl) initialsEl.textContent = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const logoutBtn = document.getElementById('portal-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => { await EP.logout(); window.location.href = 'login.html'; });

  refreshBell(user);
  EP.onChange([EP.KEYS.notifications, EP.KEYS.notification_reads], () => refreshBell(user));

  wireAccountSettings(user);
}

function wireAccountSettings(user) {
  const emailEl = document.getElementById('settings-email');
  const nameInput = document.getElementById('settings-name');
  if (emailEl) emailEl.textContent = user.email || '';
  if (nameInput) nameInput.value = user.name || '';

  const profileForm = document.getElementById('settings-profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const newName = nameInput.value.trim();
        await EP.updateProfile({ fullName: newName });
        const nameEl = document.getElementById('portal-user-name');
        const initialsEl = document.getElementById('portal-user-initials');
        if (nameEl) nameEl.textContent = newName;
        if (initialsEl) initialsEl.textContent = newName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        showToast('Profile updated');
      } catch (err) { showToast(err.message || 'Could not update profile', 'danger'); }
    });
  }

  const passwordForm = document.getElementById('settings-password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw = document.getElementById('settings-new-password').value;
      const confirm = document.getElementById('settings-confirm-password').value;
      if (pw !== confirm) { showToast('Passwords don\u2019t match', 'danger'); return; }
      if (pw.length < 8) { showToast('Password must be at least 8 characters', 'danger'); return; }
      try {
        await EP.updatePassword(pw);
        passwordForm.reset();
        showToast('Password updated');
      } catch (err) { showToast(err.message || 'Could not update password', 'danger'); }
    });
  }

  const settingsLogout = document.getElementById('settings-logout');
  if (settingsLogout) settingsLogout.addEventListener('click', async () => { await EP.logout(); window.location.href = 'login.html'; });
}

async function refreshBell(user) {
  const dot = document.getElementById('portal-bell-dot');
  const list = document.getElementById('portal-bell-list');
  if (!dot && !list) return;
  const items = await EP.notificationsFor(user);
  const unread = items.filter(n => !n.readBy.includes(user.id)).length;
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
  if (list) {
    list.innerHTML = items.slice(0, 6).map(n => `
      <div class="p-3 border-b text-sm" style="border-color:var(--border-default)">
        <p class="font-semibold" style="color:var(--navy-700)">${escapeHtml(n.title)}</p>
        <p class="text-xs mt-0.5" style="color:var(--text-secondary)">${escapeHtml(n.body)}</p>
        <p class="text-[10px] mt-1" style="color:var(--text-disabled)">${EP.timeAgo(n.createdAt)}</p>
      </div>`).join('') || `<div class="p-4 text-sm text-center" style="color:var(--text-secondary)">No notifications yet.</div>`;
  }
}

function switchTab(containerId, tabName) {
  document.querySelectorAll(`#${containerId} [data-tab-panel]`).forEach(el => {
    el.classList.toggle('hidden', el.dataset.tabPanel !== tabName);
  });
  document.querySelectorAll(`#${containerId} [data-tab-trigger]`).forEach(el => {
    const active = el.dataset.tabTrigger === tabName;
    el.style.background = active ? 'var(--navy-50)' : '';
    el.style.color = active ? 'var(--navy-700)' : 'var(--text-secondary)';
    el.classList.toggle('font-semibold', active);
  });
}

function wireTabs(containerId, defaultTab) {
  document.querySelectorAll(`#${containerId} [data-tab-trigger]`).forEach(el => {
    el.addEventListener('click', () => switchTab(containerId, el.dataset.tabTrigger));
  });
  switchTab(containerId, defaultTab);
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
