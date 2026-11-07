import { expect, test } from "@playwright/test";

// Dev-only routes (`page.dev.tsx`, see next.config.ts) must not exist in production builds.
// E2E runs against `next start`, i.e. the production build.
const DEV_ROUTES = ["/dev/landmarks"];

for (const route of DEV_ROUTES) {
  test(`${route} does not exist in the production build`, async ({ request }) => {
    const res = await request.get(route);
    expect(res.status()).toBe(404);
  });
}
