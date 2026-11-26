import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlowLifecycle } from "@/components/layout/FlowLifecycle";
import { useFlowStore } from "@/store/flow";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  act(() => useFlowStore.setState({ photo: null }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

const choosePhoto = () =>
  act(() => useFlowStore.getState().setPhoto(new File(["x"], "me.jpg", { type: "image/jpeg" })));

describe("FlowLifecycle: the photo is cleared when the user leaves the flow", () => {
  it("keeps the photo while moving between flow pages", () => {
    nav.pathname = "/analyze";
    const { rerender } = render(<FlowLifecycle />);
    choosePhoto();
    nav.pathname = "/quiz";
    rerender(<FlowLifecycle />);
    expect(useFlowStore.getState().photo).not.toBeNull();
  });

  it("clears the photo and revokes its URL on a page outside the flow", () => {
    nav.pathname = "/quiz";
    const { rerender } = render(<FlowLifecycle />);
    choosePhoto();
    nav.pathname = "/";
    rerender(<FlowLifecycle />);
    expect(useFlowStore.getState().photo).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });

  it("doesn't clear a photo chosen on the landing page before navigating into the flow", () => {
    nav.pathname = "/";
    const { rerender } = render(<FlowLifecycle />);
    choosePhoto(); // PhotoPicker on "/" sets the photo, then router.push("/analyze")
    rerender(<FlowLifecycle />); // same pathname: no effect re-run
    expect(useFlowStore.getState().photo).not.toBeNull();
    nav.pathname = "/analyze";
    rerender(<FlowLifecycle />);
    expect(useFlowStore.getState().photo).not.toBeNull();
  });
});
