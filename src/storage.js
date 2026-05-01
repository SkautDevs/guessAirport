const KEY_WEIGHTS = 'guessAirport_weights';
const KEY_SEEN = 'guessAirport_seen';
const KEY_SETTINGS = 'guessAirport_settings';

const VERSION = 1;

function readVersioned(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.v !== VERSION) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeVersioned(key, data) {
  localStorage.setItem(key, JSON.stringify({ v: VERSION, data }));
}

export function loadWeights() {
  return {
    weights: readVersioned(KEY_WEIGHTS) || {},
    seen: new Set(readVersioned(KEY_SEEN) || [])
  };
}

export function saveWeights(weights, seen) {
  writeVersioned(KEY_WEIGHTS, weights);
  writeVersioned(KEY_SEEN, [...seen]);
}

export function clearWeights() {
  localStorage.removeItem(KEY_WEIGHTS);
  localStorage.removeItem(KEY_SEEN);
}

export function loadSettings() {
  return readVersioned(KEY_SETTINGS);
}

export function saveSettings(settings) {
  writeVersioned(KEY_SETTINGS, settings);
}

export async function loadJSON(url) {
  const res = await fetch(url);
  return res.json();
}

// Exported for tests
export const _internal = { readVersioned, writeVersioned, VERSION };
