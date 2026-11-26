"use client";

import { useEffect } from "react";
import { LOCALES, type MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/useT";
import { useLocaleStore } from "@/store/locale";

/**
 * EN / SQ switch in the header (D-034). Client-side until M8's locale routing: it changes the
 * language of every page without a reload and keeps `<html lang>` in sync for screen readers.
 * Each button shows the short code and also contains the full language name for assistive tech,
 * so the accessible name includes the visible label (WCAG 2.5.3).
 */
export function LanguageSwitch() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = useT();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className="flex rounded-full border border-muted text-xs font-medium tracking-[0.12em]"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
          className="min-h-8 min-w-11 rounded-full px-3 aria-pressed:bg-ink aria-pressed:text-on-ink"
        >
          {t(`layout.languageShort.${l}` as MessageKey)}
          {/* A separate text node: a leading space inside the span is trimmed in name computation. */}{" "}
          <span className="sr-only">{t(`common.languageNames.${l}` as MessageKey)}</span>
        </button>
      ))}
    </div>
  );
}
