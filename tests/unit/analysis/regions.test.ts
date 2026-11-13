import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { describe, expect, it } from "vitest";
import {
  CHEEK_INDICES,
  FACE_OUTLINE_INSET_FRACTION,
  FACE_OVAL_RING,
  FOREHEAD_HEIGHT_FRACTION,
  FOREHEAD_LOWER_RING,
  FOREHEAD_UPPER_RING,
  REGION_LANDMARKS,
} from "@/lib/analysis/config";
import {
  isSimplePolygon,
  pointInPolygon,
  polygonArea,
  type Point,
  type Polygon,
} from "@/lib/analysis/geometry";
import {
  REGION_NAMES,
  buildSampledRegions,
  buildSkinRegions,
  faceOutline,
  foreheadPolygon,
  indicesOf,
} from "@/lib/analysis/regions";
import { canonicalVertices, loadFixtureLandmarks, poseLandmarks, toPixels } from "./helpers";

const centroid = (poly: Polygon): Point => ({
  x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
  y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
});

const set = (connections: readonly { start: number; end: number }[][]) =>
  new Set(connections.flatMap(indicesOf));
const BROWS = set([
  FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
]);

/** Mirror partner of each canonical vertex (x → −x). */
function mirrorOf(i: number): number {
  const v = canonicalVertices();
  const [x, y, z] = v[i]!;
  let best = -1;
  let bestD = Infinity;
  v.forEach(([a, b, c], k) => {
    const d = Math.hypot(a + x, b - y, c - z);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  });
  expect(bestD).toBeLessThan(1e-5);
  return best;
}

describe("buildSkinRegions", () => {
  const points: Point[] = Array.from({ length: 478 }, (_, i) => ({ x: i, y: 2 * i }));

  it("maps each cheek index to its landmark, in order", () => {
    const r = buildSkinRegions(points);
    expect(r.rightCheek).toEqual(CHEEK_INDICES.rightCheek.map((i) => ({ x: i, y: 2 * i })));
    expect(r.leftCheek).toEqual(CHEEK_INDICES.leftCheek.map((i) => ({ x: i, y: 2 * i })));
  });

  it("builds the forehead from the lower ring and a top edge part-way to the face oval", () => {
    const f = foreheadPolygon(points, 0.5);
    expect(f).toHaveLength(2 * FOREHEAD_LOWER_RING.length);
    expect(f.slice(0, 5)).toEqual(FOREHEAD_LOWER_RING.map((i) => ({ x: i, y: 2 * i })));
    // Top edge, reversed: midpoint between 299 and 297 first, between 69 and 67 last.
    expect(f[5]).toEqual({ x: (299 + 297) / 2, y: 299 + 297 });
    expect(f[9]).toEqual({ x: (69 + 67) / 2, y: 69 + 67 });
    expect(buildSkinRegions(points).forehead).toEqual(
      foreheadPolygon(points, FOREHEAD_HEIGHT_FRACTION),
    );
  });

  it("copies points (doesn't keep extra fields such as z)", () => {
    const pts = Array.from({ length: 478 }, () => ({ x: 1, y: 2, z: 3 }));
    expect(buildSkinRegions(pts).rightCheek[0]).toStrictEqual({ x: 1, y: 2 });
  });

  it("throws when a landmark is missing", () => {
    expect(() => buildSkinRegions([{ x: 0, y: 0 }])).toThrow(/landmark \d+ missing \(have 1\)/);
    expect(() => faceOutline([{ x: 0, y: 0 }])).toThrow(/faceOutline: landmark/);
  });
});

describe("indicesOf", () => {
  it("returns unique, sorted indices", () => {
    expect(
      indicesOf([
        { start: 5, end: 2 },
        { start: 2, end: 9 },
      ]),
    ).toEqual([2, 5, 9]);
  });
});

describe("config indices", () => {
  const all = REGION_NAMES.flatMap((n) => [...REGION_LANDMARKS[n]]);

  it("uses valid mesh indices (0–467, no irises) without duplicates", () => {
    for (const i of all) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(468);
    }
    expect(new Set(all).size).toBe(all.length);
  });

  it("never uses eye, iris, brow, lip or face-oval landmarks as region vertices", () => {
    const excluded = set([
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
      FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
      FaceLandmarker.FACE_LANDMARKS_LIPS,
      FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
    ]);
    expect(all.filter((i) => excluded.has(i))).toEqual([]);
  });

  it("the forehead's upper ring is the face oval (only used to place the top edge)", () => {
    const oval = new Set<number>(FACE_OVAL_RING);
    for (const i of FOREHEAD_UPPER_RING) expect(oval.has(i)).toBe(true);
  });

  it("is mirror-symmetric on the canonical mesh (x → −x)", () => {
    expect(CHEEK_INDICES.rightCheek.map(mirrorOf)).toEqual([...CHEEK_INDICES.leftCheek]);
    expect(FOREHEAD_LOWER_RING.map(mirrorOf)).toEqual([...FOREHEAD_LOWER_RING].reverse());
    expect(FOREHEAD_UPPER_RING.map(mirrorOf)).toEqual([...FOREHEAD_UPPER_RING].reverse());
  });

  it("FACE_OVAL_RING is MediaPipe's face oval, as one closed ring of its edges", () => {
    const edges = FaceLandmarker.FACE_LANDMARKS_FACE_OVAL;
    expect([...FACE_OVAL_RING].sort((a, b) => a - b)).toEqual(indicesOf(edges));
    const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
    const edgeSet = new Set(edges.map((e) => key(e.start, e.end)));
    FACE_OVAL_RING.forEach((v, i) => {
      const next = FACE_OVAL_RING[(i + 1) % FACE_OVAL_RING.length]!;
      expect(edgeSet.has(key(v, next))).toBe(true);
    });
    expect(FACE_OVAL_RING).toHaveLength(edges.length);
  });
});

describe("head poses (canonical mesh rotated and projected)", () => {
  const poses: { yaw: number; pitch: number; roll: number }[] = [];
  for (const yaw of [-30, -19, -10, 0, 10, 19, 30]) {
    for (const pitch of [-20, 0, 20]) {
      for (const roll of [-20, -16.5, 0, 16.5, 20]) poses.push({ yaw, pitch, roll });
    }
  }

  it.each(poses)("no region polygon self-intersects at %o", (pose) => {
    const { landmarks } = poseLandmarks(pose, 800, 1000);
    const raw = buildSkinRegions(landmarks);
    for (const name of REGION_NAMES) expect(isSimplePolygon(raw[name])).toBe(true);
    expect(buildSampledRegions(landmarks).reordered).toEqual([]);
  });

  it("the forehead lies above every brow landmark when the face is level", () => {
    for (const pitch of [-20, 0, 20]) {
      const { landmarks } = poseLandmarks({ pitch }, 800, 1000);
      const browTop = Math.min(...[...BROWS].map((i) => landmarks[i]!.y));
      const foreheadBottom = Math.max(...buildSkinRegions(landmarks).forehead.map((p) => p.y));
      expect(foreheadBottom).toBeLessThan(browTop);
    }
  });

  it("frontal: nothing is clipped and both cheeks match", () => {
    const g = buildSampledRegions(poseLandmarks({}, 800, 1000).landmarks);
    expect(g.keptAreaFraction.rightCheek).toBeCloseTo(1, 6);
    expect(g.keptAreaFraction.leftCheek).toBeCloseTo(1, 6);
    expect(polygonArea(g.regions.leftCheek)).toBeCloseTo(polygonArea(g.regions.rightCheek), 6);
  });

  it("a strong head turn clips the far cheek much more than the near one", () => {
    // Negative yaw turns the subject's right cheek away (it appears on the image's left).
    const g = buildSampledRegions(poseLandmarks({ yaw: -25 }, 800, 1000).landmarks);
    expect(g.keptAreaFraction.rightCheek).toBeLessThan(0.5);
    expect(g.keptAreaFraction.leftCheek).toBeCloseTo(1, 6);
  });

  it("reorders a self-intersecting cheek (swapped landmarks) instead of losing its area", () => {
    const { landmarks } = poseLandmarks({}, 800, 1000);
    const good = buildSampledRegions(landmarks);
    const swapped = [...landmarks];
    const [a, b] = [CHEEK_INDICES.rightCheek[1], CHEEK_INDICES.rightCheek[4]];
    [swapped[a], swapped[b]] = [swapped[b]!, swapped[a]!];
    expect(isSimplePolygon(buildSkinRegions(swapped).rightCheek)).toBe(false);
    const fixed = buildSampledRegions(swapped);
    expect(fixed.reordered).toEqual(["rightCheek"]);
    expect(isSimplePolygon(fixed.regions.rightCheek)).toBe(true);
    // The cheek is star-shaped, so angle order gives back its convex-ish outline: at least as
    // much area as the intended polygon (the notch at 50 may fill in), never a lost lobe.
    expect(polygonArea(fixed.regions.rightCheek)).toBeGreaterThanOrEqual(
      polygonArea(good.regions.rightCheek) * 0.99,
    );
  });
});

/**
 * Structure only, on the real-face fixture (tests/fixtures/SOURCES.md: never assert the
 * person's colour values). Landmarks were exported once from /dev/landmarks, so no WASM here.
 */
describe("regions on the NASA fixture landmarks", () => {
  const fx = loadFixtureLandmarks();
  const face = fx.faces[0]!;
  const px = toPixels(face.landmarks, fx.imageWidth, fx.imageHeight);
  const raw = buildSkinRegions(px);
  const { outline, regions, reordered } = buildSampledRegions(px);
  const at = (i: number) => px[i]!;

  it("has one face with 478 landmarks", () => {
    expect(fx.faces).toHaveLength(1);
    expect(face.landmarks).toHaveLength(478);
  });

  it("region polygons are simple (no self-intersection) and weren't reordered", () => {
    for (const name of REGION_NAMES) expect(isSimplePolygon(raw[name])).toBe(true);
    expect(reordered).toEqual([]);
  });

  it("every region vertex lies inside the face oval", () => {
    for (const name of REGION_NAMES) {
      for (const p of raw[name]) expect(pointInPolygon(p, outline.oval)).toBe(true);
    }
  });

  it("the forehead lies entirely above the brows and contains no brow landmark", () => {
    const browTop = Math.min(...[...BROWS].map((i) => at(i).y));
    for (const p of regions.forehead) expect(p.y).toBeLessThan(browTop);
    for (const i of BROWS) expect(pointInPolygon(at(i), regions.forehead)).toBe(false);
  });

  it("clipped regions stay at least the inset away from the outline", () => {
    const inset = FACE_OUTLINE_INSET_FRACTION * outline.width;
    for (const name of REGION_NAMES) {
      expect(regions[name].length).toBeGreaterThanOrEqual(3);
      for (const p of regions[name]) {
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const q = { x: p.x + dx * inset * 0.99, y: p.y + dy * inset * 0.99 };
          expect(pointInPolygon(q, outline.hull)).toBe(true);
        }
      }
    }
  });

  it("clipping never adds area", () => {
    for (const name of REGION_NAMES) {
      expect(polygonArea(regions[name])).toBeLessThanOrEqual(polygonArea(raw[name]) + 1e-6);
    }
  });

  it("a larger inset shrinks the cheeks", () => {
    const tight = buildSampledRegions(px, 0.2).regions;
    expect(polygonArea(tight.rightCheek)).toBeLessThan(polygonArea(regions.rightCheek));
    expect(polygonArea(tight.leftCheek)).toBeLessThan(polygonArea(regions.leftCheek));
  });

  it("regions sit in the right places relative to eyes, nose tip and mouth", () => {
    const eyesTop = Math.min(at(159).y, at(386).y); // upper eyelids
    const eyesBottom = Math.max(at(145).y, at(374).y); // lower eyelids
    const mouthTop = at(0).y; // upper lip, centre
    const f = centroid(regions.forehead);
    const r = centroid(regions.rightCheek);
    const l = centroid(regions.leftCheek);
    expect(f.y).toBeLessThan(eyesTop);
    for (const c of [r, l]) {
      expect(c.y).toBeGreaterThan(eyesBottom);
      expect(c.y).toBeLessThan(mouthTop);
    }
    expect(r.x).toBeLessThan(at(1).x); // 1 = nose tip; subject's right is on the image's left
    expect(l.x).toBeGreaterThan(at(1).x);
  });

  it("regions don't overlap each other", () => {
    for (const a of REGION_NAMES) {
      for (const b of REGION_NAMES) {
        if (a === b) continue;
        for (const p of regions[a]) expect(pointInPolygon(p, regions[b])).toBe(false);
      }
    }
  });

  it("face outline width is the oval's bounding-box width", () => {
    const xs = outline.oval.map((p) => p.x);
    expect(outline.width).toBeCloseTo(Math.max(...xs) - Math.min(...xs), 9);
  });
});
