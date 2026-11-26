import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLOW_ROUTES, isFlowRoute, useFlowStore } from "@/store/flow";
import { useQuizStore } from "@/store/quiz";

const photo = (name = "me.jpg") => new File(["x"], name, { type: "image/jpeg" });

let created: string[];
let revoked: string[];

beforeEach(() => {
  created = [];
  revoked = [];
  let n = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
    const url = `blob:test/${++n}`;
    created.push(url);
    return url;
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => void revoked.push(url));
  act(() => useFlowStore.setState({ photo: null }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("flow store: the photo lives in memory and is released", () => {
  it("setPhoto keeps the file with one object URL for its preview", () => {
    const file = photo();
    act(() => useFlowStore.getState().setPhoto(file));
    expect(useFlowStore.getState().photo).toEqual({ file, url: "blob:test/1" });
    expect(revoked).toEqual([]);
  });

  it("choosing another photo revokes the previous object URL", () => {
    act(() => useFlowStore.getState().setPhoto(photo("a.jpg")));
    act(() => useFlowStore.getState().setPhoto(photo("b.jpg")));
    expect(revoked).toEqual(["blob:test/1"]);
    expect(useFlowStore.getState().photo?.url).toBe("blob:test/2");
  });

  it("clearPhoto forgets the file and revokes its URL; a second call is a no-op", () => {
    act(() => useFlowStore.getState().setPhoto(photo()));
    act(() => useFlowStore.getState().clearPhoto());
    expect(useFlowStore.getState().photo).toBeNull();
    expect(revoked).toEqual(["blob:test/1"]);
    act(() => useFlowStore.getState().clearPhoto());
    expect(revoked).toEqual(["blob:test/1"]);
  });

  it("startOver clears the photo and the quiz answers", () => {
    act(() => {
      useFlowStore.getState().setPhoto(photo());
      useQuizStore.getState().answer("veins", "warm");
      useQuizStore.getState().goTo(2);
    });
    act(() => useFlowStore.getState().startOver());
    expect(useFlowStore.getState().photo).toBeNull();
    expect(revoked).toEqual(["blob:test/1"]);
    expect(useQuizStore.getState()).toMatchObject({ answers: {}, step: 0 });
  });

  it("every created object URL is revoked once the photo is gone", () => {
    act(() => {
      const s = useFlowStore.getState();
      s.setPhoto(photo("a.jpg"));
      s.setPhoto(photo("b.jpg"));
      s.setPhoto(photo("c.jpg"));
      s.clearPhoto();
    });
    expect([...revoked].sort()).toEqual([...created].sort());
  });
});

describe("isFlowRoute", () => {
  it.each(FLOW_ROUTES.map((r) => [r]))("%s is in the flow", (route) => {
    expect(isFlowRoute(route)).toBe(true);
    expect(isFlowRoute(`${route}/step`)).toBe(true);
  });

  it.each(["/", "/privacy", "/about", "/quizzes", "/analyzer", ""])("%j is not", (route) => {
    expect(isFlowRoute(route)).toBe(false);
  });
});
