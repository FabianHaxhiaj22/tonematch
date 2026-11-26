/**
 * Recommendation engine (SPEC §7): pure rules over the JSON data in src/data/.
 * Typical use: `recommend(fromScoreResult(score), loadRecommendData())`.
 */
export {
  fromScoreResult,
  recommend,
  type MetalRecommendation,
  type Recommendation,
  type RecommendationNote,
  type RecommendInput,
  type StyleSuggestion,
} from "./engine";
export { loadRecommendData } from "./data";
export { CATEGORIES, TIERS, type Category, type RecommendData, type Tier } from "./schema";
