/**
 * Interface language (SPEC §13). Client-side only until M8 moves it to next-intl locale routing
 * (D-034): the header switch sets it, every page reads it through `useT()`. In memory, so it
 * resets to English on a full page reload. Nothing is stored.
 */
import { create } from "zustand";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/messages";

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => set({ locale }),
}));
