const KEY_WEIGHTS = 'guessAirport_weights';
const KEY_SEEN = 'guessAirport_seen';
const KEY_SETTINGS = 'guessAirport_settings';

export function loadWeights() {
  return {
    weights: JSON.parse(localStorage.getItem(KEY_WEIGHTS) || '{}'),
    seen: new Set(JSON.parse(localStorage.getItem(KEY_SEEN) || '[]'))
  };
}

export function saveWeights(weights, seen) {
  localStorage.setItem(KEY_WEIGHTS, JSON.stringify(weights));
  localStorage.setItem(KEY_SEEN, JSON.stringify([...seen]));
}

export function clearWeights() {
  localStorage.removeItem(KEY_WEIGHTS);
  localStorage.removeItem(KEY_SEEN);
}

export function loadSettings() {
  return JSON.parse(localStorage.getItem(KEY_SETTINGS) || 'null');
}

export function saveSettings(settings) {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}

export async function loadJSON(url) {
  const res = await fetch(url);
  return res.json();
}
