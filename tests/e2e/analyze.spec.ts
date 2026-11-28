/**
 * The analysis step on /analyze (M6b-1) against the production build with the real MediaPipe
 * worker and model. Test photos are derived from the public-domain NASA portrait at test time
 * (support/photos.ts).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";
import { MODEL_PATHS } from "../../src/lib/models/paths";
import * as photos from "./support/photos";

const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** axe on the settled page (fades finish instantly with reduced motion). */
async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze();
  expect(results.violations).toEqual([]);
}

// Next 16 keeps visited routes mounted but hidden (React <Activity>): always target visible ones.
const visible = (page: Page, label: string) => page.getByLabel(label).filter({ visible: true });
const choose = (page: Page, photo: photos.TestPhoto, label = "Choose a photo") =>
  visible(page, label).setInputFiles(photo);
const heading = (page: Page) => page.getByRole("heading", { level: 1 }).filter({ visible: true });
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).filter({ visible: true });
const status = (page: Page) => page.getByRole("main").getByRole("status");
const preview = (page: Page) => page.getByRole("img", { name: "The photo you chose" });
const analysedSize = (page: Page) =>
  page.locator("[data-analysed-size]").filter({ visible: true }).getAttribute("data-analysed-size");

/** True while a blob: URL still resolves (i.e. it hasn't been revoked). */
const blobAlive = (page: Page, url: string) =>
  page.evaluate(
    (u) =>
      fetch(u).then(
        () => true,
        () => false,
      ),
    url,
  );

const isModelRequest = (r: Request) => new URL(r.url()).pathname.startsWith("/models/");

/**
 * Hold every /models/* response until `release()` (simulates a slow first download), so the
 * status screens stay up long enough to look at. Worker requests are routed through the context.
 */
async function holdModels(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.context().route("**/models/**", async (route) => {
    await gate;
    await route.continue();
  });
  return release;
}

test.beforeEach(async ({ page }) => {
  // Settled screens for axe and screenshots; one test below covers the motion itself.
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test.describe("loading the model", () => {
  test("only /analyze loads it, and only after a photo is chosen", async ({ page }) => {
    const modelRequests: string[] = [];
    page.on("request", (r) => {
      if (isModelRequest(r)) modelRequests.push(new URL(r.url()).pathname);
    });
    // /results (M6b-2) shows "No results yet" without an analysis; it must not load the model either.
    for (const path of ["/", "/quiz", "/results", "/analyze"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    expect(modelRequests).toEqual([]);

    await choose(page, photos.closeUp());
    await expect(heading(page)).toHaveText("Your photo was analysed and removed");
    expect(modelRequests.length).toBeGreaterThan(0);
    for (const path of modelRequests) expect(path.startsWith(`${MODEL_PATHS.base}/`)).toBe(true);
  });

  test("model files are versioned and cached as immutable", async ({ request }) => {
    for (const url of [MODEL_PATHS.model, `${MODEL_PATHS.wasm}/vision_wasm_internal.wasm`]) {
      const res = await request.get(url);
      expect(res.status()).toBe(200);
      expect(res.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
    }
    expect(MODEL_PATHS.base).toMatch(/^\/models\/\d+\.\d+\.\d+-[0-9a-f]{8}$/);
  });

  test("every request stays on this origin, through analysis and on to the quiz", async ({
    page,
    baseURL,
  }) => {
    const foreign: string[] = [];
    page.on("request", (r) => {
      const url = r.url();
      if (!url.startsWith(`${baseURL}/`) && !/^(data|blob):/.test(url)) foreign.push(url);
    });
    await page.goto("/");
    await choose(page, photos.closeUp());
    await expect(heading(page)).toHaveText("Your photo was analysed and removed");
    await page.getByRole("link", { name: "Continue to the questions" }).click();
    await expect(page).toHaveURL("/quiz");
    await page.waitForLoadState("networkidle");
    expect(foreign).toEqual([]);
  });
});

test.describe("status while analysing", () => {
  test("shows each stage, then releases the photo", async ({ page }) => {
    const release = await holdModels(page);
    await page.goto("/");
    await choose(page, photos.portrait());
    await expect(page).toHaveURL("/analyze");
    await expect(status(page)).toContainText("Loading the analysis tool");
    await expect(status(page)).toContainText("A one-time download of about 8 MB");
    const url = await preview(page).getAttribute("src");
    expect(url).toMatch(/^blob:/);
    expect(await blobAlive(page, url!)).toBe(true);
    await axe(page);

    release();
    await expect(heading(page)).toHaveText("Check your photo");
    await expect(preview(page)).toHaveCount(0);
    expect(await blobAlive(page, url!)).toBe(false);
  });

  test("adds a note when the first download is slow", async ({ page }) => {
    const release = await holdModels(page);
    await page.goto("/analyze");
    await choose(page, photos.closeUp());
    await expect(status(page)).toContainText("Loading the analysis tool");
    await expect(status(page)).not.toContainText("This is taking a while");
    // SLOW_LOAD_MS (8 s) later:
    await expect(status(page)).toContainText("This is taking a while", { timeout: 15_000 });
    release();
    await expect(heading(page)).toHaveText("Your photo was analysed and removed");
  });

  test("leaving the flow mid-analysis drops the photo and the analysis", async ({ page }) => {
    const release = await holdModels(page);
    await page.goto("/");
    await choose(page, photos.portrait());
    const url = await preview(page).getAttribute("src");
    await page.getByRole("link", { name: "ToneMatch" }).click();
    await expect(page).toHaveURL("/");
    await expect.poll(() => blobAlive(page, url!)).toBe(false);
    release();
    await page.goBack();
    await expect(heading(page)).toHaveText("Choose a photo");
  });
});

test.describe("quality report", () => {
  test("a photo that passes: analysed and removed, then on to the questions", async ({ page }) => {
    await page.goto("/analyze");
    await choose(page, photos.closeUp());
    await expect(heading(page)).toHaveText("Your photo was analysed and removed");
    await expect(page.getByText("The photo passed every check.")).toBeVisible();
    await expect(heading(page)).toBeFocused();
    await axe(page);
    await page.getByRole("link", { name: "Continue to the questions" }).click();
    await expect(page).toHaveURL("/quiz");
  });

  test("warnings: 'Analyse anyway' goes on; coming back says the photo was removed", async ({
    page,
  }) => {
    await page.goto("/");
    await choose(page, photos.portrait());
    await expect(heading(page)).toHaveText("Check your photo");
    await expect(page.getByText("Your face is small in the photo")).toBeVisible();
    await expect(
      page.getByText("Move closer, so your face fills more of the frame."),
    ).toBeVisible();
    await axe(page);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await axe(page);

    await button(page, "Analyse anyway").click();
    await expect(page).toHaveURL("/quiz");
    await page.goBack();
    await expect(heading(page)).toHaveText("Your photo was analysed and removed");
    await expect(
      page.getByText("You chose to analyse it anyway, so your result will be less certain."),
    ).toBeVisible();
    await expect(preview(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Continue to the questions" })).toBeVisible();

    await button(page, "Choose another photo").click();
    await expect(heading(page)).toHaveText("Choose a photo");
    await expect(heading(page)).toBeFocused();
    await choose(page, photos.closeUp()); // the picker on /analyze works again
    await expect(heading(page)).toHaveText("Your photo was analysed and removed");
  });

  test("a darkened photo is reported as too dark", async ({ page }) => {
    await page.goto("/analyze");
    await choose(page, photos.darkened());
    await expect(heading(page)).toHaveText("Check your photo");
    await expect(page.getByText("The photo is too dark")).toBeVisible();
    await expect(button(page, "Analyse anyway")).toBeVisible();
  });

  test("no face blocks: only 'Choose another photo'", async ({ page }) => {
    await page.goto("/analyze");
    await choose(page, photos.noFace());
    await expect(heading(page)).toHaveText("We couldn't use this photo");
    await expect(page.getByText("We couldn't find a face.")).toBeVisible();
    await expect(button(page, "Analyse anyway")).toHaveCount(0);
    await axe(page);
    await button(page, "Choose another photo").click();
    await expect(heading(page)).toHaveText("Choose a photo");
    await expect(heading(page)).toBeFocused();
  });

  test("in Albanian", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Shqip/ }).click();
    await choose(page, photos.portrait(), "Zgjidh një foto");
    await expect(heading(page)).toHaveText("Kontrollo foton");
    await expect(page.locator("html")).toHaveAttribute("lang", "sq");
    await axe(page);
    await button(page, "Analizoje gjithsesi").click();
    await expect(heading(page)).toHaveText("Disa pyetje të shpejta");
  });

  test("works at phone width without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/analyze");
    await choose(page, photos.darkened());
    await expect(heading(page)).toHaveText("Check your photo");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});

test.describe("image preparation", () => {
  test("applies EXIF orientation before analysis", async ({ page }) => {
    await page.goto("/analyze");
    await choose(page, photos.closeUp());
    await expect(heading(page)).toHaveText("Your photo was analysed and removed");
    const upright = await analysedSize(page);

    await button(page, "Choose another photo").click();
    await choose(page, photos.exifRotated());
    await expect(heading(page)).toHaveText("Your photo was analysed and removed");
    // Stored sideways with Orientation = 6: analysed upright, at the same size as the original.
    expect(await analysedSize(page)).toBe(upright);
    const [w, h] = upright!.split("x").map(Number);
    expect(w).toBeLessThan(h!);

    // Control: the same pixels without the EXIF tag are analysed sideways (and a face is still
    // found, which is why the size is what this test checks).
    await button(page, "Choose another photo").click();
    await choose(page, photos.sidewaysWithoutExif());
    await expect(heading(page)).toHaveText("Your photo was analysed and removed");
    expect(await analysedSize(page)).toBe(`${h}x${w}`);
  });

  test("downscales large photos to a 1600 px long side", async ({ page }) => {
    await page.goto("/analyze");
    await choose(page, photos.noFace(3200, 2000));
    await expect(heading(page)).toHaveText("We couldn't use this photo");
    expect(await analysedSize(page)).toBe("1600x1000");
  });
});

test.describe("motion", () => {
  test("with motion allowed, new screens fade in and settle fully visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/analyze");
    await choose(page, photos.portrait());
    const item = page.getByText("Your face is small in the photo");
    await expect(item).toBeVisible();
    // Reveal wraps each warning; it ends at full opacity with no offset.
    const card = page.locator("li > div").filter({ hasText: "Your face is small" });
    await expect(card).toHaveCSS("opacity", "1");
    await expect(card).toHaveCSS("transform", "none");
  });
});
