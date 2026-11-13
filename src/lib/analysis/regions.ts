/**
 * Skin-sampling polygons from Face Landmarker landmarks (README §6.2). Indices and their source
 * are in config.ts (SKIN_REGION_INDICES, FACE_OVAL_RING).
 */
import {
  FACE_OUTLINE_INSET_FRACTION,
  FACE_OVAL_RING,
  SKIN_REGION_INDICES,
  type RegionName,
} from "./config";
import { boundingBox, clipToInsetConvex, convexHull, type Point, type Polygon } from "./geometry";

export type { Point, Polygon } from "./geometry";
export type SkinRegions = Record<RegionName, Polygon>;

export const REGION_NAMES = Object.keys(SKIN_REGION_INDICES) as RegionName[];

function pick(points: readonly Point[], indices: readonly number[], what: string): Polygon {
  return indices.map((i) => {
    const p = points[i];
    if (!p) throw new RangeError(`${what}: landmark ${i} missing (have ${points.length})`);
    return { x: p.x, y: p.y };
  });
}

/**
 * The three skin polygons, straight from the configured indices. Pass landmarks in **pixel**
 * coordinates (multiply MediaPipe's normalised x/y by image width/height first).
 */
export function buildSkinRegions(
  points: readonly Point[],
  indices: Readonly<Record<RegionName, readonly number[]>> = SKIN_REGION_INDICES,
): SkinRegions {
  return {
    rightCheek: pick(points, indices.rightCheek, "buildSkinRegions"),
    leftCheek: pick(points, indices.leftCheek, "buildSkinRegions"),
    forehead: pick(points, indices.forehead, "buildSkinRegions"),
  };
}

export type FaceOutline = {
  /** Face-oval landmarks in ring order. */
  oval: Polygon;
  /** Convex hull of the oval (used for clipping). */
  hull: Polygon;
  /** Width of the oval's bounding box, px. */
  width: number;
};

export function faceOutline(points: readonly Point[]): FaceOutline {
  const oval = pick(points, FACE_OVAL_RING, "faceOutline");
  const box = boundingBox(oval);
  return { oval, hull: convexHull(oval), width: box.maxX - box.minX };
}

export type SampledRegions = {
  outline: FaceOutline;
  /** Polygons after clipping to the inset face outline. A region may be empty ([]). */
  regions: SkinRegions;
};

/**
 * Skin polygons clipped to the face outline moved inwards by
 * `insetFraction × face width` (keeps cheeks off hair and the face side when the head turns).
 */
export function buildSampledRegions(
  points: readonly Point[],
  insetFraction: number = FACE_OUTLINE_INSET_FRACTION,
): SampledRegions {
  const outline = faceOutline(points);
  const raw = buildSkinRegions(points);
  const inset = insetFraction * outline.width;
  const clip = (poly: Polygon) => clipToInsetConvex(poly, outline.hull, inset);
  return {
    outline,
    regions: {
      rightCheek: clip(raw.rightCheek),
      leftCheek: clip(raw.leftCheek),
      forehead: clip(raw.forehead),
    },
  };
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
