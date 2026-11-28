import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoStep } from "@/features/analyze/PhotoStep";
import { LandmarkerError } from "@/features/analyze/landmarkerClient";
import { setAnalyserForTests } from "@/features/analyze/runAnalysis";
import { useAnalysisStore } from "@/store/analysis";
import { useFlowStore } from "@/store/flow";
import { useLocaleStore } from "@/store/locale";
import { fakeAnalyser, NO_FACE, PASSED, SMALL_AND_DARK, type Call } from "./fakes";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

let calls: Call[];
const photo = () => new File(["x"], "me.jpg", { type: "image/jpeg" });
const h1 = () => screen.getByRole("heading", { level: 1 });
const flush = () => act(async () => {});

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const fake = fakeAnalyser();
  calls = fake.calls;
  setAnalyserForTests(fake.analyser);
  push.mockReset();
  act(() => {
    useFlowStore.setState({ photo: null });
    useAnalysisStore.getState().reset();
    useLocaleStore.getState().setLocale("en");
  });
});

afterEach(() => {
  setAnalyserForTests(null);
  vi.restoreAllMocks();
});

/** Render with a chosen photo; the analysis starts on mount. */
function renderWithPhoto() {
  act(() => useFlowStore.getState().setPhoto(photo()));
  render(<PhotoStep />);
  expect(calls).toHaveLength(1);
  return calls[0]!;
}

describe("PhotoStep (/analyze)", () => {
  it("without a photo, offers the picker and starts nothing", () => {
    render(<PhotoStep />);
    expect(h1()).toHaveTextContent("Choose a photo");
    expect(screen.getByLabelText("Choose a photo")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("previews the photo and announces each stage in one live region", () => {
    const call = renderWithPhoto();
    expect(h1()).toHaveTextContent("Your photo");
    expect(screen.getByRole("img", { name: "The photo you chose" })).toHaveAttribute(
      "src",
      "blob:photo",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Preparing your photo…");

    act(() => call.progress("loading-model"));
    expect(screen.getByRole("status")).toHaveTextContent("Loading the analysis tool…");
    expect(screen.getByRole("status")).toHaveTextContent("A one-time download of about 8 MB.");

    act(() => call.progress("finding-face"));
    expect(screen.getByRole("status")).toHaveTextContent("Finding your face…");
    expect(screen.getByRole("status")).not.toHaveTextContent("download");
  });

  it("shows the slow-connection note when the store says so", () => {
    const call = renderWithPhoto();
    act(() => {
      call.progress("loading-model");
      useAnalysisStore.getState().markSlow();
    });
    expect(screen.getByRole("status")).toHaveTextContent("This is taking a while.");
  });

  it("a passed photo: removed, with a link on to the questions", async () => {
    const call = renderWithPhoto();
    call.resolve(PASSED);
    await flush();
    expect(h1()).toHaveTextContent("Your photo was analysed and removed");
    expect(h1()).toHaveFocus();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
    expect(screen.getByText("The photo passed every check.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue to the questions" })).toHaveAttribute(
      "href",
      "/quiz",
    );
  });

  it("warnings: each with its tip; 'Analyse anyway' accepts them and goes to the quiz", async () => {
    const call = renderWithPhoto();
    call.resolve(SMALL_AND_DARK);
    await flush();
    expect(h1()).toHaveTextContent("Check your photo");
    expect(screen.getByText("Your face is small in the photo")).toBeInTheDocument();
    expect(screen.getByText("The photo is too dark")).toBeInTheDocument();
    expect(screen.getByText("Face a window in daylight, or add more light.")).toBeInTheDocument();
    // Two warnings (the step indicator's list items don't count).
    const items = screen.getAllByRole("listitem").filter((li) => !li.closest("nav"));
    expect(items).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Analyse anyway" }));
    expect(useAnalysisStore.getState().phase.status).toBe("done");
    expect(push).toHaveBeenCalledWith("/quiz");
    expect(h1()).toHaveTextContent("Your photo was analysed and removed");
    expect(
      screen.getByText("You chose to analyse it anyway, so your result will be less certain."),
    ).toBeInTheDocument();
  });

  it("warnings: 'Choose another photo' goes back to the picker", async () => {
    const call = renderWithPhoto();
    call.resolve(SMALL_AND_DARK);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Choose another photo" }));
    expect(h1()).toHaveTextContent("Choose a photo");
    expect(h1()).toHaveFocus();
    expect(useAnalysisStore.getState().phase).toEqual({ status: "idle" });
  });

  it("blocking issues offer only another photo", async () => {
    const call = renderWithPhoto();
    call.resolve(NO_FACE);
    await flush();
    expect(h1()).toHaveTextContent("We couldn't use this photo");
    expect(screen.getByText(/We couldn't find a face/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Analyse anyway" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose another photo" }));
    expect(h1()).toHaveTextContent("Choose a photo");
  });

  it("a failed load keeps the photo and offers 'Try again'", async () => {
    const call = renderWithPhoto();
    call.reject(new LandmarkerError("model", "404"));
    await flush();
    expect(h1()).toHaveTextContent("The analysis couldn't start");
    expect(useFlowStore.getState().photo).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(calls).toHaveLength(2);
    calls[1]!.resolve(PASSED);
    await flush();
    expect(h1()).toHaveTextContent("Your photo was analysed and removed");
  });

  it("an unreadable photo says so and offers another", async () => {
    const call = renderWithPhoto();
    call.reject(new LandmarkerError("decode", "bad"));
    await flush();
    expect(h1()).toHaveTextContent("We couldn't read this photo");
    fireEvent.click(screen.getByRole("button", { name: "Choose another photo" }));
    expect(h1()).toHaveTextContent("Choose a photo");
  });

  it("records the analysed size on the page (for the orientation e2e test)", async () => {
    const call = renderWithPhoto();
    call.resolve(PASSED, { width: 768, height: 880 });
    await flush();
    expect(document.querySelector("[data-analysed-size]")).toHaveAttribute(
      "data-analysed-size",
      "768x880",
    );
  });

  it("speaks Albanian", async () => {
    act(() => useLocaleStore.getState().setLocale("sq"));
    const call = renderWithPhoto();
    call.resolve(SMALL_AND_DARK);
    await flush();
    expect(h1()).toHaveTextContent("Kontrollo foton");
    expect(screen.getByRole("button", { name: "Analizoje gjithsesi" })).toBeInTheDocument();
  });
});
