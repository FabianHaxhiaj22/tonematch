import type { NextConfig } from "next";
import { MODELS_CACHE_MAX_AGE_S, MODELS_URL_PREFIX } from "./src/lib/models/config";

/**
 * Dev-only routes: files named `page.dev.tsx` are pages only under `next dev`. In a production
 * build "dev.tsx" isn't a page extension, so `page.dev.tsx` is just an unreferenced module:
 * no route, no bundle (SPEC §8; checked by tests/e2e/dev-routes.spec.ts).
 */
const isDev = process.env.NODE_ENV === "development";
const PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

const nextConfig: NextConfig = {
  pageExtensions: isDev ? ["dev.tsx", ...PAGE_EXTENSIONS] : PAGE_EXTENSIONS,
  cacheComponents: true,
  partialPrefetching: true,
  /**
   * The MediaPipe files live under a versioned folder (/models/<version>/, src/lib/models), so a
   * URL's content never changes: cache them for a year without revalidation. Headers apply to
   * /public files too (headers are checked before the filesystem).
   */
  async headers() {
    return [
      {
        source: `${MODELS_URL_PREFIX}/:path*`,
        headers: [
          {
            key: "Cache-Control",
            value: `public, max-age=${MODELS_CACHE_MAX_AGE_S}, immutable`,
          },
        ],
      },
    ];
  },
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
