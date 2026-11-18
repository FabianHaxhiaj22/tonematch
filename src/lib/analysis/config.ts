/**
 * Analysis configuration (README §6). Every threshold used by src/lib/analysis lives here as a
 * named, commented constant. **Initial values are heuristics** that need calibrating on real
 * photos (docs/CALIBRATION.md); change them here, never inline in the logic.
 */

// ─── Skin regions (README §6.2) ─────────────────────────────────────────────────────────────

/**
 * Landmark indices of the skin-sampling regions.
 *
 * **Source:** MediaPipe's canonical face mesh, which is the topology the Face Landmarker's
 * 478-point output uses (indices 0–467; 468–477 are the irises):
 * - Map: https://github.com/google-ai-edge/mediapipe/blob/a908d668c730da128dfa8d9f6bd25d519d006692/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
 * - Mesh (3D vertices + UVs): https://github.com/google-ai-edge/mediapipe/blob/a908d668c730da128dfa8d9f6bd25d519d006692/mediapipe/modules/face_geometry/data/canonical_face_model.obj
 * - Feature sets (eyes, brows, lips, nose, face oval): https://github.com/google-ai-edge/mediapipe/blob/212f110c65818db7f2d08c42a9539ecb2b6c0e1d/mediapipe/python/solutions/face_mesh_connections.py
 *
 * **How they were chosen** (2026-11-13, docs/DECISIONS.md D-020), on the UV map with the
 * feature sets drawn over it, then checked on the NASA fixture:
 * - Cheeks (revised 2026-11-13 after a real-selfie test, D-024): the **apple of the cheek**,
 *   below the cheekbone and beside the nose wing. Each cheek is the one-ring of mesh vertices
 *   around vertex 36 (left: 266) minus its outer vertex 50 and its nose-side vertex 129, plus 206
 *   below: 101–100–142–203–206–205. Compact and convex on the map and on real landmarks (and
 *   made convex at runtime with a hull, so landmark noise can't dent it). The first choices
 *   (116/117/123…, then 117/50/187…) sat towards the face edge, where close-range perspective
 *   and head turns cut them off: on a real selfie at yaw −12° only a third survived the clip.
 * - Left cheek = exact 3D mirror of the right cheek (vertex with x → −x in the .obj), so both
 *   cheeks cover the same anatomy and their disagreement is a fair lighting signal.
 * - Forehead (revised 2026-11-13 after a real-photo test, D-023): the first version used the
 *   brows' top edge (66–107–9–336–296) as its lower edge, which overlapped the brows on a real
 *   face. It now starts **one vertex ring higher**: FOREHEAD_LOWER_RING, each vertex of which
 *   shares a mesh triangle with a brow-top vertex but is not a brow landmark. The ring above it
 *   is the face oval (FOREHEAD_UPPER_RING = 67–109–10–338–297), i.e. the hairline, so the top
 *   edge is interpolated FOREHEAD_HEIGHT_FRACTION of the way towards it instead of using it.
 * - Checked by script and in tests: no eye, iris, brow, lip, nose or face-oval landmark is a
 *   vertex of, or lies inside, any region (the face-oval ring is only used to place the
 *   forehead's top edge).
 *
 * "Left"/"right" follow MediaPipe: the **subject's** left, which appears on the image's right.
 */
export const CHEEK_INDICES = {
  rightCheek: [101, 100, 142, 203, 206, 205],
  leftCheek: [330, 329, 371, 423, 426, 425],
} as const;

/** Forehead lower edge, from the image's left (subject's right) to the image's right. */
export const FOREHEAD_LOWER_RING = [69, 108, 151, 337, 299] as const;
/** Face-oval landmarks above FOREHEAD_LOWER_RING, pairwise (69→67, 108→109, 151→10, …). */
export const FOREHEAD_UPPER_RING = [67, 109, 10, 338, 297] as const;
/**
 * The forehead's top edge lies this fraction of the way from the lower ring to the face oval
 * (hairline). 0.5 keeps clear of fringes and low hairlines; the ΔE filter removes stray hair.
 */
export const FOREHEAD_HEIGHT_FRACTION = 0.5;

export type RegionName = "rightCheek" | "leftCheek" | "forehead";

/** Every landmark index a region uses (for labels and tests). */
export const REGION_LANDMARKS: Readonly<Record<RegionName, readonly number[]>> = {
  rightCheek: CHEEK_INDICES.rightCheek,
  leftCheek: CHEEK_INDICES.leftCheek,
  forehead: FOREHEAD_LOWER_RING,
};

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
 * Each skin region is clipped to the **visible face outline** moved inwards by this fraction of
 * the face width. The visible outline is the convex hull of all landmarks: facing the camera it
 * equals the face-oval hull, but when the head turns it follows the far cheek, whereas the
 * face-oval landmarks (5–8 cm further back) project onto the far cheek, especially at selfie
 * distance (D-024). Keeps regions off hair and the steep face side. Heuristic: 0.05 ≈ 7 px on
 * a 140 px-wide face.
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

/**
 * If one cheek keeps fewer than this fraction of the other cheek's valid pixels (head turned,
 * clipped, shadowed), the smaller cheek is left out of the overall median so the larger cheek
 * carries its weight, and the sample is flagged (lower confidence in M4).
 */
export const CHEEK_MIN_PIXEL_RATIO = 0.4;

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
 * Colour cast (README §6.1; revised 2026-11-13, D-023). Measured only on **near-neutral,
 * well-exposed** background pixels (outside the face outline), so saturated objects (a red
 * curtain, a blue wall) can't read as a cast:
 * 1. Candidates: not clipped, L* in [COLOR_CAST_MIN_L, COLOR_CAST_MAX_L], chroma ≤
 *    COLOR_CAST_CANDIDATE_MAX_CHROMA. Sampled on a grid every COLOR_CAST_SAMPLE_STEP px.
 * 2. Start at the candidates' median (a*, b*), then COLOR_CAST_ITERATIONS times re-centre on the
 *    mean of candidates within COLOR_CAST_CLUSTER_RADIUS: this follows the main cluster of
 *    neutral surfaces wherever a cast has moved it. (A fixed low-chroma cut alone hides strong
 *    casts: they push neutrals above the cut.)
 * 3. COLOR_CAST when the cluster centre's chroma exceeds COLOR_CAST_MAX_CHROMA. Skip the check
 *    (no issue) if fewer than COLOR_CAST_MIN_PIXELS candidates, or cluster members, remain.
 * Limitation: a tinted wall in neutral light and a grey wall in tinted light look the same;
 * white-paper calibration (README §6.3) is the answer to that.
 */
export const COLOR_CAST_SAMPLE_STEP = 2;
export const COLOR_CAST_MIN_L = 35;
export const COLOR_CAST_MAX_L = 90;
export const COLOR_CAST_CANDIDATE_MAX_CHROMA = 30;
export const COLOR_CAST_CLUSTER_RADIUS = 10;
export const COLOR_CAST_ITERATIONS = 4;
export const COLOR_CAST_MIN_PIXELS = 500;
export const COLOR_CAST_MAX_CHROMA = 10;

/**
 * Blur: variance of the 4-neighbour Laplacian of the face's luma, after resampling the central
 * face box (BLUR_BOX_INSET_FRACTION) to BLUR_ANALYSIS_WIDTH px wide, so the threshold doesn't
 * depend on image size. BLURRY when the variance is below BLUR_MIN_LAPLACIAN_VARIANCE.
 * Heuristic; calibrate.
 */
export const BLUR_ANALYSIS_WIDTH = 256;
/**
 * Measure blur only in the central part of the face's bounding box: this fraction is cut from
 * each side. 0.2 keeps the box inside the (roughly elliptical) face, so the sharp face/background
 * edge can't make a blurry face look sharp; eyes, nose and mouth stay in.
 */
export const BLUR_BOX_INSET_FRACTION = 0.2;
export const BLUR_MIN_LAPLACIAN_VARIANCE = 40;

/**
 * HEAD_TILTED when |yaw| or |pitch| from the transformation matrix exceeds its limit
 * (README §6.1 started at ±20° for both). Yaw tightened to ±15° (D-023): turning the head
 * shrinks the far cheek fast. On the canonical mesh the far/near cheek pixel ratio after the
 * outline clip is 0.73 at 15°, 0.59 at 19° and 0.18 at 25°, and a real selfie at 19° (with
 * perspective) lost about 90% of the far cheek. Roll isn't limited: it doesn't change which
 * skin faces the camera.
 */
export const MAX_YAW_DEG = 15;
export const MAX_PITCH_DEG = 20;

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
