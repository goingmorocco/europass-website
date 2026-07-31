document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-form');
  const errorBox = document.getElementById('forgot-error');
  const submitBtn = document.getElementById('forgot-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    try {
      await EP.resetPasswordForEmail(document.getElementById('forgot-email').value.trim());
      document.getElementById('forgot-request').classList.add('hidden');
      document.getElementById('forgot-sent').classList.remove('hidden');
    } catch (err) {
      // Supabase intentionally doesn't reveal whether an email exists for
      // most error cases, but network/rate-limit errors still surface here.
      errorBox.textContent = err.message || 'Something went wrong. Try again in a moment.';
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Link';
    }
  });
});
