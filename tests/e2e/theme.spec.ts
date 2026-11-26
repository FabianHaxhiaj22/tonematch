import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LIGHT_BG = "rgb(248, 244, 238)"; // --tm-bg light #f8f4ee
const DARK_BG = "rgb(21, 18, 16)"; // --tm-bg dark #151210

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const axe = async (page: Page) =>
  expect((await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations).toEqual([]);

async function choose(page: Page, name: "Light" | "Dark" | "System") {
  await page.getByRole("button", { name: /^Theme:/ }).click();
  // The radios are visually hidden; like a user, click the visible label.
  await page.getByRole("group", { name: "Theme" }).getByText(name, { exact: true }).click();
  await expect(page.getByRole("radio", { name })).toBeChecked();
  await page.keyboard.press("Escape");
}

test("a chosen theme overrides the system setting, both ways", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await bodyBg(page)).toBe(LIGHT_BG);

  await choose(page, "Dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bodyBg(page)).toBe(DARK_BG);
  await axe(page);

  await page.emulateMedia({ colorScheme: "dark" });
  await choose(page, "Light");
  expect(await bodyBg(page)).toBe(LIGHT_BG);
  await axe(page);

  await choose(page, "System");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  expect(await bodyBg(page)).toBe(DARK_BG); // system is dark now
});

test("the choice survives a reload with the right colours from the first paint", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await choose(page, "Dark");

  // The inline <head> script runs before <body> is parsed, so the theme is set before any paint.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bodyBg(page)).toBe(DARK_BG);
  await expect(page.getByRole("button", { name: /^Theme:/ })).toHaveAccessibleName("Theme: Dark");

  const head = await (await page.request.get("/")).text();
  const scriptAt = head.indexOf("tm-theme");
  expect(scriptAt).toBeGreaterThan(-1);
  expect(scriptAt).toBeLessThan(head.indexOf("<body"));
});

test("only the theme preference is stored, and only once chosen", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await choose(page, "Light");
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ "tm-theme": "light" });
  await choose(page, "System");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test("keyboard: open, move with arrows, close with Escape", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /^Theme:/ });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("radio", { name: "System" }).focus();
  await page.keyboard.press("ArrowUp"); // System → Dark
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  expect(await bodyBg(page)).toBe(DARK_BG);
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("the header still fits at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await page.getByRole("button", { name: /^Theme:/ }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
