import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointInPolygon, isClickOnAirport, findClickedAirport } from '../src/hit.js';
import { lonLatToXY } from '../src/projection.js';

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
  const airport = { type: 'small-north', lon: 14, lat: 50, ctr: undefined };
  const c = lonLatToXY(14, 50);
  assert.equal(isClickOnAirport(c.x, c.y, airport), true);
});

test('isClickOnAirport: miss when far away', () => {
  const airport = { type: 'small-north', lon: 14, lat: 50, ctr: undefined };
  const c = lonLatToXY(14, 50);
  assert.equal(isClickOnAirport(c.x + 200, c.y + 200, airport), false);
});

test('findClickedAirport: prefers target when overlapping', () => {
  const target = { icao: 'LKSA', type: 'small-north', lon: 14, lat: 50, ctr: undefined };
  const other = { icao: 'LKRO', type: 'small-north', lon: 14.0001, lat: 50, ctr: undefined };
  const c = lonLatToXY(14, 50);
  const result = findClickedAirport(c.x, c.y, [other, target], target);
  assert.equal(result.icao, 'LKSA');
});

test('findClickedAirport: returns single match when no overlap', () => {
  const target = { icao: 'LKSA', type: 'small-north', lon: 14, lat: 50, ctr: undefined };
  const c = lonLatToXY(14, 50);
  const result = findClickedAirport(c.x, c.y, [target], target);
  assert.equal(result.icao, 'LKSA');
});

test('findClickedAirport: returns null when no match', () => {
  const target = { icao: 'LKSA', type: 'small-north', lon: 14, lat: 50, ctr: undefined };
  const result = findClickedAirport(0, 0, [target], target);
  assert.equal(result, null);
});
