/**
 * Analysis configuration (README §6). Every threshold used by src/lib/analysis lives here as a
 * named, commented constant. **Initial values are heuristics** that need calibrating on real
 * photos (docs/CALIBRATION.md); change them here, never inline in the logic.
 */

// ─── Skin regions (README §6.2) ─────────────────────────────────────────────────────────────

/**
 * Landmark indices of the skin-sampling polygons, in drawing order.
 *
 * **Source:** MediaPipe's canonical face mesh, which is the topology the Face Landmarker's
 * 478-point output uses (indices 0–467; 468–477 are the irises):
 * - Map: https://github.com/google-ai-edge/mediapipe/blob/a908d668c730da128dfa8d9f6bd25d519d006692/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
 * - Mesh (3D vertices + UVs): https://github.com/google-ai-edge/mediapipe/blob/a908d668c730da128dfa8d9f6bd25d519d006692/mediapipe/modules/face_geometry/data/canonical_face_model.obj
 * - Feature sets (eyes, brows, lips, nose, face oval): https://github.com/google-ai-edge/mediapipe/blob/212f110c65818db7f2d08c42a9539ecb2b6c0e1d/mediapipe/python/solutions/face_mesh_connections.py
 *
 * **How they were chosen** (2026-11-13, docs/DECISIONS.md D-020), on the UV map with the
 * feature sets drawn over it, then checked on the NASA fixture:
 * - Cheeks: two vertex rings below the lower eyelid (skips under-eye shadow), lateral to the
 *   nose wing and above the nasolabial fold (129 → 57). The outer edge runs 117 → 50 → 187,
 *   one vertex column inside the face side: the outer column (116/123) already touched the face
 *   outline at a ~7° head turn on the fixture. Head turns are also handled at runtime by
 *   clipping to the inset face outline (FACE_OUTLINE_INSET_FRACTION).
 * - Left cheek = exact 3D mirror of the right cheek (vertex with x → −x in the .obj), so both
 *   cheeks cover the same anatomy and their disagreement is a fair lighting signal.
 * - Forehead: the central band from the top edge of the brows (66–107, 336–296) up to one row
 *   below the face-oval top (10/109/338), where the hairline usually is. Brow hairs at the
 *   lower edge are removed by the pixel filters.
 * - Checked by script and in tests: no eye, iris, lip, nose or face-oval landmark is a vertex
 *   of, or lies inside, any region (the forehead's lower edge is the brows' top edge, by design).
 *
 * "Left"/"right" follow MediaPipe: the **subject's** left, which appears on the image's right.
 */
export const SKIN_REGION_INDICES = {
  rightCheek: [117, 118, 101, 36, 205, 187, 50],
  leftCheek: [346, 347, 330, 266, 425, 411, 280],
  forehead: [69, 108, 151, 337, 299, 296, 336, 9, 107, 66],
} as const;

export type RegionName = keyof typeof SKIN_REGION_INDICES;

/**
 * Face outline as an ordered ring: MediaPipe's FACEMESH_FACE_OVAL edges (same source as
 * above) chained from landmark 10 (top centre). Tests check it against
 * FaceLandmarker.FACE_LANDMARKS_FACE_OVAL.
 */
export const FACE_OVAL_RING = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

/**
 * Each skin region is clipped to the face outline (its convex hull) moved inwards by this
 * fraction of the face width. Keeps cheeks off hair and the steep face side when the head is
 * turned. Heuristic: 0.05 ≈ 7 px on a 140 px-wide face.
 */
export const FACE_OUTLINE_INSET_FRACTION = 0.05;

// ─── Pixel filtering and region statistics (README §6.2) ────────────────────────────────────

/**
 * Per region, drop this fraction of pixels from **each** end of the L* distribution (specular
 * highlights, shadows). Relative to the region itself, so it doesn't depend on skin depth.
 */
export const LUMINANCE_TRIM_LOW = 0.1;
export const LUMINANCE_TRIM_HIGH = 0.1;

/**
 * After the trim, drop pixels whose CIE76 ΔE*ab from the region's median Lab exceeds this
 * (blemishes, hair, brow hairs, fold shadows). README §6.2 suggests ~15.
 */
export const OUTLIER_DELTA_E = 15;

/** A region needs at least this many valid pixels (after filtering) to be used. */
export const MIN_VALID_PIXELS = 300;

/** Weights for the overall weighted median (README §6.2). Must sum to 1. */
export const REGION_WEIGHTS: Readonly<Record<RegionName, number>> = {
  leftCheek: 0.4,
  rightCheek: 0.4,
  forehead: 0.2,
};

/**
 * Left/right cheek median ΔE*ab (CIE76) above which lighting is considered uneven.
 * Heuristic: ΔE ≈ 2–3 is "just noticeable"; 6 is a clear difference between two patches of
 * the same person's skin, which points at side lighting or shadow.
 */
export const CHEEK_DISAGREEMENT_DELTA_E = 6;

// ─── Quality gate (README §6.1) ─────────────────────────────────────────────────────────────

/** FACE_TOO_SMALL when the face-oval width is below this fraction of the image width. */
export const FACE_MIN_WIDTH_FRACTION = 0.25;

/**
 * Clipping levels (0–255). A pixel is dark-clipped if **any** channel ≤ CLIP_DARK_LEVEL and
 * bright-clipped if any channel ≥ CLIP_BRIGHT_LEVEL (README §6.1: "near 0 or 255 in any
 * channel"). Well-lit deep skin stays far above 5 in every channel, so it isn't flagged.
 */
export const CLIP_DARK_LEVEL = 5;
export const CLIP_BRIGHT_LEVEL = 250;

/** TOO_DARK / TOO_BRIGHT when more than this fraction of face pixels is clipped. */
export const FACE_CLIPPED_MAX_FRACTION = 0.05;

/**
 * Whole-image histogram checks, on Rec. 709 luma (0–255). They judge **exposure**, never skin
 * lightness (README §6.1, DECISIONS D-010):
 * - TOO_DARK if even the brightest 1% of the image (p99) is below IMAGE_MIN_P99_LUMA: nothing
 *   in the frame (eye whites, teeth, catchlights, clothing, background) reaches mid-tones.
 * - TOO_BRIGHT if even the darkest 1% (p1) is above IMAGE_MAX_P1_LUMA: the frame is washed out.
 * Heuristics; calibrate.
 */
export const IMAGE_HIGH_PERCENTILE = 0.99;
export const IMAGE_LOW_PERCENTILE = 0.01;
export const IMAGE_MIN_P99_LUMA = 90;
export const IMAGE_MAX_P1_LUMA = 150;

/**
 * Colour cast (README §6.1, refined in DECISIONS D-021): mean a* and b* of the **brightest**
 * background pixels (outside the face outline), which are most likely to be white/neutral
 * surfaces. Using the whole background would read a blue wall or a red shirt as a "cast".
 * - Take the top COLOR_CAST_BRIGHT_FRACTION of non-clipped background pixels by luma.
 * - COLOR_CAST when the chroma of their mean, sqrt(ā² + b̄²), exceeds COLOR_CAST_MAX_CHROMA.
 * - Skip the check (no issue) if fewer than COLOR_CAST_MIN_PIXELS background pixels remain.
 * 1% rather than 5%: on the NASA fixture (neutral studio white balance) the top 1% read as
 * neutral (chroma ≈ 3), while 5% reached mid-bright coloured objects and hands (≈ 11). The
 * "background" is everything outside the face, so it includes hands, neck and clothing.
 */
export const COLOR_CAST_BRIGHT_FRACTION = 0.01;
export const COLOR_CAST_MAX_CHROMA = 10;
export const COLOR_CAST_MIN_PIXELS = 500;

/**
 * Blur: variance of the 4-neighbour Laplacian of the face's luma, after resampling the central
 * face box (BLUR_BOX_INSET_FRACTION) to BLUR_ANALYSIS_WIDTH px wide (makes the threshold independent of image size).
 * BLURRY when the variance is below BLUR_MIN_LAPLACIAN_VARIANCE. Heuristic; calibrate.
 */
export const BLUR_ANALYSIS_WIDTH = 256;
/**
 * Measure blur only in the central part of the face's bounding box: this fraction is cut from
 * each side. 0.2 keeps the box inside the (roughly elliptical) face, so the sharp face/background
 * edge can't make a blurry face look sharp; eyes, nose and mouth stay in.
 */
export const BLUR_BOX_INSET_FRACTION = 0.2;
export const BLUR_MIN_LAPLACIAN_VARIANCE = 40;

/** HEAD_TILTED when |yaw| or |pitch| from the transformation matrix exceeds this (README §6.1). */
export const MAX_HEAD_ANGLE_DEG = 20;

// ─── White balance (README §6.3) ────────────────────────────────────────────────────────────

/** Radius (px, in image pixels) of the square patch averaged around the tapped point. */
export const WB_PATCH_RADIUS = 6;

/** Reject the patch if its mean linear luminance is below this (too dark to be white paper). */
export const WB_MIN_PATCH_LUMINANCE = 0.15;

/** Reject the patch if more than this fraction of its pixels is bright-clipped. */
export const WB_MAX_CLIPPED_FRACTION = 0.05;

/** Reject gains outside this range: the patch isn't white, or the cast is too strong to fix. */
export const WB_MIN_GAIN = 0.5;
export const WB_MAX_GAIN = 2;
