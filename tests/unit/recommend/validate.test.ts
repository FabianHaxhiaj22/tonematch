import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import sq from "@/i18n/messages/sq.json";
import { flattenMessages } from "@/i18n/messages";
import { crossCheck, referencedMessageKeys } from "@/lib/recommend/validate";
import { DATA, cloneData } from "./helpers";

const EN = flattenMessages(en);
const SQ = flattenMessages(sq);

describe("cross-file checks", () => {
  it("the real data set is consistent with both message files", () => {
    expect(crossCheck(DATA, EN)).toEqual([]);
    expect(crossCheck(DATA, SQ)).toEqual([]);
  });

  it("refers to every metal, gemstone, style, finish, summary, reason and engine note", () => {
    const keys = referencedMessageKeys(DATA).map((r) => r.key);
    expect(keys).toContain("metals.silver");
    expect(keys).toContain("gemstones.pearl");
    expect(keys).toContain("styles.rings.solitaire");
    expect(keys).toContain("styles.finishes.deeper");
    expect(keys).toContain("recommend.summary.uncertain");
    expect(keys).toContain("recommend.reasons.balanced.care");
    expect(keys).toContain("notes.bothCanWorkUncertain");
  });

  it("reports a missing message with where it was referenced", () => {
    const data = cloneData();
    data.metals[0]!.nameKey = "metals.unobtainium";
    expect(crossCheck(data, EN)).toEqual([
      'metals.json yellow-gold: message "metals.unobtainium" not found',
    ]);
  });

  it("reports an undertone × depth with no style in a category", () => {
    const data = cloneData();
    data.styles.categories.rings = data.styles.categories.rings.map((s) => ({
      ...s,
      depths: ["very-deep" as const],
    }));
    const problems = crossCheck(data, EN);
    expect(problems).toContain("styles.json: no rings item for warm × very-light");
    expect(problems).not.toContain("styles.json: no rings item for warm × very-deep");
  });

  it("reports an undertone with no gemstone", () => {
    const data = cloneData();
    for (const g of data.gemstones) g.affinity.warm = 0;
    expect(crossCheck(data, EN)).toContain(
      "gemstones.json: no gemstone reaches the minimum score for warm",
    );
  });
});
