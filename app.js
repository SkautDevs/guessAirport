// ============================================================
// Guess the Airport — app.js
// ============================================================

// --- Constants ---

const COLORS = {
  airport: '#268bd2',
  prohibited: '#dc322f',
  restricted: '#859900',
  tra: '#b58900',
  vor: '#6c71c4',
  border: '#586e75',
  grid: '#d5cdb6',
  correct: '#2aa198',
  wrong: '#dc322f',
  labelBg: '#fdf6e3'
};

const STROKE = {
  border: 2.5,
  grid: 0.5,
  ctr: 1.5,
  runway: 2.5,
  runwayUL: 1.5,
  circle: 1.2,
  circleUL: 0.8
};

const CIRCLE_RADIUS_NM = {
  'small-north': 3, 'small-west': 3, 'small-south': 3, 'small-east': 3,
  ultralight: 2
};
const ROUNDS_PER_GAME = 10;
const FEEDBACK_DELAY_MS = 3000;

// --- Projection ---

const CZ_BOUNDS = {
  minLon: 12.09, maxLon: 18.86,
  minLat: 48.55, maxLat: 51.06
};

const SVG_WIDTH = 800;
const SVG_HEIGHT = 500;
const PADDING = 30;

const CENTER_LAT = (CZ_BOUNDS.minLat + CZ_BOUNDS.maxLat) / 2;
const COS_CENTER = Math.cos(CENTER_LAT * Math.PI / 180);
const LON_RANGE = (CZ_BOUNDS.maxLon - CZ_BOUNDS.minLon) * COS_CENTER;
const LAT_RANGE = CZ_BOUNDS.maxLat - CZ_BOUNDS.minLat;
const DRAW_WIDTH = SVG_WIDTH - 2 * PADDING;
const DRAW_HEIGHT = SVG_HEIGHT - 2 * PADDING;

function lonLatToXY(lon, lat) {
  return {
    x: PADDING + ((lon - CZ_BOUNDS.minLon) * COS_CENTER / LON_RANGE) * DRAW_WIDTH,
    y: PADDING + ((CZ_BOUNDS.maxLat - lat) / LAT_RANGE) * DRAW_HEIGHT
  };
}

async function loadJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function nmToPixels(nm) {
  const degLat = nm * (1.852 / 111.32);
  return (degLat / LAT_RANGE) * DRAW_HEIGHT;
}

// --- SVG Helpers ---

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// --- Airport Geometry Helpers ---

function airportRadius(airport) {
  const nm = CIRCLE_RADIUS_NM[airport.type] || 5;
  return nmToPixels(nm);
}

function ctrToScreenPoints(ctr) {
  return ctr.map(([lat, lon]) => lonLatToXY(lon, lat));
}

function ctrToSVGPoints(ctr) {
  return ctrToScreenPoints(ctr).map(({ x, y }) => `${x},${y}`).join(' ');
}

// --- Border Rendering ---

function renderBorder(borderCoords) {
  const layer = document.getElementById('border-layer');

  for (let lat = 49; lat <= 51; lat++) {
    const left = lonLatToXY(CZ_BOUNDS.minLon, lat);
    const right = lonLatToXY(CZ_BOUNDS.maxLon, lat);
    layer.appendChild(svgEl('line', {
      x1: left.x, y1: left.y, x2: right.x, y2: right.y,
      stroke: COLORS.grid, 'stroke-width': STROKE.grid, 'stroke-dasharray': '4,4'
    }));
  }
  for (let lon = 13; lon <= 18; lon++) {
    const top = lonLatToXY(lon, CZ_BOUNDS.maxLat);
    const bottom = lonLatToXY(lon, CZ_BOUNDS.minLat);
    layer.appendChild(svgEl('line', {
      x1: top.x, y1: top.y, x2: bottom.x, y2: bottom.y,
      stroke: COLORS.grid, 'stroke-width': STROKE.grid, 'stroke-dasharray': '4,4'
    }));
  }

  const points = borderCoords.map(([lon, lat]) => {
    const { x, y } = lonLatToXY(lon, lat);
    return `${x},${y}`;
  }).join(' ');

  layer.appendChild(svgEl('polygon', {
    points, fill: 'none', stroke: COLORS.border, 'stroke-width': STROKE.border
  }));
}

// --- Airport Rendering ---

function renderRunways(g, airport) {
  const center = lonLatToXY(airport.lon, airport.lat);
  const isUL = airport.type === 'ultralight';
  const scale = isUL ? 0.5 : 1;
  const width = isUL ? STROKE.runwayUL : STROKE.runway;

  airport.runways.forEach(rwy => {
    let x1, y1, x2, y2;

    if (rwy.lat1 !== undefined) {
      // Real endpoint coords — scale proportionally to runway length
      const p1 = lonLatToXY(rwy.lon1, rwy.lat1);
      const p2 = lonLatToXY(rwy.lon2, rwy.lat2);
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const targetLen = Math.max(12, Math.min(30, rwy.length / 120)) * scale;
      const s = targetLen / len;
      x1 = mx - dx * s / 2; y1 = my - dy * s / 2;
      x2 = mx + dx * s / 2; y2 = my + dy * s / 2;
    } else {
      const angleRad = (rwy.heading - 90) * Math.PI / 180;
      const len = Math.max(12, Math.min(30, rwy.length / 120)) * scale;
      x1 = center.x - Math.cos(angleRad) * len;
      y1 = center.y - Math.sin(angleRad) * len;
      x2 = center.x + Math.cos(angleRad) * len;
      y2 = center.y + Math.sin(angleRad) * len;
    }

    g.appendChild(svgEl('line', {
      x1, y1, x2, y2, stroke: COLORS.airport, 'stroke-width': width
    }));
  });
}

function renderCTR(g, airport) {
  const isSpecial = airport.type === 'prohibited' || airport.type === 'restricted' || airport.type === 'tra';
  const color = airport.type === 'prohibited' ? COLORS.prohibited
    : airport.type === 'restricted' ? COLORS.restricted
    : airport.type === 'tra' ? COLORS.tra
    : COLORS.airport;
  const fillOpacity = isSpecial ? '0.08' : '0.06';

  g.appendChild(svgEl('polygon', {
    points: ctrToSVGPoints(airport.ctr),
    fill: color, 'fill-opacity': fillOpacity,
    stroke: color,
    'stroke-width': STROKE.ctr,
    'stroke-dasharray': '6,3'
  }));
}

function renderCircle(g, airport) {
  const center = lonLatToXY(airport.lon, airport.lat);
  const width = airport.type === 'ultralight' ? STROKE.circleUL : STROKE.circle;


  g.appendChild(svgEl('circle', {
    cx: center.x, cy: center.y, r: airportRadius(airport),
    fill: 'none', stroke: COLORS.airport, 'stroke-width': width
  }));
}

function renderVOR(g, airport) {
  const center = lonLatToXY(airport.lon, airport.lat);
  // ICAO standard VOR symbol: hexagon with tick marks at each vertex
  const r = 10;
  const tickLen = 4;
  // Outer hexagon
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 - 90) * Math.PI / 180;
    pts.push(`${center.x + r * Math.cos(a)},${center.y + r * Math.sin(a)}`);
  }
  g.appendChild(svgEl('polygon', {
    points: pts.join(' '),
    fill: 'none', stroke: COLORS.vor, 'stroke-width': '1.5'
  }));
  // Tick marks extending outward from each vertex
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 - 90) * Math.PI / 180;
    const x1 = center.x + r * Math.cos(a);
    const y1 = center.y + r * Math.sin(a);
    const x2 = center.x + (r + tickLen) * Math.cos(a);
    const y2 = center.y + (r + tickLen) * Math.sin(a);
    g.appendChild(svgEl('line', {
      x1, y1, x2, y2, stroke: COLORS.vor, 'stroke-width': '1.5'
    }));
  }
  // Center dot
  g.appendChild(svgEl('circle', {
    cx: center.x, cy: center.y, r: 2, fill: COLORS.vor
  }));
}

function renderAirports(airports) {
  const layer = document.getElementById('airport-layer');
  layer.innerHTML = '';

  airports.forEach(airport => {
    const g = svgEl('g', { 'data-icao': airport.icao, class: 'airport-symbol' });

    if (airport.type === 'vor') {
      renderVOR(g, airport);
    } else if (airport.ctr) {
      renderCTR(g, airport);
    } else {
      renderCircle(g, airport);
    }

    if (airport.runways.length > 0) renderRunways(g, airport);
    if (browseMode) {
      const center = lonLatToXY(airport.lon, airport.lat);
      const text = svgEl('text', {
        x: center.x, y: center.y + 25,
        'text-anchor': 'middle', 'font-size': '8',
        'font-family': 'monospace', fill: '#657b83'
      });
      text.textContent = airport.icao;
      g.appendChild(text);
    }
    layer.appendChild(g);
  });
}

// --- Hit Detection ---

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const MIN_CLICK_RADIUS = 15;

function isClickOnAirport(clickX, clickY, airport) {
  // Always check minimum click radius around center for small shapes
  const center = lonLatToXY(airport.lon, airport.lat);
  const dx = clickX - center.x;
  const dy = clickY - center.y;
  const distSq = dx * dx + dy * dy;

  if (airport.ctr) {
    return pointInPolygon(clickX, clickY, ctrToScreenPoints(airport.ctr))
      || distSq <= MIN_CLICK_RADIUS * MIN_CLICK_RADIUS;
  }
  const r = airport.type === 'vor' ? 14 : airportRadius(airport);
  const clickR = Math.max(r, MIN_CLICK_RADIUS);
  return distSq <= clickR * clickR;
}

function findClickedAirport(clickX, clickY, airports, targetType) {
  const matches = airports.filter(a => isClickOnAirport(clickX, clickY, a));
  if (matches.length <= 1) return matches[0] || null;
  // Prefer same type as target (be generous when overlapping)
  const sameType = matches.filter(a => a.type === targetType);
  if (sameType.length === 1) return sameType[0];
  // Otherwise prefer non-CTR over CTR, then smallest CTR
  const pool = sameType.length > 0 ? sameType : matches;
  return pool.sort((a, b) => {
    if (a.ctr && !b.ctr) return 1;
    if (!a.ctr && b.ctr) return -1;
    if (a.ctr && b.ctr) return a.ctr.length - b.ctr.length;
    return 0;
  })[0];
}

// --- Game State ---

let gameState = 'start';
let currentRound = 0;
let currentPool = [];
let roundAirports = [];
let browseMode = false;
let hintMode = false;
let results = [];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Adaptive Weights ---

let weights = {};   // icao -> weight (only stores != 1)
let seen = new Set(); // icaos the player has encountered

function loadWeights() {
  weights = JSON.parse(localStorage.getItem('guessAirport_weights') || '{}');
  seen = new Set(JSON.parse(localStorage.getItem('guessAirport_seen') || '[]'));
}

function saveWeights() {
  localStorage.setItem('guessAirport_weights', JSON.stringify(weights));
  localStorage.setItem('guessAirport_seen', JSON.stringify([...seen]));
}

function getWeight(icao) {
  if (weights[icao]) return weights[icao];
  return seen.has(icao) ? 1 : 2; // unseen = 2, seen+correct = 1
}

function updateWeight(icao, correct) {
  seen.add(icao);
  const current = weights[icao] || 1;
  if (correct) {
    const newW = Math.max(1, Math.round(current / 2));
    if (newW === 1) delete weights[icao];
    else weights[icao] = newW;
  } else {
    weights[icao] = current * 2;
  }
  saveWeights();
}

function weightedPick(pool, count) {
  // Build weighted array, pick without replacement
  const items = pool.map(a => ({ airport: a, weight: getWeight(a.icao) }));
  const picked = [];
  for (let n = 0; n < count && items.length > 0; n++) {
    const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
    let r = Math.random() * totalWeight;
    let idx = 0;
    for (let i = 0; i < items.length; i++) {
      r -= items[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    picked.push(items[idx].airport);
    items.splice(idx, 1);
  }
  return picked;
}

function startGame() {
  const checked = [...document.querySelectorAll('#custom-checks input:checked')].map(cb => cb.value);
  if (checked.length === 0) return;
  browseMode = document.getElementById('browse-mode').checked;
  hintMode = document.getElementById('learning-mode').checked;
  const infinityMode = document.getElementById('infinity-mode').checked;

  localStorage.setItem('guessAirport_settings', JSON.stringify({
    categories: checked, browse: browseMode, hint: hintMode, infinity: infinityMode
  }));

  currentPool = airportData.filter(a => checked.includes(a.type));
  const roundCount = infinityMode ? currentPool.length : Math.min(ROUNDS_PER_GAME, currentPool.length);
  roundAirports = infinityMode ? shuffleArray(currentPool) : weightedPick(currentPool, roundCount);
  currentRound = 0;
  results = [];
  gameState = 'playing';

  renderAirports(currentPool);

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('summary-screen').classList.add('hidden');
  document.getElementById('question-bar').classList.remove('hidden');
  document.getElementById('sidebar').classList.remove('hidden');

  renderScoreSheet();
  showCurrentQuestion();
}

const HINT_DURATION_MS = 2500;

function showCurrentQuestion() {
  const airport = roundAirports[currentRound];
  document.getElementById('round-counter').textContent = `Round ${currentRound + 1}/${roundAirports.length}`;

  if (hintMode) {
    gameState = 'hint';
    document.getElementById('question-text').innerHTML =
      `Remember: <span class="icao">${airport.icao}</span> — ${airport.name}`;
    const feedbackLayer = document.getElementById('feedback-layer');
    feedbackLayer.innerHTML = '';
    highlightAirport(feedbackLayer, airport, COLORS.correct, 3);
    labelAirport(feedbackLayer, airport, COLORS.correct);
    setTimeout(() => {
      feedbackLayer.innerHTML = '';
      gameState = 'playing';
      document.getElementById('question-text').innerHTML =
        `Find: <span class="icao">${airport.icao}</span> — ${airport.name}`;
    }, HINT_DURATION_MS);
  } else {
    document.getElementById('question-text').innerHTML =
      `Find: <span class="icao">${airport.icao}</span> — ${airport.name}`;
  }
}

// --- Score Sheet ---

function renderScoreSheet() {
  const list = document.getElementById('score-list');
  list.innerHTML = '';

  roundAirports.forEach((airport, i) => {
    const li = document.createElement('li');
    if (i < results.length) {
      li.className = results[i].correct ? 'correct' : 'wrong';
      li.textContent = `${i + 1}. ${airport.icao} — ${airport.name} ${results[i].correct ? '✓' : '✗'}`;
    } else if (i === currentRound) {
      li.className = 'pending';
      li.textContent = `${i + 1}. ${airport.icao} — ${airport.name} ...`;
    } else {
      li.className = 'pending';
      li.textContent = `${i + 1}. ???`;
    }
    list.appendChild(li);
  });

  const correctCount = results.filter(r => r.correct).length;
  document.getElementById('score-total').textContent = `Score: ${correctCount}/${results.length}`;
}

// --- Feedback ---

function highlightAirport(layer, airport, color, width) {
  const fill = `${color}33`;
  const center = lonLatToXY(airport.lon, airport.lat);

  if (airport.ctr) {
    layer.appendChild(svgEl('polygon', {
      points: ctrToSVGPoints(airport.ctr), fill, stroke: color, 'stroke-width': width
    }));
  } else {
    const r = airport.type === 'vor' ? 14 : airportRadius(airport);
    layer.appendChild(svgEl('circle', {
      cx: center.x, cy: center.y, r, fill, stroke: color, 'stroke-width': width
    }));
  }
}

function labelAirport(layer, airport, color) {
  const center = lonLatToXY(airport.lon, airport.lat);
  const text = svgEl('text', {
    x: center.x, y: center.y + 25,
    'text-anchor': 'middle',
    'font-size': '11',
    'font-family': 'monospace',
    'font-weight': 'bold',
    fill: color
  });
  text.textContent = `${airport.icao} — ${airport.name}`;
  layer.appendChild(text);
  const bbox = text.getBBox();
  const bg = svgEl('rect', {
    x: bbox.x - 3, y: bbox.y - 1,
    width: bbox.width + 6, height: bbox.height + 2,
    rx: 3,
    fill: COLORS.labelBg, 'fill-opacity': '0.9'
  });
  layer.insertBefore(bg, text);
}

function showFeedback(targetAirport, correct, clickedAirport) {
  gameState = 'feedback';
  const feedbackLayer = document.getElementById('feedback-layer');
  feedbackLayer.innerHTML = '';

  if (correct) {
    if (targetAirport.icao === 'LKMB') showEasterEgg();
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
    advanceRound();
  }, delay);
}

// --- Click Handler ---

function handleMapClick(e) {
  if (gameState !== 'playing') return;

  const svg = document.getElementById('map');
  const pt = new DOMPoint(e.clientX, e.clientY);
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

  const targetAirport = roundAirports[currentRound];
  const clickedAirport = findClickedAirport(svgPt.x, svgPt.y, currentPool, targetAirport.type);

  if (!clickedAirport) return; // ignore clicks outside any shape

  const correct = clickedAirport.icao === targetAirport.icao;
  results.push({ airport: targetAirport, correct });
  updateWeight(targetAirport.icao, correct);

  renderScoreSheet();
  showFeedback(targetAirport, correct, clickedAirport);
}

function advanceRound() {
  currentRound++;
  if (currentRound >= roundAirports.length) {
    showSummary();
  } else {
    gameState = 'playing';
    showCurrentQuestion();
    renderScoreSheet();
  }
}

// --- Summary ---

function showSummary() {
  gameState = 'summary';
  document.getElementById('question-bar').classList.add('hidden');

  const correctCount = results.filter(r => r.correct).length;
  document.getElementById('final-score').textContent = `${correctCount} / ${roundAirports.length}`;

  const list = document.getElementById('summary-list');
  list.innerHTML = '';
  results.forEach((r, i) => {
    const li = document.createElement('li');
    li.className = r.correct ? 'correct' : 'wrong';
    li.textContent = `${i + 1}. ${r.airport.icao} — ${r.airport.name} ${r.correct ? '✓' : '✗'}`;
    list.appendChild(li);
  });

  document.getElementById('summary-screen').classList.remove('hidden');
}

// --- Easter Egg ---

function showEasterEgg() {
  const egg = document.getElementById('easter-egg');
  egg.innerHTML = `
    <img src="data/LeteckySkauting_Logo.jpg" alt="Letecký Skauting">
    <h2>🏠 Domovské letiště!</h2>
    <p>LKMB — Mladá Boleslav</p>
    <p class="subtitle">Základna Leteckého Skautingu</p>
  `;
  egg.classList.remove('hidden');
  setTimeout(() => egg.classList.add('hidden'), 4000);
}

// --- Init ---

let borderData = [];
let airportData = [];

async function init() {
  try {
    borderData = await loadJSON('data/border.json');
    airportData = await loadJSON('data/airports.json');
  } catch (err) {
    document.getElementById('start-screen').innerHTML =
      '<h1>Failed to load game data</h1><p>Please run via a local HTTP server (e.g. python3 -m http.server)</p>';
    return;
  }
  loadWeights();
  renderBorder(borderData);
  renderAirports(airportData);

  // Restore saved checkbox state
  const saved = JSON.parse(localStorage.getItem('guessAirport_settings') || 'null');
  if (saved) {
    document.querySelectorAll('#custom-checks input[type="checkbox"]').forEach(cb => {
      cb.checked = saved.categories?.includes(cb.value) ?? false;
    });
    document.getElementById('browse-mode').checked = saved.browse ?? false;
    document.getElementById('learning-mode').checked = saved.hint ?? false;
    document.getElementById('infinity-mode').checked = saved.infinity ?? false;
  }

  // Show counts per category
  document.querySelectorAll('#custom-checks input[type="checkbox"]').forEach(cb => {
    const count = airportData.filter(a => a.type === cb.value).length;
    cb.parentElement.append(` (${count})`);
  });

  document.getElementById('start-btn').addEventListener('click', startGame);

  document.getElementById('map').addEventListener('click', handleMapClick);

  document.getElementById('play-again').addEventListener('click', () => {
    document.getElementById('summary-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('hidden');
  });
}

init();
