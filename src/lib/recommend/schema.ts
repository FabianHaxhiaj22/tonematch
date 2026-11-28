/**
 * Zod schemas for the recommendation data in src/data/ (SPEC §7.1, D-030). Used at runtime by
 * the engine (data.ts parses every file) and at build time by `pnpm validate:data`.
 *
 * Data files hold ids, numbers and **message keys only**: every user-facing text lives in
 * src/i18n/messages/{en,sq}.json (SPEC §13). Schemas are strict, so unknown fields (e.g. a
 * Phase 2 `faceShapes` rule) are rejected until they're designed.
 */
import { z } from "zod";
import type { DepthLabel } from "@/lib/analysis/config";
import type { UndertoneLabel } from "@/lib/analysis/undertone";

// ─── Shared enums ─────────────────────────────────────────────────────────────────────────

export const UNDERTONES = [
  "cool",
  "neutral-cool",
  "neutral",
  "neutral-warm",
  "warm",
] as const satisfies readonly UndertoneLabel[];

export const DEPTHS = [
  "very-light",
  "light",
  "medium",
  "tan",
  "deep",
  "very-deep",
] as const satisfies readonly DepthLabel[];

// Compile-time check that the arrays above list every label M4 can produce.
type Missing<All, Listed> = Exclude<All, Listed> extends never ? true : never;
const _allUndertones: Missing<UndertoneLabel, (typeof UNDERTONES)[number]> = true;
const _allDepths: Missing<DepthLabel, (typeof DEPTHS)[number]> = true;
void _allUndertones;
void _allDepths;

export const CATEGORIES = ["rings", "earrings", "necklaces", "bracelets"] as const;
export type Category = (typeof CATEGORIES)[number];

export const TIERS = ["best", "good", "care"] as const;
export type Tier = (typeof TIERS)[number];

/** Metal families. Warm vs cool is what the undertone ranks; "mixed" bridges both. */
export const FAMILIES = ["warm", "cool", "mixed"] as const;
export type Family = (typeof FAMILIES)[number];

/** Style tags (SPEC §7.1). Add new ones here first, so a typo in the data can't create one. */
export const STYLE_TAGS = [
  "delicate",
  "statement",
  "classic",
  "stackable",
  "layered",
  "hoop",
  "drop",
  "stud",
  "chain-length",
  "mixed-metal",
] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

/** How a metal relates to the (effective) undertone; picks its reason text (D-030). */
export const RELATIONS = ["favoured", "other", "mixed", "balanced"] as const;
export type Relation = (typeof RELATIONS)[number];

// ─── Building blocks ──────────────────────────────────────────────────────────────────────

const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids are lower-case kebab-case");
const Hex = z.string().regex(/^#[0-9a-f]{6}$/, "colours are lower-case #rrggbb");
const Score = z.number().min(0).max(1);
/** A dotted path into the message files, e.g. "metals.silver". Existence is checked separately. */
export const MessageKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/, "message keys are dotted paths");
const About = z.string().optional();

/** Affinity of an item for each undertone column, 0 (avoid) … 1 (ideal). */
export const AffinitySchema = z.strictObject({ cool: Score, neutral: Score, warm: Score });
export type Affinity = z.infer<typeof AffinitySchema>;

/** Reports every repeated value of `key` as an issue at `[...path, index]`. */
function checkUnique<T>(
  ctx: z.RefinementCtx,
  items: readonly T[],
  key: (t: T) => string | number,
  what: string,
  path: (string | number)[] = [],
): void {
  const seen = new Set<string | number>();
  items.forEach((item, i) => {
    const k = key(item);
    if (seen.has(k)) {
      ctx.addIssue({ code: "custom", message: `duplicate ${what} "${k}"`, path: [...path, i] });
    }
    seen.add(k);
  });
}

// ─── metals.json ──────────────────────────────────────────────────────────────────────────

export const MetalSchema = z.strictObject({
  id: Id,
  family: z.enum(FAMILIES),
  nameKey: MessageKeySchema,
  /** One colour, or 2–3 stops for a blended swatch (mixed metals). */
  swatch: z.array(Hex).min(1).max(3),
  /**
   * The metal's own short reason when the result is balanced (neutral or uncertain), where every
   * warm and cool metal ranks alike (D-039). Required for warm and cool metals; mixed metals use
   * the "mixed" reasons.
   */
  balancedReasonKey: MessageKeySchema.optional(),
  affinity: AffinitySchema,
  /** Display order within a tier when the result is balanced (no family ranked first). */
  order: z.int().positive(),
});
export type Metal = z.infer<typeof MetalSchema>;

export const MetalsFileSchema = z
  .strictObject({ _about: About, metals: z.array(MetalSchema).min(1) })
  .superRefine((file, ctx) => {
    const metals = file.metals;
    checkUnique(ctx, metals, (m) => m.id, "id", ["metals"]);
    checkUnique(ctx, metals, (m) => m.order, "order", ["metals"]);
    metals.forEach((m, i) => {
      if (m.family !== "mixed" && !m.balancedReasonKey) {
        ctx.addIssue({
          code: "custom",
          message: `${m.family} metal "${m.id}" needs a balancedReasonKey`,
          path: ["metals", i, "balancedReasonKey"],
        });
      }
    });
    for (const family of ["warm", "cool"] as const) {
      if (!metals.some((m) => m.family === family)) {
        ctx.addIssue({
          code: "custom",
          message: `needs at least one ${family} metal`,
          path: ["metals"],
        });
      }
    }
  });
export type MetalsFile = z.infer<typeof MetalsFileSchema>;

// ─── gemstones.json ───────────────────────────────────────────────────────────────────────

export const GemstoneSchema = z.strictObject({
  id: Id,
  nameKey: MessageKeySchema,
  swatch: Hex,
  affinity: AffinitySchema,
  /** Tie-break when two stones score the same. */
  order: z.int().positive(),
});
export type Gemstone = z.infer<typeof GemstoneSchema>;

export const GemstonesFileSchema = z
  .strictObject({ _about: About, gemstones: z.array(GemstoneSchema).min(1) })
  .superRefine((file, ctx) => {
    checkUnique(ctx, file.gemstones, (g) => g.id, "id", ["gemstones"]);
    checkUnique(ctx, file.gemstones, (g) => g.order, "order", ["gemstones"]);
  });
export type GemstonesFile = z.infer<typeof GemstonesFileSchema>;

// ─── styles.json ──────────────────────────────────────────────────────────────────────────

export const StyleItemSchema = z.strictObject({
  id: Id,
  labelKey: MessageKeySchema,
  tags: z.array(z.enum(STYLE_TAGS)).min(1),
  /** Only for these depths (contrast advice: delicate vs bold). Omitted = every depth. */
  depths: z.array(z.enum(DEPTHS)).min(1).optional(),
  /** Only for these (effective) undertones. Omitted = every undertone. */
  undertones: z.array(z.enum(UNDERTONES)).min(1).optional(),
});
export type StyleItem = z.infer<typeof StyleItemSchema>;

const StyleList = z
  .array(StyleItemSchema)
  .min(1)
  .superRefine((items, ctx) => checkUnique(ctx, items, (s) => s.id, "id"));

export const StylesFileSchema = z.strictObject({
  _about: About,
  categories: z.strictObject({
    rings: StyleList,
    earrings: StyleList,
    necklaces: StyleList,
    bracelets: StyleList,
  }),
  /** Finish/contrast advice for each depth (the only thing depth changes besides style items). */
  finishes: z.record(z.enum(DEPTHS), MessageKeySchema),
});
export type StylesFile = z.infer<typeof StylesFileSchema>;

// ─── copy/explanations.json ───────────────────────────────────────────────────────────────

const TierKeys = z.strictObject({
  best: MessageKeySchema,
  good: MessageKeySchema,
  care: MessageKeySchema,
});

/** Explanation templates: which message keys explain each outcome (the text is in messages). */
export const ExplanationsFileSchema = z.strictObject({
  _about: About,
  /** One summary per undertone bucket, plus "uncertain" for the low-confidence case. */
  summaries: z.record(z.enum([...UNDERTONES, "uncertain"]), MessageKeySchema),
  /** A metal's reason text, by its relation to the undertone and its tier. */
  metalReasons: z.record(z.enum(RELATIONS), TierKeys),
});
export type ExplanationsFile = z.infer<typeof ExplanationsFileSchema>;

/** Everything the engine needs, already validated. */
export type RecommendData = {
  metals: MetalsFile["metals"];
  gemstones: GemstonesFile["gemstones"];
  styles: StylesFile;
  explanations: ExplanationsFile;
};
