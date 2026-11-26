/**
 * Decorative metal and skin gradients for the logo and the landing artwork (D-034, docs/DESIGN.md).
 * They are illustration colours, not data: the recommendation swatches come from
 * src/data/metals.json. Each list is [offset 0–1, colour] stops for an SVG linearGradient.
 */
export type GradientStops = readonly (readonly [number, string])[];

/** Polished yellow gold: dark edge → bright highlight → dark edge. */
export const GOLD_STOPS: GradientStops = [
  [0, "#8f6a2a"],
  [0.35, "#d9b45e"],
  [0.5, "#f6e7b8"],
  [0.65, "#c99b45"],
  [1, "#7d5a22"],
];

/** Polished rose gold. */
export const ROSE_STOPS: GradientStops = [
  [0, "#8a4b4f"],
  [0.4, "#c88a86"],
  [0.52, "#f1d1c8"],
  [0.7, "#b9737a"],
  [1, "#7b4246"],
];

/** Polished silver. */
export const SILVER_STOPS: GradientStops = [
  [0, "#7d7f82"],
  [0.4, "#cfd1d3"],
  [0.52, "#ffffff"],
  [0.7, "#b6b8bb"],
  [1, "#6e7073"],
];

/** Softer gold for the small logo ring (fewer stops read better at 26 px). */
export const LOGO_GOLD_STOPS: GradientStops = [
  [0, "#9a7430"],
  [0.5, "#e6cb86"],
  [1, "#8a6526"],
];

/**
 * The landing artwork's arch: a warm, medium skin-tone field lit from the top left. An
 * illustration only, never a measurement or a person.
 */
export const ARCH_GRADIENT = "linear-gradient(170deg, #ead8bf, #d2ab88 45%, #a87c5a 100%)";
