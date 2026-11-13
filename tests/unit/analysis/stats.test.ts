import { describe, expect, it } from "vitest";
import { deltaE76, median, weightedMedian } from "@/lib/analysis/stats";

describe("median", () => {
  it.each([
    [[3], 3],
    [[3, 1, 2], 2],
    [[4, 1, 3, 2], 2.5],
    [[-1, -5, 10], -1],
  ])("median(%j) = %d", (values, expected) => {
    expect(median(values)).toBe(expected);
  });

  it("throws on empty input", () => {
    expect(() => median([])).toThrow(RangeError);
  });
});

describe("weightedMedian", () => {
  it("equals the plain (lower) median with equal weights", () => {
    expect(weightedMedian([5, 1, 3], [1, 1, 1])).toBe(3);
    expect(weightedMedian([1, 2, 3, 4], [1, 1, 1, 1])).toBe(2);
  });

  it("follows the heavier values", () => {
    expect(weightedMedian([1, 2, 3], [0.1, 0.1, 0.8])).toBe(3);
    expect(weightedMedian([10, 20], [0.6, 0.4])).toBe(10);
  });

  it("rejects bad input", () => {
    expect(() => weightedMedian([], [])).toThrow(RangeError);
    expect(() => weightedMedian([1, 2], [1])).toThrow(RangeError);
    expect(() => weightedMedian([1], [-1])).toThrow(RangeError);
    expect(() => weightedMedian([1, 2], [0, 0])).toThrow(RangeError);
    expect(() => weightedMedian([1], [Number.NaN])).toThrow(RangeError);
  });
});

describe("deltaE76", () => {
  it("is the Euclidean distance in Lab", () => {
    expect(deltaE76({ L: 50, a: 0, b: 0 }, { L: 50, a: 3, b: 4 })).toBe(5);
    expect(deltaE76({ L: 10, a: 1, b: 1 }, { L: 10, a: 1, b: 1 })).toBe(0);
  });
});
