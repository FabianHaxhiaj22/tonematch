import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      // README §9.5: pure logic in src/lib must keep ≥ 90% coverage.
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: ["src/lib/**/*.test.{ts,tsx}"],
      reporter: ["text", "html", "lcov"],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
