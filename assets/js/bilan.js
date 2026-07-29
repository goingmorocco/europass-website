// EuroPass — Free Bilan d'Anglais (placement test) prototype logic
const questions = [
  { q: "Choose the correct sentence.", a: ["She don't like coffee.", "She doesn't likes coffee.", "She doesn't like coffee.", "She not like coffee."], correct: 2, skill: 'grammar' },
  { q: "I ___ to the gym three times a week.", a: ["go", "goes", "going", "went"], correct: 0, skill: 'grammar' },
  { q: "By the time you arrive, we ___ dinner.", a: ["will finish", "will have finished", "finish", "are finishing"], correct: 1, skill: 'grammar' },
  { q: "Which word means 'to postpone'?", a: ["Accelerate", "Delay", "Announce", "Confirm"], correct: 1, skill: 'vocabulary' },
  { q: "Choose the closest synonym for 'crucial'.", a: ["Minor", "Optional", "Essential", "Unlikely"], correct: 2, skill: 'vocabulary' },
  { q: "\u201cCould you elaborate on that point?\u201d most likely means:", a: ["Please stop talking", "Please explain in more detail", "Please repeat exactly", "Please translate"], correct: 1, skill: 'reading' },
  { q: "A meeting invite says 'tentative.' This means the meeting is:", a: ["Cancelled", "Confirmed", "Not yet certain", "Mandatory"], correct: 2, skill: 'reading' },
  { q: "Listening clip: the speaker says the flight is \u201cdelayed indefinitely.\u201d What should the listener do?", a: ["Board immediately", "Expect an unknown wait time", "Rebook automatically", "Nothing, it's on time"], correct: 1, skill: 'listening' },
];

let current = 0;
const answers = new Array(questions.length).fill(null);

function renderQuestion() {
  const container = document.getElementById('quiz-question');
  const progress = document.getElementById('quiz-progress');
  const progressLabel = document.getElementById('quiz-progress-label');
  if (!container) return;
  const item = questions[current];
  progress.style.width = `${(current / questions.length) * 100}%`;
  progressLabel.textContent = `Question ${current + 1} of ${questions.length}`;
  container.innerHTML = `
    <p class="eyebrow mb-2">${item.skill}</p>
    <h2 class="font-display text-2xl font-semibold mb-6" style="color:var(--navy-700)">${item.q}</h2>
    <div class="space-y-3" role="radiogroup" aria-label="${item.q}">
      ${item.a.map((opt, i) => `
        <button type="button" data-index="${i}" class="quiz-option w-full text-left px-4 py-3 rounded-lg border transition"
          style="border-color:var(--border-default)" role="radio" aria-checked="false">
          ${opt}
        </button>`).join('')}
    </div>
  `;
  container.querySelectorAll('.quiz-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      answers[current] = idx;
      container.querySelectorAll('.quiz-option').forEach((b) => {
        b.style.borderColor = 'var(--border-default)';
        b.style.background = '';
        b.setAttribute('aria-checked', 'false');
      });
      btn.style.borderColor = 'var(--navy-700)';
      btn.style.background = 'var(--navy-50)';
      btn.setAttribute('aria-checked', 'true');
      document.getElementById('quiz-next').disabled = false;
    });
  });
  document.getElementById('quiz-next').disabled = answers[current] === null;
  document.getElementById('quiz-back').style.visibility = current === 0 ? 'hidden' : 'visible';
  document.getElementById('quiz-next').textContent = current === questions.length - 1 ? 'See My Results' : 'Next';
}

function scoreToCEFR(score, total) {
  const pct = score / total;
  if (pct >= 0.9) return { level: 'C1', label: 'Advanced', desc: 'You operate comfortably in complex professional and academic English.' };
  if (pct >= 0.7) return { level: 'B2', label: 'Upper-Intermediate', desc: 'You communicate well but refining fluency will unlock more nuance and confidence.' };
  if (pct >= 0.5) return { level: 'B1', label: 'Intermediate', desc: 'You have a solid foundation \u2014 the right structured practice will move you quickly.' };
  if (pct >= 0.3) return { level: 'A2', label: 'Elementary', desc: 'You know the basics \u2014 a guided path will build real confidence fast.' };
  return { level: 'A1', label: 'Beginner', desc: 'You\u2019re at the very start \u2014 which means the fastest, most visible gains are ahead of you.' };
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('quiz-question')) return;
  renderQuestion();

  document.getElementById('quiz-next').addEventListener('click', () => {
    if (current < questions.length - 1) {
      current++;
      renderQuestion();
    } else {
      document.getElementById('quiz-step').classList.add('hidden');
      document.getElementById('email-step').classList.remove('hidden');
    }
  });
  document.getElementById('quiz-back').addEventListener('click', () => {
    if (current > 0) { current--; renderQuestion(); }
  });

  const emailForm = document.getElementById('email-capture-form');
  if (emailForm) {
    emailForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const score = answers.reduce((sum, a, i) => sum + (a === questions[i].correct ? 1 : 0), 0);
      const result = scoreToCEFR(score, questions.length);
      document.getElementById('email-step').classList.add('hidden');
      const resultsStep = document.getElementById('results-step');
      resultsStep.classList.remove('hidden');
      document.getElementById('result-level').textContent = result.level;
      document.getElementById('result-label').textContent = result.label;
      document.getElementById('result-desc').textContent = result.desc;
      const bar = document.getElementById('quiz-progress');
      if (bar) bar.style.width = '100%';
    });
  }
});
