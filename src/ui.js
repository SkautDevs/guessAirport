import { renderAirports, highlightAirport, labelAirport } from './render.js';
import { findClickedAirport } from './hit.js';
import { screenToSVG } from './projection.js';
import { COLORS } from './types.js';
import { saveSettings, loadSettings, clearWeights } from './storage.js';

const FEEDBACK_DELAY_MS = 3000;

export const DOM = {};

export function cacheDOM() {
  ['map', 'border-layer', 'airport-layer', 'feedback-layer',
   'question-bar', 'round-counter', 'question-text',
   'sidebar', 'sidebar-toggle', 'score-list', 'score-total',
   'start-screen', 'summary-screen', 'final-score', 'summary-list',
   'practice-missed', 'play-again', 'start-btn', 'reset-progress',
   'easter-egg', 'browse-mode', 'hard-mode', 'infinity-mode'
  ].forEach(id => { DOM[id] = document.getElementById(id); });
}

export function renderScoreSheet(game) {
  const list = DOM['score-list'];
  list.innerHTML = '';
  game.roundAirports.forEach((airport, i) => {
    const li = document.createElement('li');
    if (i < game.results.length) {
      li.className = game.results[i].correct ? 'correct' : 'wrong';
      li.textContent = `${i + 1}. ${airport.icao} — ${airport.name} ${game.results[i].correct ? '✓' : '✗'}`;
    } else if (i === game.currentRound) {
      li.className = 'pending';
      li.textContent = `${i + 1}. ${airport.icao} — ${airport.name} ...`;
    } else {
      li.className = 'pending';
      li.textContent = `${i + 1}. ???`;
    }
    list.appendChild(li);
  });
  DOM['score-total'].textContent = `Skóre: ${game.correctCount}/${game.results.length}`;
}

export function showCurrentQuestion(game) {
  const airport = game.currentTarget;
  DOM['round-counter'].textContent = `Kolo ${game.currentRound + 1}/${game.roundAirports.length}`;
  DOM['question-text'].innerHTML = game.hardMode
    ? `Najdi: <span class="icao">${airport.icao}</span>`
    : `Najdi: <span class="icao">${airport.icao}</span> — ${airport.name}`;
}

const HOME_ICAO = 'LKMB';

export function showEasterEgg(airport) {
  const egg = DOM['easter-egg'];
  egg.innerHTML = `
    <img src="data/LeteckySkauting_Logo.jpg" alt="Letecký Skauting">
    <h2>🏠 Domovské letiště!</h2>
    <p>${airport.icao} — ${airport.name}</p>
    <p class="subtitle">Základna Leteckého Skautingu</p>
  `;
  egg.classList.remove('hidden');
  setTimeout(() => egg.classList.add('hidden'), 4000);
}

export function showFeedback(game, targetAirport, correct, clickedAirport, onDone) {
  const feedbackLayer = DOM['feedback-layer'];
  feedbackLayer.innerHTML = '';
  if (correct) {
    if (targetAirport.icao === HOME_ICAO) showEasterEgg(targetAirport);
    highlightAirport(feedbackLayer, targetAirport, COLORS.correct, 3);
  } else {
    if (clickedAirport) {
      highlightAirport(feedbackLayer, clickedAirport, COLORS.wrong, 2);
      labelAirport(feedbackLayer, clickedAirport, COLORS.wrong);
    }
    highlightAirport(feedbackLayer, targetAirport, COLORS.correct, 3);
    labelAirport(feedbackLayer, targetAirport, COLORS.correct);
  }
  const delay = correct ? FEEDBACK_DELAY_MS / 2 : FEEDBACK_DELAY_MS;
  setTimeout(() => {
    feedbackLayer.innerHTML = '';
    onDone();
  }, delay);
}

export function showSummary(game) {
  DOM['question-bar'].classList.add('hidden');
  DOM['final-score'].textContent = `${game.correctCount} / ${game.roundAirports.length}`;
  const list = DOM['summary-list'];
  list.innerHTML = '';
  game.results.forEach((r, i) => {
    const li = document.createElement('li');
    li.className = r.correct ? 'correct' : 'wrong';
    li.textContent = `${i + 1}. ${r.airport.icao} — ${r.airport.name} ${r.correct ? '✓' : '✗'}`;
    list.appendChild(li);
  });
  const missed = game.results.filter(r => !r.correct).map(r => r.airport);
  const practiceBtn = DOM['practice-missed'];
  if (missed.length > 0) {
    practiceBtn.classList.remove('hidden');
    practiceBtn.textContent = `Procvičit ${missed.length} chybných`;
  } else {
    practiceBtn.classList.add('hidden');
  }
  DOM['summary-screen'].classList.remove('hidden');
}

export function wireListeners(game, airportData) {
  let mouseDownPos = null;

  DOM['map'].addEventListener('mousedown', (e) => {
    mouseDownPos = { x: e.clientX, y: e.clientY };
  });

  DOM['map'].addEventListener('click', (e) => {
    if (game.state !== 'playing') return;
    if (mouseDownPos) {
      const dx = e.clientX - mouseDownPos.x;
      const dy = e.clientY - mouseDownPos.y;
      if (dx * dx + dy * dy > 25) return;
    }
    const svgPt = screenToSVG(DOM['map'], e.clientX, e.clientY);
    const targetAirport = game.currentTarget;
    const clickedAirport = findClickedAirport(svgPt.x, svgPt.y, game.currentPool, targetAirport);
    if (!clickedAirport) return;
    const correct = game.recordGuess(targetAirport, clickedAirport);
    renderScoreSheet(game);
    showFeedback(game, targetAirport, correct, clickedAirport, () => {
      game.advance();
      if (game.state === 'summary') {
        showSummary(game);
      } else {
        showCurrentQuestion(game);
        renderScoreSheet(game);
      }
    });
  });

  DOM['start-btn'].addEventListener('click', () => {
    const checked = [...document.querySelectorAll('#custom-checks input:checked')].map(cb => cb.value);
    if (checked.length === 0) return;
    const opts = {
      browseMode: DOM['browse-mode'].checked,
      hardMode: DOM['hard-mode'].checked,
      infinityMode: DOM['infinity-mode'].checked,
    };
    saveSettings({ categories: checked, browse: opts.browseMode, hard: opts.hardMode, infinity: opts.infinityMode });
    const pool = airportData.filter(a => checked.includes(a.type));
    game.start(pool, opts);
    renderAirports(DOM['airport-layer'], pool, opts.browseMode);
    DOM['start-screen'].classList.add('hidden');
    DOM['summary-screen'].classList.add('hidden');
    DOM['question-bar'].classList.remove('hidden');
    DOM['sidebar'].classList.remove('hidden');
    renderScoreSheet(game);
    showCurrentQuestion(game);
  });

  DOM['play-again'].addEventListener('click', () => {
    DOM['summary-screen'].classList.add('hidden');
    DOM['start-screen'].classList.remove('hidden');
    DOM['sidebar'].classList.add('hidden');
  });

  DOM['reset-progress'].addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Smazat veškerý postup učení?')) {
      clearWeights();
      game.resetProgress();
    }
  });

  DOM['sidebar-toggle'].addEventListener('click', () => {
    DOM['sidebar'].classList.toggle('expanded');
    const toggle = DOM['sidebar-toggle'];
    toggle.classList.toggle('active');
    toggle.textContent = toggle.classList.contains('active') ? '◀ Skóre' : 'Skóre ▶';
  });

  DOM['practice-missed'].addEventListener('click', () => {
    DOM['summary-screen'].classList.add('hidden');
    DOM['question-bar'].classList.remove('hidden');
    game.startPracticeMissed();
    renderScoreSheet(game);
    showCurrentQuestion(game);
  });
}

export function restoreCheckboxState() {
  const saved = loadSettings();
  if (saved) {
    document.querySelectorAll('#custom-checks input[type="checkbox"]').forEach(cb => {
      cb.checked = saved.categories?.includes(cb.value) ?? false;
    });
    DOM['browse-mode'].checked = saved.browse ?? false;
    DOM['hard-mode'].checked = saved.hard ?? false;
    DOM['infinity-mode'].checked = saved.infinity ?? false;
  }
}

export function showCategoryCounts(airportData) {
  document.querySelectorAll('#custom-checks input[type="checkbox"]').forEach(cb => {
    const count = airportData.filter(a => a.type === cb.value).length;
    cb.parentElement.append(` (${count})`);
  });
}
