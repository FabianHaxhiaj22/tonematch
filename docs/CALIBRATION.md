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
| `FACE_OUTLINE_INSET_FRACTION` | 0.05 | Keeps the far cheek off hair at the fixture's ~7° head turn |
| `FACE_MIN_WIDTH_FRACTION` | 0.25 | README §6.1 |
| `CLIP_DARK_LEVEL` / `CLIP_BRIGHT_LEVEL` | 5 / 250 | README §6.1 ("near 0 or 255") |
| `FACE_CLIPPED_MAX_FRACTION` | 0.05 | Fixture: 0.5% dark, 0.2% bright |
| `IMAGE_MIN_P99_LUMA` / `IMAGE_MAX_P1_LUMA` | 90 / 150 | Fixture: p99 = 203, p1 = 3 |
| `COLOR_CAST_BRIGHT_FRACTION` / `_MAX_CHROMA` | 0.01 / 10 | Fixture top 1% ≈ 3 (neutral); top 5% ≈ 11 (false positive), see D-021 |
| `BLUR_MIN_LAPLACIAN_VARIANCE` | 40 | Fixture sharp ≈ 1120; box blur 3×3 ≈ 76, 5×5 ≈ 22 |
| `MAX_HEAD_ANGLE_DEG` | 20 | README §6.1; fixture yaw ≈ −7° |
| `WB_*` | patch radius 6 px, min luminance 0.15, ≤ 5% clipped, gains 0.5–2 | Synthetic paper under a warm cast: gains recover the cast within 8-bit rounding |

## Threshold changes

| Date | Constant | Old | New | Evidence |
|---|---|---|---|---|
| | | | | |
