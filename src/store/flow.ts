/**
 * The analysis flow's photo (SPEC §2, §5: the image never leaves the browser and is discarded
 * after use). The chosen File and one object URL for its preview live in memory only, never in
 * storage. The photo is released, and its object URL revoked, as soon as it has been analysed
 * (M6b-1: only the numbers in ./analysis remain), and also when the user chooses another photo,
 * starts over, or leaves the flow (FlowLifecycle in src/components/layout).
 */
import { create } from "zustand";
import { useAnalysisStore } from "./analysis";
import { useQuizStore } from "./quiz";

/**
 * Routes that belong to the flow: the photo is kept while the user moves between them and
 * cleared on any other route. `/results` arrives in M6b-2.
 */
export const FLOW_ROUTES = ["/analyze", "/quiz", "/results"] as const;

/** True for a flow route or a sub-path of one (`/quiz`, `/quiz/…`), not for look-alikes (`/quizzes`). */
export function isFlowRoute(pathname: string): boolean {
  return FLOW_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export type FlowPhoto = { file: File; url: string };

type FlowState = {
  photo: FlowPhoto | null;
  /** Keep this file as the flow's photo (replacing and releasing any earlier one and its result). */
  setPhoto: (file: File) => void;
  /**
   * Forget the photo and revoke its object URL. Safe to call when there is none. An analysis
   * still running for it is abandoned; a finished analysis (numbers only) is kept.
   */
  clearPhoto: () => void;
  /** "Choose another photo": forget the photo and its analysis, back to the picker. */
  chooseAnother: () => void;
  /** "Start again": clear the photo, the analysis and the quiz answers. */
  startOver: () => void;
};

export const useFlowStore = create<FlowState>()((set, get) => ({
  photo: null,
  setPhoto: (file) => {
    const previous = get().photo;
    if (previous) URL.revokeObjectURL(previous.url);
    useAnalysisStore.getState().reset();
    set({ photo: { file, url: URL.createObjectURL(file) } });
  },
  clearPhoto: () => {
    const previous = get().photo;
    if (!previous) return;
    URL.revokeObjectURL(previous.url);
    set({ photo: null });
    const analysis = useAnalysisStore.getState();
    if (analysis.phase.status === "running") analysis.reset();
  },
  chooseAnother: () => {
    get().clearPhoto();
    useAnalysisStore.getState().reset();
  },
  startOver: () => {
    get().chooseAnother();
    useQuizStore.getState().reset();
  },
}));
