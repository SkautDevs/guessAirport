import { lonLatToXY, CZ_BOUNDS } from './projection.js';
import { COLORS, STROKE, SPECIAL_TYPES, typeColor } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

function ctrToSVGPoints(airport) {
  return airport.ctrPoints.map(({ x, y }) => `${x},${y}`).join(' ');
}

export function renderBorder(layer, borderCoords) {
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

function renderRunways(g, airport) {
  const isUL = airport.type === 'ultralight';
  const scale = isUL ? 0.5 : 1;
  const width = isUL ? STROKE.runwayUL : STROKE.runway;

  airport.runways.forEach(rwy => {
    let x1, y1, x2, y2;
    if (rwy.lat1 !== undefined) {
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
      x1 = airport.cx - Math.cos(angleRad) * len;
      y1 = airport.cy - Math.sin(angleRad) * len;
      x2 = airport.cx + Math.cos(angleRad) * len;
      y2 = airport.cy + Math.sin(angleRad) * len;
    }
    g.appendChild(svgEl('line', {
      x1, y1, x2, y2, stroke: COLORS.airport, 'stroke-width': width
    }));
  });
}

function renderCTR(g, airport) {
  const color = typeColor(airport.type);
  g.appendChild(svgEl('polygon', {
    points: ctrToSVGPoints(airport),
    fill: color, 'fill-opacity': SPECIAL_TYPES.has(airport.type) ? '0.08' : '0.06',
    stroke: color,
    'stroke-width': STROKE.ctr,
    'stroke-dasharray': '6,3'
  }));
}

function renderCircle(g, airport) {
  const width = airport.type === 'ultralight' ? STROKE.circleUL : STROKE.circle;
  g.appendChild(svgEl('circle', {
    cx: airport.cx, cy: airport.cy, r: airport.pxRadius,
    fill: 'none', stroke: COLORS.airport, 'stroke-width': width
  }));
}

function renderVOR(g, airport) {
  const r = 10;
  const tickLen = 4;
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 - 90) * Math.PI / 180;
    pts.push(`${airport.cx + r * Math.cos(a)},${airport.cy + r * Math.sin(a)}`);
  }
  g.appendChild(svgEl('polygon', {
    points: pts.join(' '),
    fill: 'none', stroke: COLORS.vor, 'stroke-width': '1.5'
  }));
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 - 90) * Math.PI / 180;
    const x1 = airport.cx + r * Math.cos(a);
    const y1 = airport.cy + r * Math.sin(a);
    const x2 = airport.cx + (r + tickLen) * Math.cos(a);
    const y2 = airport.cy + (r + tickLen) * Math.sin(a);
    g.appendChild(svgEl('line', {
      x1, y1, x2, y2, stroke: COLORS.vor, 'stroke-width': '1.5'
    }));
  }
  g.appendChild(svgEl('circle', {
    cx: airport.cx, cy: airport.cy, r: 2, fill: COLORS.vor
  }));
}

export function renderAirports(layer, airports, browseMode) {
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
      const text = svgEl('text', {
        x: airport.cx, y: airport.cy + 25,
        'text-anchor': 'middle', 'font-size': '8',
        'font-family': 'monospace', fill: '#657b83'
      });
      text.textContent = airport.icao;
      g.appendChild(text);
    }
    layer.appendChild(g);
  });
}

export function highlightAirport(layer, airport, color, width) {
  const fill = `${color}33`;
  if (airport.ctrPoints) {
    layer.appendChild(svgEl('polygon', {
      points: ctrToSVGPoints(airport), fill, stroke: color, 'stroke-width': width
    }));
  } else {
    const r = airport.type === 'vor' ? 14 : airport.pxRadius;
    layer.appendChild(svgEl('circle', {
      cx: airport.cx, cy: airport.cy, r, fill, stroke: color, 'stroke-width': width
    }));
  }
}

export function labelAirport(layer, airport, color) {
  const text = svgEl('text', {
    x: airport.cx, y: airport.cy + 25,
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
