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

// ─── Region weights when cheeks are doubtful (M4, DECISIONS D-026) ──────────────────────────

/**
 * Cheeks "look redder than the forehead" when the cheek median's a* exceeds the forehead's by
 * more than CHEEK_REDNESS_A_MARGIN, or its hue angle is lower by more than
 * CHEEK_REDNESS_HUE_MARGIN_DEG. Relative to the same face's forehead, so it doesn't depend on
 * skin depth. Blush, bronzer and natural flushing all trigger it; it only moves weight to the
 * forehead and lowers photo confidence, and is never reported to the user as "makeup".
 * Heuristics; calibrate.
 */
export const CHEEK_REDNESS_A_MARGIN = 4;
export const CHEEK_REDNESS_HUE_MARGIN_DEG = 8;

/**
 * Cheeks "disagree" (for weighting) when the colour part of their difference,
 * sqrt(Δa*² + Δb*²), exceeds this. Undertone depends on colour, not lightness. A real selfie in
 * M3 testing had ΔE 3.5, mostly in b*. Heuristic.
 */
export const CHEEK_CHROMATIC_DISAGREEMENT = 3;

/**
 * Forehead weight in the overall median when the cheeks are doubtful (redder than the
 * forehead, disagreeing, or one cheek dropped). The usable cheeks share the rest equally.
 * Normal weights are REGION_WEIGHTS (0.4 / 0.4 / 0.2).
 */
export const FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL = 0.5;

// ─── Depth (README §6.5) ────────────────────────────────────────────────────────────────────

/** Below this b*, ITA isn't computed (division by ~0); depth falls back to L* (README §6.4). */
export const ITA_MIN_B = 4;

export type DepthLabel = "very-light" | "light" | "medium" | "tan" | "deep" | "very-deep";

/**
 * Depth uses one blended angle (D-029), mostly from L*:
 *   depthAngle = DEPTH_ITA_WEIGHT × ITA + (1 − DEPTH_ITA_WEIGHT) × atan((L* − 50) / DEPTH_REF_B)
 * ITA alone depends on b*, which is also the undertone signal, so pinker skin read lighter. The
 * second term is ITA with a fixed, typical skin b* (DEPTH_REF_B), i.e. lightness only. When b* is
 * too small for ITA, only the L* term is used. Weight 0.2: with 0.3, sweeping b* from 10 to 25
 * (an undertone difference) still moved skin at L* 65 by two MST steps; with 0.2 it moves at
 * most one at any lightness (tested). Heuristics; calibrate.
 */
export const DEPTH_ITA_WEIGHT = 0.2;
export const DEPTH_REF_B = 15;

/**
 * The one depth table (D-029): depth angle → MST 1–10 → label. Each row's MST belongs to
 * exactly one label, so the label and the MST index can never contradict (tested).
 * - Label boundaries keep the classic ITA classes from skin measurements (very light ≥ 55°,
 *   light 41–55°, intermediate 28–41°, tan 10–28°, brown −30–10°, dark < −30°; Chardon et al.
 *   1991, Del Bino & Bernerd 2013, as commonly quoted, not re-checked against the originals).
 * - MST splits inside a class (65°, 48°, −10°, −50°) are heuristic and **approximate**; the UI
 *   must label MST as approximate. Calibrate with self-reported MST from volunteers (README §11).
 * Why not "nearest official swatch": the swatches are display colours (MST 1 has L* 94; measured
 * fair skin is ~65–75), so nearest-swatch read real light skin as MST 5 and almost never gave
 * MST 9–10. The official swatch colours stay in MST_SWATCHES for display (M6).
 * Ordered lightest first; a depth angle ≥ minAngle gets that row.
 */
export const DEPTH_SCALE: readonly { mst: number; label: DepthLabel; minAngle: number }[] = [
  { mst: 1, label: "very-light", minAngle: 65 },
  { mst: 2, label: "very-light", minAngle: 55 },
  { mst: 3, label: "light", minAngle: 48 },
  { mst: 4, label: "light", minAngle: 41 },
  { mst: 5, label: "medium", minAngle: 28 },
  { mst: 6, label: "tan", minAngle: 10 },
  { mst: 7, label: "deep", minAngle: -10 },
  { mst: 8, label: "deep", minAngle: -30 },
  { mst: 9, label: "very-deep", minAngle: -50 },
  { mst: 10, label: "very-deep", minAngle: -Infinity },
];

/**
 * Official Monk Skin Tone swatch colours (MST 1–10), for display next to a result (M6), not for
 * classification. Source: the `--monk-scale-color-1…10` HSL values in the official site's bundle,
 * https://skintone.google/assets/index.e4e4b56c.js (fetched 2026-11-18; SHA-256 b42d16d1…),
 * converted HSL → sRGB; table with Lab and ITA in docs/DECISIONS.md D-027.
 * Scale licence: CC BY 4.0 according to secondary sources (not confirmed on the official page).
 */
export const MST_SWATCHES: readonly string[] = [
  "#f6ede4",
  "#f3e7db",
  "#f7ead0",
  "#eadaba",
  "#d7bd96",
  "#a07e56",
  "#825c43",
  "#604134",
  "#3a312a",
  "#292420",
];

// ─── Undertone (README §6.6) ────────────────────────────────────────────────────────────────

/**
 * Photo undertone score (D-029):
 *   p = cap × tanh(hueDelta(h, HUE_NEUTRAL_CENTRE_DEG) / HUE_SCALE_DEG)
 * h is the hue angle of the overall skin colour (higher = more yellow = warmer). tanh is linear
 * near the centre (p ≈ cap × Δh / scale) and only approaches ±cap far out, so real photos rarely
 * saturate; a hard clamp at ±15° saturated an indoor selfie at 38.6° (−1.00).
 * cap = PHOTO_SCORE_CAP_CALIBRATED with white-paper calibration, else
 * PHOTO_SCORE_CAP_UNCALIBRATED: an uncalibrated camera's white balance can shift hue by several
 * degrees, so its photo can never make a strong undertone call on its own.
 * p uses hue only, never L* or chroma, so depth can't shift it. Heuristics; calibrate.
 */
export const HUE_NEUTRAL_CENTRE_DEG = 55;
export const HUE_SCALE_DEG = 20;
export const PHOTO_SCORE_CAP_CALIBRATED = 1;
export const PHOTO_SCORE_CAP_UNCALIBRATED = 0.6;

/** Quiz answer values (README §6.6). "unsure" is skipped, never scored as neutral. */
export const QUIZ_ANSWER_SCORES = { cool: -1, neutral: 0, warm: 1 } as const;

/** Fusion: photo weight w_p = PHOTO_WEIGHT_MAX × photoConfidence; quiz weight 1 − w_p. */
export const PHOTO_WEIGHT_MAX = 0.6;

/**
 * Quiz consistency (D-029) = 1 − variance of the answered values (cool −1, neutral 0, warm +1):
 * 1 when all answers agree (also all neutral), 0 for an even cool/warm split (2 + 2), 0.25 for
 * 3 warm + 1 cool. Contradictory answers are a signal of uncertainty, so:
 * - the fused score is pulled towards neutral: s × (1 − QUIZ_SPLIT_SHRINK × (1 − consistency));
 * - overall confidence: the quiz's share counts × consistency, and the whole value is multiplied
 *   by (1 − QUIZ_SPLIT_PENALTY × (1 − consistency)), so a split quiz ends up *below* no quiz.
 * Heuristics; calibrate.
 */
export const QUIZ_SPLIT_SHRINK = 0.5;
export const QUIZ_SPLIT_PENALTY = 0.25;

/**
 * Undertone buckets on the fused score s (README §6.6, issue M). Explicit cut-points:
 * s < −0.25 cool · −0.25 ≤ s < −0.10 neutral-cool · −0.10 ≤ s ≤ 0.10 neutral ·
 * 0.10 < s ≤ 0.25 neutral-warm · s > 0.25 warm. Heuristics; calibrate.
 */
export const UNDERTONE_CUTS = {
  coolBelow: -0.25,
  neutralCoolBelow: -0.1,
  neutralWarmAbove: 0.1,
  warmAbove: 0.25,
} as const;

// ─── Confidence (README §6.6, issue L) ──────────────────────────────────────────────────────

/**
 * Photo confidence (before fusion, photo evidence only) starts at 1 and is multiplied by the
 * factors below. Heuristics; calibrate.
 */
export const PHOTO_ISSUE_FACTORS = {
  FACE_TOO_SMALL: 0.85,
  TOO_DARK: 0.7,
  TOO_BRIGHT: 0.7,
  COLOR_CAST: 0.6,
  BLURRY: 0.85,
  HEAD_TILTED: 0.8,
} as const;
/** COLOR_CAST factor when white-paper calibration was used (the cast was corrected). */
export const PHOTO_COLOR_CAST_CALIBRATED_FACTOR = 0.95;
/** No calibration: cameras' white balance is unknown. */
export const PHOTO_UNCALIBRATED_FACTOR = 0.9;
/** Valid pixels used for the overall colour: full trust at ≥ GOOD, factor MIN_FACTOR at ≤ MIN. */
export const PHOTO_PIXELS_GOOD = 2000;
export const PHOTO_PIXELS_MIN = 300;
export const PHOTO_PIXELS_MIN_FACTOR = 0.6;
/** Each region below MIN_VALID_PIXELS. */
export const PHOTO_LOW_PIXEL_REGION_FACTOR = 0.85;
/** One cheek dropped for imbalance (D-023). */
export const PHOTO_CHEEK_IMBALANCE_FACTOR = 0.8;
/**
 * Cheek colour disagreement (chromatic part): factor falls linearly from 1 at 0 to
 * PHOTO_CHEEK_CHROMATIC_MIN_FACTOR at PHOTO_CHEEK_CHROMATIC_FULL and above. ΔC 3.5 → 0.825.
 */
export const PHOTO_CHEEK_CHROMATIC_FULL = 8;
export const PHOTO_CHEEK_CHROMATIC_MIN_FACTOR = 0.6;
/** Cheeks much lighter/darker than each other (side light; mostly affects depth). */
export const PHOTO_UNEVEN_LIGHTING_FACTOR = 0.95;
/** Cheeks redder than the forehead (blush, bronzer or flushing). */
export const PHOTO_CHEEK_REDNESS_FACTOR = 0.85;
/** Lower bound so a poor photo still counts a little. */
export const PHOTO_CONFIDENCE_MIN = 0.05;

/**
 * Overall confidence (after fusion) = (PHOTO_SHARE × photoConfidence + QUIZ_SHARE ×
 * answeredCount / 4 × quiz consistency) × agreement factor × quiz split factor (see above).
 * The agreement factor is 1 while |p − q| ≤ AGREEMENT_FULL_DIFF and falls linearly to
 * AGREEMENT_MIN_FACTOR at |p − q| = 2. With no quiz
 * answers there's nothing to agree with (factor 1), so confidence tops out at PHOTO_SHARE.
 * DISAGREEMENT_NOTE_DIFF: add the "photo and quiz disagree" note when |p − q| exceeds it and at
 * least DISAGREEMENT_NOTE_MIN_ANSWERS questions were answered. Heuristics.
 */
export const OVERALL_PHOTO_SHARE = 0.6;
export const OVERALL_QUIZ_SHARE = 0.4;
export const AGREEMENT_FULL_DIFF = 0.5;
/**
 * 0.4 (was 0.6, D-029): with 0.6, four warm answers against a clearly cool photo still gave 70%;
 * now that case lands around 55–60%.
 */
export const AGREEMENT_MIN_FACTOR = 0.4;
export const DISAGREEMENT_NOTE_DIFF = 1;
export const DISAGREEMENT_NOTE_MIN_ANSWERS = 2;
/**
 * Overall confidence never exceeds this without white-paper calibration (D-029): camera white
 * balance is unknown, so only a calibrated photo can support a very confident result.
 */
export const OVERALL_MAX_UNCALIBRATED = 0.85;
/** Add a "low photo confidence" note below this. */
export const LOW_PHOTO_CONFIDENCE_NOTE = 0.4;
