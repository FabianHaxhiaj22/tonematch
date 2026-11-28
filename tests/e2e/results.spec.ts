/**
 * The results page (M6b-2) and the full flow against the production build, with the real
 * MediaPipe worker and model on the public-domain NASA portrait (support/photos.ts).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SPLIT, WARM, analysePhoto, answerQuiz, h1, reachResults } from "./support/flow";

const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  expect(results.violations).toEqual([]);
}

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** Pick a theme in the header's panel (D-037), as theme.spec.ts does; `group` is its label. */
async function chooseTheme(page: Page, name: string, group = "Theme") {
  await page.getByRole("button", { name: new RegExp(`^${group}:`) }).click();
  await page.getByRole("group", { name: group }).getByText(name, { exact: true }).click();
  await expect(page.getByRole("radio", { name })).toBeChecked();
  await page.keyboard.press("Escape");
}

test.beforeEach(async ({ page }) => {
  // Settled screens for axe; the motion test below turns this off.
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test.describe("full flow: upload → analysis → quiz → results", () => {
  test("shows every section of the results, from numbers kept in this tab only", async ({
    page,
    baseURL,
  }) => {
    const foreign: string[] = [];
    page.on("request", (r) => {
      const url = r.url();
      if (!url.startsWith(`${baseURL}/`) && !/^(data|blob):/.test(url)) foreign.push(url);
    });

    await analysePhoto(page);
    // The photo was released after analysis (M6b-1): no blob: preview is left on the page.
    await expect(page.locator('img[src^="blob:"]')).toHaveCount(0);
    await answerQuiz(page, WARM);

    const modelRequests: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname.startsWith("/models/")) modelRequests.push(r.url());
    });
    await page.getByRole("link", { name: "See my results" }).click();
    await expect(page).toHaveURL("/results");

    // Profile
    await expect(h1(page)).toHaveText(/^(Cool|Neutral|Warm|Neutral, leaning (cool|warm)) · \S/);
    await expect(page.getByText("Your skin, as sampled")).toBeVisible();
    await expect(page.getByText("Colours on screen are approximate.")).toBeVisible();
    await expect(
      page.getByText(/^About \d+ on the Monk Skin Tone scale \(approximate\)$/),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "CC BY 4.0" })).toBeVisible();
    const percent = await page.locator("[data-percent]").getAttribute("data-percent");
    await expect(page.getByText(`${percent}%`, { exact: true })).toBeVisible();

    // Summary, metals with swatch pairs, styles in four cards, gemstones, disclaimer
    const metals = page.getByRole("region", { name: "Metals for you" });
    await expect(metals.getByRole("heading", { name: "Best for you" })).toBeVisible();
    expect(await metals.locator("[data-metal]").count()).toBe(7);
    expect(await metals.locator("[data-swatch]").count()).toBe(7);
    const cards = page.getByRole("region", { name: "Styles to try" }).locator("[data-category]");
    await expect(cards).toHaveCount(4);
    await expect(
      page.getByRole("region", { name: "Gemstones" }).getByRole("listitem").first(),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Style guidance based on colour analysis. Lighting and cameras affect results.",
      ),
    ).toBeVisible();

    // Nothing left the device, and /results itself loaded no model files.
    await page.waitForLoadState("networkidle");
    expect(foreign).toEqual([]);
    expect(modelRequests).toEqual([]);

    // The step indicator leads back to the questions with the answers kept.
    await page
      .getByRole("navigation", { name: "Steps" })
      .getByRole("link", { name: "2. Questions" })
      .click();
    await expect(page).toHaveURL("/quiz");
    await expect(page.getByText("Golden or peachy")).toBeVisible();
    await page.getByRole("link", { name: "See my results" }).click();
    await expect(page.getByRole("heading", { name: "Metals for you" })).toBeVisible();

    // Start again clears everything and returns to the photo step.
    await page.getByRole("button", { name: "Start again" }).click();
    await expect(page).toHaveURL("/analyze");
    await expect(h1(page)).toHaveText("Choose a photo");
  });

  test("a split quiz shows 'Both can work' clearly, not as fine print", async ({ page }) => {
    await reachResults(page, SPLIT);
    await expect(h1(page)).toHaveText("Both can work");
    await expect(page.getByText(/^Undertone reading: /)).toBeVisible();
    const lead = page.getByTestId("lead-note");
    await expect(lead).toContainText("Both metal families can work for you.");
    // Body text at 18 px, above the metals, not small print at the bottom.
    const size = await lead.locator("p").evaluate((p) => parseFloat(getComputedStyle(p).fontSize));
    expect(size).toBeGreaterThanOrEqual(18);
    const leadTop = (await lead.boundingBox())!.y;
    const metalsTop = (await page.getByRole("heading", { name: "Metals for you" }).boundingBox())!
      .y;
    expect(leadTop).toBeLessThan(metalsTop);
    await axe(page);
  });
});

test.describe("accessibility", () => {
  test("no axe violations in light, dark and Albanian", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await reachResults(page);
    await chooseTheme(page, "Light"); // forced light while the system prefers dark
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await axe(page);

    await chooseTheme(page, "Dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await axe(page);

    await page.getByRole("button", { name: /Shqip/ }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "sq");
    await expect(page.getByRole("heading", { name: "Metalet për ty" })).toBeVisible();
    await axe(page);

    await chooseTheme(page, "E çelët", "Tema");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await axe(page);
  });

  test("the quiz, restyled, has no axe violations at the summary with results available", async ({
    page,
  }) => {
    await analysePhoto(page);
    await answerQuiz(page, WARM);
    await expect(page.getByRole("link", { name: "See my results" })).toBeVisible();
    await axe(page);
  });
});

test.describe("phone width", () => {
  test("results and the quiz fit 360 px without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await reachResults(page);
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.getByRole("button", { name: /Shqip/ }).click();
    await expect(page.getByRole("heading", { name: "Metalet për ty" })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    await page.goto("/quiz"); // fresh page: question 1
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

test.describe("without an analysis", () => {
  test("/results asks to start with a photo and never loads the model", async ({ page }) => {
    const modelRequests: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).pathname.startsWith("/models/")) modelRequests.push(r.url());
    });
    await page.goto("/results");
    await expect(h1(page)).toHaveText("No results yet");
    await axe(page);
    await page.getByRole("link", { name: "Start with a photo" }).click();
    await expect(page).toHaveURL("/analyze");
    await expect(h1(page)).toHaveText("Choose a photo");
    await page.waitForLoadState("networkidle");
    expect(modelRequests).toEqual([]);
  });

  test("the quiz summary asks for a photo instead of 'See my results'", async ({ page }) => {
    await page.goto("/quiz");
    for (const [i, label] of WARM.entries()) {
      await page.getByRole("radio", { name: label, exact: true }).check();
      await page.getByRole("button", { name: i === 3 ? "See my answers" : "Next" }).click();
    }
    await expect(page.getByRole("link", { name: "See my results" })).toHaveCount(0);
    await expect(
      page.getByText("Your results also need a photo. Your answers are kept."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Start with a photo" }).click();
    await expect(page).toHaveURL("/analyze");
  });

  test("a reload on /results forgets the result (memory only)", async ({ page }) => {
    await reachResults(page);
    await page.reload();
    await expect(h1(page)).toHaveText("No results yet");
  });
});

test.describe("motion", () => {
  /**
   * Record the confidence fill's first inline width as soon as the results render (before any
   * animation frame), then the settled one.
   */
  async function watchFill(page: Page) {
    await page.evaluate(() => {
      const w = window as unknown as { __fill?: string[] };
      w.__fill = [];
      new MutationObserver(() => {
        const fill = document.querySelector<HTMLElement>("[data-percent] > div");
        if (fill && w.__fill!.length === 0) w.__fill!.push(fill.style.width);
      }).observe(document.body, { childList: true, subtree: true });
    });
  }
  const firstWidth = (page: Page) =>
    page.evaluate(() => (window as unknown as { __fill: string[] }).__fill[0]);

  test("sections reveal in sequence and the confidence bar fills from 0", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await analysePhoto(page);
    await answerQuiz(page, WARM);
    await watchFill(page);
    await page.getByRole("link", { name: "See my results" }).click();
    await expect(page.getByRole("heading", { name: "Metals for you" })).toBeVisible();
    expect(await firstWidth(page)).toBe("0%");
    const percent = await page.locator("[data-percent]").getAttribute("data-percent");
    await expect(page.locator("[data-percent] > div")).toHaveAttribute(
      "style",
      new RegExp(`width: ${percent}%`),
    );
  });

  test("with reduced motion the bar is drawn at its value straight away", async ({ page }) => {
    await analysePhoto(page);
    await answerQuiz(page, WARM);
    await watchFill(page);
    await page.getByRole("link", { name: "See my results" }).click();
    await expect(page.getByRole("heading", { name: "Metals for you" })).toBeVisible();
    const percent = await page.locator("[data-percent]").getAttribute("data-percent");
    expect(await firstWidth(page)).toBe(`${percent}%`);
  });
});
