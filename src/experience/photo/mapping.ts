export type PhotoSceneId = 'collins' | 'facade' | 'sphere';
export const PHOTO_WIDTH = 1672;
export const PHOTO_HEIGHT = 941;
export const PANEL_ASPECT: Record<PhotoSceneId, number> = { collins: .78, facade: 2.65, sphere: 1.75 };
export type SurfacePoint = { u: number; v: number; shade: number; edge: number };
type Vertex = [number, number, number, number];
type Column = [number, number, number, number, number];
const curvedColumns: Column[] = [
  [0, 634, 199, 609, 589], [.06, 645, 171, 626, 578], [.13, 665, 146, 651, 565],
  [.22, 704, 118, 697, 556], [.3, 763, 112, 761, 556], [1, 1518, 295, 1540, 629],
];
const towerFaces: Vertex[][] = [
  [[857, 0, 0, 0], [1025, 36, .5, 0], [1025, 665, .5, 1], [857, 627, 0, 1]],
  [[1025, 36, .5, 0], [1201, 0, 1, 0], [1201, 628, 1, 1], [1025, 665, .5, 1]],
];
function triangle(x: number, y: number, a: Vertex, b: Vertex, c: Vertex): SurfacePoint | null {
  const denom = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  const wa = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / denom;
  const wb = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / denom;
  const wc = 1 - wa - wb;
  if (Math.min(wa, wb, wc) < -1e-6) return null;
  return { u: wa * a[2] + wb * b[2] + wc * c[2], v: wa * a[3] + wb * b[3] + wc * c[3], shade: 1, edge: 1 };
}
function quad(x: number, y: number, vertices: Vertex[]) {
  return triangle(x, y, vertices[0], vertices[1], vertices[2]) ?? triangle(x, y, vertices[0], vertices[2], vertices[3]);
}
/** Reference pixel coordinates. The asset baker and mouse hit testing share
 * this exact mapping, including non-display areas and corner continuity. */
export function mapPhotoSurface(id: PhotoSceneId, x: number, y: number): SurfacePoint | null {
  if (id === 'sphere') {
    const dy = (y - 566) / 303;
    if (Math.abs(dy) >= 1) return null;
    const radius = 299 * Math.sqrt(1 - dy * dy);
    const dx = (x - 959) / radius;
    const bottom = 644 - 6 * Math.pow((x - 959) / 299, 2);
    if (Math.abs(dx) >= 1 || y > bottom) return null;
    const latitude = Math.asin(dy);
    // The entire above-ground dome is a display, including its crown. Keep
    // the longitude seam behind this fixed front view and exclude the lobby.
    return { u: Math.asin(dx) / Math.PI + .5, v: Math.max(0, Math.min(1, (latitude + Math.PI / 2) / (Math.asin((644 - 566) / 303) + Math.PI / 2))),
      shade: .7 + .3 * Math.sqrt((1 - dx * dx) * (1 - dy * dy)), edge: Math.min(radius - Math.abs(x - 959), y - 263, bottom - y) };
  }
  if (id === 'collins') {
    if (x < 857 || x > 1201) return null;
    const top = x < 1025 ? 397 - (x - 857) / 168 * 361 : 36 + (x - 1025) / 176 * 362;
    if (y < top) return null;
    for (const vertices of towerFaces) {
      const point = quad(x, y, vertices);
      if (point) return { ...point, shade: x < 1025 ? .8 : 1, edge: Math.min(y - top, x - 857, 1201 - x, (x < 1025 ? 627 + (x - 857) / 168 * 38 : 665 - (x - 1025) / 176 * 37) - y) };
    }
    return null;
  }
  for (let index = 0; index < curvedColumns.length - 1; index++) {
    const a = curvedColumns[index], b = curvedColumns[index + 1];
    const point = quad(x, y, [[a[1], a[2], a[0], 0], [b[1], b[2], b[0], 0], [b[3], b[4], b[0], 1], [a[3], a[4], a[0], 1]]);
    if (point) return { ...point, shade: .64 + .36 * Math.min(1, point.u / .3), edge: Math.min(point.v, 1 - point.v) * 400 };
  }
  return null;
}
export function mediaCoordinates(point: SurfacePoint, id: PhotoSceneId, aspect: number, offset: number, vertical: number) {
  const panel = PANEL_ASPECT[id];
  const u = (point.u - .5) * Math.min(1, panel / aspect) + .5 + offset / 100;
  const v = (point.v - .5) * Math.min(1, aspect / panel) + .5 + vertical / 100;
  return { u: u - Math.floor(u), v: Math.max(0, Math.min(1, v)) };
}
