/**
 * Colour swatches on the results page. All are decorative (`aria-hidden`): the names and the
 * skin description are always visible text next to them. Colours come from the user's sample
 * (via labToSrgb) and from src/data (metals.json, gemstones.json), never from the illustration
 * palette (DESIGN.md "Imagery"). The white/black overlays only add a sheen or facets on top of
 * the data colour, the same way in both themes.
 */
import type { CSSProperties } from "react";

/** Soft highlight that makes a flat colour read as polished metal. */
const SHEEN =
  "radial-gradient(circle at 32% 28%, rgba(255,255,255,.65), rgba(255,255,255,0) 52%), " +
  "radial-gradient(circle at 70% 78%, rgba(0,0,0,.18), rgba(0,0,0,0) 55%)";

/** A flat colour, or diagonal bands for a blended swatch (mixed metals). */
export function metalBackground(swatch: readonly string[]): string {
  if (swatch.length === 1) return `${SHEEN}, ${swatch[0]}`;
  const band = 100 / swatch.length;
  const stops = swatch.map((c, i) => `${c} ${i * band}% ${(i + 1) * band}%`).join(", ");
  return `${SHEEN}, linear-gradient(135deg, ${stops})`;
}

/** The user's skin colour as a large circle with a hairline frame. */
export function SkinSwatch({ hex }: { hex: string }) {
  return (
    <span aria-hidden="true" className="block size-24 shrink-0 rounded-full border border-line p-1">
      <span className="block size-full rounded-full" style={{ backgroundColor: hex }} />
    </span>
  );
}

/** Skin and metal side by side, overlapping, so each metal is seen against the skin. */
export function SwatchPair({ skin, metal }: { skin: string; metal: readonly string[] }) {
  const circle = "block size-12 rounded-full border-2 border-bg";
  return (
    <span aria-hidden="true" className="flex shrink-0">
      <span className={circle} style={{ backgroundColor: skin }} />
      <span
        className={`${circle} -ml-4`}
        data-swatch={metal.join(" ")}
        style={{ background: metalBackground(metal) } satisfies CSSProperties}
      />
    </span>
  );
}

/** A faceted octagon in the gemstone's colour. */
export function GemShape({ color }: { color: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="60"
      height="60"
      viewBox="0 0 64 64"
      data-swatch={color}
    >
      <polygon points="20,3 44,3 61,20 61,44 44,61 20,61 3,44 3,20" fill={color} />
      {/* Crown facets: light from the top left, shade to the bottom right. */}
      <polygon points="20,3 44,3 40,15 24,15" fill="#fff" fillOpacity=".38" />
      <polygon points="3,20 20,3 24,15 15,24" fill="#fff" fillOpacity=".28" />
      <polygon points="3,44 3,20 15,24 15,40" fill="#fff" fillOpacity=".12" />
      <polygon points="61,20 61,44 49,40 49,24" fill="#000" fillOpacity=".14" />
      <polygon points="44,61 61,44 49,40 40,49" fill="#000" fillOpacity=".24" />
      <polygon points="20,61 44,61 40,49 24,49" fill="#000" fillOpacity=".2" />
      {/* Table. */}
      <polygon
        points="24,15 40,15 49,24 49,40 40,49 24,49 15,40 15,24"
        fill="#fff"
        fillOpacity=".16"
      />
      <polygon
        points="20,3 44,3 61,20 61,44 44,61 20,61 3,44 3,20"
        fill="none"
        stroke="#000"
        strokeOpacity=".22"
      />
    </svg>
  );
}
