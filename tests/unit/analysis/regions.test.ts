import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { describe, expect, it } from "vitest";
import {
  FACE_OUTLINE_INSET_FRACTION,
  FACE_OVAL_RING,
  SKIN_REGION_INDICES,
} from "@/lib/analysis/config";
import { pointInPolygon, polygonArea, type Point, type Polygon } from "@/lib/analysis/geometry";
import {
  REGION_NAMES,
  buildSampledRegions,
  buildSkinRegions,
  faceOutline,
  indicesOf,
} from "@/lib/analysis/regions";
import { loadFixtureLandmarks, toPixels } from "./helpers";

const centroid = (poly: Polygon): Point => ({
  x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
  y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
});

describe("buildSkinRegions", () => {
  it("maps each configured index to its landmark, in order", () => {
    const points: Point[] = Array.from({ length: 478 }, (_, i) => ({ x: i, y: 2 * i }));
    const regions = buildSkinRegions(points);
    for (const name of REGION_NAMES) {
      expect(regions[name]).toEqual(SKIN_REGION_INDICES[name].map((i) => ({ x: i, y: 2 * i })));
    }
  });

  it("copies points (doesn't keep extra fields such as z)", () => {
    const points = Array.from({ length: 478 }, () => ({ x: 1, y: 2, z: 3 }));
    expect(buildSkinRegions(points).forehead[0]).toStrictEqual({ x: 1, y: 2 });
  });

  it("accepts custom indices", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    const r = buildSkinRegions(points, { rightCheek: [0, 1, 2], leftCheek: [2, 1], forehead: [0] });
    expect(r.leftCheek).toEqual([points[2], points[1]]);
    expect(r.forehead).toEqual([points[0]]);
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
  const all = REGION_NAMES.flatMap((n) => [...SKIN_REGION_INDICES[n]]);

  it("uses valid mesh indices (0–467, no irises) without duplicates", () => {
    for (const i of all) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(468);
    }
    expect(new Set(all).size).toBe(all.length);
  });

  it("cheeks have the same number of vertices (mirror pair)", () => {
    expect(SKIN_REGION_INDICES.leftCheek.length).toBe(SKIN_REGION_INDICES.rightCheek.length);
  });

  it("never uses eye, iris, lip or face-oval landmarks (MediaPipe's own sets)", () => {
    const excluded = new Set(
      [
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
        FaceLandmarker.FACE_LANDMARKS_LIPS,
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
      ].flatMap(indicesOf),
    );
    expect(all.filter((i) => excluded.has(i))).toEqual([]);
  });

  it("only the forehead touches the brows, and only along their top edge", () => {
    const brows = new Set(
      [
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
      ].flatMap(indicesOf),
    );
    expect(SKIN_REGION_INDICES.rightCheek.filter((i) => brows.has(i))).toEqual([]);
    expect(SKIN_REGION_INDICES.leftCheek.filter((i) => brows.has(i))).toEqual([]);
    expect(SKIN_REGION_INDICES.forehead.filter((i) => brows.has(i)).sort((a, b) => a - b)).toEqual([
      66, 107, 296, 336,
    ]);
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

/**
 * Structure only, on the real-face fixture (tests/fixtures/SOURCES.md: never assert the
 * person's colour values). Landmarks were exported once from /dev/landmarks, so no WASM here.
 */
describe("regions on the NASA fixture landmarks", () => {
  const fx = loadFixtureLandmarks();
  const face = fx.faces[0]!;
  const px = toPixels(face.landmarks, fx.imageWidth, fx.imageHeight);
  const raw = buildSkinRegions(px);
  const { outline, regions } = buildSampledRegions(px);
  const at = (i: number) => px[i]!;

  it("has one face with 478 landmarks", () => {
    expect(fx.faces).toHaveLength(1);
    expect(face.landmarks).toHaveLength(478);
  });

  it("every configured region vertex lies inside the face oval", () => {
    for (const name of REGION_NAMES) {
      for (const p of raw[name]) expect(pointInPolygon(p, outline.oval)).toBe(true);
    }
  });

  it("clipped regions stay at least the inset away from the outline", () => {
    const inset = FACE_OUTLINE_INSET_FRACTION * outline.width;
    for (const name of REGION_NAMES) {
      expect(regions[name].length).toBeGreaterThanOrEqual(3);
      for (const p of regions[name]) {
        // Moving the point outwards by just under the inset in any direction stays inside.
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
    const eyesTop = Math.min(at(159).y, at(386).y); // upper eyelids (RIGHT_EYE / LEFT_EYE sets)
    const eyesBottom = Math.max(at(145).y, at(374).y); // lower eyelids
    const mouthTop = at(0).y; // upper lip, centre (LIPS set)
    const f = centroid(regions.forehead);
    const r = centroid(regions.rightCheek);
    const l = centroid(regions.leftCheek);
    expect(f.y).toBeLessThan(eyesTop);
    for (const c of [r, l]) {
      expect(c.y).toBeGreaterThan(eyesBottom);
      expect(c.y).toBeLessThan(mouthTop);
    }
    // Subject's right cheek appears on the image's left.
    expect(r.x).toBeLessThan(at(1).x); // 1 = nose tip (NOSE set)
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
