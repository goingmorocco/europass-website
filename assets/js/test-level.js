// EuroPass — multi-language "Test Your Level" self-check.
// Small, honest question banks per language (not exhaustive placement
// tests) that map a score to an estimated CEFR level and a program link.

const QUESTION_BANKS = {
  de: {
    label: 'German', flag: '\u{1F1E9}\u{1F1EA}', color: 'teal',
    programHref: 'program-german.html', programName: 'German Program',
    questions: [
      { q: 'Wie ___ du?', a: ['bist', 'bin', 'sein', 'ist'], correct: 0 },
      { q: '\u201cGuten Morgen\u201d is used:', a: ['At night', 'In the morning', 'To say goodbye', 'When eating'], correct: 1 },
      { q: 'Ich ___ Lehrer. (I am a teacher.)', a: ['bin', 'bist', 'ist', 'sind'], correct: 0 },
      { q: 'Which word means \u201chospital\u201d?', a: ['Schule', 'Krankenhaus', 'Bahnhof', 'Bibliothek'], correct: 1 },
      { q: 'Gestern ___ ich im Park. (Yesterday I was in the park.)', a: ['bin', 'war', 'werde', 'bist'], correct: 1 },
      { q: '\u201cIch h\u00e4tte gern einen Termin.\u201d most likely means:', a: ['I would like an appointment', 'I already have an appointment', 'I am cancelling', 'I am late'], correct: 0 },
    ],
  },
  fr: {
    label: 'French', flag: '\u{1F1EB}\u{1F1F7}', color: 'red',
    programHref: 'program-french.html', programName: 'French Program',
    questions: [
      { q: 'Comment ___-tu?', a: ["t'appelles", 'appeler', 'appelle', 's\'appelle'], correct: 0 },
      { q: '\u201cBonsoir\u201d is used:', a: ['In the morning', 'In the evening', 'At noon', 'On Mondays only'], correct: 1 },
      { q: 'Je ___ professeur. (I am a teacher.)', a: ['suis', 'es', 'est', 'sommes'], correct: 0 },
      { q: 'Which word means \u201chospital\u201d?', a: ['\u00c9cole', 'H\u00f4pital', 'Gare', 'Biblioth\u00e8que'], correct: 1 },
      { q: 'Hier, je ___ au parc. (Yesterday I was at the park.)', a: ['suis', '\u00e9tais', 'serai', 'es'], correct: 1 },
      { q: '\u201cJ\u2019aimerais prendre un rendez-vous.\u201d most likely means:', a: ['I would like an appointment', 'I already have one', 'I am cancelling', 'I am running late'], correct: 0 },
    ],
  },
  en: {
    label: 'English', flag: '\u{1F1EC}\u{1F1E7}', color: 'navy',
    programHref: 'courses.html', programName: 'English Programs',
    questions: [
      { q: 'Choose the correct sentence.', a: ["She don't like coffee.", "She doesn't likes coffee.", "She doesn't like coffee.", "She not like coffee."], correct: 2 },
      { q: 'I ___ to the gym three times a week.', a: ['go', 'goes', 'going', 'went'], correct: 0 },
      { q: 'By the time you arrive, we ___ dinner.', a: ['will finish', 'will have finished', 'finish', 'are finishing'], correct: 1 },
      { q: 'Which word means \u2018to postpone\u2019?', a: ['Accelerate', 'Delay', 'Announce', 'Confirm'], correct: 1 },
      { q: '\u201cCould you elaborate on that point?\u201d most likely means:', a: ['Please stop talking', 'Please explain in more detail', 'Please repeat exactly', 'Please translate'], correct: 1 },
      { q: 'A meeting invite says \u2018tentative.\u2019 This means the meeting is:', a: ['Cancelled', 'Confirmed', 'Not yet certain', 'Mandatory'], correct: 2 },
    ],
  },
};

let currentLang = 'de';
let current = 0;
let answers = [];

function scoreToCEFR(score, total) {
  const pct = score / total;
  if (pct >= 0.85) return { level: 'B2', label: 'Upper-Intermediate' };
  if (pct >= 0.6) return { level: 'B1', label: 'Intermediate' };
  if (pct >= 0.35) return { level: 'A2', label: 'Elementary' };
  return { level: 'A1', label: 'Beginner' };
}

function startLanguage(lang) {
  currentLang = lang;
  current = 0;
  answers = new Array(QUESTION_BANKS[lang].questions.length).fill(null);
  document.querySelectorAll('.flag-tab[data-lang]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.lang === lang)));
  document.getElementById('test-intro-lang').textContent = QUESTION_BANKS[lang].label;
  document.getElementById('test-intro-flag').textContent = QUESTION_BANKS[lang].flag;
  showStep('intro');
}

function showStep(step) {
  ['intro', 'quiz', 'results'].forEach((s) => {
    const el = document.getElementById('step-' + s);
    if (el) el.classList.toggle('hidden', s !== step);
  });
}

function renderQuestion() {
  const bank = QUESTION_BANKS[currentLang];
  const item = bank.questions[current];
  const container = document.getElementById('quiz-question');
  const progress = document.getElementById('quiz-progress');
  const progressLabel = document.getElementById('quiz-progress-label');
  progress.style.width = `${(current / bank.questions.length) * 100}%`;
  progress.style.background = 'var(--teal-600)';
  progressLabel.textContent = `Question ${current + 1} of ${bank.questions.length}`;
  container.innerHTML = `
    <h2 class="font-serif text-2xl font-semibold mb-6" style="color:var(--navy-700)">${item.q}</h2>
    <div class="space-y-3" role="radiogroup" aria-label="${item.q}">
      ${item.a.map((opt, i) => `
        <button type="button" data-index="${i}" class="quiz-option w-full text-left px-4 py-3 rounded-lg border transition"
          style="border-color:var(--border-default)" role="radio" aria-checked="false">${opt}</button>`).join('')}
    </div>`;
  container.querySelectorAll('.quiz-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      answers[current] = parseInt(btn.dataset.index, 10);
      container.querySelectorAll('.quiz-option').forEach((b) => {
        b.style.borderColor = 'var(--border-default)'; b.style.background = ''; b.setAttribute('aria-checked', 'false');
      });
      btn.style.borderColor = 'var(--teal-600)'; btn.style.background = 'var(--teal-50)'; btn.setAttribute('aria-checked', 'true');
      document.getElementById('quiz-next').disabled = false;
    });
  });
  document.getElementById('quiz-next').disabled = answers[current] === null;
  document.getElementById('quiz-back').style.visibility = current === 0 ? 'hidden' : 'visible';
  document.getElementById('quiz-next').textContent = current === bank.questions.length - 1 ? 'See My Result' : 'Next';
}

function showResults() {
  const bank = QUESTION_BANKS[currentLang];
  const score = answers.reduce((sum, a, i) => sum + (a === bank.questions[i].correct ? 1 : 0), 0);
  const result = scoreToCEFR(score, bank.questions.length);
  showStep('results');
  document.getElementById('result-flag').textContent = bank.flag;
  document.getElementById('result-level').textContent = result.level;
  document.getElementById('result-label').textContent = `${result.label} ${bank.label}`;
  document.getElementById('result-program-link').href = bank.programHref;
  document.getElementById('result-program-link').textContent = `Explore the ${bank.programName}`;
  document.getElementById('quiz-progress').style.width = '100%';
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('step-intro')) return;

  document.querySelectorAll('.flag-tab[data-lang]').forEach((tab) => {
    tab.addEventListener('click', () => startLanguage(tab.dataset.lang));
  });

  document.getElementById('start-quiz-btn').addEventListener('click', () => { current = 0; showStep('quiz'); renderQuestion(); });
  document.getElementById('quiz-next').addEventListener('click', () => {
    const bank = QUESTION_BANKS[currentLang];
    if (current < bank.questions.length - 1) { current++; renderQuestion(); } else { showResults(); }
  });
  document.getElementById('quiz-back').addEventListener('click', () => { if (current > 0) { current--; renderQuestion(); } });
  document.getElementById('retake-btn').addEventListener('click', () => startLanguage(currentLang));

  // Pre-select a language from ?lang=de|fr|en if provided (e.g. homepage CTA links)
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('lang');
  startLanguage(QUESTION_BANKS[requested] ? requested : 'de');
});
