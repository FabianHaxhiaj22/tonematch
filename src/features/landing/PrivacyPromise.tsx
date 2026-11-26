"use client";

import { CONTAINER } from "@/components/layout/container";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/useT";

/**
 * The privacy promise (SPEC §3: "your photo never leaves your device"). Product copy describing
 * what the app does, not legal text; the privacy notice itself is the /privacy page (M8).
 */
const POINTS = ["noUpload", "noAccount", "nothingStored"] as const;

export function PrivacyPromise() {
  const t = useT();
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-title"
      className="scroll-mt-6 bg-sunken py-16 md:py-20"
    >
      <div className={`${CONTAINER} grid gap-10 lg:grid-cols-2 lg:items-end lg:gap-24`}>
        <div>
          <p className="eyebrow text-accent">{t("landing.privacy.eyebrow")}</p>
          <h2
            id="privacy-title"
            className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] leading-tight font-normal"
          >
            {t("landing.privacy.title")}
          </h2>
          <p className="mt-5 font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-snug italic">
            {t("landing.privacy.body")}
          </p>
        </div>
        <ul>
          {POINTS.map((point) => (
            <li
              key={point}
              className="grid gap-1 border-t border-line py-4 last:border-b sm:grid-cols-[10rem_1fr] sm:gap-4"
            >
              <strong className="eyebrow text-[0.8125rem] tracking-[0.14em] text-ink">
                {t(`landing.privacy.points.${point}.title` as MessageKey)}
              </strong>
              <span className="text-[0.9375rem] text-muted">
                {t(`landing.privacy.points.${point}.body` as MessageKey)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
