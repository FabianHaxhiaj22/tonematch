# Calibration

How the analysis thresholds in `src/lib/analysis/config.ts` were tuned (README §11). *Starting values from M3 below; volunteer log from M4 onwards.*

## Rules

- Volunteers must consent. **Photos stay on their device**; record only numbers and self-reported answers.
- Never record names, race or ethnicity.

## Log

| Date | Device | Lighting | Calibrated? | L* | a* | b* | h° | ITA° | Photo score `p` | Quiz score `q` | Self-reported undertone | Result | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | |

## M3 starting thresholds (2026-11-13)

All in `src/lib/analysis/config.ts`; all heuristics until volunteer data exists. Evidence so far comes from synthetic images and from **non-skin** measurements on the NASA fixture (exposure, background, blur, head angle). Per `tests/fixtures/SOURCES.md`, the fixture person's skin values are never recorded here.

| Constant | Value | Evidence so far |
|---|---|---|
| `LUMINANCE_TRIM_LOW` / `_HIGH` | 0.10 / 0.10 | README §6.2 |
| `OUTLIER_DELTA_E` | 15 | README §6.2; removes planted highlights, shadows and off-hue blemishes in tests |
| `MIN_VALID_PIXELS` | 300 | README §6.2; fixture cheeks keep ~1,250–1,600 px; a ~140 px-wide face falls below |
| `CHEEK_DISAGREEMENT_DELTA_E` | 6 | Heuristic (ΔE 2–3 ≈ just noticeable) |
| `CHEEK_MIN_PIXEL_RATIO` | 0.4 | Real selfie at yaw −19° lost ~90% of the far cheek; canonical mesh: 0.73 at 15°, 0.59 at 19°, 0.18 at 25° |
| `FOREHEAD_HEIGHT_FRACTION` | 0.5 | Half-way from the ring above the brows to the hairline; fixture keeps 1843 px |
| `FACE_OUTLINE_INSET_FRACTION` | 0.05 | Of the visible outline (D-024); cheeks keep 100% at yaw ±15° at 25–45 cm on the canonical mesh |
| `FACE_MIN_WIDTH_FRACTION` | 0.25 | README §6.1 |
| `CLIP_DARK_LEVEL` / `CLIP_BRIGHT_LEVEL` | 5 / 250 | README §6.1 ("near 0 or 255") |
| `FACE_CLIPPED_MAX_FRACTION` | 0.05 | Fixture: 0.5% dark, 0.2% bright |
| `IMAGE_MIN_P99_LUMA` / `IMAGE_MAX_P1_LUMA` | 90 / 150 | Fixture: p99 = 203, p1 = 3 |
| `COLOR_CAST_*` (neutral cluster) | L\* 35–90, chroma ≤ 30, radius 10, 4 iterations, flag > 10 | Fixture 4.3; + warm cast 15.0; grey wall warm/cool/tungsten 13.2/11.5/26.0; red curtain skipped. A ×1.3 blue boost on mid-grey reads exactly 10 (D-023) |
| `BLUR_MIN_LAPLACIAN_VARIANCE` | 40 | Fixture sharp ≈ 1120; box blur 3×3 ≈ 76, 5×5 ≈ 22 |
| `MAX_YAW_DEG` / `MAX_PITCH_DEG` | 15 / 20 | Yaw tightened from 20 (D-023); fixture yaw ≈ −7° |
| `WB_*` | patch radius 6 px, min luminance 0.15, ≤ 5% clipped, gains 0.5–2 | Synthetic paper under a warm cast: gains recover the cast within 8-bit rounding |

## M4 starting values (2026-11-18)

All in `src/lib/analysis/config.ts`, all heuristics until volunteer data exists (README §11).

| Constant | Value | Basis so far |
|---|---|---|
| `DEPTH_ITA_WEIGHT` / `DEPTH_REF_B` | 0.2 / 15 | Depth angle mostly from L\*; b\* 10 → 25 moves MST ≤ 1 step (D-029) |
| `DEPTH_SCALE` (angle → MST → label) | 65 / 55 / 48 / 41 / 28 / 10 / −10 / −30 / −50 | Label edges = classic ITA classes; MST splits heuristic (D-029). Ask volunteers for self-reported MST |
| `ITA_MIN_B` | 4 | Skin b\* is normally 10–25 |
| `HUE_NEUTRAL_CENTRE_DEG` / `HUE_SCALE_DEG` | 55° / 20° (tanh) | Real skin hues 40–70° stay below \|p\| 0.7 calibrated; an indoor selfie at 38.6° saturated the old ±15° clamp (D-029) |
| `UNDERTONE_CUTS` | ±0.10, ±0.25 | README §6.6 |
| `PHOTO_SCORE_CAP_CALIBRATED` / `_UNCALIBRATED` | 1 / 0.6 | Camera white balance shifts hue; an uncalibrated photo alone can't make a strong call (D-029) |
| `PHOTO_WEIGHT_MAX` | 0.6 | README §6.6 |
| `QUIZ_SPLIT_SHRINK` / `QUIZ_SPLIT_PENALTY` | 0.5 / 0.25 | 2 + 2 quiz: score × 0.5, confidence × 0.75 and quiz share × 0 (D-029) |
| `CHEEK_REDNESS_A_MARGIN` / `_HUE_MARGIN_DEG` | 4 / 8° | Synthetic: unmade-up skin at every depth not flagged; obvious redness flagged |
| `CHEEK_CHROMATIC_DISAGREEMENT` | 3 | M3 real selfie: ΔE 3.5, mostly b\* |
| `FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL` | 0.5 | D-026 |
| `PHOTO_*` factors | see D-028 | Heuristic |
| `OVERALL_PHOTO_SHARE` / `_QUIZ_SHARE` | 0.6 / 0.4 | Heuristic |
| `AGREEMENT_FULL_DIFF` / `_MIN_FACTOR` | 0.5 / 0.4 | Photo and quiz in opposite directions land around 55–60% (D-029) |
| `OVERALL_MAX_UNCALIBRATED` | 0.85 | Only white-paper calibration can go above 85% (D-029) |

**First observation (NASA fixture, studio light from one side):** several photo-confidence factors apply at once (framing, no calibration, cheek colour disagreement, uneven light, cheek-vs-forehead difference), so photo confidence is low (≈ 0.4). Strong side light makes the two cheeks and the forehead differ; whether these factors overlap too much is a question for the calibration set. (Per `SOURCES.md`, the person's skin results aren't recorded.)

## Threshold changes

| Date | Constant | Old | New | Evidence |
|---|---|---|---|---|
| 2026-11-13 | Yaw limit | ±20° | ±15° | Real selfie at −19° lost ~90% of the far cheek (D-023) |
| 2026-11-13 | Colour cast method | brightest 1% of background | neutral-pixel cluster | Red curtain false positive (23.7) on a real photo (D-023) |
| 2026-11-13 | Forehead lower edge | brow top edge | one ring higher | Overlapped the brows on a real photo (D-023) |
| 2026-11-13 | Cheek indices | 117–118–101–36–205–187–50 | 101–100–142–203–206–205 (apple of the cheek) | Real selfie at yaw −12° kept 33% of the right cheek after the clip (D-024) |
| 2026-11-18 | Photo score | clamp(Δh / 15°) | cap × tanh(Δh / 20°), cap 0.6 uncalibrated | Indoor selfie saturated at −1.00 (D-029) |
| 2026-11-18 | Depth / MST | ITA classes + nearest display swatch | one L\*-weighted angle, one table | Label and MST contradicted on a real photo (D-029) |
| 2026-11-18 | `AGREEMENT_MIN_FACTOR` | 0.6 | 0.4 | All-warm quiz vs cool photo gave 70%; now 59% (D-029) |
| 2026-11-18 | Uncalibrated confidence cap | none | 0.85 | Only calibration should allow > 85% (D-029) |
| 2026-11-18 | Quiz consistency | none | 1 − variance; shrink 0.5, penalty 0.25 | 2 + 2 quiz raised confidence 64% → 68% (D-029) |
| 2026-11-18 | `HUE_HALF_WIDTH_DEG` | 10° (first draft) | 15° | Neutral bucket was ±1° of hue; 8-bit rounding flipped it in tests (D-026) |
| 2026-11-13 | Clip boundary | face-oval hull | hull of all landmarks (visible outline) | Perspective puts far-side face-oval landmarks onto the far cheek (D-024) |
