// EuroPass — Arabic "Test Your Level" self-check. Instructional text and
// results are in Arabic; the actual language content being tested (German/
// French/English words and sentences) stays in that language, since that's
// literally what's being evaluated — a common, correct pattern for
// placement tests aimed at speakers of a different native language.

const QUESTION_BANKS = {
  de: {
    label: 'الألمانية', flag: '\u{1F1E9}\u{1F1EA}',
    programHref: 'program-german.html', programName: 'البرنامج الألماني',
    questions: [
      { q: 'Wie ___ du?', a: ['bist', 'bin', 'sein', 'ist'], correct: 0 },
      { q: '"Guten Morgen" \u062a\u064f\u0633\u062a\u064e\u062e\u062f\u064e\u0645:', a: ['\u0641\u064a \u0627\u0644\u0644\u064a\u0644', '\u0641\u064a \u0627\u0644\u0635\u0628\u0627\u062d', '\u0644\u0644\u0648\u062f\u0627\u0639', '\u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0623\u0643\u0644'], correct: 1 },
      { q: 'Ich ___ Lehrer. (\u0623\u0646\u0627 \u0645\u062f\u0631\u0651\u0633.)', a: ['bin', 'bist', 'ist', 'sind'], correct: 0 },
      { q: '\u0623\u064a \u0643\u0644\u0645\u0629 \u062a\u0639\u0646\u064a "\u0645\u0633\u062a\u0634\u0641\u0649"\u061f', a: ['Schule', 'Krankenhaus', 'Bahnhof', 'Bibliothek'], correct: 1 },
      { q: 'Gestern ___ ich im Park. (\u0643\u0646\u062a \u0641\u064a \u0627\u0644\u062d\u062f\u064a\u0642\u0629 \u0623\u0645\u0633.)', a: ['bin', 'war', 'werde', 'bist'], correct: 1 },
      { q: '"Ich h\u00e4tte gern einen Termin." \u062a\u0639\u0646\u064a \u0639\u0644\u0649 \u0627\u0644\u0623\u0631\u062c\u062d:', a: ['\u0623\u0631\u063a\u0628 \u0641\u064a \u062a\u062d\u062f\u064a\u062f \u0645\u0648\u0639\u062f', '\u0644\u062f\u064a \u0645\u0648\u0639\u062f \u0628\u0627\u0644\u0641\u0639\u0644', '\u0623\u0646\u0627 \u0623\u0644\u063a\u064a \u0627\u0644\u0645\u0648\u0639\u062f', '\u0623\u0646\u0627 \u0645\u062a\u0623\u062e\u0631'], correct: 0 },
    ],
  },
  fr: {
    label: '\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629', flag: '\u{1F1EB}\u{1F1F7}',
    programHref: 'program-french.html', programName: '\u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c \u0627\u0644\u0641\u0631\u0646\u0633\u064a',
    questions: [
      { q: 'Comment ___-tu?', a: ["t'appelles", 'appeler', 'appelle', "s'appelle"], correct: 0 },
      { q: '"Bonsoir" \u062a\u064f\u0633\u062a\u064e\u062e\u062f\u064e\u0645:', a: ['\u0641\u064a \u0627\u0644\u0635\u0628\u0627\u062d', '\u0641\u064a \u0627\u0644\u0645\u0633\u0627\u0621', '\u0639\u0646\u062f \u0627\u0644\u0638\u0647\u0631', '\u0623\u064a\u0627\u0645 \u0627\u0644\u0627\u062b\u0646\u064a\u0646 \u0641\u0642\u0637'], correct: 1 },
      { q: 'Je ___ professeur. (\u0623\u0646\u0627 \u0623\u0633\u062a\u0627\u0630.)', a: ['suis', 'es', 'est', 'sommes'], correct: 0 },
      { q: '\u0623\u064a \u0643\u0644\u0645\u0629 \u062a\u0639\u0646\u064a "\u0645\u0633\u062a\u0634\u0641\u0649"\u061f', a: ['\u00c9cole', 'H\u00f4pital', 'Gare', 'Biblioth\u00e8que'], correct: 1 },
      { q: 'Hier, je ___ au parc. (\u0643\u0646\u062a \u0641\u064a \u0627\u0644\u062d\u062f\u064a\u0642\u0629 \u0623\u0645\u0633.)', a: ['suis', '\u00e9tais', 'serai', 'es'], correct: 1 },
      { q: '"J\u2019aimerais prendre un rendez-vous." \u062a\u0639\u0646\u064a \u0639\u0644\u0649 \u0627\u0644\u0623\u0631\u062c\u062d:', a: ['\u0623\u0631\u063a\u0628 \u0641\u064a \u062a\u062d\u062f\u064a\u062f \u0645\u0648\u0639\u062f', '\u0644\u062f\u064a \u0645\u0648\u0639\u062f \u0628\u0627\u0644\u0641\u0639\u0644', '\u0623\u0646\u0627 \u0623\u0644\u063a\u064a \u0627\u0644\u0645\u0648\u0639\u062f', '\u0623\u0646\u0627 \u0645\u062a\u0623\u062e\u0631'], correct: 0 },
    ],
  },
  en: {
    label: '\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629', flag: '\u{1F1EC}\u{1F1E7}',
    programHref: 'courses.html', programName: '\u0628\u0631\u0627\u0645\u062c \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629',
    questions: [
      { q: '\u0627\u062e\u062a\u0631 \u0627\u0644\u062c\u0645\u0644\u0629 \u0627\u0644\u0635\u062d\u064a\u062d\u0629.', a: ["She don't like coffee.", "She doesn't likes coffee.", "She doesn't like coffee.", "She not like coffee."], correct: 2 },
      { q: 'I ___ to the gym three times a week.', a: ['go', 'goes', 'going', 'went'], correct: 0 },
      { q: 'By the time you arrive, we ___ dinner.', a: ['will finish', 'will have finished', 'finish', 'are finishing'], correct: 1 },
      { q: '\u0623\u064a \u0643\u0644\u0645\u0629 \u062a\u0639\u0646\u064a "to postpone" (\u062a\u0623\u062c\u064a\u0644)\u061f', a: ['Accelerate', 'Delay', 'Announce', 'Confirm'], correct: 1 },
      { q: '"Could you elaborate on that point?" \u062a\u0639\u0646\u064a \u0639\u0644\u0649 \u0627\u0644\u0623\u0631\u062c\u062d:', a: ['\u062a\u0648\u0642\u0641 \u0639\u0646 \u0627\u0644\u062d\u062f\u064a\u062b \u0645\u0646 \u0641\u0636\u0644\u0643', '\u0627\u0634\u0631\u062d \u0628\u0645\u0632\u064a\u062f \u0645\u0646 \u0627\u0644\u062a\u0641\u0635\u064a\u0644 \u0645\u0646 \u0641\u0636\u0644\u0643', '\u0643\u0631\u0631 \u0628\u0627\u0644\u0636\u0628\u0637 \u0645\u0646 \u0641\u0636\u0644\u0643', '\u062a\u0631\u062c\u0645 \u0645\u0646 \u0641\u0636\u0644\u0643'], correct: 1 },
      { q: '\u062f\u0639\u0648\u0629 \u0627\u062c\u062a\u0645\u0627\u0639 \u062a\u0642\u0648\u0644 \u0625\u0646 \u0627\u0644\u0645\u0648\u0639\u062f "tentative". \u0647\u0630\u0627 \u064a\u0639\u0646\u064a \u0623\u0646 \u0627\u0644\u0627\u062c\u062a\u0645\u0627\u0639:', a: ['\u0623\u064f\u0644\u063a\u064a', '\u0645\u0624\u0643\u062f', '\u063a\u064a\u0631 \u0645\u0624\u0643\u062f \u0628\u0639\u062f', '\u0625\u0644\u0632\u0627\u0645\u064a'], correct: 2 },
    ],
  },
};

let currentLang = 'de';
let current = 0;
let answers = [];

function scoreToCEFR(score, total) {
  const pct = score / total;
  if (pct >= 0.85) return { level: 'B2', label: '\u0641\u0648\u0642 \u0627\u0644\u0645\u062a\u0648\u0633\u0637' };
  if (pct >= 0.6) return { level: 'B1', label: '\u0645\u062a\u0648\u0633\u0637' };
  if (pct >= 0.35) return { level: 'A2', label: '\u0623\u0633\u0627\u0633\u064a' };
  return { level: 'A1', label: '\u0645\u0628\u062a\u062f\u0626' };
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
  progressLabel.textContent = `\u0627\u0644\u0633\u0624\u0627\u0644 ${current + 1} \u0645\u0646 ${bank.questions.length}`;
  container.innerHTML = `
    <h2 class="font-serif text-2xl font-semibold mb-6" style="color:var(--navy-700)">${item.q}</h2>
    <div class="space-y-3" role="radiogroup" aria-label="${item.q}">
      ${item.a.map((opt, i) => `
        <button type="button" data-index="${i}" class="quiz-option w-full text-right px-4 py-3 rounded-lg border transition"
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
  document.getElementById('quiz-next').textContent = current === bank.questions.length - 1 ? '\u0634\u0627\u0647\u062f \u0646\u062a\u064a\u062c\u062a\u064a' : '\u0627\u0644\u062a\u0627\u0644\u064a';
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
  document.getElementById('result-program-link').textContent = `\u0627\u0633\u062a\u0643\u0634\u0641 ${bank.programName}`;
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

  const params = new URLSearchParams(window.location.search);
  const requested = params.get('lang');
  startLanguage(QUESTION_BANKS[requested] ? requested : 'de');
});
