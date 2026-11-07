import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// M0 smoke test: the production build serves the home page and it has no axe violations.
test("home page loads and is accessible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
