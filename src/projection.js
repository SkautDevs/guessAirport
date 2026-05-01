export const CZ_BOUNDS = {
  minLon: 12.09, maxLon: 18.86,
  minLat: 48.55, maxLat: 51.06
};

export const SVG_WIDTH = 800;
export const SVG_HEIGHT = 500;
export const PADDING = 30;

const CENTER_LAT = (CZ_BOUNDS.minLat + CZ_BOUNDS.maxLat) / 2;
const COS_CENTER = Math.cos(CENTER_LAT * Math.PI / 180);
const LON_RANGE = (CZ_BOUNDS.maxLon - CZ_BOUNDS.minLon) * COS_CENTER;
const LAT_RANGE = CZ_BOUNDS.maxLat - CZ_BOUNDS.minLat;
const DRAW_WIDTH = SVG_WIDTH - 2 * PADDING;
const DRAW_HEIGHT = SVG_HEIGHT - 2 * PADDING;

export function lonLatToXY(lon, lat) {
  return {
    x: PADDING + ((lon - CZ_BOUNDS.minLon) * COS_CENTER / LON_RANGE) * DRAW_WIDTH,
    y: PADDING + ((CZ_BOUNDS.maxLat - lat) / LAT_RANGE) * DRAW_HEIGHT
  };
}

export function nmToPixels(nm) {
  const degLat = nm * (1.852 / 111.32);
  return (degLat / LAT_RANGE) * DRAW_HEIGHT;
}

export function screenToSVG(svg, clientX, clientY) {
  const pt = new DOMPoint(clientX, clientY);
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
