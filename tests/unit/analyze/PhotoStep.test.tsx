import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoStep } from "@/features/analyze/PhotoStep";
import { useFlowStore } from "@/store/flow";
import { useLocaleStore } from "@/store/locale";

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  act(() => {
    useFlowStore.setState({ photo: null });
    useLocaleStore.getState().setLocale("en");
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PhotoStep (/analyze)", () => {
  it("without a photo, offers the picker", () => {
    render(<PhotoStep />);
    expect(screen.getByRole("heading", { level: 1, name: "Choose a photo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Choose a photo")).toBeInTheDocument();
  });

  it("previews the chosen photo and links on to the questions", () => {
    act(() => useFlowStore.getState().setPhoto(new File(["x"], "me.jpg", { type: "image/jpeg" })));
    render(<PhotoStep />);
    expect(screen.getByRole("heading", { level: 1, name: "Your photo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "The photo you chose" })).toHaveAttribute(
      "src",
      "blob:photo",
    );
    expect(screen.getByRole("link", { name: "Continue to the questions" })).toHaveAttribute(
      "href",
      "/quiz",
    );
  });

  it("'Choose another photo' clears the photo, revokes its URL and focuses the picker heading", () => {
    act(() => useFlowStore.getState().setPhoto(new File(["x"], "me.jpg", { type: "image/jpeg" })));
    render(<PhotoStep />);
    fireEvent.click(screen.getByRole("button", { name: "Choose another photo" }));
    expect(useFlowStore.getState().photo).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Choose a photo" })).toHaveFocus();
  });
});
