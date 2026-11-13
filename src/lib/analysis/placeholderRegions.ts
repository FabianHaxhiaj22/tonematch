/**
 * PLACEHOLDER skin regions for the M2 debug view only. M3 replaces these with polygons built
 * from indices chosen on the official canonical face mesh map (README §6.2), with a cited source.
 *
 * To avoid guessing mesh indices, these placeholders are derived only from landmark *sets* that
 * MediaPipe exports itself (FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, _LEFT_EYE, _RIGHT_EYE,
 * _LIPS), as axis-aligned boxes between those features. They ignore head tilt.
 *
 * Left/right follow MediaPipe: "left" is the subject's left, which appears on the image's right.
 */

export type Point = { x: number; y: number };
export type Polygon = Point[];

export type FeatureIndexSets = {
  faceOval: readonly number[];
  leftEye: readonly number[];
  rightEye: readonly number[];
  lips: readonly number[];
};

export type PlaceholderRegions = { forehead: Polygon; leftCheek: Polygon; rightCheek: Polygon };

export type PlaceholderGeometry = {
  foreheadTop: number;
  foreheadBottom: number;
  cheekTop: number;
  cheekBottom: number;
};

/**
 * Placeholder geometry, as fractions of distances between features. Not tuned and not used for
 * analysis; only for drawing in the debug view.
 */
export const PLACEHOLDER_GEOMETRY: Readonly<PlaceholderGeometry> = {
  /** Forehead band, measured from the face-oval top (0) down to the eyes' top (1). */
  foreheadTop: 0.25,
  foreheadBottom: 0.6,
  /** Cheek band, measured from the eye's bottom (0) down to the lips' top (1). */
  cheekTop: 0.25,
  cheekBottom: 0.75,
};

type Box = { minX: number; maxX: number; minY: number; maxY: number };

function boxOf(points: readonly Point[], indices: readonly number[]): Box {
  if (indices.length === 0) throw new RangeError("boxOf: empty index set");
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const i of indices) {
    const p = points[i];
    if (!p) throw new RangeError(`boxOf: landmark ${i} missing (have ${points.length})`);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

function rect(minX: number, maxX: number, minY: number, maxY: number): Polygon {
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Build placeholder forehead and cheek boxes from landmarks in **pixel** coordinates (multiply
 * MediaPipe's normalised x/y by image width/height first, so distances aren't distorted).
 */
export function buildPlaceholderRegions(
  points: readonly Point[],
  sets: FeatureIndexSets,
  geometry: Readonly<PlaceholderGeometry> = PLACEHOLDER_GEOMETRY,
): PlaceholderRegions {
  const oval = boxOf(points, sets.faceOval);
  const leftEye = boxOf(points, sets.leftEye);
  const rightEye = boxOf(points, sets.rightEye);
  const lips = boxOf(points, sets.lips);

  const eyesTop = Math.min(leftEye.minY, rightEye.minY);
  const eyesMinX = Math.min(leftEye.minX, rightEye.minX);
  const eyesMaxX = Math.max(leftEye.maxX, rightEye.maxX);
  const forehead = rect(
    eyesMinX,
    eyesMaxX,
    lerp(oval.minY, eyesTop, geometry.foreheadTop),
    lerp(oval.minY, eyesTop, geometry.foreheadBottom),
  );

  const cheekUnder = (eye: Box): Polygon =>
    rect(
      eye.minX,
      eye.maxX,
      lerp(eye.maxY, lips.minY, geometry.cheekTop),
      lerp(eye.maxY, lips.minY, geometry.cheekBottom),
    );

  return { forehead, leftCheek: cheekUnder(leftEye), rightCheek: cheekUnder(rightEye) };
}

/** Unique landmark indices used by a MediaPipe connection list ({ start, end } pairs). */
export function indicesOf(connections: readonly { start: number; end: number }[]): number[] {
  const set = new Set<number>();
  for (const { start, end } of connections) {
    set.add(start);
    set.add(end);
  }
  return [...set].sort((a, b) => a - b);
}
