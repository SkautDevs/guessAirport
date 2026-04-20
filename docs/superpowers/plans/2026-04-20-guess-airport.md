# Guess the Airport — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based game where players identify Czech airports on a blind VFR-style map by clicking airport symbols.

**Architecture:** Single HTML page with SVG map rendering (border + airport symbols) and HTML UI overlays (question bar, score sidebar, start/summary screens). All airport and border data is baked into static JSON files. Zero dependencies.

**Tech Stack:** Vanilla HTML/CSS/JS, SVG, static JSON data files

**Spec:** `docs/superpowers/specs/2026-04-20-guess-airport-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `index.html` | Page structure: SVG container, question bar, score sidebar, start/summary overlays |
| `style.css` | Paper VFR chart theme, layout, responsive sizing |
| `app.js` | Game state machine, SVG rendering, projection, hit detection, score tracking |
| `data/border.json` | Czech Republic border polygon coordinates (simplified GeoJSON) |
| `data/airports.json` | Array of airport objects with coords, ICAO, name, type, runways, CTR polygons |

---

### Task 1: Fetch and Curate Border Data

**Files:**
- Create: `data/border.json`

- [ ] **Step 1: Download Czech border GeoJSON**

```bash
curl -o /tmp/cze.geo.json "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CZE.geo.json"
```

- [ ] **Step 2: Extract and simplify to a coordinate array**

Read the downloaded GeoJSON. Extract the `coordinates` array from the `Polygon` geometry. Save as `data/border.json` — a flat array of `[lon, lat]` pairs:

```json
[
  [12.09, 50.32],
  [12.32, 50.21],
  ...
]
```

Strip the GeoJSON wrapper — we only need the ring coordinates. Verify visually that the polygon looks like Czechia (starts roughly at the western tip near Aš, traces the border clockwise or counterclockwise).

- [ ] **Step 3: Commit**

```bash
git add data/border.json
git commit -m "feat: add Czech Republic border coordinates"
```

---

### Task 2: Fetch and Curate Airport Data

**Files:**
- Create: `data/airports.json`

- [ ] **Step 1: Download OurAirports CSVs**

```bash
curl -o /tmp/airports.csv "https://davidmegginson.github.io/ourairports-data/airports.csv"
curl -o /tmp/runways.csv "https://davidmegginson.github.io/ourairports-data/runways.csv"
```

- [ ] **Step 2: Filter and merge into airports.json**

Write a one-off Node.js script (run it, don't commit it) that:

1. Reads `airports.csv`, filters rows where `iso_country == "CZ"` and `type` is one of `large_airport`, `medium_airport`, `small_airport`
2. Reads `runways.csv`, joins on `airport_ident` to get runway headings (`le_heading_degT`) and lengths (`length_ft`, convert to meters)
3. Assigns our type categories:
   - OurAirports `large_airport` → `"large"`
   - OurAirports `medium_airport` → `"medium"`
   - OurAirports `small_airport` with 4-char ICAO (LKXX) → `"small"`
   - OurAirports `small_airport` with 6-char ICAO (LKXXXX) → `"ultralight"`
4. Outputs `data/airports.json` as an array:

```json
[
  {
    "icao": "LKPR",
    "name": "Praha/Ruzyně",
    "lat": 50.1008,
    "lon": 14.26,
    "type": "large",
    "runways": [
      { "heading": 60, "length": 3715 },
      { "heading": 119, "length": 3250 }
    ],
    "ctr": null
  },
  {
    "icao": "LKKA",
    "name": "Brno/Křižanov",
    "lat": 49.35,
    "lon": 16.12,
    "type": "small",
    "runways": [
      { "heading": 280, "length": 600 }
    ],
    "ctr": null
  }
]
```

Note: `ctr` is `null` initially — CTR polygons are added in Step 3.

- [ ] **Step 3: Add CTR polygon data for major airports**

Manually add CTR/MCTR polygon coordinates for Czech airports that have them. These are the major controlled airports. Source the coordinates from the Czech AIP (publicly viewable at `aim.rlp.cz`, section ENR 2.1) or from OpenAIP if API access is available.

Known Czech airports with CTR/MCTR:
- LKPR (Praha) — CTR
- LKTB (Brno/Tuřany) — MCTR
- LKMT (Ostrava/Mošnov) — MCTR
- LKKV (Karlovy Vary) — MCTR
- LKPD (Pardubice) — MCTR
- LKNA (Náměšť nad Oslavou) — MCTR
- LKCV (Čáslav) — MCTR
- LKKB (Praha/Kbely) — MCTR
- LKLB (Liberec) — MCTR
- LKLN (Plzeň/Líně) — MCTR
- LKPO (Přerov) — MCTR
- LKHK (Hradec Králové) — MCTR
- LKKU (Kunovice) — MCTR

For each, add a `ctr` field as an array of `[lat, lon]` coordinate pairs forming the polygon boundary:

```json
{
  "icao": "LKPR",
  "ctr": [
    [50.15, 14.1],
    [50.15, 14.5],
    [50.0, 14.5],
    [50.0, 14.1]
  ]
}
```

- [ ] **Step 4: Verify data integrity**

Check: every airport has at least one runway, coordinates are within CZ bounding box (lat 48.5–51.1, lon 12.1–18.9), no duplicate ICAOs, CTR polygons have at least 3 points.

- [ ] **Step 5: Commit**

```bash
git add data/airports.json
git commit -m "feat: add curated Czech airport data with CTR polygons"
```

---

### Task 3: HTML Structure

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guess the Airport</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="game">
    <!-- Question bar -->
    <div id="question-bar" class="hidden">
      <span id="round-counter"></span>
      <span id="question-text"></span>
    </div>

    <!-- SVG map container -->
    <svg id="map" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
      <g id="border-layer"></g>
      <g id="airport-layer"></g>
      <g id="feedback-layer"></g>
    </svg>

    <!-- Score sidebar -->
    <div id="sidebar" class="hidden">
      <h2>Score Sheet</h2>
      <ul id="score-list"></ul>
      <div id="score-total"></div>
    </div>

    <!-- Start screen overlay -->
    <div id="start-screen">
      <h1>Guess the Airport</h1>
      <p>Identify Czech airports on a blind VFR map</p>
      <div id="difficulty-buttons">
        <button class="diff-btn" data-difficulty="easy" disabled>Easy</button>
        <button class="diff-btn" data-difficulty="normal" disabled>Normal</button>
        <button class="diff-btn" data-difficulty="hard">Hard</button>
      </div>
    </div>

    <!-- Summary overlay -->
    <div id="summary-screen" class="hidden">
      <h1>Round Complete</h1>
      <p id="final-score"></p>
      <ul id="summary-list"></ul>
      <button id="play-again">Play Again</button>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify it loads**

Open `index.html` in a browser. Should show a blank page with the start screen title and three buttons (Easy and Normal greyed out).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add HTML structure with game screens"
```

---

### Task 4: CSS Theme — Paper VFR Chart

**Files:**
- Create: `style.css`

- [ ] **Step 1: Write the stylesheet**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #eee8d5;
  color: #073642;
  height: 100vh;
  overflow: hidden;
}

#game {
  display: flex;
  height: 100vh;
  position: relative;
}

/* --- SVG Map --- */

#map {
  flex: 1;
  background: #eee8d5;
  cursor: crosshair;
}

/* --- Question Bar --- */

#question-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 200px;
  background: rgba(253, 246, 227, 0.95);
  border-bottom: 2px solid #586e75;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 10;
}

#round-counter {
  color: #657b83;
  font-size: 13px;
}

#question-text {
  font-size: 18px;
  font-weight: 700;
  color: #073642;
  letter-spacing: 0.5px;
}

#question-text .icao {
  color: #268bd2;
}

/* --- Score Sidebar --- */

#sidebar {
  width: 200px;
  background: #fdf6e3;
  padding: 16px;
  font-size: 13px;
  border-left: 2px solid #93a1a1;
  overflow-y: auto;
}

#sidebar h2 {
  font-size: 15px;
  margin-bottom: 12px;
  border-bottom: 2px solid #586e75;
  padding-bottom: 8px;
}

#score-list {
  list-style: none;
}

#score-list li {
  margin-bottom: 6px;
  font-family: monospace;
}

#score-list li.correct {
  color: #2aa198;
}

#score-list li.wrong {
  color: #dc322f;
}

#score-list li.pending {
  color: #93a1a1;
  font-style: italic;
}

#score-total {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid #d5cdb6;
  font-weight: 600;
}

/* --- Start Screen --- */

#start-screen, #summary-screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(253, 246, 227, 0.95);
  z-index: 20;
}

#start-screen h1, #summary-screen h1 {
  font-size: 36px;
  margin-bottom: 8px;
}

#start-screen p, #summary-screen p {
  color: #657b83;
  margin-bottom: 32px;
}

#difficulty-buttons {
  display: flex;
  gap: 12px;
}

.diff-btn {
  padding: 12px 28px;
  font-size: 16px;
  font-weight: 600;
  border: 2px solid #268bd2;
  background: #fdf6e3;
  color: #268bd2;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.diff-btn:hover:not(:disabled) {
  background: #268bd2;
  color: #fdf6e3;
}

.diff-btn:disabled {
  border-color: #93a1a1;
  color: #93a1a1;
  cursor: not-allowed;
}

#play-again {
  margin-top: 24px;
  padding: 12px 28px;
  font-size: 16px;
  font-weight: 600;
  border: 2px solid #268bd2;
  background: #268bd2;
  color: #fdf6e3;
  border-radius: 6px;
  cursor: pointer;
}

#summary-list {
  list-style: none;
  text-align: left;
  font-family: monospace;
  font-size: 14px;
}

#summary-list li {
  margin-bottom: 4px;
}

#summary-list li.correct {
  color: #2aa198;
}

#summary-list li.wrong {
  color: #dc322f;
}

#final-score {
  font-size: 48px;
  font-weight: 700;
  color: #268bd2;
  margin-bottom: 24px;
}

/* --- Utility --- */

.hidden {
  display: none !important;
}
```

- [ ] **Step 2: Verify styling**

Open `index.html` in a browser. The start screen should show centered with cream background, blue buttons, Easy/Normal greyed out, Hard active and hoverable.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add paper VFR chart CSS theme"
```

---

### Task 5: Core App — Projection, Data Loading, Border Rendering

**Files:**
- Create: `app.js`

- [ ] **Step 1: Write projection and data loading**

```javascript
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

// Apply cos(centerLat) correction to longitude to avoid east-west distortion
const LON_RANGE = (CZ_BOUNDS.maxLon - CZ_BOUNDS.minLon) * COS_CENTER;
const LAT_RANGE = CZ_BOUNDS.maxLat - CZ_BOUNDS.minLat;
const ASPECT = LON_RANGE / LAT_RANGE;

function lonLatToXY(lon, lat) {
  const x = PADDING + ((lon - CZ_BOUNDS.minLon) * COS_CENTER / LON_RANGE) * (SVG_WIDTH - 2 * PADDING);
  const y = PADDING + ((CZ_BOUNDS.maxLat - lat) / LAT_RANGE) * (SVG_HEIGHT - 2 * PADDING);
  return { x, y };
}

// --- Data Loading ---

async function loadJSON(url) {
  const res = await fetch(url);
  return res.json();
}

// --- Border Rendering ---

function renderBorder(borderCoords) {
  const layer = document.getElementById('border-layer');
  const points = borderCoords.map(([lon, lat]) => {
    const { x, y } = lonLatToXY(lon, lat);
    return `${x},${y}`;
  }).join(' ');

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', points);
  polygon.setAttribute('fill', 'none');
  polygon.setAttribute('stroke', '#586e75');
  polygon.setAttribute('stroke-width', '2.5');
  layer.appendChild(polygon);
}

// --- Init ---

let borderData = [];
let airportData = [];

async function init() {
  borderData = await loadJSON('data/border.json');
  airportData = await loadJSON('data/airports.json');
  renderBorder(borderData);
}

init();
```

- [ ] **Step 2: Verify border renders**

Open `index.html` in a browser (via a local HTTP server since `fetch` won't work from `file://`):

```bash
cd /home/pilecky/prg/guessAirport && python3 -m http.server 8080
```

Open `http://localhost:8080`. Dismiss the start screen concept (it covers the map) — use browser devtools to hide `#start-screen` temporarily. The Czech border should render as a dark grey outline on the cream background.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add projection, data loading, and border rendering"
```

---

### Task 6: Airport Symbol Rendering

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add SVG helper and NM-to-pixel conversion**

Add after the projection functions in `app.js`:

```javascript
// --- SVG Helpers ---

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// 1 NM ≈ 1.852 km ≈ 0.01667° latitude
// Convert 5 NM radius to SVG pixels
function nmToPixels(nm) {
  const degLat = nm * (1.852 / 111.32);
  return (degLat / (CZ_BOUNDS.maxLat - CZ_BOUNDS.minLat)) * (SVG_HEIGHT - 2 * PADDING);
}
```

- [ ] **Step 2: Add airport rendering function**

Add after the SVG helpers:

```javascript
// --- Airport Rendering ---

const AIRPORT_BLUE = '#268bd2';

function renderRunways(g, airport) {
  const center = lonLatToXY(airport.lon, airport.lat);
  const scale = airport.type === 'ultralight' ? 0.5 : 1;

  airport.runways.forEach(rwy => {
    const angleRad = (rwy.heading - 90) * Math.PI / 180;
    const len = Math.max(8, Math.min(20, rwy.length / 200)) * scale;
    const x1 = center.x - Math.cos(angleRad) * len;
    const y1 = center.y - Math.sin(angleRad) * len;
    const x2 = center.x + Math.cos(angleRad) * len;
    const y2 = center.y + Math.sin(angleRad) * len;

    g.appendChild(svgEl('line', {
      x1, y1, x2, y2,
      stroke: AIRPORT_BLUE,
      'stroke-width': airport.type === 'ultralight' ? '1.5' : '2.5'
    }));
  });
}

function renderCTR(g, airport) {
  const points = airport.ctr.map(([lat, lon]) => {
    const { x, y } = lonLatToXY(lon, lat);
    return `${x},${y}`;
  }).join(' ');

  g.appendChild(svgEl('polygon', {
    points,
    fill: 'rgba(38,139,210,0.06)',
    stroke: AIRPORT_BLUE,
    'stroke-width': '1.5',
    'stroke-dasharray': '6,3'
  }));
}

function renderCircle(g, airport) {
  const center = lonLatToXY(airport.lon, airport.lat);
  const radius = nmToPixels(5);
  const r = airport.type === 'ultralight' ? radius * 0.7 : radius;

  g.appendChild(svgEl('circle', {
    cx: center.x,
    cy: center.y,
    r,
    fill: 'none',
    stroke: AIRPORT_BLUE,
    'stroke-width': airport.type === 'ultralight' ? '0.8' : '1.2'
  }));
}

function renderAirports(airports) {
  const layer = document.getElementById('airport-layer');
  layer.innerHTML = '';

  airports.forEach(airport => {
    const g = svgEl('g', { 'data-icao': airport.icao, class: 'airport-symbol' });

    if (airport.ctr) {
      renderCTR(g, airport);
    } else {
      renderCircle(g, airport);
    }

    renderRunways(g, airport);
    layer.appendChild(g);
  });
}
```

- [ ] **Step 3: Call renderAirports from init**

Update the `init` function:

```javascript
async function init() {
  borderData = await loadJSON('data/border.json');
  airportData = await loadJSON('data/airports.json');
  renderBorder(borderData);
  renderAirports(airportData);
}
```

- [ ] **Step 4: Verify airports render**

Open `http://localhost:8080`. Hide `#start-screen` via devtools. Airports should appear as blue symbols on the map — circles for small/ultralight, dashed polygons for those with CTR data, with runway lines inside.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: render airport symbols (CTR, circles, runways)"
```

---

### Task 7: Hit Detection

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add point-in-polygon test**

Add after the airport rendering functions:

```javascript
// --- Hit Detection ---

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isClickOnAirport(clickX, clickY, airport) {
  if (airport.ctr) {
    const screenPoly = airport.ctr.map(([lat, lon]) => {
      const { x, y } = lonLatToXY(lon, lat);
      return [x, y];
    });
    return pointInPolygon(clickX, clickY, screenPoly);
  } else {
    const center = lonLatToXY(airport.lon, airport.lat);
    const radius = nmToPixels(5) * (airport.type === 'ultralight' ? 0.7 : 1);
    const dx = clickX - center.x;
    const dy = clickY - center.y;
    return (dx * dx + dy * dy) <= (radius * radius);
  }
}

function findClickedAirport(clickX, clickY, airports) {
  return airports.find(a => isClickOnAirport(clickX, clickY, a)) || null;
}
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: add point-in-polygon and circle hit detection"
```

---

### Task 8: Game State Machine

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add game state and round management**

Add after the hit detection functions:

```javascript
// --- Game State ---

const ROUNDS_PER_GAME = 10;

let gameState = 'start'; // 'start' | 'playing' | 'feedback' | 'summary'
let currentRound = 0;
let roundAirports = [];
let results = []; // { airport, correct: bool }

function pickRoundAirports(airports, count) {
  const shuffled = [...airports].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function startGame(difficulty) {
  const pool = airportData; // v1: all airports regardless of difficulty
  roundAirports = pickRoundAirports(pool, ROUNDS_PER_GAME);
  currentRound = 0;
  results = [];
  gameState = 'playing';

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('summary-screen').classList.add('hidden');
  document.getElementById('question-bar').classList.remove('hidden');
  document.getElementById('sidebar').classList.remove('hidden');

  renderScoreSheet();
  showCurrentQuestion();
}

function showCurrentQuestion() {
  const airport = roundAirports[currentRound];
  document.getElementById('round-counter').textContent = `Round ${currentRound + 1}/${ROUNDS_PER_GAME}`;
  document.getElementById('question-text').innerHTML =
    `Find: <span class="icao">${airport.icao}</span> — ${airport.name}`;
}
```

- [ ] **Step 2: Add score sheet rendering**

```javascript
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
```

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add game state machine and score sheet"
```

---

### Task 9: Click Handling, Feedback, and Game Loop

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add feedback rendering**

```javascript
// --- Feedback ---

function showFeedback(targetAirport, correct, clickedAirport) {
  gameState = 'feedback';
  const feedbackLayer = document.getElementById('feedback-layer');
  feedbackLayer.innerHTML = '';

  if (correct) {
    highlightAirport(feedbackLayer, targetAirport, '#2aa198', 3);
  } else {
    if (clickedAirport) {
      highlightAirport(feedbackLayer, clickedAirport, '#dc322f', 2);
    }
    highlightAirport(feedbackLayer, targetAirport, '#2aa198', 3);
  }

  setTimeout(() => {
    feedbackLayer.innerHTML = '';
    advanceRound();
  }, 1500);
}

function highlightAirport(layer, airport, color, width) {
  // color is a hex like '#2aa198' — append '33' for 20% opacity fill
  const fill = `${color}33`;

  if (airport.ctr) {
    const points = airport.ctr.map(([lat, lon]) => {
      const { x, y } = lonLatToXY(lon, lat);
      return `${x},${y}`;
    }).join(' ');
    layer.appendChild(svgEl('polygon', {
      points, fill, stroke: color, 'stroke-width': width
    }));
  } else {
    const center = lonLatToXY(airport.lon, airport.lat);
    const radius = nmToPixels(5) * (airport.type === 'ultralight' ? 0.7 : 1);
    layer.appendChild(svgEl('circle', {
      cx: center.x, cy: center.y, r: radius,
      fill, stroke: color, 'stroke-width': width
    }));
  }
}
```

- [ ] **Step 2: Add click handler and round advancement**

```javascript
// --- Click Handler ---

function handleMapClick(e) {
  if (gameState !== 'playing') return;

  const svg = document.getElementById('map');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

  const targetAirport = roundAirports[currentRound];
  const clickedAirport = findClickedAirport(svgPt.x, svgPt.y, airportData);

  const correct = clickedAirport && clickedAirport.icao === targetAirport.icao;
  results.push({ airport: targetAirport, correct });

  renderScoreSheet();
  showFeedback(targetAirport, correct, clickedAirport);
}

function advanceRound() {
  currentRound++;
  if (currentRound >= ROUNDS_PER_GAME) {
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
  document.getElementById('final-score').textContent = `${correctCount} / ${ROUNDS_PER_GAME}`;

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
```

- [ ] **Step 3: Wire up event listeners in init**

Update the `init` function to add event listeners:

```javascript
async function init() {
  borderData = await loadJSON('data/border.json');
  airportData = await loadJSON('data/airports.json');
  renderBorder(borderData);
  renderAirports(airportData);

  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        startGame(btn.dataset.difficulty);
      }
    });
  });

  // Map clicks
  document.getElementById('map').addEventListener('click', handleMapClick);

  // Play again
  document.getElementById('play-again').addEventListener('click', () => {
    document.getElementById('summary-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('hidden');
  });
}
```

- [ ] **Step 4: Verify full game loop**

Open `http://localhost:8080`.

1. Click "Hard" — game starts, question bar shows first airport
2. Click on the map — feedback shows (green if correct, red+green if wrong)
3. After 1.5s, next question appears
4. After 10 rounds, summary screen shows with score and Play Again button
5. Score sidebar tracks all guesses with ✓/✗

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: add click handling, feedback, and complete game loop"
```

---

### Task 10: Polish and Final Verification

**Files:**
- Modify: `style.css` (minor tweaks if needed)
- Modify: `app.js` (minor tweaks if needed)

- [ ] **Step 1: Add grid lines to map**

Add to `renderBorder` in `app.js`, before the border polygon:

```javascript
function renderBorder(borderCoords) {
  const layer = document.getElementById('border-layer');

  // Subtle grid lines
  for (let lat = 49; lat <= 51; lat++) {
    const left = lonLatToXY(CZ_BOUNDS.minLon, lat);
    const right = lonLatToXY(CZ_BOUNDS.maxLon, lat);
    layer.appendChild(svgEl('line', {
      x1: left.x, y1: left.y, x2: right.x, y2: right.y,
      stroke: '#d5cdb6', 'stroke-width': '0.5', 'stroke-dasharray': '4,4'
    }));
  }
  for (let lon = 13; lon <= 18; lon++) {
    const top = lonLatToXY(lon, CZ_BOUNDS.maxLat);
    const bottom = lonLatToXY(lon, CZ_BOUNDS.minLat);
    layer.appendChild(svgEl('line', {
      x1: top.x, y1: top.y, x2: bottom.x, y2: bottom.y,
      stroke: '#d5cdb6', 'stroke-width': '0.5', 'stroke-dasharray': '4,4'
    }));
  }

  // Border polygon
  const points = borderCoords.map(([lon, lat]) => {
    const { x, y } = lonLatToXY(lon, lat);
    return `${x},${y}`;
  }).join(' ');

  const polygon = document.createElementNS(SVG_NS, 'polygon');
  polygon.setAttribute('points', points);
  polygon.setAttribute('fill', 'none');
  polygon.setAttribute('stroke', '#586e75');
  polygon.setAttribute('stroke-width', '2.5');
  layer.appendChild(polygon);
}
```

- [ ] **Step 2: Test the complete game end-to-end**

Full playthrough checklist:
1. Start screen shows with three buttons, Easy/Normal disabled
2. Click Hard — question bar and sidebar appear
3. Clicking inside an airport's zone registers a hit
4. Clicking outside or on wrong airport registers a miss
5. Feedback highlights correctly (teal for correct, red for wrong + teal on correct)
6. Score sheet updates in real-time with ICAO + full name
7. After 10 rounds, summary shows final score and full results
8. Play Again returns to start screen

- [ ] **Step 3: Commit**

```bash
git add app.js style.css
git commit -m "feat: add grid lines and polish game"
```

- [ ] **Step 4: Add .gitignore**

```bash
echo ".superpowers/" > .gitignore
git add .gitignore
git commit -m "chore: add gitignore"
```
