"use client";

import Link from "next/link";
import { BUTTON_PRIMARY } from "@/components/ui/buttons";
import { useT } from "@/i18n/useT";

/**
 * Shown when there is no photo analysis to build results from: on /results (a reload clears the
 * in-memory analysis, or the user came straight here) and on the quiz summary. Leads to /analyze.
 * `page` is the full /results view with its own heading; `inline` sits inside the quiz summary.
 */
export function StartWithPhoto({ variant }: { variant: "page" | "inline" }) {
  const t = useT();
  const action = (
    <Link href="/analyze" className={BUTTON_PRIMARY}>
      {t("results.empty.action")}
    </Link>
  );
  if (variant === "inline") {
    return (
      <div className="border-l-2 border-accent pl-4">
        <p>{t("quiz.summary.needPhoto")}</p>
        <div className="mt-5">{action}</div>
      </div>
    );
  }
  return (
    <>
      <p className="eyebrow text-accent">{t("results.eyebrow")}</p>
      <h1 className="mt-3 mb-6 font-display text-[clamp(2.5rem,6vw,4rem)] leading-none font-normal">
        {t("results.empty.title")}
      </h1>
      <p className="max-w-xl text-lg text-muted">{t("results.empty.body")}</p>
      <div className="mt-8">{action}</div>
    </>
  );
}
