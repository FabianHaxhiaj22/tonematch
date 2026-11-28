import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MODEL_PATHS, modelPaths, modelsVersion, type ModelsLockId } from "@/lib/models";

const SHA = "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff";
const lock = (over: Partial<ModelsLockId> = {}): ModelsLockId => ({
  tasksVisionVersion: "1.2.3",
  model: { file: "face_landmarker.task", sha256: SHA },
  ...over,
});

describe("versioned model paths", () => {
  it("names the folder after the tasks-vision version and the model hash", () => {
    expect(modelsVersion(lock())).toBe("1.2.3-64184e22");
    expect(modelPaths(lock())).toEqual({
      version: "1.2.3-64184e22",
      base: "/models/1.2.3-64184e22",
      wasm: "/models/1.2.3-64184e22/wasm",
      model: "/models/1.2.3-64184e22/face_landmarker.task",
    });
  });

  it("changes when the package or the model changes (so immutable caching stays safe)", () => {
    const base = modelsVersion(lock());
    expect(modelsVersion(lock({ tasksVisionVersion: "1.2.4" }))).not.toBe(base);
    const otherModel = { file: "face_landmarker.task", sha256: "0".repeat(64) };
    expect(modelsVersion(lock({ model: otherModel }))).not.toBe(base);
  });

  it.each([
    ["a non-semver version", lock({ tasksVisionVersion: "latest" })],
    ["a path in the version", lock({ tasksVisionVersion: "../1.2.3" })],
    ["a short hash", lock({ model: { file: "f", sha256: "abc" } })],
    ["an upper-case hash", lock({ model: { file: "f", sha256: SHA.toUpperCase() } })],
  ])("rejects %s", (_name, l) => {
    expect(() => modelsVersion(l)).toThrow(/models\.lock\.json/);
  });

  it("the app uses the committed lock file", () => {
    const committed = JSON.parse(readFileSync("scripts/models.lock.json", "utf8")) as ModelsLockId;
    expect(MODEL_PATHS).toEqual(modelPaths(committed));
    expect(MODEL_PATHS.base).toMatch(/^\/models\/\d+\.\d+\.\d+-[0-9a-f]{8}$/);
  });
});
