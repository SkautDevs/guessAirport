import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lonLatToXY, nmToPixels, CZ_BOUNDS, SVG_WIDTH, SVG_HEIGHT, PADDING } from '../src/projection.js';

test('lonLatToXY: NW corner maps to top-left of draw area', () => {
  const p = lonLatToXY(CZ_BOUNDS.minLon, CZ_BOUNDS.maxLat);
  assert.equal(p.x, PADDING);
  assert.equal(p.y, PADDING);
});

test('lonLatToXY: SE corner maps to bottom-right of draw area', () => {
  const p = lonLatToXY(CZ_BOUNDS.maxLon, CZ_BOUNDS.minLat);
  assert.ok(Math.abs(p.x - (SVG_WIDTH - PADDING)) < 1e-6);
  assert.ok(Math.abs(p.y - (SVG_HEIGHT - PADDING)) < 1e-6);
});

test('lonLatToXY: monotonic in lon and lat', () => {
  const a = lonLatToXY(14, 50);
  const b = lonLatToXY(15, 50);
  const c = lonLatToXY(14, 49);
  assert.ok(b.x > a.x, 'higher lon -> larger x');
  assert.ok(c.y > a.y, 'lower lat -> larger y (screen-down)');
});

test('nmToPixels: zero is zero, positive is positive', () => {
  assert.equal(nmToPixels(0), 0);
  assert.ok(nmToPixels(5) > 0);
});

test('nmToPixels: linear', () => {
  const a = nmToPixels(2);
  const b = nmToPixels(4);
  assert.ok(Math.abs(b - 2 * a) < 1e-9);
});
