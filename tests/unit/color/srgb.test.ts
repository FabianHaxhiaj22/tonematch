import { describe, expect, it } from "vitest";
import {
  SRGB_DECODE_BREAKPOINT,
  SRGB_ENCODE_BREAKPOINT,
  linearChannelToSrgb,
  linearToSrgb,
  srgbChannelToLinear,
  srgbToLinear,
} from "@/lib/color";

describe("srgbChannelToLinear", () => {
  // Reference values from the IEC 61966-2-1 transfer function (hand-computed, 7+ digits).
  it.each([
    { value: 0, linear: 0 },
    { value: 10, linear: 10 / 255 / 12.92 }, // linear segment: 0.0030352698…
    { value: 128, linear: 0.2158605 },
    { value: 188, linear: 0.5028865 },
    { value: 255, linear: 1 },
  ])("decodes $value → $linear", ({ value, linear }) => {
    expect(srgbChannelToLinear(value)).toBeCloseTo(linear, 7);
  });

  it("is continuous at the 0.04045 breakpoint (both segments agree)", () => {
    const atBreak = SRGB_DECODE_BREAKPOINT * 255;
    const linearSegment = SRGB_DECODE_BREAKPOINT / 12.92;
    const powerSegment = ((SRGB_DECODE_BREAKPOINT + 0.055) / 1.055) ** 2.4;
    expect(srgbChannelToLinear(atBreak)).toBeCloseTo(linearSegment, 12);
    expect(Math.abs(linearSegment - powerSegment)).toBeLessThan(1e-7);
  });

  it("is strictly increasing over 0–255", () => {
    for (let v = 1; v <= 255; v++) {
      expect(srgbChannelToLinear(v)).toBeGreaterThan(srgbChannelToLinear(v - 1));
    }
  });
});

describe("linearChannelToSrgb", () => {
  it.each([
    { linear: 0, value: 0 },
    { linear: 0.002, value: 0.002 * 12.92 * 255 }, // linear segment
    { linear: 0.2158605, value: 128 },
    { linear: 1, value: 255 },
  ])("encodes $linear → $value", ({ linear, value }) => {
    expect(linearChannelToSrgb(linear)).toBeCloseTo(value, 4);
  });

  it("is continuous at the 0.0031308 breakpoint", () => {
    const below = linearChannelToSrgb(SRGB_ENCODE_BREAKPOINT);
    const above = linearChannelToSrgb(SRGB_ENCODE_BREAKPOINT + 1e-12);
    expect(Math.abs(below - above)).toBeLessThan(1e-4);
  });

  it("round-trips every 8-bit value", () => {
    for (let v = 0; v <= 255; v++) {
      expect(linearChannelToSrgb(srgbChannelToLinear(v))).toBeCloseTo(v, 9);
    }
  });
});

describe("srgbToLinear / linearToSrgb", () => {
  it("converts each channel independently", () => {
    expect(srgbToLinear({ r: 255, g: 128, b: 0 })).toEqual({
      r: srgbChannelToLinear(255),
      g: srgbChannelToLinear(128),
      b: srgbChannelToLinear(0),
    });
  });

  it("round-trips a colour", () => {
    const rgb = { r: 224, g: 172, b: 140 };
    const back = linearToSrgb(srgbToLinear(rgb));
    expect(back.r).toBeCloseTo(rgb.r, 9);
    expect(back.g).toBeCloseTo(rgb.g, 9);
    expect(back.b).toBeCloseTo(rgb.b, 9);
  });
});
