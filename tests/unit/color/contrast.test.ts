import { describe, expect, it } from "vitest";
import { contrastRatio, hexToRgb, relativeLuminance } from "@/lib/color";

describe("hexToRgb", () => {
  it("parses #rrggbb with or without # and in any case", () => {
    expect(hexToRgb("#ff8000")).toEqual({ r: 255, g: 128, b: 0 });
    expect(hexToRgb("FF8000")).toEqual({ r: 255, g: 128, b: 0 });
    expect(hexToRgb(" #0a0B0c ")).toEqual({ r: 10, g: 11, b: 12 });
  });

  it.each(["#fff", "#12345", "#1234567", "red", "#gg0000", ""])("rejects %j", (bad) => {
    expect(() => hexToRgb(bad)).toThrow(/Not a #rrggbb colour/);
  });
});

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 10);
  });

  it("weights green most and blue least", () => {
    const r = relativeLuminance({ r: 255, g: 0, b: 0 });
    const g = relativeLuminance({ r: 0, g: 255, b: 0 });
    const b = relativeLuminance({ r: 0, g: 0, b: 255 });
    expect([r, g, b].map((x) => x.toFixed(4))).toEqual(["0.2126", "0.7152", "0.0722"]);
  });
});

describe("contrastRatio", () => {
  // Reference values: WebAIM contrast checker (https://webaim.org/resources/contrastchecker/).
  it.each([
    ["#000000", "#ffffff", 21],
    ["#ffffff", "#ffffff", 1],
    ["#777777", "#ffffff", 4.48], // the classic "just fails AA" grey
    ["#767676", "#ffffff", 4.54], // the classic "just passes AA" grey
    ["#0000ff", "#ffffff", 8.59],
    ["#ff0000", "#ffffff", 4],
  ])("%s on %s = %f", (fg, bg, expected) => {
    expect(contrastRatio(fg, bg)).toBeCloseTo(expected, 2);
  });

  it("is symmetric and accepts Rgb255 objects", () => {
    expect(contrastRatio("#1e1a17", "#f8f4ee")).toBe(contrastRatio("#f8f4ee", "#1e1a17"));
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, "#ffffff")).toBeCloseTo(21, 10);
  });
});
