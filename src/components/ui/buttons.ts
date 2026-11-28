/**
 * Button styles (DESIGN.md "Components"). Class strings rather than components, so they work on
 * <button>, <Link> and <label> alike.
 */

/** Primary: ink fill, square corners, tracked capitals, at least 48 px tall. */
export const BUTTON_PRIMARY =
  "inline-flex min-h-12 items-center justify-center bg-ink px-7 text-sm font-medium tracking-[0.14em] text-on-ink uppercase";

/** Secondary: same shape, ink outline on the page background. */
export const BUTTON_OUTLINE =
  "inline-flex min-h-12 items-center justify-center border border-ink px-7 text-sm font-medium tracking-[0.14em] text-ink uppercase";

/** Text action: an underlined accent link-button, at least 44 px tall. */
export const BUTTON_TEXT = "min-h-11 text-sm text-accent underline underline-offset-4";
