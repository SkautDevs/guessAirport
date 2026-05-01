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

export const CIRCLE_RADIUS_NM = {
  'small-north': 3, 'small-west': 3, 'small-south': 3, 'small-east': 3,
  ultralight: 2
};

export const SPECIAL_TYPES = new Set(['prohibited', 'restricted', 'tra']);

export function typeColor(type) {
  return COLORS[type] || COLORS.airport;
}
