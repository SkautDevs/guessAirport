import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWeight, updateWeight, weightedPick, shuffleArray } from '../src/weights.js';

test('getWeight: unseen airport defaults to 2', () => {
  assert.equal(getWeight({}, new Set(), 'LKPR'), 2);
});

test('getWeight: seen+correct (no entry) defaults to 1', () => {
  assert.equal(getWeight({}, new Set(['LKPR']), 'LKPR'), 1);
});

test('updateWeight: correct halves weight', () => {
  const weights = { LKPR: 4 };
  const seen = new Set();
  updateWeight(weights, seen, 'LKPR', true);
  assert.equal(weights.LKPR, 2);
  assert.ok(seen.has('LKPR'));
});

test('updateWeight: incorrect doubles weight', () => {
  const weights = {};
  const seen = new Set();
  updateWeight(weights, seen, 'LKPR', false);
  assert.equal(weights.LKPR, 2);
});

test('updateWeight: correct deletes weight when reaches 1', () => {
  const weights = { LKPR: 2 };
  updateWeight(weights, new Set(), 'LKPR', true);
  assert.equal(weights.LKPR, undefined);
});

test('weightedPick: returns requested count without duplicates', () => {
  const pool = [
    { icao: 'A' }, { icao: 'B' }, { icao: 'C' }, { icao: 'D' }, { icao: 'E' }
  ];
  const picked = weightedPick(pool, 3, {}, new Set());
  assert.equal(picked.length, 3);
  const icaos = picked.map(p => p.icao);
  assert.equal(new Set(icaos).size, 3);
});

test('weightedPick: caps at pool size', () => {
  const pool = [{ icao: 'A' }, { icao: 'B' }];
  const picked = weightedPick(pool, 10, {}, new Set());
  assert.equal(picked.length, 2);
});

test('shuffleArray: preserves elements', () => {
  const a = [1, 2, 3, 4, 5];
  const b = shuffleArray(a);
  assert.equal(b.length, a.length);
  assert.deepEqual([...b].sort(), [...a].sort());
});

test('shuffleArray: does not mutate input', () => {
  const a = [1, 2, 3];
  shuffleArray(a);
  assert.deepEqual(a, [1, 2, 3]);
});
