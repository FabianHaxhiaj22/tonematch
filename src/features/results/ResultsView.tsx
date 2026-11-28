"use client";

import { NoticeIcon } from "@/components/icons";
import { CONTAINER } from "@/components/layout/container";
import { SECTION_STAGGER_S } from "@/components/motion/config";
import { Reveal } from "@/components/motion/Reveal";
import { BUTTON_TEXT } from "@/components/ui/buttons";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/useT";
import type { ResultsView as View } from "@/lib/results";
import { ConfidenceBar } from "./ConfidenceBar";
import { MST_LICENCE_URL, MST_SOURCE_URL } from "./config";
import { GemShape, SkinSwatch, SwatchPair } from "./Swatches";

/** Message keys stored in the data files (validated by `pnpm validate:data`). */
const key = (k: string) => k as MessageKey;

/**
 * The results page (M6b-2), from the Atelier mockup (D-034): profile and confidence, the
 * one-line summary, metals by tier with skin + metal swatches, the styles in one gold card per
 * category, finish advice, gemstones and notes; the disclaimer is the site footer's note (D-039).
 * Sections fade in one after another (nothing moves with prefers-reduced-motion). The view is
 * never server-rendered (the analysis only exists in this tab), so animating it on appearance
 * never hides a first paint.
 */
export function ResultsView({ view, onStartAgain }: { view: View; onStartAgain: () => void }) {
  const t = useT();
  const step = (i: number) => ({ index: i, stagger: SECTION_STAGGER_S });
  const undertone = t(key(`undertone.${view.undertone}`));
  const depth = t(key(`depth.${view.depth}`));

  return (
    <>
      <div className={`${CONTAINER} py-12 md:py-20`}>
        <div className="grid gap-y-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-20">
          {/* ── Profile ───────────────────────────────────────────────────────────── */}
          {/* Sticky on wide screens (when the window is tall enough to show all of it), so the
              profile stays beside the metals instead of leaving an empty column. */}
          <Reveal
            {...step(0)}
            className="lg:self-start lg:[@media(min-height:46rem)]:sticky lg:[@media(min-height:46rem)]:top-8"
          >
            <p className="eyebrow text-accent">{t("results.eyebrow")}</p>
            {view.uncertain ? (
              <h1 className="mt-3 font-display text-[clamp(3rem,7vw,5rem)] leading-[1.05] font-normal">
                {t("results.uncertainTitle")}
              </h1>
            ) : (
              // Undertone and depth as two flex items. When the depth doesn't fit beside the
              // undertone it moves to its own line, and its separator dot (outside its left edge)
              // is clipped there, so no line ever starts with "·".
              <h1
                data-testid="profile-heading"
                className="mt-3 flex flex-wrap items-baseline gap-x-6 overflow-x-clip font-display text-[clamp(3rem,7vw,5rem)] leading-[1.05] font-normal"
              >
                <span>{undertone}</span>
                <span className="relative text-[clamp(1.75rem,3vw,2.25rem)] text-accent italic">
                  <span aria-hidden="true" className="absolute right-full mr-2.5">
                    ·
                  </span>
                  {/* Read as "Warm, Medium"; the space sits outside the hidden comma so it
                      survives accessible-name trimming (a leading space isn't drawn). */}
                  <span className="sr-only">,</span> {depth}
                </span>
              </h1>
            )}
            {view.uncertain && (
              <p className="mt-4 text-lg text-muted">
                {t("results.reading", { undertone })} · {depth}
              </p>
            )}

            <div className="mt-8 flex items-center gap-5">
              <SkinSwatch hex={view.skinHex} />
              <div>
                <p className="font-medium">{t("results.skin.label")}</p>
                <p className="mt-1 text-[0.8125rem] text-muted">{t("results.skin.approx")}</p>
              </div>
            </div>

            {/* Where the depth sits on the MST scale: a position on a neutral track, not colour
                swatches (they looked like a wrong colour match next to the sampled skin, D-039). */}
            <div className="mt-8">
              <p className="text-sm">{t("depth.mstApprox", { value: view.mstApprox })}</p>
              <div aria-hidden="true" className="mt-3 flex items-center gap-1" data-mst-track>
                {Array.from({ length: view.mstSteps }, (_, i) => i + 1).map((n) => (
                  <span
                    key={n}
                    data-current={n === view.mstApprox || undefined}
                    className={`block flex-1 rounded-full ${n === view.mstApprox ? "h-2 bg-accent" : "h-1 bg-line"}`}
                  />
                ))}
              </div>
              <div
                aria-hidden="true"
                className="mt-2 flex justify-between text-[0.8125rem] text-muted"
              >
                <span>{t("results.mst.start")}</span>
                <span>{view.mstSteps}</span>
              </div>
              <p className="mt-2 text-xs text-muted">
                {t("results.mst.credit")}{" "}
                <a href={MST_SOURCE_URL} className="whitespace-nowrap underline underline-offset-2">
                  {t("results.mst.source")}
                </a>{" "}
                · {t("results.mst.licence")}{" "}
                <a
                  href={MST_LICENCE_URL}
                  rel="license"
                  className="whitespace-nowrap underline underline-offset-2"
                >
                  {t("results.mst.licenceName")}
                </a>
              </p>
            </div>

            <div className="mt-10 border-t border-line pt-6">
              <p className="flex items-end justify-between gap-4">
                <span className="eyebrow">{t("results.confidence.label")}</span>
                <span className="font-display text-[2.5rem] leading-none">
                  {t("results.confidence.value", { value: view.confidencePercent })}
                </span>
              </p>
              <ConfidenceBar percent={view.confidencePercent} />
              <p className="mt-3 text-[0.8125rem] text-muted">{t("results.confidence.hint")}</p>
            </div>
          </Reveal>

          <div>
            {/* ── Summary and the low-confidence message ───────────────────────────── */}
            {view.summaryKey && (
              <Reveal {...step(1)}>
                <p className="font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-snug italic">
                  {t(key(view.summaryKey))}
                </p>
              </Reveal>
            )}
            {view.leadNote && (
              <Reveal {...step(1)}>
                <div
                  data-testid="lead-note"
                  className="flex gap-4 border-l-2 border-accent bg-surface p-5"
                >
                  <NoticeIcon className="mt-1 shrink-0 text-accent" />
                  <p className="text-lg">{t(key(`notes.${view.leadNote}`))}</p>
                </div>
              </Reveal>
            )}

            {/* ── Metals ───────────────────────────────────────────────────────────── */}
            <Reveal {...step(3)}>
              <section aria-labelledby="results-metals" className="mt-12">
                <h2
                  id="results-metals"
                  className="font-display text-[clamp(2rem,4vw,3rem)] leading-tight font-normal"
                >
                  {t("results.metals.title")}
                </h2>
                {view.metalTiers.map(({ tier, metals }) => (
                  <div key={tier} className="mt-8">
                    <h3 className="eyebrow flex items-center gap-4 text-accent after:h-px after:flex-1 after:bg-line">
                      {t(key(`recommend.tiers.${tier}`))}
                    </h3>
                    <ul>
                      {metals.map((m) => (
                        <li
                          key={m.id}
                          data-metal={m.id}
                          className="flex items-center gap-5 border-b border-line py-4"
                        >
                          <SwatchPair skin={view.skinHex} metal={m.swatch} />
                          <div className="min-w-0">
                            <p className="font-display text-2xl leading-tight">
                              {t(key(m.nameKey))}
                            </p>
                            <p className="mt-1 text-sm text-muted">{t(key(m.reasonKey))}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            </Reveal>
          </div>
        </div>

        {/* ── Styles ─────────────────────────────────────────────────────────────── */}
        <Reveal {...step(4)}>
          <section aria-labelledby="results-styles" className="mt-20 border-t border-line pt-16">
            <p aria-hidden="true" className="eyebrow text-accent">
              {view.styles
                .map((s) => t(key(`results.styles.categories.${s.category}`)))
                .join(" · ")}
            </p>
            <h2
              id="results-styles"
              className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] leading-tight font-normal"
            >
              {t("results.styles.title")}
            </h2>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {view.styles.map((s, i) => (
                <li
                  key={s.category}
                  data-category={s.category}
                  className="gold-card p-6 shadow-[0_18px_40px_-32px_var(--tm-ink)] dark:shadow-none"
                >
                  <div className="flex items-baseline justify-between gap-3 border-b border-line pb-4">
                    <h3 className="font-display text-[1.625rem] font-medium">
                      {t(key(`results.styles.categories.${s.category}`))}
                    </h3>
                    <span aria-hidden="true" className="eyebrow text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <ul>
                    {s.items.map((item) => (
                      <li key={item.id} className="border-b border-line py-3 last:border-b-0">
                        {t(key(item.labelKey))}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="mt-8 flex flex-col gap-2 sm:flex-row sm:gap-6">
              <span className="eyebrow shrink-0 pt-1">{t("results.styles.finish")}</span>
              <span className="max-w-2xl text-muted">{t(key(view.finishKey))}</span>
            </p>
          </section>
        </Reveal>
      </div>

      {/* ── Gemstones ────────────────────────────────────────────────────────────── */}
      <Reveal {...step(5)}>
        <section aria-labelledby="results-gemstones" className="bg-sunken">
          <div className={`${CONTAINER} py-16`}>
            <p className="eyebrow text-accent">
              {t(key(`results.gemstones.eyebrow.${view.palette}`))}
            </p>
            <h2
              id="results-gemstones"
              className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] leading-tight font-normal"
            >
              {t("results.gemstones.title")}
            </h2>
            <ul className="mt-10 grid grid-cols-2 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
              {view.gemstones.map((g) => (
                <li key={g.id} className="flex flex-col items-center gap-3 text-center">
                  <GemShape color={g.swatch} />
                  <span className="font-display text-2xl">{t(key(g.nameKey))}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Reveal>

      {/* ── Notes and start again (the disclaimer is the footer's note, D-039) ─────── */}
      <Reveal {...step(6)}>
        <div
          className={`${CONTAINER} flex flex-col gap-8 py-16 lg:flex-row lg:items-end lg:justify-between`}
        >
          <div className="max-w-2xl">
            {view.notes.length > 0 && (
              <section aria-labelledby="results-notes" className="border-l-2 border-accent pl-5">
                <h2 id="results-notes" className="eyebrow">
                  {t("results.notes.title")}
                </h2>
                <ul className="mt-2 space-y-2">
                  {view.notes.map((n) => (
                    <li key={n}>{t(key(`notes.${n}`))}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <button
            type="button"
            onClick={onStartAgain}
            className={`${BUTTON_TEXT} self-start lg:self-auto`}
          >
            {t("results.startAgain")}
          </button>
        </div>
      </Reveal>
    </>
  );
}
