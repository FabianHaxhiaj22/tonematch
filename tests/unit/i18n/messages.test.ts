import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import sq from "@/i18n/messages/sq.json";
import review from "@/i18n/review/sq.json";
import { flattenMessages, getMessage, translator } from "@/i18n/messages";

const EN = flattenMessages(en);
const SQ = flattenMessages(sq);
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("message files", () => {
  it("sq has exactly the same keys as en", () => {
    expect(Object.keys(SQ).sort()).toEqual(Object.keys(EN).sort());
  });

  it("every string is non-empty and uses the same placeholders in both languages", () => {
    for (const [key, value] of Object.entries(EN)) {
      expect(value.trim(), key).not.toBe("");
      expect(SQ[key]!.trim(), key).not.toBe("");
      expect(placeholders(SQ[key]!), key).toEqual(placeholders(value));
    }
  });

  it("every Albanian string has a native-review status (all drafts start as needs-native-review)", () => {
    const status = review.strings as Record<string, string>;
    expect(Object.keys(status).sort()).toEqual(Object.keys(SQ).sort());
    for (const s of Object.values(status)) expect(["needs-native-review", "reviewed"]).toContain(s);
  });

  it("never tells the user they wear makeup (blush/flushing only shifts weights, D-026)", () => {
    for (const text of [...Object.values(EN), ...Object.values(SQ)]) {
      expect(text).not.toMatch(/make-?up|blush|bronzer|grim|ruzh|pudër/i);
    }
  });

  it("labels the MST value as approximate in both languages", () => {
    expect(EN["depth.mstApprox"]).toMatch(/approximate/i);
    expect(SQ["depth.mstApprox"]).toMatch(/përafërsisht/i);
  });
});

describe("getMessage / translator", () => {
  it("looks up nested keys and fills placeholders", () => {
    expect(getMessage("en", "quiz.progress", { current: 2, total: 4 })).toBe("Question 2 of 4");
    expect(translator("sq")("quiz.progress", { current: 2, total: 4 })).toBe("Pyetja 2 nga 4");
  });

  it("leaves unknown placeholders as they are", () => {
    expect(getMessage("en", "quiz.progress", { current: 1 })).toBe("Question 1 of {total}");
  });

  it("returns the string unchanged without values", () => {
    expect(getMessage("en", "quiz.back")).toBe("Back");
  });

  it("throws on a key that is not a string", () => {
    // @ts-expect-error: "quiz" is a group, not a message
    expect(() => getMessage("en", "quiz")).toThrow(/Missing message/);
  });
});
