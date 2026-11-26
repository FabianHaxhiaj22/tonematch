import type { Metadata } from "next";
import { PhotoStep } from "@/features/analyze/PhotoStep";

// English metadata until M8 adds locale routing.
export const metadata: Metadata = { title: "Your photo · ToneMatch" };

export default function AnalyzePage() {
  return <PhotoStep />;
}
