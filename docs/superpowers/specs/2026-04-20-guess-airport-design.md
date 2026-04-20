# Guess the Airport — Design Spec

## Overview

A browser-based game where players identify Czech airports on a blind map. The map shows only the country border outline and aviation chart-style airport symbols (runway shapes, CTR polygons, 5NM circles). The player is given an airport name and ICAO code and must click the correct symbol on the map.

## Tech Stack

- Single-page client-side app: `index.html` + `style.css` + `app.js`
- Zero external dependencies
- SVG for map rendering, HTML for UI overlays
- Static JSON data files, requires a local HTTP server (e.g. `python3 -m http.server`)

## File Structure

```
guessAirport/
├── index.html            — Single page entry point
├── style.css             — Paper VFR chart theme
├── app.js                — Game logic, state machine, rendering
├── data/
│   ├── border.json       — CZ border as simplified GeoJSON coordinates
│   └── airports.json     — Airport data (coords, ICAO, runways, CTR shapes)
└── docs/
    └── mctr_namest_web.jpg  — VFR chart reference image
```

## Airport Data Model

Each airport in `airports.json`:

```json
{
  "icao": "LKPR",
  "name": "Praha/Ruzyně",
  "lat": 50.1008,
  "lon": 14.26,
  "type": "large",
  "runways": [
    { "heading": 60, "length": 3715 },
    { "heading": 120, "length": 3250 }
  ],
  "ctr": [[50.15, 14.1], [50.15, 14.5], ...]
}
```

### Airport Type Categories

| Type | ICAO Pattern | Symbol | Description |
|------|-------------|--------|-------------|
| `large` | LKXX | CTR polygon + runway layout | International airports (LKPR, LKMT, LKTB, LKKV...) |
| `medium` | LKXX | CTR polygon + runway layout | Controlled airports with CTR |
| `small` | LKXX | 5NM circle + runway line(s) | Registered aerodromes |
| `ultralight` | LKXXXX (6-char) | 5NM circle (smaller) + runway line | SLZ ultralight fields |

### Future Difficulty Tiers

- **Easy:** `large` only
- **Normal:** `large` + `medium` + `small`
- **Hard:** all including `ultralight`

For v1, all airports are included in the pool (difficulty selector is visible but disabled).

## Data Sources

1. **OurAirports CSV** (`airports.csv`, `runways.csv`) — coordinates, ICAO codes, names, airport type, runway headings/lengths
2. **OpenAIP** (`openaip.net`) — airspace data including CTR/MCTR polygon shapes in GeoJSON/OpenAir format (free account required)

Data is fetched once during implementation, curated, and baked into static `data/airports.json` and `data/border.json` files committed to the repo. No build script or runtime fetching — the JSON files are the source of truth for the app.

## Coordinate System

All geo coordinates (WGS84 lat/lon) are projected to screen space via a simple equirectangular projection fitted to the Czech Republic bounding box (~48.5°–51.1°N, ~12.1°–18.9°E). A `lonLatToXY(lon, lat)` function maps to SVG viewport coordinates. Latitude is corrected by `cos(centerLat)` to avoid east-west distortion.

## Rendering

### Layers (bottom to top)

1. **SVG: CZ border** — simplified polygon outline, `#586e75` stroke
2. **SVG: Airport symbols** — all blue `#268bd2`:
   - Large/medium with CTR: dashed polygon boundary + solid runway lines inside
   - Small: 5NM circle + runway line(s)
   - Ultralight: smaller 5NM circle + single runway line
3. **SVG: Feedback overlay** — green glow (`#2aa198`) on correct, red flash (`#dc322f`) on wrong + green highlight on correct location
4. **HTML: Question bar** (top) — round counter + "Find: LKTB — Brno/Tuřany"
5. **HTML: Score sheet** (right sidebar) — running list of results
6. **HTML: Start screen / Summary modal** — overlays

### Visual Theme — Paper VFR Chart

| Element | Color |
|---------|-------|
| Map background | `#eee8d5` (cream) |
| Country border | `#586e75` (dark grey) |
| All aviation symbology | `#268bd2` (blue) |
| Correct feedback | `#2aa198` (teal) |
| Wrong feedback | `#dc322f` (red) |
| Sidebar background | `#fdf6e3` (light cream) |
| Text primary | `#073642` (near-black) |
| Text secondary | `#657b83` (grey) |

Subtle grid lines in `#d5cdb6` with dash pattern for chart feel.

## Game Flow

### States

1. **Start** — Title "Guess the Airport", three difficulty buttons: Easy / Normal / Hard. Clicking a button starts the game immediately (no separate Start button). In v1, Easy and Normal are disabled — only Hard (all airports) is active.
2. **Playing** — Question bar shows target airport, player clicks the map
3. **Feedback** — 1.5s display:
   - Correct: green glow on the clicked airport symbol
   - Wrong: red flash on clicked area + green highlight on the correct airport
   - Then auto-advance to next round
4. **Summary** — After 10 rounds: final score (e.g. "7/10"), full list of guesses with hit/miss, Play Again button

### Round Setup

On game start, randomly select 10 airports from the pool (no repeats). Shuffle order.

### Hit Detection

- **CTR airports:** Point-in-polygon test — check if click coordinates fall inside the CTR polygon SVG path
- **Circle airports:** Distance check — click must be within the 5NM circle radius (converted to SVG pixels at projection scale)
- **Click evaluation:**
  - If click is inside the target airport's zone → correct
  - If click is inside a different airport's zone → wrong (that airport is not the target)
  - If click is outside all zones → wrong

### Score Sheet

Running sidebar list updated after each round:

```
1. LKPR — Praha/Ruzyně        ✓
2. LKMT — Ostrava/Mošnov      ✗
3. LKTB — Brno/Tuřany         ...
```

Shows ICAO code, full airport name, and hit/miss indicator. Current round shown in italic with "..." until answered. Running score total at the bottom.

## Future Enhancements (Not in v1)

- **Difficulty tiers:** Easy/Normal/Hard filtering by airport type
- **Progressive clues:** On click, reveal clues one at a time (runway count, elevation, nearby city) before final guess
- **Timed mode**
- **Persistent high scores** (localStorage)
