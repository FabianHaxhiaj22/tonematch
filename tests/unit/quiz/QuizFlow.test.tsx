import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { QuizFlow } from "@/features/quiz/QuizFlow";
import { scoreQuiz } from "@/lib/analysis/undertone";
import { useQuizStore } from "@/store/quiz";

beforeEach(() => {
  act(() => {
    useQuizStore.getState().reset();
    useQuizStore.getState().setLocale("en");
  });
});

const next = () => screen.getByRole("button", { name: /^(Next|See my answers)$/ });

describe("QuizFlow", () => {
  it("shows the first question as a radio group with four answers, Next disabled", () => {
    render(<QuizFlow />);
    const group = screen.getByRole("group", { name: /Question 1 of 4.*veins/ });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: "Not sure / doesn't apply" })).toBeInTheDocument();
    expect(next()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });

  it("enables Next once an answer is chosen, and advances", () => {
    render(<QuizFlow />);
    fireEvent.click(screen.getByRole("radio", { name: "Green or olive" }));
    expect(useQuizStore.getState().answers.veins).toBe("warm");
    expect(next()).toBeEnabled();
    fireEvent.click(next());
    expect(screen.getByRole("group", { name: /Question 2 of 4/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Pink or rosy" })).toBeInTheDocument(); // Q2 (D-009)
  });

  it("moves focus to the new question so screen readers announce it", () => {
    render(<QuizFlow />);
    fireEvent.click(screen.getByRole("radio", { name: "Blue or purple" }));
    fireEvent.click(next());
    expect(document.activeElement?.tagName).toBe("LEGEND");
    expect(document.activeElement).toHaveTextContent("Question 2 of 4");
  });

  it("goes back and keeps the earlier answer", () => {
    render(<QuizFlow />);
    fireEvent.click(screen.getByRole("radio", { name: "Blue or purple" }));
    fireEvent.click(next());
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: "Blue or purple" })).toBeChecked();
  });

  it("submits with Enter (form submit) only when an answer is chosen", () => {
    render(<QuizFlow />);
    const form = screen.getAllByRole("radio")[0]!.closest("form")!;
    fireEvent.submit(form);
    expect(useQuizStore.getState().step).toBe(0);
    fireEvent.click(screen.getByRole("radio", { name: "A mix of both" }));
    fireEvent.submit(form);
    expect(useQuizStore.getState().step).toBe(1);
  });

  it("completes the quiz; 'not sure' is shown as skipped and not scored", () => {
    render(<QuizFlow />);
    for (const name of ["Blue or purple", "Not sure / doesn't apply", "Silver", "Both"]) {
      fireEvent.click(screen.getByRole("radio", { name }));
      fireEvent.click(next());
    }
    expect(screen.getByRole("heading", { name: "Your answers" })).toHaveFocus();
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    const score = scoreQuiz(useQuizStore.getState().answers);
    expect(score).toMatchObject({ q: -2 / 3, answeredCount: 3 });
    expect(score.consistency).toBeCloseTo(1 - 2 / 9, 12); // values −1, −1, 0
  });

  it("lets you change an answer from the summary, and start again", () => {
    act(() => {
      const s = useQuizStore.getState();
      s.answer("veins", "cool");
      s.answer("daylight", "warm");
      s.answer("metal", "neutral");
      s.answer("white", "unsure");
      s.goTo(4);
    });
    render(<QuizFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Change answer to question 3" }));
    expect(screen.getByRole("group", { name: /Question 3 of 4/ })).toBeInTheDocument();
    act(() => useQuizStore.getState().goTo(4));
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(useQuizStore.getState().answers).toEqual({});
    expect(screen.getByRole("group", { name: /Question 1 of 4/ })).toBeInTheDocument();
  });

  it("switches to Albanian, marking the language for assistive tech", () => {
    const { container } = render(<QuizFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Shqip" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Disa pyetje të shpejta");
    expect(screen.getByRole("radio", { name: "Nuk e di" })).toBeInTheDocument();
    expect(container.querySelector("main")).toHaveAttribute("lang", "sq");
    expect(screen.getByRole("button", { name: "Shqip" })).toHaveAttribute("aria-pressed", "true");
  });

  it("clamps steps to the valid range", () => {
    act(() => useQuizStore.getState().goTo(99));
    expect(useQuizStore.getState().step).toBe(4);
    act(() => useQuizStore.getState().goTo(-3));
    expect(useQuizStore.getState().step).toBe(0);
  });
});
