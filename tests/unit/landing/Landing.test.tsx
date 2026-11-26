import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useLocaleStore } from "@/store/locale";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  act(() => useLocaleStore.getState().setLocale("en"));
});

describe("landing page", () => {
  it("has one h1, the upload, how it works and the privacy promise", () => {
    render(<Home />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Find the metals that love your skin",
    );
    expect(screen.getByLabelText("Choose a photo")).toBeInTheDocument();
    expect(screen.getByText("Your photo never leaves your device")).toBeInTheDocument();
    const how = screen.getByRole("region", { name: "How it works" });
    expect(within(how).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("region", { name: "Your photo stays with you" })).toHaveAttribute(
      "id",
      "privacy",
    );
    expect(screen.getByText("Tips for a good photo")).toBeInTheDocument();
  });

  it("switches every text to Albanian", () => {
    render(<Home />);
    act(() => useLocaleStore.getState().setLocale("sq"));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Gjej metalet që i rrinë bukur lëkurës sate",
    );
    expect(screen.getByRole("region", { name: "Si funksionon" })).toBeInTheDocument();
    expect(screen.getByLabelText("Zgjidh një foto")).toBeInTheDocument();
  });

  it("never mentions race or ethnicity, and never claims to detect filters or makeup", () => {
    const { container } = render(<Home />);
    expect(container.textContent).not.toMatch(/race|ethnic|we detect|detects? (filters|makeup)/i);
  });
});

describe("site header and footer", () => {
  it("header: skip link, home link with the wordmark, section links, language switch", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("link", { name: "ToneMatch" })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/#how-it-works",
    );
    expect(within(nav).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/#privacy");
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
  });

  it("footer: guidance note, no links to pages that don't exist yet", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent("not a measurement");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
