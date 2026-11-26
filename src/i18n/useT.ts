/**
 * `const t = useT()` in client components: a translator for the current interface language
 * (src/store/locale.ts). Re-renders when the language changes. Replaced by next-intl in M8.
 */
import { useLocaleStore } from "@/store/locale";
import { translator } from "./messages";

export function useT() {
  return translator(useLocaleStore((s) => s.locale));
}
