/**
 * Renders src/app/apple-icon.png (180×180, the size iOS uses for home-screen icons) from the
 * same mark as src/app/icon.svg, on the ivory page colour with the mark centred. Run it only
 * when the logo changes: `pnpm exec tsx scripts/render-apple-icon.ts` (needs Playwright's
 * Chromium, as for `pnpm e2e`). The PNG is committed; the build doesn't run this.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const SIZE = 180;
const BACKGROUND = "#f8f4ee"; // --tm-bg (light)
const MARK_SCALE = 0.72; // share of the icon the mark spans; iOS rounds the corners itself

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Light-mode drawing only: iOS shows the icon on any wallpaper, so no dark variant.
const svg = readFileSync(resolve(root, "src/app/icon.svg"), "utf8").replace(
  /@media \(prefers-color-scheme: dark\)[^}]*}\s*}/,
  "",
);

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  await page.setContent(
    `<body style="margin:0;display:grid;place-items:center;width:${SIZE}px;height:${SIZE}px;background:${BACKGROUND}">
       <div style="width:${SIZE * MARK_SCALE}px;height:${SIZE * MARK_SCALE}px">${svg.replace("<svg ", '<svg width="100%" height="100%" ')}</div>
     </body>`,
  );
  await page.screenshot({ path: resolve(root, "src/app/apple-icon.png") });
  await browser.close();
  console.log("wrote src/app/apple-icon.png");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
