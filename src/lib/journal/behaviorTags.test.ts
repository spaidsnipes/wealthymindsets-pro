import { describe, expect, it } from "vitest";
import { appendAmendment, behaviourTags, latestAmendment, parseAmendments } from "./behaviorTags";
import type { Episode } from "@/lib/broker/webullLedger";

const ep = (id: string, key: string, open: string, close: string, qty = 1, combo = "NORMAL") => ({
  id, accountId: "A", instrumentKey: key, label: "RECONSTRUCTED", openedAt: open, closedAt: close, maxQuantity: qty,
  entries: [{ comboType: combo, orderType: "MARKET" }],
} as unknown as Episode);

describe("behaviour tags — only what fills establish, each INFERRED with evidence", () => {
  it("third attempt, rapid re-entry, no bracket, above usual size", () => {
    const eps = [
      ep("a", "TSLA 2026-10-01 390C", "2026-10-01T13:31:00Z", "2026-10-01T13:33:00Z", 1, "MASTER"),
      ep("b", "TSLA 2026-10-01 390C", "2026-10-01T13:35:00Z", "2026-10-01T13:40:00Z"),   // 120 s after a's exit
      ep("c", "TSLA 2026-10-01 395C", "2026-10-01T14:30:00Z", "2026-10-01T14:40:00Z", 3), // 3rd of day, 3× size
    ];
    const t = behaviourTags(eps);
    expect(t.get("a")!.map(x => x.id)).toEqual([]);
    expect(t.get("b")!.map(x => x.id)).toEqual(["RAPID_REENTRY", "NO_BRACKET_AT_ENTRY"]);
    expect(t.get("c")!.map(x => x.id)).toEqual(["THIRD_PLUS_ATTEMPT", "NO_BRACKET_AT_ENTRY", "ABOVE_USUAL_SIZE"]);
    expect(t.get("b")![0].evidence).toMatch(/120 s later/);
    expect(t.get("c")!.every(x => x.truth === "INFERRED" && x.rule.length > 0)).toBe(true);
    expect(t.get("b")![0].rule).toMatch(/win does not lower standards/);
  });

  it("amendments are append-only lineage; the latest is the current reading, the original stays", () => {
    const original = { label: "Re-entered the same contract within 5 min", evidence: "…", truth: "INFERRED" as const };
    let list = appendAmendment([], { episodeId: "b", tag: "RAPID_REENTRY", original, verdict: "CORRECTED", correction: "planned scale-in", at: 1 });
    list = appendAmendment(list, { episodeId: "b", tag: "RAPID_REENTRY", original, verdict: "CONFIRMED", correction: "", at: 2 });
    expect(list).toHaveLength(2);
    expect(latestAmendment(list, "b", "RAPID_REENTRY")?.verdict).toBe("CONFIRMED");
    expect(list[0]).toMatchObject({ verdict: "CORRECTED", correction: "planned scale-in", original });
    expect(parseAmendments(JSON.stringify(list))).toHaveLength(2);
    expect(parseAmendments("not json")).toEqual([]);
  });
});
