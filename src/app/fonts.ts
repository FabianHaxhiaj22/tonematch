/**
 * Fonts (D-034): Cormorant Garamond for display (24px and up only; its fine strokes get too thin
 * below that) and Jost for body text and UI. Both are variable fonts under the SIL Open Font
 * Licence. next/font downloads them at build time and serves them from our own domain, so the
 * browser never contacts Google (SPEC §2 privacy). The `latin` subset covers Albanian ç and ë.
 */
import { Cormorant_Garamond, Jost } from "next/font/google";

export const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
});

export const bodyFont = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jost",
});
