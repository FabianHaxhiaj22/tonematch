import { describe, expect, it } from "vitest";
import { ita, srgbToLab } from "@/lib/color";
import {
  DEPTH_ITA_WEIGHT,
  DEPTH_REF_B,
  DEPTH_SCALE,
  ITA_MIN_B,
  MST_SWATCHES,
} from "@/lib/analysis/config";
import {
  depthAngle,
  depthFromLab,
  depthRow,
  labelForMst,
  lightnessAngle,
} from "@/lib/analysis/depth";

const deg = (rad: number) => (rad * 180) / Math.PI;

describe("DEPTH_SCALE (one table for MST and label)", () => {
  it("lists MST 1–10 once each, lightest first, with strictly decreasing angles", () => {
    expect(DEPTH_SCALE.map((r) => r.mst)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let i = 1; i < DEPTH_SCALE.length; i++) {
      expect(DEPTH_SCALE[i]!.minAngle).toBeLessThan(DEPTH_SCALE[i - 1]!.minAngle);
    }
  });

  it("each label covers a contiguous run of MST values, in depth order", () => {
    const order = ["very-light", "light", "medium", "tan", "deep", "very-deep"];
    const seen = DEPTH_SCALE.map((r) => r.label).filter((l, i, a) => i === 0 || a[i - 1] !== l);
    expect(seen).toEqual(order);
  });

  it("keeps the classic ITA class edges as label edges", () => {
    const lastAngle = (label: string) =>
      DEPTH_SCALE.filter((r) => r.label === label).at(-1)!.minAngle;
    expect(lastAngle("very-light")).toBe(55);
    expect(lastAngle("light")).toBe(41);
    expect(lastAngle("medium")).toBe(28);
    expect(lastAngle("tan")).toBe(10);
    expect(lastAngle("deep")).toBe(-30);
  });

  it("labelForMst follows the table and rejects unknown indices", () => {
    for (const r of DEPTH_SCALE) expect(labelForMst(r.mst)).toBe(r.label);
    expect(() => labelForMst(0)).toThrow(RangeError);
    expect(() => labelForMst(11)).toThrow(RangeError);
  });

  it.each([
    [80, 1],
    [65, 1],
    [64.9, 2],
    [55, 2],
    [54.9, 3],
    [41, 4],
    [28, 5],
    [27.9, 6],
    [10, 6],
    [9.9, 7],
    [-30, 8],
    [-30.1, 9],
    [-50.1, 10],
  ])("angle %d° → MST %d", (angle, mst) => {
    expect(depthRow(angle).mst).toBe(mst);
  });
});

describe("depth bucket and MST can never contradict", () => {
  it("over a sweep of skin-like and extreme colours, label === labelForMst(mst)", () => {
    let checked = 0;
    for (let L = 2; L <= 98; L += 4) {
      for (let a = -5; a <= 30; a += 5) {
        for (let b = -10; b <= 40; b += 2.5) {
          const d = depthFromLab({ L, a, b });
          expect(d.label).toBe(labelForMst(d.mstApprox));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(2000);
  });

  it("the case from real testing (very-light with MST ≈ 5) can't happen any more", () => {
    // ITA 56° gave the old label very-light but the old nearest swatch MST 5.
    const L = 50 + 18 * Math.tan((56 * Math.PI) / 180);
    const d = depthFromLab({ L, a: 10, b: 18 });
    expect(d.label).toBe(labelForMst(d.mstApprox));
  });
});

describe("depthAngle: mostly L*, a little ITA", () => {
  it("blends ITA and the lightness angle with the configured weight", () => {
    const lab = { L: 65, a: 10, b: 18 };
    const expected =
      DEPTH_ITA_WEIGHT * deg(Math.atan(15 / 18)) +
      (1 - DEPTH_ITA_WEIGHT) * deg(Math.atan(15 / DEPTH_REF_B));
    expect(depthAngle(lab).angle).toBeCloseTo(expected, 9);
    expect(depthAngle(lab).ita).toBeCloseTo(ita(lab, ITA_MIN_B)!, 9);
  });

  it("lightnessAngle is ITA with the reference b*", () => {
    expect(lightnessAngle(50)).toBe(0);
    expect(lightnessAngle(65)).toBeCloseTo(deg(Math.atan(15 / DEPTH_REF_B)), 9);
  });

  it("b* (the undertone signal) barely moves depth: at most one MST step from b* 10 to 25", () => {
    for (const L of [75, 65, 55, 45, 35, 25]) {
      const msts = [10, 15, 20, 25].map((b) => depthFromLab({ L, a: 10, b }).mstApprox);
      expect(Math.max(...msts) - Math.min(...msts)).toBeLessThanOrEqual(1);
    }
    // Pure ITA would have moved L* 60 from "light" (b* 10, 45°) to "tan" (b* 25, 21.8°).
    expect(deg(Math.atan(10 / 10))).toBeGreaterThan(41);
    expect(deg(Math.atan(10 / 25))).toBeLessThan(28);
  });

  it("is monotonic in lightness: darker never gives a lower MST", () => {
    for (const b of [8, 15, 22]) {
      let last = 1;
      for (let L = 95; L >= 5; L -= 1) {
        const m = depthFromLab({ L, a: 10, b }).mstApprox;
        expect(m).toBeGreaterThanOrEqual(last);
        last = m;
      }
    }
  });
});

describe("depthFromLab", () => {
  it.each([
    ["very light", { L: 75, a: 8, b: 16 }, "very-light", 2],
    ["medium", { L: 60, a: 10, b: 18 }, "medium", 5],
    ["very deep", { L: 25, a: 9, b: 12 }, "very-deep", 10],
  ] as const)("%s skin", (_n, lab, label, mst) => {
    expect(depthFromLab(lab)).toMatchObject({ label, mstApprox: mst, method: "blend" });
  });

  it("uses L* only when b* is too small for ITA", () => {
    const d = depthFromLab({ L: 45, a: 3, b: ITA_MIN_B - 1 });
    expect(d.method).toBe("lightness");
    expect(d.ita).toBeNull();
    expect(d.angle).toBeCloseTo(lightnessAngle(45), 12); // ≈ −18.4°
    expect(d).toMatchObject({ label: "deep", mstApprox: 8 });
  });
});

describe("MST_SWATCHES (display colours, D-027)", () => {
  it("are the official colours, and our colour engine gives the D-027 ITA values", () => {
    const D027_ITA = [83.0, 80.2, 71.8, 64.7, 50.3, 10.9, -20.1, -55.4, -78.4, -84.3];
    expect(MST_SWATCHES).toHaveLength(10);
    MST_SWATCHES.forEach((hex, i) => {
      const n = parseInt(hex.slice(1), 16);
      const lab = srgbToLab({ r: n >> 16, g: (n >> 8) & 255, b: n & 255 });
      expect(deg(Math.atan((lab.L - 50) / lab.b))).toBeCloseTo(D027_ITA[i]!, 0);
    });
  });
});
