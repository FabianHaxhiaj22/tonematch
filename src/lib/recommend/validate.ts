/**
 * Cross-file checks for the recommendation data (D-030), run by `pnpm validate:data` after each
 * file has passed its own schema, and by the unit tests. Things a per-file schema can't see:
 * - every message key the data refers to exists in the message file;
 * - every note the engine can add has a message at `notes.<code>`;
 * - every undertone × depth gets at least one style per category and at least one gemstone.
 */
import { ENGINE_NOTES, selectGemstones, selectStyles } from "./engine";
import { CATEGORIES, DEPTHS, UNDERTONES, type RecommendData } from "./schema";

/** Every message key the data refers to, with where it came from. */
export function referencedMessageKeys(data: RecommendData): { key: string; from: string }[] {
  const refs: { key: string; from: string }[] = [];
  for (const m of data.metals) {
    refs.push({ key: m.nameKey, from: `metals.json ${m.id}` });
    if (m.balancedReasonKey) {
      refs.push({ key: m.balancedReasonKey, from: `metals.json ${m.id} balancedReasonKey` });
    }
  }
  for (const g of data.gemstones) refs.push({ key: g.nameKey, from: `gemstones.json ${g.id}` });
  for (const category of CATEGORIES) {
    for (const s of data.styles.categories[category]) {
      refs.push({ key: s.labelKey, from: `styles.json ${category}.${s.id}` });
    }
  }
  for (const [depth, key] of Object.entries(data.styles.finishes)) {
    refs.push({ key, from: `styles.json finishes.${depth}` });
  }
  for (const [outcome, key] of Object.entries(data.explanations.summaries)) {
    refs.push({ key, from: `copy/explanations.json summaries.${outcome}` });
  }
  for (const [relation, tiers] of Object.entries(data.explanations.metalReasons)) {
    for (const [tier, key] of Object.entries(tiers)) {
      refs.push({ key, from: `copy/explanations.json metalReasons.${relation}.${tier}` });
    }
  }
  for (const note of ENGINE_NOTES) refs.push({ key: `notes.${note}`, from: `engine note ${note}` });
  return refs;
}

/** Returns a list of problems; empty when the data set is consistent. */
export function crossCheck(data: RecommendData, messages: Record<string, string>): string[] {
  const errors: string[] = [];
  for (const { key, from } of referencedMessageKeys(data)) {
    if (typeof messages[key] !== "string") errors.push(`${from}: message "${key}" not found`);
  }
  for (const undertone of UNDERTONES) {
    if (selectGemstones(data.gemstones, undertone).length === 0) {
      errors.push(`gemstones.json: no gemstone reaches the minimum score for ${undertone}`);
    }
    for (const depth of DEPTHS) {
      const styles = selectStyles(data.styles.categories, undertone, depth);
      for (const category of CATEGORIES) {
        if (styles[category].length === 0) {
          errors.push(`styles.json: no ${category} item for ${undertone} × ${depth}`);
        }
      }
    }
  }
  return errors;
}
