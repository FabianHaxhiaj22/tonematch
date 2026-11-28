import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const HEIC_HEAD = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from("ftypheic"),
  Buffer.alloc(16),
]);

const axe = async (page: Page) =>
  expect((await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations).toEqual([]);

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

// Next 16 keeps visited routes mounted but hidden (React <Activity>), so a page can contain a
// hidden copy of another page's picker: always target the visible one.
const picker = (page: Page, label = "Choose a photo") =>
  page.getByLabel(label).filter({ visible: true });

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
      "Gjej metalet që i rrinë bukur lëkurës sate",
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
