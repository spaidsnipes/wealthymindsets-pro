/**
 * Sheriff a11y finding (2026-10-08): the trade panel's "Plan" section (ManagementPlanCard) had inputs
 * a screen reader could not name. Every field now carries an aria-label in the trader's words.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(path.resolve(__dirname, "ManagementPlanCard.tsx"), "utf8");

describe("ManagementPlanCard — every field has an accessible name in trader words", () => {
  const tags = [...SRC.matchAll(/<(input|textarea|select)\b/g)].map(m => {
    const rest = SRC.slice(m.index!);
    const head = rest.slice(0, rest.search(/onChange=|\/>/));
    return { tag: m[1], head };
  });
  it("finds the plan card's fields (vacuity guard)", () => {
    expect(tags.length).toBeGreaterThanOrEqual(9);   // 6 plan fields + the amendment fields (one tag renders 4) + evidence + note
  });
  it("each field declares an aria-label before its handlers", () => {
    for (const t of tags) expect(t.head, t.head.slice(0, 80)).toMatch(/aria-label=/);
  });
  it("the names are the trader's words — not test ids, not jargon, not verdicts", () => {
    // The words read aloud: the literal labels, and the string results of the amendment field's choice (not its keys).
    const names = [...SRC.matchAll(/aria-label=(?:"([^"]+)"|\{([^}]+)\})/g)]
      .flatMap(m => m[1] ? [m[1]] : [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1]).filter(x => !/Px$/.test(x)))
      .join(" | ");
    expect(names.length).toBeGreaterThan(300);
    for (const w of ["Invalidation price", "Expected hold, in minutes", "Management conditions, one per line", "Session you plan to trade", "Context you see", "New stop price", "New target price", "New evidence"]) expect(names).toContain(w);
    expect(names).not.toMatch(/plan-|Px\b|_|impulsiv|afraid|fear|discipline/i);
  });
});
