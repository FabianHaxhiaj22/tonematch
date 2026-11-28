/**
 * Drive the whole flow in one page session (the analysis and the answers live in memory, so a
 * reload would lose them): photo on the landing page → analysis on /analyze with the real
 * MediaPipe worker → the four questions → results.
 */
import { expect, type Page } from "@playwright/test";
import * as photos from "./photos";

/** One answer label per question, in order. */
export type Answers = readonly [string, string, string, string];

/** All warm. */
export const WARM: Answers = ["Green or olive", "Golden or peachy", "Gold", "Off-white or cream"];
/** Two warm, two cool: quiz consistency 0, which always lands below the confidence threshold. */
export const SPLIT: Answers = ["Green or olive", "Pink or rosy", "Gold", "Pure white"];

// Next 16 keeps visited routes mounted but hidden (React <Activity>): always target visible ones.
export const h1 = (page: Page) => page.getByRole("heading", { level: 1 }).filter({ visible: true });

/** Upload the close-up NASA portrait from the landing page and wait for the analysis. */
export async function analysePhoto(page: Page) {
  await page.goto("/");
  await page.getByLabel("Choose a photo").filter({ visible: true }).setInputFiles(photos.closeUp());
  await expect(h1(page)).toHaveText("Your photo was analysed and removed", { timeout: 60_000 });
}

/** From the analysed photo through the four questions to the quiz summary. */
export async function answerQuiz(page: Page, answers: Answers) {
  await page.getByRole("link", { name: "Continue to the questions" }).click();
  await expect(page).toHaveURL("/quiz");
  for (const [i, label] of answers.entries()) {
    await page.getByRole("radio", { name: label, exact: true }).check();
    await page
      .getByRole("button", { name: i === answers.length - 1 ? "See my answers" : "Next" })
      .click();
  }
  await expect(page.getByRole("heading", { name: "Your answers" })).toBeVisible();
}

/** The whole flow, ending on /results. */
export async function reachResults(page: Page, answers: Answers = WARM) {
  await analysePhoto(page);
  await answerQuiz(page, answers);
  await page.getByRole("link", { name: "See my results" }).click();
  await expect(page).toHaveURL("/results");
  await expect(page.getByRole("heading", { name: "Metals for you" })).toBeVisible();
}
