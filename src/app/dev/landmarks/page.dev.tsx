// Dev-only route (exists under `next dev` only; see next.config.ts pageExtensions).
import { LandmarkDebug } from "@/features/analyze/dev/LandmarkDebug";

export const metadata = { title: "Landmarks (dev)", robots: { index: false } };

export default function DevLandmarksPage() {
  return <LandmarkDebug />;
}
