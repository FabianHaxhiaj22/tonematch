"use client";

import { useT } from "@/i18n/useT";
import { CONTAINER } from "./container";

/**
 * Footer: the "guidance, not a measurement" note (SPEC §1, §12) and the copyright line. Links to
 * the Privacy and About pages are added in M8, when those pages exist (D-034).
 */
export function SiteFooter() {
  const t = useT();
  return (
    <footer className="border-t border-line">
      <div
        className={`${CONTAINER} flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-10 text-[0.8125rem] text-muted`}
      >
        <p>{t("layout.footer.note")}</p>
        <p>{t("layout.footer.copyright")}</p>
      </div>
    </footer>
  );
}
