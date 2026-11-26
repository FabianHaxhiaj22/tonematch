"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/useT";
import { THEMES, type ThemePreference } from "@/lib/theme";
import {
  getServerThemePreference,
  getThemePreference,
  setThemePreference,
  subscribeThemePreference,
} from "./themeStore";

const ICONS: Record<ThemePreference, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

/**
 * Theme switch in the header (D-037): a button showing the current choice opens a small panel
 * with Light / Dark / System as native radio buttons (arrow keys move between them). The panel
 * closes on Escape (focus returns to the button), on a click outside, or when focus leaves it.
 */
export function ThemeToggle() {
  const t = useT();
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    getThemePreference,
    getServerThemePreference,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const label = (p: ThemePreference) => t(`layout.theme.${p}` as MessageKey);
  const Current = ICONS[preference];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        // Close when keyboard focus moves to something outside. A null relatedTarget (e.g.
        // clicking a non-focusable label inside the panel) must not close it; clicks outside
        // are handled by the pointerdown listener.
        const next = e.relatedTarget as Node | null;
        if (next && !rootRef.current?.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-full border border-muted"
      >
        <Current />
        <span className="sr-only">
          {t("layout.theme.label")}: {label(preference)}
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          className="gold-card absolute top-full right-0 z-40 mt-2 w-44 p-2 shadow-[0_14px_30px_-18px_rgba(30,20,10,0.45)]"
        >
          <fieldset>
            <legend className="eyebrow px-2 pt-1 pb-2 text-[0.6875rem] text-accent">
              {t("layout.theme.label")}
            </legend>
            {THEMES.map((p) => {
              const Icon = ICONS[p];
              return (
                <label
                  key={p}
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm has-checked:bg-sunken has-checked:font-medium has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-focus"
                >
                  <input
                    type="radio"
                    name={`${panelId}-theme`}
                    value={p}
                    checked={preference === p}
                    onChange={() => setThemePreference(p)}
                    className="sr-only"
                  />
                  <Icon className="shrink-0 text-accent" />
                  {label(p)}
                </label>
              );
            })}
          </fieldset>
        </div>
      )}
    </div>
  );
}
