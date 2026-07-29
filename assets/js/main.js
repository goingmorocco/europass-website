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

  // Persona hero switcher
  const personaContent = {
    professional: {
      eyebrow: 'FOR PROFESSIONALS',
      headline: 'Don\u2019t let your English hold your career back.',
      sub: 'Business English coaching built around real interviews, real meetings, and real promotions \u2014 not generic grammar drills.',
      cta: 'Book Your Free Bilan',
    },
    parent: {
      eyebrow: 'FOR PARENTS',
      headline: 'Give your child a head start that lasts a lifetime.',
      sub: 'It\u2019s never too early \u2014 or too late \u2014 to open the door to a better future for your child.',
      cta: 'Book a Free Assessment for Your Child',
    },
    communicator: {
      eyebrow: 'FOR EVERYDAY SPEAKERS',
      headline: 'You understand English. Now let\u2019s get you speaking it.',
      sub: 'Join a Speaking Club built for people who know the words but freeze when it\u2019s time to talk.',
      cta: 'Join a Free Trial Session',
    },
    future: {
      eyebrow: 'FOR YOUR NEXT CHAPTER',
      headline: 'Your future abroad starts with your next English lesson.',
      sub: 'IELTS, TOEFL, and practical English for study, travel, and immigration \u2014 built around your target score and your timeline.',
      cta: 'Book Your Free Bilan',
    },
  };
  const tabs = document.querySelectorAll('.persona-tab');
  const heroEyebrow = document.getElementById('hero-eyebrow');
  const heroHeadline = document.getElementById('hero-headline');
  const heroSub = document.getElementById('hero-sub');
  const heroCta = document.getElementById('hero-cta');
  if (tabs.length && heroHeadline) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
        tab.setAttribute('aria-selected', 'true');
        const data = personaContent[tab.dataset.persona];
        if (!data) return;
        heroHeadline.style.opacity = 0;
        heroSub.style.opacity = 0;
        setTimeout(() => {
          heroEyebrow.textContent = data.eyebrow;
          heroHeadline.textContent = data.headline;
          heroSub.textContent = data.sub;
          heroCta.textContent = data.cta;
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
