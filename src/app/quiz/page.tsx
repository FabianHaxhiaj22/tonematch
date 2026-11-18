import type { Metadata } from "next";
import { QuizFlow } from "@/features/quiz/QuizFlow";

// English metadata until M8 adds locale routing (the page itself switches en/sq).
export const metadata: Metadata = { title: "Quiz · ToneMatch" };

export default function QuizPage() {
  return <QuizFlow />;
}
