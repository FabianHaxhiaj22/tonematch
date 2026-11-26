import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
// Public-domain NASA portrait (tests/fixtures/SOURCES.md).
const FIXTURE = "tests/fixtures/faces/nasa-watkins-2017.jpg";
const HEIC_HEAD = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from("ftypheic"),
  Buffer.alloc(16),
]);

const axe = async (page: Page) =>
  expect((await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations).toEqual([]);

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

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

// Next 16 keeps visited routes mounted but hidden (React <Activity>), so a page can contain a
// hidden copy of another page's picker: always target the visible one.
const picker = (page: Page, label = "Choose a photo") =>
  page.getByLabel(label).filter({ visible: true });

const choosePhoto = (page: Page, label?: string) => picker(page, label).setInputFiles(FIXTURE);

// Scoped to <main>: Next's route announcer is also a role="alert" region.
const photoError = (page: Page) => page.getByRole("main").getByRole("alert");

test.describe("landing page", () => {
  test("has no axe violations in light mode, dark mode and Albanian", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Find the metals that love your skin",
    );
    await axe(page);

    await page.emulateMedia({ colorScheme: "dark" });
    await axe(page);

    await page.getByRole("button", { name: /Shqip/ }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "sq");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Gjej metalet që i shkojnë lëkurës sate",
    );
    await axe(page);
  });

  test("works at phone width without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.getByText("Tips for a good photo").click();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("skip link and section links work from the keyboard", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Privacy" })
      .click();
    await expect(page).toHaveURL(/#privacy$/);
  });

  test("explains HEIC instead of accepting it", async ({ page }) => {
    await page.goto("/");
    await picker(page).setInputFiles({
      name: "IMG_0001.HEIC",
      mimeType: "image/heic",
      buffer: HEIC_HEAD,
    });
    await expect(photoError(page)).toContainText("HEIC photo");
    await expect(page).toHaveURL("/");
  });
});

test.describe("photo step", () => {
  test("upload → preview on /analyze → continue to the questions, photo kept", async ({ page }) => {
    await page.goto("/");
    await choosePhoto(page);
    await expect(page).toHaveURL("/analyze");
    const preview = page.getByRole("img", { name: "The photo you chose" });
    await expect(preview).toBeVisible();
    await axe(page);

    await page.getByRole("link", { name: "Continue to the questions" }).click();
    await expect(page).toHaveURL("/quiz");
    await page.goBack();
    await expect(page.getByRole("img", { name: "The photo you chose" })).toBeVisible();
  });

  test("'Choose another photo' clears the photo and revokes its object URL", async ({ page }) => {
    await page.goto("/");
    await choosePhoto(page);
    const url = await page.getByRole("img", { name: "The photo you chose" }).getAttribute("src");
    expect(url).toMatch(/^blob:/);
    expect(await blobAlive(page, url!)).toBe(true);

    await page.getByRole("button", { name: "Choose another photo" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Choose a photo" })).toBeFocused();
    await expect(page.getByRole("img", { name: "The photo you chose" })).toHaveCount(0);
    expect(await blobAlive(page, url!)).toBe(false);

    await choosePhoto(page); // the picker on /analyze works too
    await expect(page.getByRole("img", { name: "The photo you chose" })).toBeVisible();
  });

  test("leaving the flow clears the photo", async ({ page }) => {
    await page.goto("/");
    await choosePhoto(page);
    const url = await page.getByRole("img", { name: "The photo you chose" }).getAttribute("src");

    await page.getByRole("link", { name: "ToneMatch" }).click(); // back to the landing page
    await expect(page).toHaveURL("/");
    await expect.poll(() => blobAlive(page, url!)).toBe(false);

    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Choose a photo" })).toBeVisible();
  });

  test("the chosen language carries through the flow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Shqip/ }).click();
    await choosePhoto(page, "Zgjidh një foto");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fotoja jote");
    await page.getByRole("link", { name: "Vazhdo te pyetjet" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Disa pyetje të shpejta");
    await expect(page.locator("html")).toHaveAttribute("lang", "sq");
  });
});
