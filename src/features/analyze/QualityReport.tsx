"use client";

import { CheckIcon, LockIcon, NoticeIcon } from "@/components/icons";
import { Reveal } from "@/components/motion/Reveal";
import { BUTTON_OUTLINE, BUTTON_PRIMARY } from "@/components/ui/buttons";
import { useT } from "@/i18n/useT";
import type { BlockingReason } from "@/lib/analysis/pipeline";
import type { QualityIssue } from "@/lib/analysis/quality";

/**
 * The quality report (SPEC §6.1, M6b-1). Blocking issues only offer another photo; warnings offer
 * "Analyse anyway" (lowers confidence) or another photo. Each warning comes with what to change.
 * The photo has already been released when this shows (only the check results are kept).
 */

export function BlockedReport({
  reason,
  onChooseAnother,
}: {
  reason: BlockingReason;
  onChooseAnother: () => void;
}) {
  const t = useT();
  return (
    <>
      <Reveal>
        <p className="flex gap-3 border-l-2 border-accent pl-4 text-lg">
          {t(`analyze.report.blocked.${reason}`)}
        </p>
      </Reveal>
      <RemovedNote />
      <div className="mt-8">
        <button type="button" onClick={onChooseAnother} className={BUTTON_PRIMARY}>
          {t("analyze.another")}
        </button>
      </div>
    </>
  );
}

export function WarningsReport({
  warnings,
  onAnalyseAnyway,
  onChooseAnother,
}: {
  warnings: readonly QualityIssue[];
  onAnalyseAnyway: () => void;
  onChooseAnother: () => void;
}) {
  const t = useT();
  return (
    <>
      <p className="text-muted">{t("analyze.report.reviewIntro")}</p>
      <ul className="mt-4 space-y-3">
        {warnings.map((w, i) => (
          <li key={w.code}>
            <Reveal index={i} className="flex gap-4 border border-line bg-surface p-5">
              <NoticeIcon className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="font-medium">{t(`analyze.report.issues.${issueKey(w)}.title`)}</p>
                <p className="mt-1 text-sm text-muted">
                  {t(`analyze.report.issues.${issueKey(w)}.tip`)}
                </p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
      <p className="mt-6">{t("analyze.report.reviewChoice")}</p>
      <RemovedNote />
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="button" onClick={onChooseAnother} className={BUTTON_PRIMARY}>
          {t("analyze.another")}
        </button>
        <button type="button" onClick={onAnalyseAnyway} className={BUTTON_OUTLINE}>
          {t("analyze.report.anyway")}
        </button>
      </div>
    </>
  );
}

/** Shown after the photo was analysed: passed, or warnings accepted. */
export function DoneReport({ accepted }: { accepted: boolean }) {
  const t = useT();
  return (
    <Reveal>
      <p className="flex items-start gap-3 text-lg">
        {accepted ? (
          <NoticeIcon className="mt-1 shrink-0 text-accent" />
        ) : (
          <CheckIcon className="mt-1 shrink-0 text-accent" />
        )}
        {accepted ? t("analyze.done.accepted") : t("analyze.done.passed")}
      </p>
      <p className="mt-4 flex items-start gap-3 text-sm text-muted">
        <LockIcon className="mt-0.5 shrink-0 text-accent" />
        {t("analyze.done.body")}
      </p>
    </Reveal>
  );
}

function RemovedNote() {
  const t = useT();
  return (
    <p className="mt-6 flex items-start gap-3 text-sm text-muted">
      <LockIcon className="mt-0.5 shrink-0 text-accent" />
      {t("analyze.report.removedNote")}
    </p>
  );
}

/** Message keys exist for every warning code (blocking codes never reach the warnings list). */
type WarningCode = Exclude<QualityIssue["code"], "NO_FACE" | "MULTIPLE_FACES">;
const issueKey = (w: QualityIssue) => w.code as WarningCode;
