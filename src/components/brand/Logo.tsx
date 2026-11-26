import { useId } from "react";
import { LOGO_GOLD_STOPS } from "./metals";

/**
 * The ToneMatch mark: two interlocking rings, skin (ink outline) meets metal (gold). Decorative:
 * the wordmark next to it carries the name. Also drawn as src/app/icon.svg.
 */
export function Logo({ className }: { className?: string }) {
  // useId can contain characters that break `url(#…)`; keep letters, digits, _ and -.
  const gradientId = `tm-logo-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 40 26"
      width="40"
      height="26"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          {LOGO_GOLD_STOPS.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <circle cx="13" cy="13" r="10" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="27" cy="13" r="10" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2.4" />
    </svg>
  );
}
