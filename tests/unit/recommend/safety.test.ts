/**
 * The recommendation output must never mention race, ethnicity or makeup (README §1, D-026,
 * CLAUDE.md non-negotiables), in either language. Checks every possible output, every message
 * and the raw data files.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import sq from "@/i18n/messages/sq.json";
import { flattenMessages } from "@/i18n/messages";
import type { ConfidenceNote } from "@/lib/analysis/confidence";
import { recommend, type Recommendation } from "@/lib/recommend/engine";
import { CATEGORIES, DEPTHS, UNDERTONES } from "@/lib/recommend/schema";
import { DATA, input } from "./helpers";

const EN = flattenMessages(en);
const SQ = flattenMessages(sq);

// `\b` treats "ë" as a non-letter, so word edges use Unicode letter lookarounds.
const start = (stem: string) => new RegExp(`(?<!\\p{L})${stem}`, "iu");
const whole = (word: string) => new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, "iu");

/** Words that must never appear (English and Albanian). Stems match word starts. */
const BANNED: RegExp[] = [
  // race / ethnicity / nationality
  ...["race", "races", "racë", "raca", "racës", "racat", "racave"].map(whole),
  ...["racial", "racis", "racor", "racizëm", "ethnic", "etni", "nationalit", "kombësi"].map(start),
  // makeup and cosmetics
  ...["make-?up", "blush", "bronzer", "foundation", "concealer", "lipstick", "cosmetic"].map(start),
  ...["grim", "makijazh", "ruzh", "pudër", "pudr", "fondatin", "kozmetik", "buzëkuq"].map(start),
];
const offending = (text: string) => BANNED.filter((re) => re.test(text)).map(String);

/** Every message key a recommendation can lead the UI to show. */
function shownKeys(r: Recommendation): string[] {
  const metalName = (id: string) => DATA.metals.find((m) => m.id === id)!.nameKey;
  const gemName = (id: string) => DATA.gemstones.find((g) => g.id === id)!.nameKey;
  return [
    `undertone.${r.undertone}`,
    `depth.${r.depth}`,
    "depth.mstApprox",
    r.summaryKey,
    r.finishKey,
    ...r.metals.flatMap((m) => [metalName(m.id), m.reasonKey, `recommend.tiers.${m.tier}`]),
    ...r.gemstones.map(gemName),
    ...CATEGORIES.flatMap((c) => r.styles[c].map((s) => s.labelKey)),
    ...r.notes.map((n) => `notes.${n}`),
  ];
}

const NOTE_SETS: ConfidenceNote[][] = [
  [],
  ["photoQuizDisagree", "lowPhotoConfidence", "noQuizAnswers"],
];

const ALL_OUTPUTS: Recommendation[] = UNDERTONES.flatMap((u) =>
  DEPTHS.flatMap((d) =>
    [0, 0.3, 0.49, 0.5, 0.8, 1].flatMap((c) =>
      NOTE_SETS.map((n) => recommend(input(u, d, c, n), DATA)),
    ),
  ),
);

describe("the banned-word check itself", () => {
  it("catches the words it should, in both languages", () => {
    for (const text of [
      "Your race",
      "ethnicity",
      "Racial",
      "make-up",
      "Makeup",
      "blush",
      "raca",
      "racë",
      "etnia",
      "grimi",
      "makijazhi",
      "ruzhi",
      "pudër",
    ]) {
      expect(offending(text), text).not.toEqual([]);
    }
  });

  it("doesn't flag ordinary words that contain a banned stem", () => {
    for (const text of ["bracelet", "Byzylyk", "embrace", "trace", "graceful", "Shkëlqimi"]) {
      expect(offending(text), text).toEqual([]);
    }
  });
});

describe("recommendation output never mentions race, ethnicity or makeup", () => {
  it(`all ${ALL_OUTPUTS.length} outputs: every shown message, in en and sq`, () => {
    for (const r of ALL_OUTPUTS) {
      for (const key of shownKeys(r)) {
        expect(EN[key], `en ${key}`).toBeTypeOf("string");
        expect(SQ[key], `sq ${key}`).toBeTypeOf("string");
        expect(offending(EN[key]!), `en ${key}`).toEqual([]);
        expect(offending(SQ[key]!), `sq ${key}`).toEqual([]);
      }
    }
  });

  it("the output objects themselves (ids, keys, tags)", () => {
    for (const r of ALL_OUTPUTS) expect(offending(JSON.stringify(r))).toEqual([]);
  });

  it("every message in both files", () => {
    for (const [key, text] of [...Object.entries(EN), ...Object.entries(SQ)]) {
      expect(offending(text), key).toEqual([]);
    }
  });

  it("the raw data files", () => {
    const dir = join(process.cwd(), "src", "data");
    const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) =>
      f.endsWith(".json"),
    );
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const f of files) expect(offending(readFileSync(join(dir, f), "utf8")), f).toEqual([]);
  });
});

describe("the low-confidence note helps the user improve the result", () => {
  it("mentions daylight, white-paper calibration and the quiz, in both languages", () => {
    expect(EN["notes.bothCanWorkUncertain"]).toMatch(/daylight/i);
    expect(EN["notes.bothCanWorkUncertain"]).toMatch(/white paper/i);
    expect(EN["notes.bothCanWorkUncertain"]).toMatch(/questions/i);
    expect(SQ["notes.bothCanWorkUncertain"]).toMatch(/dritën e ditës/i);
    expect(SQ["notes.bothCanWorkUncertain"]).toMatch(/fletë të bardhë/i);
    expect(SQ["notes.bothCanWorkUncertain"]).toMatch(/pyetjeve/i);
  });
});
