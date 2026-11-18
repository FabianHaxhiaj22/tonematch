/**
 * Loads and validates the real recommendation data (src/data/). Parsing at load time means a
 * broken data file fails loudly in tests and in the app, not only in `pnpm validate:data`.
 */
import explanationsJson from "@/data/copy/explanations.json";
import gemstonesJson from "@/data/gemstones.json";
import metalsJson from "@/data/metals.json";
import stylesJson from "@/data/styles.json";
import {
  ExplanationsFileSchema,
  GemstonesFileSchema,
  MetalsFileSchema,
  StylesFileSchema,
  type RecommendData,
} from "./schema";

export function loadRecommendData(): RecommendData {
  return {
    metals: MetalsFileSchema.parse(metalsJson).metals,
    gemstones: GemstonesFileSchema.parse(gemstonesJson).gemstones,
    styles: StylesFileSchema.parse(stylesJson),
    explanations: ExplanationsFileSchema.parse(explanationsJson),
  };
}
