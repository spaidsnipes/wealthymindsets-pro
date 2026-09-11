/**
 * A retyped list is not a shape. It is a snapshot of a shape, taken on the day
 * someone typed it.
 *
 * `SmartMoneyPanel` consumes `selectAggressorFlow` and used to re-declare that
 * selector's result TWICE: once as `interface Flow { haveData; hasFlow; vwap;
 * cvd; askVol; bidVol; imbRatio; oneSided; askDom; candleUp }`, and once as a
 * field-by-field object projection inside the `flow` memo.
 *
 * Both copies were correct the day they were written. Then the selector gained
 * `oneSided` — the honest signal that a zero-volume opposing side makes the
 * ratio UNBOUNDED, not 3:1 — and the panel did not receive it, because a
 * hand-typed field list has no way to notice that its source grew a field. The
 * panel painted the 300 sentinel as a measured ratio for that entire window.
 * The panel's own in-file comment recorded the miss, which is how we know it
 * happened and how long it lasted.
 *
 * It would have happened a second time on `provenance` (2026-09-11), on the
 * same two copies, for the same reason.
 *
 * Nothing about that defect is visible to the type system: the retyped
 * interface is a perfectly valid type, the projection satisfies it, and
 * `tsc --noEmit` exits 0 while the trader looks at a number that lost its
 * qualifier. Only a guard that reads the SOURCE can see a structural
 * restatement, so that is what this is.
 *
 * The cure is structural, not vigilant: `extends` and a spread. The owner adds
 * a field; every consumer has it; there is no list anywhere to forget.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PANEL = path.resolve(
  process.cwd(),
  "src/components/smart-money/SmartMoneyPanel.tsx",
);

/**
 * Fields the selector owns. Named here NOT as a list the panel must match —
 * that would be the very defect — but as the set that must appear in the panel
 * at most as a consequence of the spread, never as a re-declaration.
 */
const OWNED_FIELDS = [
  "haveData",
  "hasFlow",
  "askVol",
  "bidVol",
  "cvd",
  "vwap",
  "imbRatio",
  "oneSided",
  "askDom",
  "provenance",
] as const;

function panelSource(): string {
  return fs.readFileSync(PANEL, "utf8");
}

describe("SmartMoneyPanel adopts the aggressor snapshot SHAPE, never a copy of it", () => {
  it("derives its Flow type from the selector's own result type", () => {
    const src = panelSource();
    expect(src).toContain("interface Flow extends AggressorFlowSnapshot");
    expect(src).toContain("type AggressorFlowSnapshot");
  });

  it("spreads the selector's result instead of projecting it field by field", () => {
    const src = panelSource();
    expect(src).toContain("...selectAggressorFlow(");
  });

  it("declares only the ONE field the tape does not own", () => {
    // `candleUp` reads the live bar, not the tape, so the selector correctly
    // does not produce it and the panel correctly does. It is the only member
    // `interface Flow` may declare for itself.
    const src = panelSource();
    const body = src.slice(
      src.indexOf("interface Flow extends AggressorFlowSnapshot"),
    );
    const decl = body.slice(0, body.indexOf("}") + 1);

    expect(decl).toContain("candleUp");
    for (const field of OWNED_FIELDS) {
      // A re-declared owned field means someone reopened the list. Even one is
      // enough to start the drift over again.
      expect(decl).not.toContain(`${field}:`);
    }
  });

  it("expresses NO TAPE by giving the selector nothing, not by typing a zeroed twin", () => {
    // The panel used to short-circuit `if (!realTape) return { hasFlow: false,
    // askVol: 0, ... }` — a second hand-typed copy of the snapshot, and the one
    // most likely to drift, because the "empty" case is the case nobody
    // re-reads. The selector already owns its own empty answer, and stamps it
    // `provenance: "UNDISCLOSED"`, which a hand-typed literal would not have.
    const src = panelSource();
    expect(src).toContain("realTape ? recentTicks : null");
  });
});
