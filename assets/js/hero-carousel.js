// EuroPass — homepage hero carousel. Auto-advances, pauses on hover,
// respects prefers-reduced-motion (no auto-advance, instant swap).
document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('hero-carousel');
  if (!track) return;
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  const dots = Array.from(document.querySelectorAll('.carousel-dot'));
  if (!slides.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let timer = null;

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === index));
    dots.forEach((d, n) => d.classList.toggle('is-active', n === index));
  }

  function startAutoplay() {
    if (reduceMotion) return;
    stopAutoplay();
    timer = setInterval(() => show(index + 1), 6000);
  }
  function stopAutoplay() { if (timer) clearInterval(timer); }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { show(i); startAutoplay(); });
  });

  track.addEventListener('mouseenter', stopAutoplay);
  track.addEventListener('mouseleave', startAutoplay);

  show(0);
  startAutoplay();
});
