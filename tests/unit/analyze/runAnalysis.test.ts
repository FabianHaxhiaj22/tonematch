import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SLOW_LOAD_MS } from "@/features/analyze/config";
import { LandmarkerError } from "@/features/analyze/landmarkerClient";
import { retryAnalysis, runAnalysis, setAnalyserForTests } from "@/features/analyze/runAnalysis";
import { useAnalysisStore } from "@/store/analysis";
import { useFlowStore } from "@/store/flow";
import { fakeAnalyser, PASSED, SMALL_AND_DARK, type Call } from "./fakes";

let calls: Call[];
const phase = () => useAnalysisStore.getState().phase;
const flowPhoto = () => useFlowStore.getState().photo;

function choose() {
  useFlowStore.getState().setPhoto(new File(["x"], "me.jpg", { type: "image/jpeg" }));
  return flowPhoto()!;
}
const flush = () => act(async () => {});

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const fake = fakeAnalyser();
  calls = fake.calls;
  setAnalyserForTests(fake.analyser);
  useFlowStore.setState({ photo: null });
  useAnalysisStore.getState().reset();
});
afterEach(() => {
  setAnalyserForTests(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("runAnalysis", () => {
  it("sends the photo file, follows the stages and releases the photo when done", async () => {
    const p = choose();
    const run = runAnalysis(p);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.photo).toBe(p.file);
    calls[0]!.progress("finding-face");
    expect(phase()).toMatchObject({ status: "running", stage: "finding-face" });
    calls[0]!.resolve(SMALL_AND_DARK, { width: 1200, height: 1600 });
    await run;
    expect(phase()).toMatchObject({ status: "review", size: { width: 1200, height: 1600 } });
    expect(flowPhoto()).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");
  });

  it("doesn't start twice for the same photo", async () => {
    const p = choose();
    void runAnalysis(p);
    void runAnalysis(p);
    expect(calls).toHaveLength(1);
    calls[0]!.resolve(PASSED);
    await flush();
    void runAnalysis(p); // already done
    expect(calls).toHaveLength(1);
  });

  it("drops a result for a photo the user already left", async () => {
    const p = choose();
    const run = runAnalysis(p);
    useFlowStore.getState().clearPhoto(); // e.g. back to the landing page
    calls[0]!.resolve(PASSED);
    await run;
    expect(phase()).toEqual({ status: "idle" });
  });

  it("drops progress and results from an older run once a new photo is chosen", async () => {
    const first = runAnalysis(choose());
    const second = runAnalysis(choose());
    calls[0]!.progress("checking");
    calls[0]!.resolve(PASSED);
    await first;
    expect(phase()).toMatchObject({ status: "running", stage: "preparing" });
    calls[1]!.resolve(SMALL_AND_DARK);
    await second;
    expect(phase().status).toBe("review");
  });

  it("adds the slow note after SLOW_LOAD_MS of loading, not before", async () => {
    vi.useFakeTimers();
    const run = runAnalysis(choose());
    calls[0]!.progress("loading-model");
    vi.advanceTimersByTime(SLOW_LOAD_MS - 1);
    expect(phase()).toMatchObject({ slow: false });
    vi.advanceTimersByTime(1);
    expect(phase()).toMatchObject({ stage: "loading-model", slow: true });
    calls[0]!.progress("finding-face");
    vi.advanceTimersByTime(SLOW_LOAD_MS);
    expect(phase()).toMatchObject({ stage: "finding-face", slow: false });
    calls[0]!.resolve(PASSED);
    await run;
  });

  it("a load failure keeps the photo, and 'Try again' analyses it again", async () => {
    const p = choose();
    const run = runAnalysis(p);
    calls[0]!.reject(new LandmarkerError("model", "404"));
    await run;
    expect(phase()).toEqual({ status: "failed", reason: "load" });
    expect(flowPhoto()).toBe(p);

    retryAnalysis();
    expect(calls).toHaveLength(2);
    calls[1]!.resolve(PASSED);
    await flush();
    expect(phase().status).toBe("done");
  });

  it("timeouts and crashes count as load failures", async () => {
    const run = runAnalysis(choose());
    calls[0]!.reject(new LandmarkerError("timeout", "slow"));
    await run;
    expect(phase()).toEqual({ status: "failed", reason: "load" });
    retryAnalysis();
    calls[1]!.reject(new Error("boom"));
    await flush();
    expect(phase()).toEqual({ status: "failed", reason: "load" });
  });

  it("an unreadable photo is released (there's nothing to retry)", async () => {
    const run = runAnalysis(choose());
    calls[0]!.reject(new LandmarkerError("decode", "bad image"));
    await run;
    expect(phase()).toEqual({ status: "failed", reason: "decode" });
    expect(flowPhoto()).toBeNull();
  });

  it("'Try again' without a photo does nothing", () => {
    retryAnalysis();
    expect(calls).toHaveLength(0);
  });
});
