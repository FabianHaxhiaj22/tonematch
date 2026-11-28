/**
 * Results page settings (M6b-2). The data itself is loaded once here: `loadRecommendData`
 * validates src/data/*.json with Zod, so a broken data file fails loudly instead of rendering
 * wrong advice.
 */
import { loadRecommendData } from "@/lib/recommend";

export const RECOMMEND_DATA = loadRecommendData();

/**
 * Credit for the Monk Skin Tone Scale strip (D-039). Checked 2026-11-28 on the official
 * "Get started" page (skintone.google/get-started): "License: Creative Commons Attribution 4.0
 * International license" and "Scale Usage Citation: Monk, Ellis. “Monk Skin Tone Scale,” 2019.
 * https://skintone.google". The citation and link texts are in the message files.
 */
export const MST_SOURCE_URL = "https://skintone.google";
export const MST_LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";
