import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const memStore = new Map();
globalThis.localStorage = {
  getItem: (k) => memStore.has(k) ? memStore.get(k) : null,
  setItem: (k, v) => { memStore.set(k, String(v)); },
  removeItem: (k) => { memStore.delete(k); },
  clear: () => { memStore.clear(); },
};

const { loadWeights, saveWeights, loadSettings, saveSettings } = await import('../src/storage.js');

beforeEach(() => { memStore.clear(); });

test('saveWeights / loadWeights round-trips', () => {
  saveWeights({ LKPR: 4 }, new Set(['LKPR', 'LKMB']));
  const { weights, seen } = loadWeights();
  assert.deepEqual(weights, { LKPR: 4 });
  assert.equal(seen.has('LKPR'), true);
  assert.equal(seen.has('LKMB'), true);
});

test('loadWeights returns empty when nothing stored', () => {
  const { weights, seen } = loadWeights();
  assert.deepEqual(weights, {});
  assert.equal(seen.size, 0);
});

test('loadWeights drops payload with mismatched version', () => {
  // Simulate a v0 (unversioned) payload — old format
  localStorage.setItem('guessAirport_weights', JSON.stringify({ LKPR: 4 }));
  const { weights } = loadWeights();
  assert.deepEqual(weights, {});
});

test('saveSettings / loadSettings round-trip', () => {
  saveSettings({ categories: ['large'], browse: false });
  const s = loadSettings();
  assert.deepEqual(s, { categories: ['large'], browse: false });
});

test('loadSettings returns null for unversioned', () => {
  localStorage.setItem('guessAirport_settings', JSON.stringify({ categories: [] }));
  assert.equal(loadSettings(), null);
});
