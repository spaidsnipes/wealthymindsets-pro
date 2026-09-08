/**
 * THE ORPHAN IS WIRED — enforcement.
 *
 * ATHOS "NO ORPHAN BREAKTHROUGHS": an internal engine computing into nowhere
 * is an ORPHANED INTERNAL WIRE, and incomplete regardless of test count.
 * `projectDecision` was exactly that for one commit. These rules prove it now
 * has a real consumer, and — the part that matters — that the consumer tells
 * the four answers apart.
 *
 * The colour/word mapping is asserted against the REAL exported values, not
 * grepped, because "these two states must not look alike" is a claim a regex
 * cannot actually check. The wiring itself is source-level: this repo has no
 * DOM environment, so that half is TESTED, not OBSERVED.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WORD, toneFor } from "@/components/paper/DecisionReachCheck";

const page = readFileSync(resolve(process.cwd(), "src/app/paper/page.tsx"), "utf8");
const component = readFileSync(
  resolve(process.cwd(), "src/components/paper/DecisionReachCheck.tsx"), "utf8",
);

describe("decision reach — the read arrow has a real consumer", () => {
  it("the blotter renders the check", () => {
    expect(page).toContain("DecisionReachCheck");
    expect(page).toContain("@/components/paper/DecisionReachCheck");
  });

  it("asks about the order's OWN decision, not some other id", () => {
    expect(page).toMatch(/<DecisionReachCheck\s+decisionId=\{ord\.decisionId\}/);
  });

  it("calls the canonical reader and does not open a second transport", () => {
    // H21, one owner per rule. A private fetch here would mean two modules
    // deciding what NOT_RECORDED means.
    expect(component).toContain("@/lib/traderMemory/projectDecision");
    expect(component).not.toMatch(/fetch\(/);
  });
});

describe("decision reach — the four answers stay four", () => {
  it("NOT_RECORDED and UNVERIFIED never share a colour", () => {
    // THE RULE THIS FILE EXISTS FOR. "I looked and it is not there" and "I
    // could not look" lead to OPPOSITE actions. Collapsing them to one tint
    // is how a trader acts on a position WM never actually checked.
    expect(toneFor("NOT_RECORDED")).not.toBe(toneFor("UNVERIFIED"));
  });

  it("every status carries a word, so colour is never the only message (§9)", () => {
    for (const status of ["PROJECTED", "NOT_RECORDED", "UNVERIFIED", "SIGNED_OUT"] as const) {
      expect(WORD[status], `${status} has no word`).toBeTruthy();
      expect(WORD[status].trim().length).toBeGreaterThan(3);
    }
  });

  it("no two statuses share a word either", () => {
    const words = Object.values(WORD);
    expect(new Set(words).size).toBe(words.length);
  });

  it("success is not painted green (§9 — no green shield)", () => {
    const green = ["#00D4AA", "#5cb85c", "#00A888"];
    expect(green).not.toContain(toneFor("PROJECTED"));
  });

  it("the words name the account, never an error (§8)", () => {
    for (const word of Object.values(WORD)) {
      expect(word).not.toMatch(/error|failed|invalid/i);
    }
  });
});

describe("decision reach — it does not claim what it has not asked", () => {
  it("does not project on mount — N rows would be N requests", () => {
    // This path does not go through quoteRequestCoalescer. Auto-projecting
    // every blotter row is the duplicate-subscription shape this repo has
    // already fixed three times.
    expect(component).not.toContain("useEffect");
  });

  it("the idle state asks a question rather than showing a status", () => {
    // A "—" or a grey dot before asking would report a state never observed.
    expect(component).toMatch(/Is this on my other devices\?/);
  });

  it("discloses an order that has no shared identity instead of hiding it", () => {
    // A row with no control at all reads as "nothing to ask here", which is
    // a different and untrue statement.
    expect(component).toMatch(/decisionId === undefined \|\| decisionId\.trim\(\) === ""/);
    expect(component).toMatch(/no shared identity/);
  });
});
