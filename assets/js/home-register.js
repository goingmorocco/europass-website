// Handles the "Open Your Account" registration form embedded directly on
// the homepage — same underlying EP.signup() flow as the portal's
// signup.html, just a second entry point for someone who doesn't want to
// leave the homepage to create an account. Runs on the English, French,
// and Arabic homepages, so every user-facing string branches on language.
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('home-register-form');
  if (!form) return;
  const errorBox = document.getElementById('home-register-error');
  const submitBtn = document.getElementById('home-register-submit');
  const courseSelect = document.getElementById('home-register-course');

  // Portal dashboards only exist at the site root, never under /fr/ or
  // /ar/ — this same script runs on all three homepages, so redirect
  // targets need this prefix when called from inside a language
  // subfolder, or they'd resolve to a non-existent /fr/student-dashboard.html.
  const lang = /\/fr\//.test(window.location.pathname) ? 'fr' : /\/ar\//.test(window.location.pathname) ? 'ar' : 'en';
  const portalPrefix = lang === 'en' ? '' : '../';

  const STRINGS = {
    ar: {
      alreadyLoggedIn: '\u0623\u0646\u062a \u0645\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0627\u0644\u0641\u0639\u0644.',
      goToDashboard: '\u0627\u0630\u0647\u0628 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
      passwordsMismatch: '\u0643\u0644\u0645\u062a\u0627 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642\u062a\u064a\u0646.',
      passwordTooShort: '\u064a\u062c\u0628 \u0623\u0646 \u062a\u062a\u0643\u0648\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 8 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644.',
      creating: '\u062c\u0627\u0631\u064d \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628...',
      createAccount: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628',
      checkEmailTitle: '\u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
      checkEmailBody: '\u0623\u0631\u0633\u0644\u0646\u0627 \u0631\u0627\u0628\u0637 \u062a\u0623\u0643\u064a\u062f \u0644\u0625\u0646\u0647\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628\u0643. \u0628\u0639\u062f \u0627\u0644\u062a\u0623\u0643\u064a\u062f،',
      logInHere: '\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0645\u0646 \u0647\u0646\u0627',
      genericError: '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628\u0643. \u062c\u0631\u0651\u0628 \u0628\u0631\u064a\u062f\u064b\u0627 \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u064b\u0627 \u0622\u062e\u0631 \u0623\u0648 \u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627.',
    },
    fr: {
      alreadyLoggedIn: 'Vous \u00eates d\u00e9j\u00e0 connect\u00e9(e).',
      goToDashboard: 'Aller \u00e0 votre tableau de bord',
      passwordsMismatch: 'Les mots de passe ne correspondent pas.',
      passwordTooShort: 'Le mot de passe doit contenir au moins 8 caract\u00e8res.',
      creating: 'Cr\u00e9ation du compte...',
      createAccount: 'Cr\u00e9er un Compte',
      checkEmailTitle: 'V\u00e9rifiez votre e-mail',
      checkEmailBody: 'Nous avons envoy\u00e9 un lien de confirmation pour finaliser la cr\u00e9ation de votre compte. Une fois confirm\u00e9,',
      logInHere: 'connectez-vous ici',
      genericError: 'Impossible de cr\u00e9er votre compte. Essayez un autre e-mail ou contactez le support.',
    },
    en: {
      alreadyLoggedIn: 'You\u2019re already logged in.',
      goToDashboard: 'Go to your dashboard',
      passwordsMismatch: 'Passwords don\u2019t match.',
      passwordTooShort: 'Password must be at least 8 characters.',
      creating: 'Creating account...',
      createAccount: 'Create Account',
      checkEmailTitle: 'Check your email',
      checkEmailBody: 'We sent a confirmation link to finish creating your account. Once confirmed,',
      logInHere: 'log in here',
      genericError: 'Could not create your account. Try a different email or contact support.',
    },
  };
  const T = STRINGS[lang];

  // If already logged in, no need to register again.
  const existing = await EP.getSession().catch(() => null);
  if (existing) {
    const dashByRole = { admin: 'admin-dashboard.html', teacher: 'teacher-dashboard.html', student: 'student-dashboard.html' };
    const target = portalPrefix + (dashByRole[existing.role] || 'index.html');
    form.closest('section').innerHTML = `<div class="container-ep max-w-lg text-center"><p class="text-sm" style="color:var(--text-secondary)">${T.alreadyLoggedIn}</p><a href="${target}" class="btn btn-primary mt-4">${T.goToDashboard}</a></div>`;
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
  } catch (e) { console.warn('Could not load course list:', e); }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const password = document.getElementById('home-register-password').value;
    const confirm = document.getElementById('home-register-password-confirm').value;
    if (password !== confirm) { showError(T.passwordsMismatch); return; }
    if (password.length < 8) { showError(T.passwordTooShort); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = T.creating;
    try {
      const { hasSession } = await EP.signup({
        email: document.getElementById('home-register-email').value.trim(),
        password,
        fullName: document.getElementById('home-register-name').value.trim(),
        courseId: courseSelect.value,
        city: document.getElementById('home-register-city').value.trim(),
        phone: document.getElementById('home-register-phone').value.trim(),
      });
      if (hasSession) {
        window.location.href = portalPrefix + 'student-dashboard.html';
      } else {
        form.classList.add('hidden');
        const wrap = form.parentElement;
        const msg = document.createElement('div');
        msg.className = 'card p-6 text-center';
        msg.innerHTML = `<p class="font-serif text-xl font-bold mb-2" style="color:var(--navy-700)">${T.checkEmailTitle}</p><p class="text-sm" style="color:var(--text-secondary)">${T.checkEmailBody} <a href="${portalPrefix}login.html" class="underline font-semibold" style="color:var(--navy-700)">${T.logInHere}</a>.</p>`;
        wrap.appendChild(msg);
      }
    } catch (err) {
      showError(err.message || T.genericError);
      submitBtn.disabled = false;
      submitBtn.textContent = T.createAccount;
    }
  });
});
