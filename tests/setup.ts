import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount rendered components between tests (Vitest globals are off, so RTL can't do it itself).
afterEach(() => {
  cleanup();
});
