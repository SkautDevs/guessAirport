import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointInPolygon, isClickOnAirport, findClickedAirport } from '../src/hit.js';
import { lonLatToXY, enrichAirports } from '../src/projection.js';

function fixtureAirport(icao, lon, lat, type = 'small-north') {
  const a = { icao, lon, lat, type, runways: [] };
  enrichAirports([a]);
  return a;
}

test('pointInPolygon: square inside', () => {
  const square = [
    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }
  ];
  assert.equal(pointInPolygon(5, 5, square), true);
});

test('pointInPolygon: square outside', () => {
  const square = [
    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }
  ];
  assert.equal(pointInPolygon(20, 5, square), false);
});

test('isClickOnAirport: hit a small airport at its center', () => {
  const airport = fixtureAirport('LKAA', 14, 50);
  assert.equal(isClickOnAirport(airport.cx, airport.cy, airport), true);
});

test('isClickOnAirport: miss when far away', () => {
  const airport = fixtureAirport('LKAA', 14, 50);
  assert.equal(isClickOnAirport(airport.cx + 200, airport.cy + 200, airport), false);
});

test('findClickedAirport: prefers target when overlapping', () => {
  const target = fixtureAirport('LKSA', 14, 50);
  const other = fixtureAirport('LKRO', 14.0001, 50);
  const result = findClickedAirport(target.cx, target.cy, [other, target], target);
  assert.equal(result.icao, 'LKSA');
});

test('findClickedAirport: returns single match when no overlap', () => {
  const target = fixtureAirport('LKSA', 14, 50);
  const result = findClickedAirport(target.cx, target.cy, [target], target);
  assert.equal(result.icao, 'LKSA');
});

test('findClickedAirport: returns null when no match', () => {
  const target = fixtureAirport('LKSA', 14, 50);
  const result = findClickedAirport(0, 0, [target], target);
  assert.equal(result, null);
});
