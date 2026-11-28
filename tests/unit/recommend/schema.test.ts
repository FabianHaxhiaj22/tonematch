import { describe, expect, it } from "vitest";
import explanationsJson from "@/data/copy/explanations.json";
import gemstonesJson from "@/data/gemstones.json";
import metalsJson from "@/data/metals.json";
import stylesJson from "@/data/styles.json";
import {
  ExplanationsFileSchema,
  GemstonesFileSchema,
  MetalsFileSchema,
  StylesFileSchema,
} from "@/lib/recommend/schema";

const clone = <T>(v: T): T => structuredClone(v);
const issues = (r: {
  success: boolean;
  error?: { issues: { message: string; path: PropertyKey[] }[] };
}) => r.error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`) ?? [];

describe("the real data files pass their schemas", () => {
  it.each([
    ["metals.json", MetalsFileSchema, metalsJson],
    ["gemstones.json", GemstonesFileSchema, gemstonesJson],
    ["styles.json", StylesFileSchema, stylesJson],
    ["copy/explanations.json", ExplanationsFileSchema, explanationsJson],
  ] as const)("%s", (_name, schema, json) => {
    const r = schema.safeParse(json);
    expect(issues(r)).toEqual([]);
  });
});

describe("metals schema", () => {
  it("rejects affinity outside 0–1", () => {
    const bad = clone(metalsJson);
    bad.metals[0]!.affinity.warm = 1.2;
    expect(MetalsFileSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a bad swatch colour", () => {
    const bad = clone(metalsJson);
    bad.metals[0]!.swatch = ["gold"];
    expect(MetalsFileSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects duplicate ids and orders, with the offending index", () => {
    const bad = clone(metalsJson);
    bad.metals[1]!.id = bad.metals[0]!.id;
    bad.metals[2]!.order = bad.metals[0]!.order;
    const msgs = issues(MetalsFileSchema.safeParse(bad));
    expect(msgs).toContain('metals.1: duplicate id "yellow-gold"');
    expect(msgs).toContain('metals.2: duplicate order "1"');
  });

  it("needs a warm and a cool metal", () => {
    const bad = clone(metalsJson);
    bad.metals = bad.metals.filter((m) => m.family !== "cool");
    expect(issues(MetalsFileSchema.safeParse(bad))).toContain(
      "metals: needs at least one cool metal",
    );
  });

  it("needs a balancedReasonKey for warm and cool metals, not for mixed (D-039)", () => {
    const bad = clone(metalsJson) as unknown as { metals: Record<string, unknown>[] };
    delete bad.metals[1]!.balancedReasonKey; // silver
    expect(issues(MetalsFileSchema.safeParse(bad))).toContain(
      'metals.1.balancedReasonKey: cool metal "silver" needs a balancedReasonKey',
    );
    expect(bad.metals.find((m) => m.family === "mixed")!.balancedReasonKey).toBeUndefined();
  });

  it("rejects unknown fields (strict)", () => {
    const bad = clone(metalsJson) as unknown as { metals: Record<string, unknown>[] };
    bad.metals[0]!.label = "Yellow gold";
    expect(MetalsFileSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown family", () => {
    const bad = clone(metalsJson) as unknown as { metals: Record<string, unknown>[] };
    bad.metals[0]!.family = "golden";
    expect(MetalsFileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("gemstones schema", () => {
  it("rejects duplicate ids", () => {
    const bad = clone(gemstonesJson);
    bad.gemstones[1]!.id = "garnet";
    expect(issues(GemstonesFileSchema.safeParse(bad))).toContain(
      'gemstones.1: duplicate id "garnet"',
    );
  });

  it("rejects duplicate orders", () => {
    const bad = clone(gemstonesJson);
    bad.gemstones[1]!.order = 1;
    expect(GemstonesFileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("styles schema", () => {
  it("rejects an unknown tag", () => {
    const bad = clone(stylesJson) as unknown as { categories: { rings: { tags: string[] }[] } };
    bad.categories.rings[0]!.tags = ["sparkly"];
    expect(StylesFileSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects face-shape rules (Phase 2)", () => {
    const bad = clone(stylesJson) as unknown as {
      categories: { rings: Record<string, unknown>[] };
    };
    bad.categories.rings[0]!.faceShapes = ["oval"];
    expect(StylesFileSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown depth filter", () => {
    const bad = clone(stylesJson) as unknown as { categories: { rings: { depths?: string[] }[] } };
    bad.categories.rings[0]!.depths = ["olive"];
    const msgs = issues(StylesFileSchema.safeParse(bad));
    expect(msgs.some((m) => m.startsWith("categories.rings.0.depths"))).toBe(true);
  });

  it("rejects duplicate ids within a category", () => {
    const bad = clone(stylesJson);
    bad.categories.rings[1]!.id = bad.categories.rings[0]!.id;
    expect(issues(StylesFileSchema.safeParse(bad))).toContain(
      'categories.rings.1: duplicate id "fine-bands"',
    );
  });

  it("needs finish advice for every depth", () => {
    const bad = clone(stylesJson) as unknown as { finishes: Record<string, string> };
    delete bad.finishes.tan;
    expect(StylesFileSchema.safeParse(bad).success).toBe(false);
  });

  it("needs all four categories", () => {
    const bad = clone(stylesJson) as unknown as { categories: Record<string, unknown> };
    delete bad.categories.bracelets;
    expect(StylesFileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("explanations schema", () => {
  it("needs a summary for every bucket and the uncertain case", () => {
    const bad = clone(explanationsJson) as unknown as { summaries: Record<string, string> };
    delete bad.summaries.uncertain;
    expect(ExplanationsFileSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects text instead of a message key", () => {
    const bad = clone(explanationsJson);
    bad.metalReasons.mixed.best = "Mixing metals looks great";
    expect(ExplanationsFileSchema.safeParse(bad).success).toBe(false);
  });
});
