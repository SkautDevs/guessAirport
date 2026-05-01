import { lonLatToXY, nmToPixels } from './projection.js';
import { CIRCLE_RADIUS_NM } from './types.js';

export function airportRadius(airport) {
  const nm = CIRCLE_RADIUS_NM[airport.type] || 5;
  return nmToPixels(nm);
}

export function ctrToMapPoints(ctr) {
  return ctr.map(([lat, lon]) => lonLatToXY(lon, lat));
}

export function pointInPolygon(x, y, polygon) {
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

export function isClickOnAirport(clickX, clickY, airport) {
  const center = lonLatToXY(airport.lon, airport.lat);
  const dx = clickX - center.x;
  const dy = clickY - center.y;
  const distSq = dx * dx + dy * dy;

  if (airport.ctr) {
    return pointInPolygon(clickX, clickY, ctrToMapPoints(airport.ctr))
      || distSq <= MIN_CLICK_RADIUS * MIN_CLICK_RADIUS;
  }
  const r = airport.type === 'vor' ? 14 : airportRadius(airport);
  const clickR = Math.max(r, MIN_CLICK_RADIUS);
  return distSq <= clickR * clickR;
}

export function findClickedAirport(clickX, clickY, airports, targetAirport) {
  const matches = airports.filter(a => isClickOnAirport(clickX, clickY, a));
  if (matches.length <= 1) return matches[0] || null;
  const targetMatch = matches.find(a => a.icao === targetAirport.icao);
  if (targetMatch) return targetMatch;
  const sameType = matches.filter(a => a.type === targetAirport.type);
  if (sameType.length === 1) return sameType[0];
  const pool = sameType.length > 0 ? sameType : matches;
  return pool.sort((a, b) => {
    if (a.ctr && !b.ctr) return 1;
    if (!a.ctr && b.ctr) return -1;
    if (a.ctr && b.ctr) return a.ctr.length - b.ctr.length;
    return 0;
  })[0];
}
