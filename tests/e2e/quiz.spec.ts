import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("quiz: keyboard-only run through all four questions, no axe violations", async ({ page }) => {
  await page.goto("/quiz");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A few quick questions");
  expect((await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations).toEqual([]);

  for (let i = 1; i <= 4; i++) {
    await expect(page.getByRole("group", { name: new RegExp(`Question ${i} of 4`) })).toBeVisible();
    // Keyboard only: focus the first answer, pick it with Space, submit with Enter.
    await page.getByRole("radio").first().focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Your answers" })).toBeFocused();
  expect((await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations).toEqual([]);
});

test("quiz: Albanian has no axe violations and sets lang", async ({ page }) => {
  await page.goto("/quiz");
  await page.getByRole("button", { name: "Shqip" }).click();
  await expect(page.getByRole("main")).toHaveAttribute("lang", "sq");
  expect((await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations).toEqual([]);
});

test("quiz: works at phone width without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/quiz");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  const box = await page.getByRole("radio").first().locator("xpath=..").boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44); // WCAG 2.2 target size (we use ≥ 56 px)
});

test("quiz: no axe violations in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/quiz");
  await page.getByRole("radio").first().check();
  expect((await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations).toEqual([]);
});
