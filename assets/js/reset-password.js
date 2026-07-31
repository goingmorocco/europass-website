document.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('reset-loading');
  const formWrap = document.getElementById('reset-form-wrap');
  const invalid = document.getElementById('reset-invalid');
  const success = document.getElementById('reset-success');
  const errorBox = document.getElementById('reset-error');

  let resolved = false;
  function showForm() {
    if (resolved) return;
    resolved = true;
    loading.classList.add('hidden');
    formWrap.classList.remove('hidden');
  }
  function showInvalid() {
    if (resolved) return;
    resolved = true;
    loading.classList.add('hidden');
    invalid.classList.remove('hidden');
  }

  // Supabase processes the recovery token from the email link automatically
  // on client init, then fires this event once a recovery session is ready.
  EP.onAuthEvent((event) => {
    if (event === 'PASSWORD_RECOVERY') showForm();
  });

  // Fallback: some browsers/timings fire PASSWORD_RECOVERY before this
  // listener attaches, so also check directly for an active session.
  EP.getSession().then((user) => { if (user) showForm(); }).catch(() => {});

  // If nothing resolved within a few seconds, the link was likely invalid/expired.
  setTimeout(showInvalid, 4000);

  document.getElementById('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    const pw = document.getElementById('reset-password').value;
    const confirm = document.getElementById('reset-password-confirm').value;
    if (pw !== confirm) { errorBox.textContent = 'Passwords don\u2019t match.'; errorBox.classList.remove('hidden'); return; }
    if (pw.length < 8) { errorBox.textContent = 'Password must be at least 8 characters.'; errorBox.classList.remove('hidden'); return; }
    try {
      await EP.updatePassword(pw);
      formWrap.classList.add('hidden');
      success.classList.remove('hidden');
    } catch (err) {
      errorBox.textContent = err.message || 'Could not update your password.';
      errorBox.classList.remove('hidden');
    }
  });
});
