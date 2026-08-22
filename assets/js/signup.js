document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('signup-form');
  const errorBox = document.getElementById('signup-error');
  const submitBtn = document.getElementById('signup-submit');
  const courseSelect = document.getElementById('signup-course');

  // If already logged in, no need to sign up again.
  const existing = await EP.getSession();
  if (existing) {
    const dashByRole = { admin: 'admin-dashboard.html', teacher: 'teacher-dashboard.html', student: 'student-dashboard.html' };
    window.location.href = dashByRole[existing.role] || 'index.html';
    return;
  }

  try {
    const courses = await EP.courses();
    courses.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      courseSelect.appendChild(opt);
    });
  } catch (e) { console.warn('Could not load course list (check SUPABASE_URL/ANON_KEY in data.js):', e); }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-password-confirm').value;
    if (password !== confirm) { showError('Passwords don\u2019t match.'); return; }
    if (password.length < 8) { showError('Password must be at least 8 characters.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    try {
      const { hasSession } = await EP.signup({
        email: document.getElementById('signup-email').value.trim(),
        password,
        fullName: document.getElementById('signup-name').value.trim(),
        courseId: courseSelect.value,
        city: document.getElementById('signup-city').value.trim(),
        phone: document.getElementById('signup-phone').value.trim(),
      });
      if (hasSession) {
        window.location.href = 'student-dashboard.html';
      } else {
        // Email confirmation is required by this Supabase project's auth settings.
        form.classList.add('hidden');
        document.getElementById('signup-error').classList.add('hidden');
        const wrap = form.parentElement;
        const msg = document.createElement('div');
        msg.className = 'card p-6 text-center';
        msg.innerHTML = `<p class="font-serif text-xl font-bold mb-2" style="color:var(--navy-700)">Check your email</p><p class="text-sm" style="color:var(--text-secondary)">We sent a confirmation link to finish creating your account. Once confirmed, <a href="login.html" class="underline font-semibold" style="color:var(--navy-700)">log in here</a>.</p>`;
        wrap.appendChild(msg);
      }
    } catch (err) {
      showError(err.message || 'Could not create your account. Try a different email or contact support.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
});
