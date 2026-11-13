/**
 * Photo quality gate (README §6.1). Judges what can be measured: face count and size, exposure
 * (from clipping and the image histogram, never from skin lightness), colour cast, blur, head
 * angle. Beauty filters, skin smoothing and tinted glasses are NOT detected (no reliable
 * signal); the guide screen covers them.
 */
import { srgbToLab } from "@/lib/color";
import {
  BLUR_ANALYSIS_WIDTH,
  BLUR_BOX_INSET_FRACTION,
  BLUR_MIN_LAPLACIAN_VARIANCE,
  CLIP_BRIGHT_LEVEL,
  CLIP_DARK_LEVEL,
  COLOR_CAST_BRIGHT_FRACTION,
  COLOR_CAST_MAX_CHROMA,
  COLOR_CAST_MIN_PIXELS,
  FACE_CLIPPED_MAX_FRACTION,
  FACE_MIN_WIDTH_FRACTION,
  IMAGE_HIGH_PERCENTILE,
  IMAGE_LOW_PERCENTILE,
  IMAGE_MAX_P1_LUMA,
  IMAGE_MIN_P99_LUMA,
  MAX_HEAD_ANGLE_DEG,
} from "./config";
import { boundingBox, type Box, type Point } from "./geometry";
import { lumaAt, maskFromIndices, rasterizePolygon, type RgbaImage } from "./image";
import { headAngles, toMat4, type FlatMatrix, type HeadAngles } from "./matrix";
import { faceOutline } from "./regions";

export type QualityCode =
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "FACE_TOO_SMALL"
  | "TOO_DARK"
  | "TOO_BRIGHT"
  | "COLOR_CAST"
  | "BLURRY"
  | "HEAD_TILTED";

/**
 * `blocking` issues stop the analysis; `warning`s can be overridden ("analyse anyway"), which
 * lowers confidence (README §6.1).
 */
export type QualityIssue = {
  code: QualityCode;
  severity: "blocking" | "warning";
  /** The measured value that triggered the issue, and the limit it crossed (for UI/debug). */
  value?: number;
  limit?: number;
};

/** Raw measurements, for the debug view and for calibrating the thresholds. */
export type QualityMetrics = {
  faceWidthFraction: number;
  faceDarkClippedFraction: number;
  faceBrightClippedFraction: number;
  imageP99Luma: number;
  imageP1Luma: number;
  /** null when there weren't enough background pixels to judge. */
  backgroundCastChroma: number | null;
  laplacianVariance: number;
  angles: HeadAngles | null;
};

export type QualityResult = {
  ok: boolean;
  issues: QualityIssue[];
  metrics: QualityMetrics | null;
};

export type QualityFace = { landmarksPx: readonly Point[]; matrix: FlatMatrix | null };

export function assessQuality(img: RgbaImage, faces: readonly QualityFace[]): QualityResult {
  if (faces.length === 0) {
    return { ok: false, issues: [{ code: "NO_FACE", severity: "blocking" }], metrics: null };
  }
  if (faces.length > 1) {
    return {
      ok: false,
      issues: [{ code: "MULTIPLE_FACES", severity: "blocking", value: faces.length, limit: 1 }],
      metrics: null,
    };
  }
  const face = faces[0]!;
  const outline = faceOutline(face.landmarksPx);
  const facePixels = rasterizePolygon(outline.oval, img.width, img.height);
  const hullMask = maskFromIndices(
    rasterizePolygon(outline.hull, img.width, img.height),
    img.width,
    img.height,
  );

  const metrics: QualityMetrics = {
    faceWidthFraction: outline.width / img.width,
    ...faceClipping(img, facePixels),
    ...lumaPercentiles(img),
    backgroundCastChroma: backgroundCast(img, hullMask),
    laplacianVariance: laplacianVariance(
      img,
      insetBox(boundingBox(outline.oval), BLUR_BOX_INSET_FRACTION),
    ),
    angles: face.matrix ? headAngles(toMat4(face.matrix)) : null,
  };

  const issues: QualityIssue[] = [];
  const warn = (code: QualityCode, value: number, limit: number) =>
    issues.push({ code, severity: "warning", value, limit });

  if (metrics.faceWidthFraction < FACE_MIN_WIDTH_FRACTION) {
    warn("FACE_TOO_SMALL", metrics.faceWidthFraction, FACE_MIN_WIDTH_FRACTION);
  }
  if (metrics.faceDarkClippedFraction > FACE_CLIPPED_MAX_FRACTION) {
    warn("TOO_DARK", metrics.faceDarkClippedFraction, FACE_CLIPPED_MAX_FRACTION);
  } else if (metrics.imageP99Luma < IMAGE_MIN_P99_LUMA) {
    warn("TOO_DARK", metrics.imageP99Luma, IMAGE_MIN_P99_LUMA);
  }
  if (metrics.faceBrightClippedFraction > FACE_CLIPPED_MAX_FRACTION) {
    warn("TOO_BRIGHT", metrics.faceBrightClippedFraction, FACE_CLIPPED_MAX_FRACTION);
  } else if (metrics.imageP1Luma > IMAGE_MAX_P1_LUMA) {
    warn("TOO_BRIGHT", metrics.imageP1Luma, IMAGE_MAX_P1_LUMA);
  }
  if (
    metrics.backgroundCastChroma !== null &&
    metrics.backgroundCastChroma > COLOR_CAST_MAX_CHROMA
  ) {
    warn("COLOR_CAST", metrics.backgroundCastChroma, COLOR_CAST_MAX_CHROMA);
  }
  if (metrics.laplacianVariance < BLUR_MIN_LAPLACIAN_VARIANCE) {
    warn("BLURRY", metrics.laplacianVariance, BLUR_MIN_LAPLACIAN_VARIANCE);
  }
  if (metrics.angles) {
    const worst = Math.max(Math.abs(metrics.angles.yaw), Math.abs(metrics.angles.pitch));
    if (worst > MAX_HEAD_ANGLE_DEG) warn("HEAD_TILTED", worst, MAX_HEAD_ANGLE_DEG);
  }
  return { ok: issues.length === 0, issues, metrics };
}

/** Shrink a box by `fraction` of its width/height on each side. */
export function insetBox(box: Box, fraction: number): Box {
  const dx = (box.maxX - box.minX) * fraction;
  const dy = (box.maxY - box.minY) * fraction;
  return { minX: box.minX + dx, minY: box.minY + dy, maxX: box.maxX - dx, maxY: box.maxY - dy };
}

/** Fractions of face pixels clipped dark / bright in any channel. */
export function faceClipping(
  img: RgbaImage,
  facePixels: Uint32Array,
): { faceDarkClippedFraction: number; faceBrightClippedFraction: number } {
  let dark = 0;
  let bright = 0;
  for (const p of facePixels) {
    const o = p * 4;
    const r = img.data[o]!;
    const g = img.data[o + 1]!;
    const b = img.data[o + 2]!;
    if (r <= CLIP_DARK_LEVEL || g <= CLIP_DARK_LEVEL || b <= CLIP_DARK_LEVEL) dark++;
    if (r >= CLIP_BRIGHT_LEVEL || g >= CLIP_BRIGHT_LEVEL || b >= CLIP_BRIGHT_LEVEL) bright++;
  }
  const n = Math.max(1, facePixels.length);
  return { faceDarkClippedFraction: dark / n, faceBrightClippedFraction: bright / n };
}

/** Whole-image luma percentiles from a 256-bin histogram. */
export function lumaPercentiles(img: RgbaImage): { imageP99Luma: number; imageP1Luma: number } {
  const hist = new Uint32Array(256);
  const n = img.width * img.height;
  for (let p = 0; p < n; p++) hist[Math.min(255, Math.round(lumaAt(img, p)))]!++;
  const at = (q: number) => {
    const target = q * n;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v]!;
      if (acc >= target) return v;
    }
    /* v8 ignore next */
    return 255;
  };
  return { imageP99Luma: at(IMAGE_HIGH_PERCENTILE), imageP1Luma: at(IMAGE_LOW_PERCENTILE) };
}

/**
 * Mean chroma of the brightest non-clipped background pixels (outside `faceMask`), or null if
 * too few. See config.ts COLOR_CAST_* and DECISIONS D-021.
 */
export function backgroundCast(img: RgbaImage, faceMask: Uint8Array): number | null {
  const n = img.width * img.height;
  const hist = new Uint32Array(256);
  const lumas = new Uint16Array(n); // luma + 1 (1–256); 0 = excluded
  let count = 0;
  for (let p = 0; p < n; p++) {
    if (faceMask[p]) continue;
    const o = p * 4;
    const r = img.data[o]!;
    const g = img.data[o + 1]!;
    const b = img.data[o + 2]!;
    const clipped =
      r >= CLIP_BRIGHT_LEVEL ||
      g >= CLIP_BRIGHT_LEVEL ||
      b >= CLIP_BRIGHT_LEVEL ||
      r <= CLIP_DARK_LEVEL ||
      g <= CLIP_DARK_LEVEL ||
      b <= CLIP_DARK_LEVEL;
    if (clipped) continue;
    const y = Math.round(lumaAt(img, p));
    lumas[p] = y + 1; // 0 = excluded
    hist[y]!++;
    count++;
  }
  const want = Math.ceil(count * COLOR_CAST_BRIGHT_FRACTION);
  if (count < COLOR_CAST_MIN_PIXELS || want === 0) return null;
  // Luma threshold so that roughly the top `want` pixels are included.
  let threshold = 255;
  for (let acc = 0; threshold > 0; threshold--) {
    acc += hist[threshold]!;
    if (acc >= want) break;
  }
  let sa = 0;
  let sb = 0;
  let k = 0;
  for (let p = 0; p < n; p++) {
    if (lumas[p]! === 0 || lumas[p]! - 1 < threshold) continue;
    const o = p * 4;
    const lab = srgbToLab({ r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! });
    sa += lab.a;
    sb += lab.b;
    k++;
  }
  return Math.hypot(sa / k, sb / k);
}

/**
 * Variance of the 4-neighbour Laplacian of luma inside `box`, after box-resampling the box to
 * BLUR_ANALYSIS_WIDTH px wide (aspect kept). Sharp faces have strong edges → high variance.
 */
export function laplacianVariance(
  img: RgbaImage,
  box: Box,
  targetWidth: number = BLUR_ANALYSIS_WIDTH,
): number {
  const x0 = Math.max(0, Math.floor(box.minX));
  const y0 = Math.max(0, Math.floor(box.minY));
  const x1 = Math.min(img.width, Math.ceil(box.maxX));
  const y1 = Math.min(img.height, Math.ceil(box.maxY));
  const bw = x1 - x0;
  const bh = y1 - y0;
  if (bw < 3 || bh < 3) return 0;
  const w = Math.max(3, Math.min(targetWidth, bw));
  const h = Math.max(3, Math.round((bh * w) / bw));
  // Box resample: each target pixel = mean luma of the source pixels it covers.
  const small = new Float64Array(w * h);
  for (let ty = 0; ty < h; ty++) {
    const sy0 = y0 + Math.floor((ty * bh) / h);
    const sy1 = Math.max(sy0 + 1, y0 + Math.floor(((ty + 1) * bh) / h));
    for (let tx = 0; tx < w; tx++) {
      const sx0 = x0 + Math.floor((tx * bw) / w);
      const sx1 = Math.max(sx0 + 1, x0 + Math.floor(((tx + 1) * bw) / w));
      let s = 0;
      for (let y = sy0; y < sy1; y++)
        for (let x = sx0; x < sx1; x++) s += lumaAt(img, y * img.width + x);
      small[ty * w + tx] = s / ((sy1 - sy0) * (sx1 - sx0));
    }
  }
  let sum = 0;
  let sum2 = 0;
  let m = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = small[i - 1]! + small[i + 1]! + small[i - w]! + small[i + w]! - 4 * small[i]!;
      sum += lap;
      sum2 += lap * lap;
      m++;
    }
  }
  const mean = sum / m;
  return sum2 / m - mean * mean;
}
