/**
 * Test helpers for the analysis pipeline: fixture decoding and synthetic images.
 * Synthetic faces reuse the NASA fixture's **normalised landmark geometry** (no pixels), so
 * regions have realistic shapes while every colour is chosen by the test.
 */
import { readFileSync } from "node:fs";
import jpeg from "jpeg-js";
import type { Rgb255 } from "@/lib/color";
import { FACE_OVAL_RING } from "@/lib/analysis/config";
import type { Point } from "@/lib/analysis/geometry";
import { rasterizePolygon, type RgbaImage } from "@/lib/analysis/image";
import type { FlatMatrix } from "@/lib/analysis/matrix";

export const FIXTURE_JPG = "tests/fixtures/faces/nasa-watkins-2017.jpg";
export const FIXTURE_LANDMARKS = "tests/fixtures/faces/nasa-watkins-2017.landmarks.json";

type LandmarkFile = {
  imageWidth: number;
  imageHeight: number;
  faces: { landmarks: { x: number; y: number; z: number }[]; matrix: FlatMatrix | null }[];
};

export function loadFixtureLandmarks(): LandmarkFile {
  return JSON.parse(readFileSync(FIXTURE_LANDMARKS, "utf8")) as LandmarkFile;
}

/** Normalised (0–1) landmarks → pixel coordinates for an image of the given size. */
export function toPixels(lm: readonly { x: number; y: number }[], w: number, h: number): Point[] {
  return lm.map((p) => ({ x: p.x * w, y: p.y * h }));
}

let decoded: RgbaImage | null = null;
/** The NASA fixture as RGBA (decoded once per test file). */
export function loadFixtureImage(): RgbaImage {
  decoded ??= (() => {
    const raw = jpeg.decode(readFileSync(FIXTURE_JPG), { useTArray: true, formatAsRGBA: true });
    return { width: raw.width, height: raw.height, data: raw.data };
  })();
  return decoded;
}

/** Solid-colour image. */
export function solidImage(w: number, h: number, c: Rgb255): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([c.r, c.g, c.b, 255], i * 4);
  return { width: w, height: h, data };
}

/** Image from a per-pixel function. */
export function imageFrom(w: number, h: number, f: (x: number, y: number) => Rgb255): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = f(x, y);
      data.set([c.r, c.g, c.b, 255], (y * w + x) * 4);
    }
  }
  return { width: w, height: h, data };
}

export function setPixel(img: RgbaImage, x: number, y: number, c: Rgb255): void {
  img.data.set([c.r, c.g, c.b, 255], (y * img.width + x) * 4);
}

export function getPixel(img: RgbaImage, x: number, y: number): Rgb255 {
  const o = (y * img.width + x) * 4;
  return { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
}

export type SyntheticFace = { img: RgbaImage; landmarks: Point[]; matrix: FlatMatrix | null };

/**
 * A synthetic "photo": background colour + a face-shaped area (the fixture's face oval, scaled
 * to this image size) filled with `skin`. Optional `face` callback can vary the face colour.
 */
export function syntheticFace(
  w: number,
  h: number,
  opts: {
    background: Rgb255 | ((x: number, y: number) => Rgb255);
    skin: Rgb255 | ((x: number, y: number) => Rgb255);
    /** Scale the face about its centre (the fixture's face is ~24% of the width). Default 1.5. */
    zoom?: number;
  },
): SyntheticFace {
  const fx = loadFixtureLandmarks();
  const face = fx.faces[0]!;
  const zoom = opts.zoom ?? 1.5;
  const raw = toPixels(face.landmarks, w, h);
  const cx = raw.reduce((s, p) => s + p.x, 0) / raw.length;
  const cy = raw.reduce((s, p) => s + p.y, 0) / raw.length;
  const landmarks = raw.map((p) => ({
    x: w / 2 + (p.x - cx) * zoom,
    y: h / 2 + (p.y - cy) * zoom,
  }));
  const bg = opts.background;
  const skin = opts.skin;
  const img = imageFrom(w, h, (x, y) => (typeof bg === "function" ? bg(x, y) : bg));
  const oval = FACE_OVAL_RING.map((i) => landmarks[i]!);
  for (const p of rasterizePolygon(oval, w, h)) {
    const x = p % w;
    const y = Math.floor(p / w);
    setPixel(img, x, y, typeof skin === "function" ? skin(x, y) : skin);
  }
  return { img, landmarks, matrix: face.matrix };
}

/** Deterministic PRNG (mulberry32) for reproducible noise. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Column-major 4×4 rotation R = Ry(yaw)·Rx(pitch)·Rz(roll) (degrees), with translation. */
export function rotationMatrix(yaw: number, pitch: number, roll: number, scale = 1): FlatMatrix {
  const r = (d: number) => (d * Math.PI) / 180;
  const [cy, sy] = [Math.cos(r(yaw)), Math.sin(r(yaw))];
  const [cp, sp] = [Math.cos(r(pitch)), Math.sin(r(pitch))];
  const [cr, sr] = [Math.cos(r(roll)), Math.sin(r(roll))];
  const Ry = [
    [cy, 0, sy],
    [0, 1, 0],
    [-sy, 0, cy],
  ];
  const Rx = [
    [1, 0, 0],
    [0, cp, -sp],
    [0, sp, cp],
  ];
  const Rz = [
    [cr, -sr, 0],
    [sr, cr, 0],
    [0, 0, 1],
  ];
  const mul = (A: number[][], B: number[][]) =>
    A.map((row) => [0, 1, 2].map((j) => row.reduce((s, v, k) => s + v * B[k]![j]!, 0)));
  const R = mul(mul(Ry, Rx), Rz);
  const data: number[] = [];
  for (let c = 0; c < 4; c++) {
    for (let row = 0; row < 4; row++) {
      if (c < 3 && row < 3) data.push(R[row]![c]! * scale);
      else if (c === 3) data.push(row === 3 ? 1 : [1, 2, -60][row]!);
      else data.push(0);
    }
  }
  return { rows: 4, columns: 4, data };
}

/** Skin colour with deterministic ±amp noise per channel (texture, so the face isn't "blurry"). */
export function noisy(c: Rgb255, amp: number, seed = 1): (x: number, y: number) => Rgb255 {
  const rnd = prng(seed);
  const j = () => Math.round((rnd() * 2 - 1) * amp);
  return () => ({ r: c.r + j(), g: c.g + j(), b: c.b + j() });
}
