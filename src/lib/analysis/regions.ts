/**
 * Skin-sampling polygons from Face Landmarker landmarks (README §6.2). Indices and their source
 * are in config.ts (CHEEK_INDICES, FOREHEAD_*_RING, FACE_OVAL_RING).
 */
import {
  CHEEK_INDICES,
  FACE_OUTLINE_INSET_FRACTION,
  FACE_OVAL_RING,
  FOREHEAD_HEIGHT_FRACTION,
  FOREHEAD_LOWER_RING,
  FOREHEAD_UPPER_RING,
  type RegionName,
} from "./config";
import {
  boundingBox,
  clipToInsetConvex,
  convexHull,
  isSimplePolygon,
  orderByAngle,
  polygonArea,
  type Point,
  type Polygon,
} from "./geometry";

export type { Point, Polygon } from "./geometry";
export type SkinRegions = Record<RegionName, Polygon>;

export const REGION_NAMES: readonly RegionName[] = ["rightCheek", "leftCheek", "forehead"];

function pick(points: readonly Point[], indices: readonly number[], what: string): Polygon {
  return indices.map((i) => {
    const p = points[i];
    if (!p) throw new RangeError(`${what}: landmark ${i} missing (have ${points.length})`);
    return { x: p.x, y: p.y };
  });
}

/**
 * Forehead polygon: the lower ring, then the top edge (FOREHEAD_HEIGHT_FRACTION of the way to
 * the face oval above each lower vertex) back in reverse order.
 */
export function foreheadPolygon(
  points: readonly Point[],
  heightFraction: number = FOREHEAD_HEIGHT_FRACTION,
): Polygon {
  const lower = pick(points, FOREHEAD_LOWER_RING, "foreheadPolygon");
  const upper = pick(points, FOREHEAD_UPPER_RING, "foreheadPolygon");
  const top = lower.map((p, i) => ({
    x: p.x + (upper[i]!.x - p.x) * heightFraction,
    y: p.y + (upper[i]!.y - p.y) * heightFraction,
  }));
  return [...lower, ...top.reverse()];
}

/**
 * The three skin polygons as configured (cheeks as convex hulls), before any clipping. Pass landmarks in **pixel**
 * coordinates (multiply MediaPipe's normalised x/y by image width/height first).
 */
export function buildSkinRegions(points: readonly Point[]): SkinRegions {
  return {
    // Cheeks are meant to be convex (config.ts); the hull keeps them so despite landmark noise.
    rightCheek: convexHull(pick(points, CHEEK_INDICES.rightCheek, "buildSkinRegions")),
    leftCheek: convexHull(pick(points, CHEEK_INDICES.leftCheek, "buildSkinRegions")),
    forehead: foreheadPolygon(points),
  };
}

export type FaceOutline = {
  /** Face-oval landmarks in ring order. */
  oval: Polygon;
  /**
   * Visible face outline: convex hull of **all** landmarks (used for clipping). Facing the
   * camera it equals the oval's hull; with the head turned it follows the far cheek (D-024).
   */
  hull: Polygon;
  /** Width of the oval's bounding box, px. */
  width: number;
};

export function faceOutline(points: readonly Point[]): FaceOutline {
  const oval = pick(points, FACE_OVAL_RING, "faceOutline");
  const box = boundingBox(oval);
  return { oval, hull: convexHull(points), width: box.maxX - box.minX };
}

export type SampledRegions = {
  outline: FaceOutline;
  /** Polygons after clipping to the inset face outline. A region may be empty ([]). */
  regions: SkinRegions;
  /** Clipped area / configured area, per region (1 = nothing clipped). For diagnostics. */
  keptAreaFraction: Record<RegionName, number>;
  /**
   * Regions whose landmark polygon crossed itself on this face and were reordered by angle
   * around their centroid before clipping (should be rare; logged for diagnostics).
   */
  reordered: RegionName[];
};

/**
 * Skin polygons ready for sampling: self-intersecting ones are reordered, then each is clipped
 * to the face outline moved inwards by `insetFraction × face width` (keeps cheeks off hair and
 * the face side when the head turns).
 */
export function buildSampledRegions(
  points: readonly Point[],
  insetFraction: number = FACE_OUTLINE_INSET_FRACTION,
): SampledRegions {
  const outline = faceOutline(points);
  const raw = buildSkinRegions(points);
  const inset = insetFraction * outline.width;
  const regions = {} as SkinRegions;
  const keptAreaFraction = {} as Record<RegionName, number>;
  const reordered: RegionName[] = [];
  for (const name of REGION_NAMES) {
    let poly = raw[name];
    if (!isSimplePolygon(poly)) {
      poly = orderByAngle(poly);
      reordered.push(name);
    }
    const clipped = clipToInsetConvex(poly, outline.hull, inset);
    regions[name] = clipped;
    const before = polygonArea(poly);
    keptAreaFraction[name] = before > 0 ? polygonArea(clipped) / before : 0;
  }
  return { outline, regions, keptAreaFraction, reordered };
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
