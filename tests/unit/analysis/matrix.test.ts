import { describe, expect, it } from "vitest";
import { toMat4, translationOf, type FlatMatrix } from "@/lib/analysis/matrix";

/** Real output from MediaPipe on a frontal portrait (M2), rounded to 4 decimals. */
const REAL: FlatMatrix = {
  rows: 4,
  columns: 4,
  data: [
    0.9925, -0.0414, 0.1149, 0, 0.0431, 0.999, -0.0126, 0, -0.1143, 0.0174, 0.9933, 0, 0.8819,
    15.7976, -63.1698, 1,
  ],
};

describe("toMat4 (column-major MediaPipe data → row-major 4×4)", () => {
  it("puts data[c*4 + r] at row r, column c", () => {
    const data = Array.from({ length: 16 }, (_, i) => i);
    const m = toMat4({ rows: 4, columns: 4, data });
    expect(m).toEqual([
      [0, 4, 8, 12],
      [1, 5, 9, 13],
      [2, 6, 10, 14],
      [3, 7, 11, 15],
    ]);
  });

  it("gives a rigid transform for real MediaPipe output: bottom row 0 0 0 1", () => {
    expect(toMat4(REAL)[3]).toEqual([0, 0, 0, 1]);
  });

  it("gives a near-orthonormal rotation block for real output", () => {
    const m = toMat4(REAL);
    for (let i = 0; i < 3; i++) {
      const row = m[i]!;
      const norm = Math.hypot(row[0], row[1], row[2]);
      expect(norm).toBeCloseTo(1, 2);
    }
  });

  it.each([
    { rows: 3, columns: 4, data: new Array<number>(12).fill(0) },
    { rows: 4, columns: 4, data: new Array<number>(15).fill(0) },
    { rows: 4, columns: 3, data: new Array<number>(16).fill(0) },
  ])("rejects a $rows×$columns matrix with $data.length values", (m) => {
    expect(() => toMat4(m)).toThrow(RangeError);
  });
});

describe("translationOf", () => {
  it("reads the last column (canonical-model units, cm)", () => {
    expect(translationOf(toMat4(REAL))).toEqual({ x: 0.8819, y: 15.7976, z: -63.1698 });
  });

  it("returns zero for the identity", () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    expect(translationOf(toMat4({ rows: 4, columns: 4, data: identity }))).toEqual({
      x: 0,
      y: 0,
      z: 0,
    });
  });
});
