export const COLORS = {
  airport: '#268bd2',
  prohibited: '#dc322f',
  restricted: '#859900',
  tra: '#b58900',
  vor: '#6c71c4',
  border: '#586e75',
  grid: '#d5cdb6',
  correct: '#2aa198',
  wrong: '#dc322f',
  labelBg: '#fdf6e3'
};

export const STROKE = {
  border: 2.5,
  grid: 0.5,
  ctr: 1.5,
  runway: 2.5,
  runwayUL: 1.5,
  circle: 1.2,
  circleUL: 0.8
};

// Per-type configuration. shape: 'ctr' | 'circle' | 'vor'.
// hitRadiusPx is used when shape is not 'ctr' (overrides pxRadius).
// radiusNM (when set) is the click/draw radius in nautical miles for circle types.
// fillOp applies to CTR polygons.
export const TYPES = {
  large:         { color: COLORS.airport,    shape: 'ctr',    fillOp: 0.06 },
  medium:        { color: COLORS.airport,    shape: 'ctr',    fillOp: 0.06 },
  'small-north': { color: COLORS.airport,    shape: 'circle', radiusNM: 3 },
  'small-west':  { color: COLORS.airport,    shape: 'circle', radiusNM: 3 },
  'small-south': { color: COLORS.airport,    shape: 'circle', radiusNM: 3 },
  'small-east':  { color: COLORS.airport,    shape: 'circle', radiusNM: 3 },
  ultralight:    { color: COLORS.airport,    shape: 'circle', radiusNM: 2 },
  vor:           { color: COLORS.vor,        shape: 'vor',    hitRadiusPx: 14 },
  prohibited:    { color: COLORS.prohibited, shape: 'ctr',    fillOp: 0.08 },
  restricted:    { color: COLORS.restricted, shape: 'ctr',    fillOp: 0.08 },
  tra:           { color: COLORS.tra,        shape: 'ctr',    fillOp: 0.08 },
};

export function typeOf(airport) {
  return TYPES[airport.type] || TYPES.large;
}
