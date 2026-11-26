"use client";

import { useRouter } from "next/navigation";
import { LockIcon } from "@/components/icons";
import { PhotoPicker } from "@/features/photo/PhotoPicker";
import { PhotoTips } from "@/features/photo/PhotoTips";
import { useT } from "@/i18n/useT";
import { HeroArt } from "./HeroArt";

/** Landing hero: promise, photo upload (→ /analyze), privacy line, photo tips, artwork. */
export function Hero() {
  const t = useT();
  const router = useRouter();
  return (
    <section
      aria-labelledby="hero-title"
      className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:py-24"
    >
      <div>
        <p className="eyebrow text-accent">{t("landing.hero.eyebrow")}</p>
        <h1
          id="hero-title"
          className="mt-5 mb-6 font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-none font-normal tracking-[-0.01em]"
        >
          {t("landing.hero.titleStart")}{" "}
          <em className="text-accent">{t("landing.hero.titleEmphasis")}</em>
        </h1>
        <p className="max-w-[34em] text-lg text-muted">{t("landing.hero.lede")}</p>
        <div className="mt-9">
          <PhotoPicker onPicked={() => router.push("/analyze")} />
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm">
          <LockIcon className="shrink-0 text-accent" />
          {t("landing.hero.privacy")}
        </p>
        <PhotoTips className="mt-3" />
      </div>
      <HeroArt />
    </section>
  );
}
