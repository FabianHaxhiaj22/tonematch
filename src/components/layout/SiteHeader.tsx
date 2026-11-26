"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { useT } from "@/i18n/useT";
import { CONTAINER } from "./container";
import { LanguageSwitch } from "./LanguageSwitch";

/** Site header: skip link, logo + wordmark (home), section links, language and theme switches. */
export function SiteHeader() {
  const t = useT();
  return (
    <header className="border-b border-line">
      <a
        href="#main"
        className="sr-only z-50 bg-ink px-4 py-3 text-on-ink focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t("layout.skipToContent")}
      </a>
      <div className={`${CONTAINER} flex h-18 items-center justify-between gap-4`}>
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-[1.375rem] font-medium tracking-[0.02em] sm:text-[1.625rem]">
            {t("common.brand")}
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-8">
          <nav aria-label={t("layout.nav.label")} className="hidden md:block">
            <ul className="flex gap-8 text-sm">
              <li>
                <Link href="/#how-it-works" className="underline-offset-4 hover:underline">
                  {t("layout.nav.howItWorks")}
                </Link>
              </li>
              <li>
                <Link href="/#privacy" className="underline-offset-4 hover:underline">
                  {t("layout.nav.privacy")}
                </Link>
              </li>
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
