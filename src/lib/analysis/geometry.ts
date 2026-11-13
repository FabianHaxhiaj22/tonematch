/**
 * Small, pure 2D geometry helpers for skin regions (pixel coordinates, y grows downwards).
 */

export type Point = { x: number; y: number };
export type Polygon = Point[];
export type Box = { minX: number; minY: number; maxX: number; maxY: number };

const cross = (o: Point, a: Point, b: Point) =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Signed area (shoelace). Positive = clockwise on screen (y down). */
export function signedArea(poly: readonly Point[]): number {
  let s = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!;
    const b = poly[i]!;
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export const polygonArea = (poly: readonly Point[]) => Math.abs(signedArea(poly));

export function boundingBox(points: readonly Point[]): Box {
  if (points.length === 0) throw new RangeError("boundingBox: no points");
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** Even-odd point-in-polygon test. */
export function pointInPolygon(p: Point, poly: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Convex hull (Andrew's monotone chain), counter-clockwise in maths orientation. */
export function convexHull(points: readonly Point[]): Polygon {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * Clip `subject` (any simple polygon, may be concave) to the convex polygon `clip` after
 * moving every edge of `clip` inwards by `inset` (≥ 0). Sutherland–Hodgman against the
 * half-planes of the edges, which for a convex clip polygon equals the inset polygon.
 * Returns [] when nothing is left.
 */
export function clipToInsetConvex(
  subject: readonly Point[],
  clip: readonly Point[],
  inset: number,
): Polygon {
  if (clip.length < 3) throw new RangeError("clipToInsetConvex: clip polygon needs ≥ 3 points");
  if (inset < 0) throw new RangeError("clipToInsetConvex: inset must be ≥ 0");
  // Orientation sign so that "inside" is on the same side for every edge.
  const orient = Math.sign(signedArea(clip));
  let out: Point[] = [...subject];
  for (let i = 0; i < clip.length && out.length > 0; i++) {
    const a = clip[i]!;
    const b = clip[(i + 1) % clip.length]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    // Signed distance of p from edge a→b, positive towards the inside.
    const dist = (p: Point) => (orient * cross(a, b, p)) / len - inset;
    const input = out;
    out = [];
    for (let k = 0; k < input.length; k++) {
      const cur = input[k]!;
      const prev = input[(k + input.length - 1) % input.length]!;
      const dc = dist(cur);
      const dp = dist(prev);
      if (dc >= 0) {
        if (dp < 0) out.push(lerpPoint(prev, cur, dp / (dp - dc)));
        out.push(cur);
      } else if (dp >= 0) {
        out.push(lerpPoint(prev, cur, dp / (dp - dc)));
      }
    }
  }
  return out;
}

const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
