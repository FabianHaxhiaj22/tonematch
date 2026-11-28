import type { Metadata } from "next";
import { ResultsPage } from "@/features/results/ResultsPage";

// English metadata until M8 adds locale routing.
export const metadata: Metadata = { title: "Your result · ToneMatch" };

export default function Results() {
  return <ResultsPage />;
}
