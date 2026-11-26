"use client";

import { useId } from "react";
import {
  ARCH_GRADIENT,
  GOLD_STOPS,
  ROSE_STOPS,
  SILVER_STOPS,
  type GradientStops,
} from "@/components/brand/metals";
import { useT } from "@/i18n/useT";

/**
 * Landing artwork: three interlocking metal rings (silver, rose gold, yellow gold) on a warm
 * skin-tone arch. Pure decoration (no face, no person), hidden from assistive tech.
 */
const RINGS: {
  key: "silver" | "rose-gold" | "yellow-gold";
  stops: GradientStops;
  cx: number;
  width: number;
}[] = [
  { key: "silver", stops: SILVER_STOPS, cx: 96, width: 9 },
  { key: "rose-gold", stops: ROSE_STOPS, cx: 150, width: 9 },
  { key: "yellow-gold", stops: GOLD_STOPS, cx: 204, width: 11 },
];

export function HeroArt() {
  const t = useT();
  const prefix = `tm-art-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[4/5] w-full max-w-[300px] justify-self-center sm:max-w-[440px]"
    >
      <div
        className="absolute inset-x-[8%] top-0 bottom-[6%] overflow-hidden rounded-t-full after:absolute after:inset-0 after:bg-[radial-gradient(120%_70%_at_30%_20%,rgba(255,255,255,.35),transparent_60%)]"
        style={{ backgroundImage: ARCH_GRADIENT }}
      />
      <svg
        viewBox="0 0 300 200"
        focusable="false"
        className="absolute top-[52%] left-1/2 w-[82%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_12px_18px_rgba(60,40,20,0.25)]"
      >
        <defs>
          {RINGS.map(({ key, stops }) => (
            <linearGradient key={key} id={`${prefix}-${key}`} x1="0" y1="0" x2="1" y2="1">
              {stops.map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
          ))}
        </defs>
        {RINGS.map(({ key, cx, width }) => (
          <circle
            key={key}
            cx={cx}
            cy="100"
            r="66"
            fill="none"
            stroke={`url(#${prefix}-${key})`}
            strokeWidth={width}
          />
        ))}
      </svg>
      <div className="eyebrow absolute inset-x-[8%] bottom-0 flex justify-between text-[0.6875rem] tracking-[0.18em] text-muted">
        {RINGS.map(({ key }) => (
          <span key={key}>{t(`metals.${key}`)}</span>
        ))}
      </div>
    </div>
  );
}
