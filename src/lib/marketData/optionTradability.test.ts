import { describe, it, expect } from "vitest";
import { selectOptionTradability } from "./optionTradability";
import type { CanonicalSession } from "./canonicalIdentity";

/**
 * H4 — STOCK SESSION IS NOT OPTION SESSION.
 *
 * These test the OWNER directly. expressionCard.test.ts separately proves the
 * card still composes this correctly; that suite is the wiring proof, this one
 * is the law.
 */
const ALL: readonly (CanonicalSession | null)[] = [
  "RTH",
  "EXTENDED",
  "OVERNIGHT",
  "CLOSED",
  "24X7",
  null,
];

describe("selectOptionTradability — the contract's own clock", () => {
  it("only the CONTRACT's session may grant tradability", () => {
    // Stock wide open, contract shut: the stock does not rescue it.
    expect(selectOptionTradability("RTH", "CLOSED").optionTradableNow).toBe("NO");
    // Stock shut, contract open: the stock does not condemn it.
    expect(selectOptionTradability("CLOSED", "RTH").optionTradableNow).toBe("YES");
  });

  it("the underlying's session cannot change a single verdict", () => {
    // The strongest form of "it never votes": sweep every underlying against a
    // fixed contract session and prove the verdict is invariant.
    for (const option of ALL) {
      const verdicts = ALL.map((u) => selectOptionTradability(u, option).optionTradableNow);
      expect(new Set(verdicts).size).toBe(1);
    }
  });

  it("names the state rather than going quiet when it cannot confirm", () => {
    const v = selectOptionTradability(null, null);
    expect(v.optionTradableNow).toBe("UNKNOWN");
    expect(v.optionSession).toBe("UNKNOWN");
    expect(v.note).toContain("OPTION SESSION UNKNOWN");
  });

  it("UNKNOWN is not NO — a third state, not a rounded-down second one", () => {
    expect(selectOptionTradability(null, null).optionTradableNow).toBe("UNKNOWN");
    expect(selectOptionTradability(null, "CLOSED").optionTradableNow).toBe("NO");
    expect(selectOptionTradability(null, null).note).not.toEqual(
      selectOptionTradability(null, "CLOSED").note,
    );
  });

  it("EXTENDED and OVERNIGHT fail closed and say which", () => {
    for (const s of ["EXTENDED", "OVERNIGHT"] as const) {
      const v = selectOptionTradability(s, s);
      expect(v.optionTradableNow).toBe("NO");
      expect(v.note).toContain("OPTION NOT TRADABLE NOW");
      expect(v.note).toContain(s);
    }
  });

  it("RTH and 24X7 are the only sessions that open a contract", () => {
    const open = ALL.filter((s) => selectOptionTradability(null, s).optionTradableNow === "YES");
    expect(open).toEqual(["RTH", "24X7"]);
  });

  it("divergence needs two KNOWN, DIFFERENT sessions", () => {
    expect(selectOptionTradability("EXTENDED", "CLOSED").sessionsDiverged).toBe(true);
    expect(selectOptionTradability("RTH", "RTH").sessionsDiverged).toBe(false);
    // Two absences are not a disagreement.
    expect(selectOptionTradability(null, null).sessionsDiverged).toBe(false);
    // One absence is not a disagreement either.
    expect(selectOptionTradability(null, "CLOSED").sessionsDiverged).toBe(false);
    expect(selectOptionTradability("RTH", null).sessionsDiverged).toBe(false);
  });

  it("THE H4 CASE: stock printing in EXTENDED while the contract is shut", () => {
    const v = selectOptionTradability("EXTENDED", "CLOSED");
    expect(v.optionTradableNow).toBe("NO");
    // Verdict first, reason second. Never one blended sentence.
    expect(v.note).toMatch(/^OPTION SESSION CLOSED/);
    expect(v.note).toContain("EXTENDED");
    expect(v.note).toContain("different market");
  });

  it("a note exists if and only if the contract is not tradable", () => {
    for (const u of ALL) {
      for (const o of ALL) {
        const v = selectOptionTradability(u, o);
        expect(v.note === null).toBe(v.optionTradableNow === "YES");
      }
    }
  });

  it("never names UNKNOWN as a market in the divergence clause", () => {
    for (const u of ALL) {
      for (const o of ALL) {
        const v = selectOptionTradability(u, o);
        if (!v.sessionsDiverged || v.note === null) continue;
        expect(v.note).not.toContain("UNKNOWN");
      }
    }
  });

  it("divergence is reported structurally even when the contract IS tradable", () => {
    // Stock shut, contract open — the inverse of the headline case, and the
    // shape the XTSLA amendment lives in (one underlying, two venues, two
    // clocks). `note` stays null because note answers CAN I ACT and the answer
    // is yes. The divergence is not lost: it is on the verdict as a field, so a
    // surface that wants to say "the stock is closed" can, without this module
    // inventing a warning about a market that is working.
    const v = selectOptionTradability("CLOSED", "RTH");
    expect(v.optionTradableNow).toBe("YES");
    expect(v.note).toBeNull();
    expect(v.sessionsDiverged).toBe(true);
    expect(v.underlyingSession).toBe("CLOSED");
  });

  it("a designed market boundary is never dressed as a failure", () => {
    for (const u of ALL) {
      for (const o of ALL) {
        const note = selectOptionTradability(u, o).note;
        if (note === null) continue;
        expect(note).not.toMatch(/\b(ERROR|FAILED|CRITICAL|FATAL|WARNING)\b/);
        expect(note).not.toMatch(/coming soon|eventually|needs wiring|try again later/i);
        // Every honest state must still be a readable sentence.
        expect(note.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("echoes back exactly the sessions it was given", () => {
    for (const u of ALL) {
      for (const o of ALL) {
        const v = selectOptionTradability(u, o);
        expect(v.underlyingSession).toBe(u ?? "UNKNOWN");
        expect(v.optionSession).toBe(o ?? "UNKNOWN");
      }
    }
  });

  it("is pure — same inputs, equal verdict, no shared mutable state", () => {
    const a = selectOptionTradability("EXTENDED", "CLOSED");
    const b = selectOptionTradability("EXTENDED", "CLOSED");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
