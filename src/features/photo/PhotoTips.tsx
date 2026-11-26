"use client";

import { ChevronIcon } from "@/components/icons";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/useT";

/**
 * The photo guide (SPEC §1, §3), shown next to the upload as a disclosure. It covers what the
 * app can't detect (filters, smoothing, tinted glasses, products on the cheeks), so the UI never
 * claims to detect them. Never mentions makeup by name (D-025, D-026).
 */
const TIPS = ["window", "flash", "glasses", "hair", "cheeks", "straight"] as const;

export function PhotoTips({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <details className={`group ${className}`}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-accent underline underline-offset-4 [&::-webkit-details-marker]:hidden">
        {t("photo.tips.title")}
        <ChevronIcon className="motion-safe:transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2 grid gap-2 border-l border-line pl-4 text-[0.9375rem] text-muted">
        {TIPS.map((tip) => (
          <li key={tip}>{t(`photo.tips.items.${tip}` as MessageKey)}</li>
        ))}
      </ul>
    </details>
  );
}
