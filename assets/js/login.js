document.addEventListener('DOMContentLoaded', () => {
  const dashByRole = { admin: 'admin-dashboard.html', teacher: 'teacher-dashboard.html', student: 'student-dashboard.html' };
  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  // If already logged in, skip straight to the right dashboard.
  EP.getSession().then((user) => { if (user) window.location.href = dashByRole[user.role]; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    try {
      const user = await EP.login(
        document.getElementById('login-email').value.trim(),
        document.getElementById('login-password').value
      );
      if (!user) throw new Error('Could not load your profile. Contact an administrator.');
      await EP.ensurePendingEnrollment().catch(() => {});
      window.location.href = dashByRole[user.role] || 'index.html';
    } catch (err) {
      errorBox.textContent = err.message || 'Login failed. Check your email and password.';
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });
});
