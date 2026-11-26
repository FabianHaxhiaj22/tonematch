"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CONTAINER_NARROW } from "@/components/layout/container";
import { LockIcon } from "@/components/icons";
import { PhotoPicker } from "@/features/photo/PhotoPicker";
import { PhotoTips } from "@/features/photo/PhotoTips";
import { useT } from "@/i18n/useT";
import { useFlowStore } from "@/store/flow";

/**
 * /analyze, the photo step. M6a: a preview of the chosen photo, "Choose another photo" and
 * "Continue to the questions". M6b inserts the quality checks and the analysis here (D-034).
 * Without a photo (direct visit, or after "Choose another photo") it shows the picker.
 */
export function PhotoStep() {
  const t = useT();
  const photo = useFlowStore((s) => s.photo);
  const clearPhoto = useFlowStore((s) => s.clearPhoto);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // When the view switches (photo chosen or cleared), move focus to the new heading.
  const hasPhoto = photo !== null;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [hasPhoto]);

  return (
    <div className={`${CONTAINER_NARROW} py-12 md:py-20`}>
      <p className="eyebrow text-accent">{t("analyze.eyebrow")}</p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 mb-8 font-display text-[clamp(2.5rem,6vw,4rem)] leading-none font-normal focus:outline-none"
      >
        {photo ? t("analyze.title") : t("analyze.emptyTitle")}
      </h1>

      {photo ? (
        <>
          {/* A blob: URL of the user's own file; next/image can't optimise it and needn't. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={t("analyze.previewAlt")}
            className="max-h-[60vh] w-auto max-w-full border border-line bg-surface object-contain p-2"
          />
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <LockIcon className="shrink-0 text-accent" />
            {t("analyze.stays")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/quiz"
              className="inline-flex min-h-12 items-center bg-ink px-7 text-sm font-medium tracking-[0.14em] text-on-ink uppercase"
            >
              {t("analyze.next")}
            </Link>
            <button
              type="button"
              onClick={clearPhoto}
              className="min-h-11 text-sm text-accent underline underline-offset-4"
            >
              {t("analyze.another")}
            </button>
          </div>
        </>
      ) : (
        <>
          <PhotoPicker />
          <PhotoTips className="mt-3" />
        </>
      )}
    </div>
  );
}
