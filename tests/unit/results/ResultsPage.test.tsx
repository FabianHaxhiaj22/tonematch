import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResultsPage } from "@/features/results/ResultsPage";
import { metalBackground } from "@/features/results/Swatches";
import type { PhotoSummary } from "@/lib/analysis/score";
import type { QuizAnswers } from "@/lib/analysis/undertone";
import { loadRecommendData } from "@/lib/recommend";
import { buildResultsView } from "@/lib/results";
import { useAnalysisStore } from "@/store/analysis";
import { useLocaleStore } from "@/store/locale";
import { useQuizStore } from "@/store/quiz";
import { COOL_SKIN, SPLIT, WARM_SKIN, all } from "./fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

/** Put the flow in the state the quiz leaves it: an accepted analysis plus answers. */
function arrive(summary: PhotoSummary, answers: QuizAnswers) {
  act(() => {
    useAnalysisStore.setState({
      phase: { status: "done", warnings: [], summary, size: { width: 1280, height: 1600 } },
    });
    useQuizStore.setState({ answers, step: 4 });
  });
}

const h1 = () => screen.getByRole("heading", { level: 1 });
/** The confident heading's two parts: undertone, then depth (its "·" is decorative). */
const headingParts = () => {
  const [undertone, depth] = [...screen.getByTestId("profile-heading").children];
  return { undertone: undertone!.textContent, depth: depth!.textContent };
};
const main = () => screen.getByTestId("results");

function renderPage() {
  render(
    <div data-testid="results">
      <ResultsPage />
    </div>,
  );
}

beforeEach(() => {
  push.mockReset();
  act(() => {
    useAnalysisStore.getState().reset();
    useQuizStore.getState().reset();
    useLocaleStore.getState().setLocale("en");
  });
});

describe("ResultsPage without an analysis", () => {
  it("asks the user to start with a photo, linking to /analyze", () => {
    renderPage();
    expect(h1()).toHaveTextContent("No results yet");
    expect(screen.getByRole("link", { name: "Start with a photo" })).toHaveAttribute(
      "href",
      "/analyze",
    );
    expect(screen.queryByText("Metals for you")).toBeNull();
  });

  it("also with quiz answers but no photo analysis", () => {
    act(() => useQuizStore.setState({ answers: all("warm") }));
    renderPage();
    expect(h1()).toHaveTextContent("No results yet");
  });

  it("shows the step indicator with Result as the current step", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: "Steps" });
    expect(within(nav).getByText("Result").closest("[aria-current]")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});

describe("ResultsPage: a confident warm result", () => {
  beforeEach(() => arrive(WARM_SKIN, all("warm")));

  it("leads with the undertone and depth, the skin swatch and the approximate MST", () => {
    renderPage();
    expect(headingParts()).toEqual({ undertone: "Warm", depth: "·, Medium" });
    expect(h1()).toHaveAccessibleName(/^Warm ?, Medium$/);
    expect(screen.getByText("Your skin, as sampled")).toBeInTheDocument();
    expect(screen.getByText("Colours on screen are approximate.")).toBeInTheDocument();
    expect(
      screen.getByText(/^About \d+ on the Monk Skin Tone scale \(approximate\)$/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/#[0-9a-f]{6}/i)).toBeNull(); // no hex code shown (decision 3)
  });

  it("the depth separator is decorative, so a wrapped depth never starts with it", () => {
    renderPage();
    const depth = screen.getByTestId("profile-heading").children[1]!;
    const dot = depth.querySelector('[aria-hidden="true"]')!;
    expect(dot).toHaveTextContent("·");
    // Outside the depth's left edge, clipped by the heading when the depth starts a line.
    expect(dot).toHaveClass("absolute", "right-full");
    expect(screen.getByTestId("profile-heading")).toHaveClass("flex-wrap", "overflow-x-clip");
  });

  it("shows the MST value as a position on a neutral track, not as colour swatches", () => {
    renderPage();
    const track = main().querySelector("[data-mst-track]")!;
    const steps = [...track.children] as HTMLElement[];
    expect(steps).toHaveLength(10);
    const current = steps.filter((s) => s.hasAttribute("data-current"));
    expect(current).toHaveLength(1);
    expect(steps.indexOf(current[0]!) + 1).toBe(
      buildResultsView(WARM_SKIN, all("warm"), loadRecommendData()).mstApprox,
    );
    for (const s of steps) expect(s.style.backgroundColor).toBe("");
  });

  it("credits the MST scale as the official page asks, with the licence link", () => {
    renderPage();
    expect(screen.getByText(/Monk, Ellis\. “Monk Skin Tone Scale,” 2019\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "skintone.google" })).toHaveAttribute(
      "href",
      "https://skintone.google",
    );
    const licence = screen.getByRole("link", { name: "CC BY 4.0" });
    expect(licence).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
    expect(licence).toHaveAttribute("rel", "license");
  });

  it("shows the confidence as a percentage, with the bar at that value", () => {
    renderPage();
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(main().querySelector("[data-percent]")).toHaveAttribute("data-percent", "85");
  });

  it("shows the one-line summary and no 'both can work' message", () => {
    renderPage();
    expect(screen.getByText(/Your skin reads warm in this analysis/)).toBeInTheDocument();
    expect(screen.queryByTestId("lead-note")).toBeNull();
  });

  it("lists metals by tier, each with a skin + metal swatch pair and a reason", () => {
    renderPage();
    const metals = screen.getByRole("region", { name: "Metals for you" });
    const tiers = within(metals).getAllByRole("heading", { level: 3 });
    expect(tiers.map((h) => h.textContent)).toEqual(["Best for you", "Also good", "Use with care"]);
    const yellow = metals.querySelector('[data-metal="yellow-gold"]') as HTMLElement;
    expect(within(yellow).getByText("Yellow gold")).toBeInTheDocument();
    expect(
      within(yellow).getByText("Matches the way your skin tone leans, so it looks effortless."),
    ).toBeInTheDocument();
    expect(yellow.querySelector('[data-swatch="#d4af37"]')).not.toBeNull();
  });

  it("puts the styles in one card per category, with finish advice", () => {
    renderPage();
    const styles = screen.getByRole("region", { name: "Styles to try" });
    const cards = styles.querySelectorAll("[data-category]");
    expect([...cards].map((c) => c.getAttribute("data-category"))).toEqual([
      "rings",
      "earrings",
      "necklaces",
      "bracelets",
    ]);
    for (const card of cards) expect(card).toHaveClass("gold-card");
    expect(within(styles).getByText("Finish")).toBeInTheDocument();
  });

  it("shows gemstones with a warm eyebrow; the disclaimer is left to the footer", () => {
    renderPage();
    const gems = screen.getByRole("region", { name: "Gemstones" });
    expect(within(gems).getByText("Stones that echo your warmth")).toBeInTheDocument();
    const view = buildResultsView(WARM_SKIN, all("warm"), loadRecommendData());
    expect(within(gems).getAllByRole("listitem")).toHaveLength(view.gemstones.length);
    expect(screen.queryByText(/Lighting and cameras affect results/)).toBeNull();
  });

  it("'Start again' clears the analysis and answers and goes to /analyze", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(useAnalysisStore.getState().phase.status).toBe("idle");
    expect(useQuizStore.getState().answers).toEqual({});
    expect(push).toHaveBeenCalledWith("/analyze");
  });

  it("recomputes when an answer changes", () => {
    renderPage();
    expect(headingParts().undertone).toBe("Warm");
    act(() => useQuizStore.setState({ answers: all("cool") }));
    expect(screen.getByText("Good to know")).toBeInTheDocument();
    expect(
      screen.getByText(/Your photo and your answers pointed in different directions/),
    ).toBeInTheDocument();
  });
});

describe("ResultsPage: low confidence", () => {
  beforeEach(() => arrive(COOL_SKIN, SPLIT));

  it("leads with 'Both can work' and shows the reading smaller", () => {
    renderPage();
    expect(h1()).toHaveTextContent("Both can work");
    expect(
      screen.getByText("Undertone reading: Neutral, leaning cool · Medium"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("profile-heading")).toBeNull();
  });

  it("shows the 'both can work' message prominently, not among the notes", () => {
    renderPage();
    const lead = screen.getByTestId("lead-note");
    expect(lead).toHaveTextContent(/^Both metal families can work for you\. For a clearer result/);
    expect(lead.querySelector("p")).toHaveClass("text-lg");
    expect(screen.queryByText("Good to know")).toBeNull();
    expect(screen.getAllByText(/For a clearer result/)).toHaveLength(1);
  });

  it("says it once: heading and box, no summary line; each metal has its own reason", () => {
    renderPage();
    expect(screen.queryByText(/We couldn't tell clearly enough/)).toBeNull();
    const reasons = [...main().querySelectorAll("[data-metal] p + p")].map((p) => p.textContent);
    expect(reasons.length).toBe(7);
    expect(new Set(reasons).size).toBe(reasons.length);
    expect(screen.getByText("Cool and bright, and easy to wear every day.")).toBeInTheDocument();
  });

  it("uses a balanced gemstone eyebrow", () => {
    renderPage();
    expect(screen.getByText("Stones for a balanced palette")).toBeInTheDocument();
  });
});

describe("ResultsPage in Albanian", () => {
  it("renders every section from the sq messages", () => {
    arrive(COOL_SKIN, all("cool"));
    act(() => useLocaleStore.getState().setLocale("sq"));
    renderPage();
    expect(headingParts()).toEqual({ undertone: "I ftohtë", depth: "·, Mesatare" });
    expect(screen.getByRole("heading", { name: "Metalet për ty" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stile për t'i provuar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gurë të çmuar" })).toBeInTheDocument();
    expect(screen.getByText("Ngjyrat në ekran janë të përafërta.")).toBeInTheDocument();
    expect(screen.getByText(/Përafërsisht \d+ në shkallën Monk Skin Tone/)).toBeInTheDocument();
    expect(screen.queryByText("Metals for you")).toBeNull();
  });

  it("the low-confidence heading too", () => {
    arrive(WARM_SKIN, SPLIT);
    act(() => useLocaleStore.getState().setLocale("sq"));
    renderPage();
    expect(h1()).toHaveTextContent("Të dyja mund të të rrinë mirë");
    expect(screen.getByText(/^Nëntoni sipas analizës: /)).toBeInTheDocument();
  });
});

describe("metalBackground", () => {
  it("adds a sheen over one colour, or diagonal bands for a blend", () => {
    expect(metalBackground(["#c0c0c0"])).toMatch(/radial-gradient.*#c0c0c0$/);
    const mixed = metalBackground(["#d4af37", "#c0c0c0"]);
    expect(mixed).toContain("linear-gradient(135deg, #d4af37 0% 50%, #c0c0c0 50% 100%)");
  });
});
