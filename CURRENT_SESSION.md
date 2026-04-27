# Guess the Airport — Session Progress

## What This Is
A browser-based game where players identify Czech airports, airspace areas, and navaids on a blind VFR-style map. Player sees an ICAO code + name in a prompt bar, clicks the correct symbol on the map.

## Tech Stack
- Single-page app: `index.html` + `style.css` + `app.js`
- Zero dependencies, vanilla JS, SVG rendering, HTML overlays
- Static JSON data files (`data/airports.json`, `data/border.json`)
- Requires local HTTP server (`python3 -m http.server`)

## File Structure
```
guessAirport/
├── index.html                 — Page structure
├── style.css                  — Paper VFR chart theme
├── app.js                     — All game logic (~500 lines)
├── data/
│   ├── airports.json          — 144 entities (airports, areas, VORs)
│   ├── border.json            — CZ border (231 points)
│   └── czech_airspace_openair.txt — Source airspace data from soaringweb.org
├── docs/
│   ├── mctr_namest_web.jpg    — VFR chart reference
│   └── superpowers/
│       ├── specs/2026-04-20-guess-airport-design.md
│       └── plans/2026-04-20-guess-airport.md
└── .gitignore
```

## Current Data (144 entities)
| Type | Count | Description |
|------|-------|-------------|
| `large` | 6 | LKPR, LKTB, LKMT, LKKV, LKPD, LKCS — all have CTR polygons + real runway endpoints |
| `medium` | 5 | LKCV, LKKB, LKKU, LKNA, LKVO — all have CTR polygons + real runway endpoints |
| `small-north` | 24 | North Bohemia aerodromes |
| `small-west` | 17 | West Bohemia aerodromes |
| `small-south` | 17 | South Bohemia aerodromes |
| `small-east` | 23 | Moravia & Silesia aerodromes |
| `ultralight` | 26 | SLZ fields (CZ-XXXX ICAO pattern) |
| `vor` | 10 | VOR-DME navaids (OKL, BNO, OKF, OKG, OKX, KVY, NER, OTA, VLM, VOZ) |
| `prohibited` | 11 | LKP areas (Pražský hrad, Temelín, Dukovany, etc.) |
| `restricted` | 5 | LKR areas (Šumava, KRNAP, České Švýcarsko, Podyjí, Praha) |

## Key Architecture Decisions

### Rendering
- SVG with 3 layers: border-layer, airport-layer, feedback-layer
- HTML overlays: question bar (top, centered), score sidebar (right), start/summary screens
- Coordinate projection: equirectangular with cos(centerLat) correction
- `lonLatToXY(lon, lat)` maps WGS84 → SVG viewport (800x500, padding 30)

### Airport Symbols
- **CTR airports**: dashed blue polygon from AIP data + runway lines at real endpoint positions
- **Small airports**: 3NM circle (ATZ) + runway lines
- **Ultralight**: 2NM circle + smaller runway lines (0.5x scale)
- **VOR**: ICAO standard hexagon with tick marks + center dot (purple)
- **Prohibited**: red dashed polygon
- **Restricted**: green dashed polygon

### Runway Rendering
- Airports with `lat1/lon1/lat2/lon2` in runway data: draw at real geographic positions, scaled using `len/120` formula (12-30px)
- Airports without endpoints: draw from center using heading + length
- Ultralight runways: 0.5x scale factor

### Hit Detection
- CTR polygons: ray-casting point-in-polygon test
- Circles: distance check against radius
- VORs: 14px fixed click radius
- All entities: minimum 15px click radius around center (for small shapes like prohibited areas)
- Overlapping zones: prefer same type as current target, then smallest zone

### Game Flow
1. **Start screen**: checkboxes for categories + "Learning mode" toggle + Start button
2. **Playing**: question bar shows target, player clicks map, only clicks on shapes count
3. **Feedback**: correct = 1.5s green highlight, wrong = 3s red highlight on clicked + green on correct + labels with cream background
4. **Summary**: score + full results list + Play Again

### Data Sources
- **OurAirports CSV**: airport coordinates, names, runway endpoints, lengths
- **Czech AIP via soaringweb.org OpenAir**: CTR/MCTR polygons, restricted/prohibited areas
- **Natural Earth (datasets/geo-countries)**: CZ border polygon (simplified to 231 points)
- Runway headings for ultralights: derived from runway identifiers (e.g. "09/27" → 90°)

## LKPR CTR — Known Complexity
LKPR CTR has 4 arc segments around OKL VOR (50.09583°N, 14.26556°E). OpenAir `D=+` means **clockwise**. Current implementation: 6 straight points (NE protrusion) + 4 CW arcs (20 steps each) = ~91 points. Has been rebuilt multiple times — the current shape is correct but could be verified visually.

## Regional Split Boundaries (for small airports)
- **East (Moravia & Silesia)**: lon >= 16° (default)
- **North Bohemia**: lat >= 50° and lon < 16° (default)  
- **West Bohemia**: lat < 50° and lon < 14.5° (default)
- **South Bohemia**: remaining (lat < 50°, lon 14.5°-16°)
- Several airports manually moved between regions for geographic accuracy

## Colors (Paper VFR Chart Theme)
| Element | Color |
|---------|-------|
| Map background | `#eee8d5` |
| Border | `#586e75` |
| Grid lines | `#d5cdb6` |
| Airport symbology | `#268bd2` |
| Prohibited areas | `#dc322f` |
| Restricted areas | `#859900` |
| VOR navaids | `#6c71c4` |
| Correct feedback | `#2aa198` |
| Wrong feedback | `#dc322f` |
| Label background | `#fdf6e3` |

## What's NOT Done Yet (from original spec)
- Progressive clues (reveal one at a time before final guess)
- Timed mode
- Persistent high scores (localStorage)
- LKTRA (temporary restricted/military training areas) — data exists in OpenAir file but not parsed

## Known Issues / Things to Watch
- CZ-0171 (Rovná u Sokolova) has runway ident "W/E" — couldn't derive heading, stays at 0
- Some geographic region assignments are subjective — user manually adjusted ~15 airports
- `loadJSON` uses `fetch()` so requires HTTP server, not `file://`
