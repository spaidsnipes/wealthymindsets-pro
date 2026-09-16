/**
 * A COLOUR IS NOT A STATE NAME.
 *
 * WHY THIS FILE EXISTS. PerCapabilityFidelityGrid is rendered on /command-deck.
 * For every evaluated capability row it called `fidelityLabelToFailureReport`,
 * got back the full canon seven-question report — and then THREW THE ANSWER
 * AWAY to draw this:
 *
 *   <span aria-hidden style={{
 *     width: 6, height: 6, borderRadius: "50%",
 *     background: isNormal ? "#00E88A" : "#F5A623",
 *   }} />
 *
 * One boolean. Two colours. SIX canon states. Five of them — DEGRADED,
 * BLOCKED, UNAVAILABLE, RECOVERING, UNKNOWN — were painted the identical
 * orange, and the state name was reachable ONLY through the `title` tooltip on
 * the row, which a touch device never shows and a screen reader reads as one
 * undifferentiated blob.
 *
 * THAT IS NOT A COSMETIC LOSS. The two states proven below imply OPPOSITE
 * trader actions:
 *
 *   BLOCKED    → "upgrade the entitlement"      (act — nothing will change on its own)
 *   RECOVERING → "wait for the pipeline"        (do NOT act — acting is the mistake)
 *
 * Same pixel. Same colour. Opposite instruction. That is the ErrorBoundary law
 * pointed at a swatch instead of a symbol: a rendering that cannot distinguish
 * two states is a rendering that GUESSES between them.
 *
 * FailureStateChip already owned this vocabulary and already renders every
 * non-NORMAL state as visible text while keeping NORMAL quiet per canon
 * §"Normal inactivity is not failure". The grid now mounts it. This file is
 * what stops the dot coming back — and it is pinned at the COMPONENT, because
 * the chip can stay perfect forever while a caller draws its own swatch beside
 * it. (@testing-library/react is NOT installed in this repo, so this is a
 * source-level Sentinel by necessity as well as by design — a render test could
 * not have been written here even if one were preferred.)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fidelityLabelToFailureReport } from "./fidelityToHealth";
import { CANONICAL_FIDELITY_LABELS } from "../marketData/canonicalFidelityLabels";

const GRID = resolve(__dirname, "../../components/marketData/PerCapabilityFidelityGrid.tsx");
const src = () => readFileSync(GRID, "utf8");

/** JSX comments, block comments and line comments. A COMMENT IS NOT A CONSUMER. */
const codeOnly = () =>
  src()
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

describe("× A COLOUR IS NOT A STATE NAME — the fidelity grid names what it knows", () => {
  it("the stripper really strips, so every ban below is a ban on CODE", () => {
    // Non-vacuity. The docblock in the component quotes the defect verbatim;
    // without this, a ban could be passing only because it matched prose.
    expect(src()).toContain("hand-rolled dot");
    expect(codeOnly()).not.toContain("hand-rolled dot");
  });

  it("mounts the chip that owns the six-state vocabulary", () => {
    expect(codeOnly()).toContain("<FailureStateChip");
  });

  it("hands the chip the SAME report it computed — the wire, not just the tag", () => {
    // THE DEFECT was never a missing import; it was a COMPUTED ANSWER
    // DISCARDED. A <FailureStateChip state="NORMAL" /> beside a hand-rolled
    // dot would satisfy a tag check and still show nothing true.
    expect(codeOnly()).toMatch(/<FailureStateChip[^>]*\breport=\{report7q\}/);
  });

  it("draws no swatch whose colour is the only carrier of the state", () => {
    // THE DEFECT, verbatim in shape: any style property switched on the
    // NORMAL/not-NORMAL boolean and painted as a background. `color:` on the
    // row text is deliberately NOT banned — text that is also NAMED elsewhere
    // may be tinted; a swatch that is the sole evidence may not.
    const offenders = codeOnly().match(/(background|boxShadow)\s*:\s*isNormal\s*\?/g) ?? [];
    expect(offenders, "the binary health dot is back — five states, one colour").toEqual([]);
  });

  it("does not re-spell the canon states inside the component", () => {
    // A SENTINEL PINNED TO A SPELLING IS NOT PINNED TO A MEANING, so this bans
    // the second owner rather than a particular rendering of it. If the grid
    // starts typing state words itself, FailureStateChip has stopped being the
    // single writer no matter how the words are styled.
    const code = codeOnly();
    for (const state of ["DEGRADED", "BLOCKED", "UNAVAILABLE", "RECOVERING"]) {
      expect(code, `${state} is spelled inside the grid — the chip is no longer the only writer`)
        .not.toContain(`"${state}"`);
    }
  });
});

describe("the collapse this prevents was real, not hypothetical", () => {
  it("BLOCKED and RECOVERING arise from real labels and instruct OPPOSITE actions", () => {
    // This is the whole argument for the fix, executed rather than asserted in
    // a comment. Both of these rows could appear on /command-deck; pre-fix
    // both rendered the identical orange dot.
    const blocked = fidelityLabelToFailureReport(CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT);
    const recovering = fidelityLabelToFailureReport(CANONICAL_FIDELITY_LABELS.STALE_PIPELINE);

    expect(blocked.state).toBe("BLOCKED");
    expect(recovering.state).toBe("RECOVERING");

    // ACT vs DO-NOT-ACT. If these two ever converge, the dot was harmless and
    // this Sentinel should be re-argued — not silently deleted.
    expect(blocked.nextSafeAction).toMatch(/upgrade/i);
    expect(recovering.nextSafeAction).toMatch(/wait/i);
    expect(blocked.nextSafeAction).not.toEqual(recovering.nextSafeAction);
  });

  it("five of the six canon states were painted the same non-NORMAL colour", () => {
    // Counted, so the claim in the docblock above is checkable rather than
    // rhetorical: everything that is not NORMAL shared one swatch.
    const states = new Set(
      Object.values(CANONICAL_FIDELITY_LABELS).map((l) => fidelityLabelToFailureReport(l).state),
    );
    expect(states.has("NORMAL")).toBe(true);
    expect([...states].filter((s) => s !== "NORMAL").length).toBeGreaterThan(1);
  });
});
