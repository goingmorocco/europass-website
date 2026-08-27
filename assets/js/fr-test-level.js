// EuroPass — French "Test Your Level" self-check. Instructional text and
// results are in French; the actual language content being tested (German/
// French/English words and sentences) stays in that language, since that's
// literally what's being evaluated — same pattern as ar-test-level.js.

const QUESTION_BANKS = {
  de: {
    label: 'Allemand', flag: '\u{1F1E9}\u{1F1EA}', color: 'teal',
    programHref: 'program-german.html', programName: 'Programme Allemand',
    questions: [
      { q: 'Wie ___ du?', a: ['bist', 'bin', 'sein', 'ist'], correct: 0 },
      { q: '\u00abGuten Morgen\u00bb est utilis\u00e9 :', a: ['La nuit', 'Le matin', 'Pour dire au revoir', 'En mangeant'], correct: 1 },
      { q: 'Ich ___ Lehrer. (Je suis professeur.)', a: ['bin', 'bist', 'ist', 'sind'], correct: 0 },
      { q: 'Quel mot signifie \u00abh\u00f4pital\u00bb ?', a: ['Schule', 'Krankenhaus', 'Bahnhof', 'Bibliothek'], correct: 1 },
      { q: 'Gestern ___ ich im Park. (Hier, j\u2019\u00e9tais au parc.)', a: ['bin', 'war', 'werde', 'bist'], correct: 1 },
      { q: '\u00abIch h\u00e4tte gern einen Termin.\u00bb signifie probablement :', a: ['Je voudrais un rendez-vous', 'J\u2019ai d\u00e9j\u00e0 un rendez-vous', 'J\u2019annule', 'Je suis en retard'], correct: 0 },
    ],
  },
  fr: {
    label: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}', color: 'red',
    programHref: 'program-french.html', programName: 'Programme Fran\u00e7ais',
    questions: [
      { q: 'Comment ___-tu?', a: ["t'appelles", 'appeler', 'appelle', "s'appelle"], correct: 0 },
      { q: '\u00abBonsoir\u00bb est utilis\u00e9 :', a: ['Le matin', 'Le soir', 'Le midi', 'Le lundi uniquement'], correct: 1 },
      { q: 'Je ___ professeur. (Je suis professeur.)', a: ['suis', 'es', 'est', 'sommes'], correct: 0 },
      { q: 'Quel mot signifie \u00abh\u00f4pital\u00bb ?', a: ['\u00c9cole', 'H\u00f4pital', 'Gare', 'Biblioth\u00e8que'], correct: 1 },
      { q: 'Hier, je ___ au parc. (Hier, j\u2019\u00e9tais au parc.)', a: ['suis', '\u00e9tais', 'serai', 'es'], correct: 1 },
      { q: '\u00abJ\u2019aimerais prendre un rendez-vous.\u00bb signifie probablement :', a: ['Je voudrais un rendez-vous', 'J\u2019en ai d\u00e9j\u00e0 un', 'J\u2019annule', 'Je suis en retard'], correct: 0 },
    ],
  },
  en: {
    label: 'Anglais', flag: '\u{1F1EC}\u{1F1E7}', color: 'navy',
    programHref: 'courses.html', programName: 'Programmes d\u2019Anglais',
    questions: [
      { q: 'Choisissez la phrase correcte.', a: ["She don't like coffee.", "She doesn't likes coffee.", "She doesn't like coffee.", "She not like coffee."], correct: 2 },
      { q: 'I ___ to the gym three times a week.', a: ['go', 'goes', 'going', 'went'], correct: 0 },
      { q: 'By the time you arrive, we ___ dinner.', a: ['will finish', 'will have finished', 'finish', 'are finishing'], correct: 1 },
      { q: 'Quel mot signifie \u00abto postpone\u00bb (reporter) ?', a: ['Accelerate', 'Delay', 'Announce', 'Confirm'], correct: 1 },
      { q: '\u00abCould you elaborate on that point?\u00bb signifie probablement :', a: ['Arr\u00eatez de parler', 'Expliquez plus en d\u00e9tail', 'R\u00e9p\u00e9tez exactement', 'Traduisez'], correct: 1 },
      { q: 'Une invitation \u00e0 une r\u00e9union indique \u00abtentative\u00bb. Cela signifie que la r\u00e9union est :', a: ['Annul\u00e9e', 'Confirm\u00e9e', 'Pas encore certaine', 'Obligatoire'], correct: 2 },
    ],
  },
};

let currentLang = 'de';
let current = 0;
let answers = [];

function scoreToCEFR(score, total) {
  const pct = score / total;
  if (pct >= 0.85) return { level: 'B2', label: 'Interm\u00e9diaire Sup\u00e9rieur' };
  if (pct >= 0.6) return { level: 'B1', label: 'Interm\u00e9diaire' };
  if (pct >= 0.35) return { level: 'A2', label: '\u00c9l\u00e9mentaire' };
  return { level: 'A1', label: 'D\u00e9butant' };
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
  progressLabel.textContent = `Question ${current + 1} sur ${bank.questions.length}`;
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
  document.getElementById('quiz-next').textContent = current === bank.questions.length - 1 ? 'Voir Mon R\u00e9sultat' : 'Suivant';
}

function showResults() {
  const bank = QUESTION_BANKS[currentLang];
  const score = answers.reduce((sum, a, i) => sum + (a === bank.questions[i].correct ? 1 : 0), 0);
  const result = scoreToCEFR(score, bank.questions.length);
  showStep('results');
  document.getElementById('result-flag').textContent = bank.flag;
  document.getElementById('result-level').textContent = result.level;
  document.getElementById('result-label').textContent = `${result.label} \u2014 ${bank.label}`;
  document.getElementById('result-program-link').href = bank.programHref;
  document.getElementById('result-program-link').textContent = `D\u00e9couvrir le ${bank.programName}`;
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
