import type { NextConfig } from "next";

/**
 * Dev-only routes: files named `page.dev.tsx` are pages only under `next dev`. In a production
 * build "dev.tsx" isn't a page extension, so `page.dev.tsx` is just an unreferenced module:
 * no route, no bundle (README §8; checked by tests/e2e/dev-routes.spec.ts).
 */
const isDev = process.env.NODE_ENV === "development";
const PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

const nextConfig: NextConfig = {
  pageExtensions: isDev ? ["dev.tsx", ...PAGE_EXTENSIONS] : PAGE_EXTENSIONS,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
