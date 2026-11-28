import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalysisStore } from "@/store/analysis";
import { useFlowStore } from "@/store/flow";
import { useQuizStore } from "@/store/quiz";
import { PASSED } from "../analyze/fakes";

const photo = () => new File(["x"], "me.jpg", { type: "image/jpeg" });
const SIZE = { width: 1, height: 1 };

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  useFlowStore.setState({ photo: null });
  useAnalysisStore.getState().reset();
});
afterEach(() => vi.restoreAllMocks());

describe("flow store and the analysis (M6b-1)", () => {
  it("a new photo replaces the previous analysis", () => {
    useAnalysisStore.getState().finish(PASSED, SIZE);
    useFlowStore.getState().setPhoto(photo());
    expect(useAnalysisStore.getState().phase).toEqual({ status: "idle" });
  });

  it("releasing the photo after analysis keeps the numbers", () => {
    useFlowStore.getState().setPhoto(photo());
    useAnalysisStore.getState().finish(PASSED, SIZE);
    useFlowStore.getState().clearPhoto();
    expect(useFlowStore.getState().photo).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");
    expect(useAnalysisStore.getState().phase.status).toBe("done");
  });

  it("clearing the photo mid-analysis abandons the analysis", () => {
    useFlowStore.getState().setPhoto(photo());
    useAnalysisStore.getState().start();
    useFlowStore.getState().clearPhoto();
    expect(useAnalysisStore.getState().phase).toEqual({ status: "idle" });
  });

  it("'Choose another photo' forgets the photo and the analysis", () => {
    useFlowStore.getState().setPhoto(photo());
    useAnalysisStore.getState().finish(PASSED, SIZE);
    useFlowStore.getState().chooseAnother();
    expect(useFlowStore.getState().photo).toBeNull();
    expect(useAnalysisStore.getState().phase).toEqual({ status: "idle" });
  });

  it("'Start again' also resets the analysis and the quiz", () => {
    useAnalysisStore.getState().finish(PASSED, SIZE);
    useQuizStore.getState().answer("veins", "warm");
    useFlowStore.getState().startOver();
    expect(useAnalysisStore.getState().phase).toEqual({ status: "idle" });
    expect(useQuizStore.getState().answers).toEqual({});
  });
});
