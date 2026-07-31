// EuroPass — shared front-end behavior (no backend; UI prototype only)
document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav drawer
  const navToggle = document.getElementById('nav-toggle');
  const navDrawer = document.getElementById('nav-drawer');
  const navClose = document.getElementById('nav-close');
  if (navToggle && navDrawer) {
    navToggle.addEventListener('click', () => {
      navDrawer.classList.remove('translate-x-full');
      navDrawer.setAttribute('aria-hidden', 'false');
      navToggle.setAttribute('aria-expanded', 'true');
    });
  }
  if (navClose && navDrawer) {
    navClose.addEventListener('click', () => {
      navDrawer.classList.add('translate-x-full');
      navDrawer.setAttribute('aria-hidden', 'true');
      navToggle && navToggle.setAttribute('aria-expanded', 'false');
    });
  }

  // Accordion (FAQ, curriculum)
  document.querySelectorAll('[data-accordion-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      if (panel) panel.classList.toggle('open', !expanded);
    });
  });

  // Program hero switcher
  const programContent = {
    german: {
      eyebrow: 'GERMAN PROGRAM',
      headline: 'Learn German. Train as a Nurse. Build Your Life in Germany.',
      sub: 'From your first German word to a signed Ausbildung contract — language training and job placement, built as one path.',
      cta: 'Explore German Program', href: 'program-german.html',
    },
    french: {
      eyebrow: 'FRENCH PROGRAM',
      headline: 'French that actually gets you speaking.',
      sub: 'DELF-aligned training for study, work, and everyday life — from your first bonjour to real fluency.',
      cta: 'Explore French Program', href: 'program-french.html',
    },
    english: {
      eyebrow: 'ENGLISH PROGRAM',
      headline: 'Four English paths. One goal: real results.',
      sub: 'Business English, Kids English, Communication English, or IELTS/TOEFL — pick the path that matches your goal.',
      cta: 'Explore English Programs', href: 'courses.html',
    },
    nursing: {
      eyebrow: 'NURSING & AUSBILDUNG',
      headline: 'German for healthcare. A real job at the end of it.',
      sub: 'Language training plus placement support — this track ends with a signed Ausbildung contract with a German employer.',
      cta: 'Explore Nursing & Ausbildung', href: 'program-nursing-ausbildung.html',
    },
  };
  const tabs = document.querySelectorAll('.flag-tab[data-program]');
  const heroEyebrow = document.getElementById('hero-eyebrow');
  const heroHeadline = document.getElementById('hero-headline');
  const heroSub = document.getElementById('hero-sub');
  const heroCta = document.getElementById('hero-cta');
  if (tabs.length && heroHeadline) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
        tab.setAttribute('aria-selected', 'true');
        const data = programContent[tab.dataset.program];
        if (!data) return;
        heroHeadline.style.opacity = 0;
        heroSub.style.opacity = 0;
        setTimeout(() => {
          heroEyebrow.textContent = data.eyebrow;
          heroHeadline.textContent = data.headline;
          heroSub.textContent = data.sub;
          heroCta.textContent = data.cta;
          heroCta.href = data.href;
          heroHeadline.style.opacity = 1;
          heroSub.style.opacity = 1;
        }, 120);
      });
    });
  }

  // Course filter chips (Courses hub)
  const filterChips = document.querySelectorAll('[data-filter]');
  const courseCards = document.querySelectorAll('[data-course-category]');
  if (filterChips.length && courseCards.length) {
    filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        filterChips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
        const filter = chip.dataset.filter;
        courseCards.forEach((card) => {
          const show = filter === 'all' || card.dataset.courseCategory === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }

  // Toast helper
  window.showToast = function (message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const colors = {
      success: ['var(--success-50)', 'var(--success-600)'],
      danger: ['var(--danger-50)', 'var(--danger-600)'],
      info: ['var(--info-50)', 'var(--info-600)'],
    };
    const [bg, fg] = colors[type] || colors.success;
    const toast = document.createElement('div');
    toast.className = 'toast px-4 py-3 mb-2 text-sm font-medium';
    toast.style.background = bg;
    toast.style.color = fg;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.transition = 'opacity .3s'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
  };

  // Generic form intercept (prototype — no backend wired up)
  document.querySelectorAll('form[data-demo-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const requiredInvalid = form.querySelector(':invalid');
      if (requiredInvalid) {
        requiredInvalid.focus();
        window.showToast('Please fill in all required fields.', 'danger');
        return;
      }
      window.showToast(form.dataset.demoForm || 'Submitted — thank you!', 'success');
      form.reset();
    });
  });
});
