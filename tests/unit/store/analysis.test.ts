import { beforeEach, describe, expect, it } from "vitest";
import { selectSummary, useAnalysisStore } from "@/store/analysis";
import { NO_FACE, PASSED, SMALL_AND_DARK, SUMMARY, WARNINGS } from "../analyze/fakes";

const SIZE = { width: 1280, height: 1600 };
const s = () => useAnalysisStore.getState();

beforeEach(() => s().reset());

describe("analysis store", () => {
  it("starts idle and runs through the stages", () => {
    expect(s().phase).toEqual({ status: "idle" });
    s().start();
    expect(s().phase).toEqual({ status: "running", stage: "preparing", slow: false });
    s().setStage("loading-model");
    s().markSlow();
    expect(s().phase).toEqual({ status: "running", stage: "loading-model", slow: true });
    // The slow note belongs to the download: it goes with the next stage.
    s().setStage("finding-face");
    expect(s().phase).toEqual({ status: "running", stage: "finding-face", slow: false });
  });

  it("only marks the download as slow, and ignores stages when not running", () => {
    s().start();
    s().markSlow();
    expect(s().phase).toMatchObject({ stage: "preparing", slow: false });
    s().reset();
    s().setStage("checking");
    s().markSlow();
    expect(s().phase).toEqual({ status: "idle" });
  });

  it("a passed photo is done straight away", () => {
    s().finish(PASSED, SIZE);
    expect(s().phase).toEqual({ status: "done", warnings: [], summary: SUMMARY, size: SIZE });
    expect(selectSummary(s())).toBe(SUMMARY);
  });

  it("warnings wait for 'Analyse anyway', which keeps them (they lower confidence)", () => {
    s().finish(SMALL_AND_DARK, SIZE);
    expect(s().phase.status).toBe("review");
    expect(selectSummary(s())).toBeNull();
    s().acceptWarnings();
    expect(s().phase).toMatchObject({ status: "done", warnings: WARNINGS });
    expect(selectSummary(s())).toBe(SUMMARY);
  });

  it("blocked results have no summary and can't be accepted", () => {
    s().finish(NO_FACE, SIZE);
    expect(s().phase).toEqual({ status: "blocked", reason: "NO_FACE", size: SIZE });
    s().acceptWarnings();
    expect(s().phase.status).toBe("blocked");
    expect(selectSummary(s())).toBeNull();
  });

  it("records failures", () => {
    s().fail("load");
    expect(s().phase).toEqual({ status: "failed", reason: "load" });
  });

  it("holds numbers only: the phase survives JSON unchanged", () => {
    s().finish(SMALL_AND_DARK, SIZE);
    s().acceptWarnings();
    expect(JSON.parse(JSON.stringify(s().phase))).toEqual(s().phase);
  });
});
