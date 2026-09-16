/**
 * The deck must never answer "what am I holding?" with blank space.
 *
 * WHY THIS FILE EXISTS (2026-09-16). `compileScene` has admitted the surface
 * elements PROTECTION_GRADE and HUMILITY_PANEL since it was written, and
 * `SceneAdmissionPanel` carries their human labels. A repo-wide grep for both
 * identifiers on this date found ZERO renderers. The vocabulary shipped; the
 * pixels never did.
 *
 * The consequence on /command-deck was that `scene-risk` contained exactly one
 * child — `AvailableRChip` — so the risk column told a trader how much R was
 * available for the NEXT decision and said nothing whatsoever about the book
 * they are already carrying. §14.1 was written because the dangerous direction
 * of that error is always the same: a trader with capital exposed being left
 * free to assume they hold none. Silence does that just as efficiently as the
 * 2026-09-03 Alpaca panel's "No open positions" did.
 *
 * The tests below pin the two things that make this line safe rather than
 * decorative: the provenance check runs BEFORE the label is read, and the word
 * FLAT is only ever a headline when flatness was actually observed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CAPITAL_UNREAD_DETAIL,
  selectCapitalPosture,
  type CapitalPostureInput,
} from "./selectCapitalPosture";
import { compileScene } from "./compileScene";
import { deckSceneSignals } from "./deckSceneSignals";
import type { PositionConfidence, PositionLabel } from "../positionTruth";

const base: CapitalPostureInput = {
  position: "FLAT",
  confidence: "CONFIRMED",
  provenance: "OBSERVED",
  capitalAtRisk: false,
};

const ALL_LABELS: readonly PositionLabel[] = [
  "FLAT",
  "LONG",
  "SHORT",
  "POSITION UNCONFIRMED",
];
const ALL_CONFIDENCES: readonly PositionConfidence[] = [
  "CONFIRMED",
  "STALE",
  "TIME UNVERIFIED",
  "UNOBSERVED",
  "DISPUTED",
];

describe("an unobserved capital column is stated, not implied", () => {
  it("UNOBSERVED provenance wins over EVERY label/confidence pair", () => {
    // The ordering is the safety property. `deckSceneSignals` hard-codes the
    // capital column to a constant; if the label were consulted first, that
    // constant would be rendered as though a source had produced it. This
    // sweeps the whole cross-product so no future label can sneak past.
    for (const position of ALL_LABELS) {
      for (const confidence of ALL_CONFIDENCES) {
        const vm = selectCapitalPosture({
          ...base,
          position,
          confidence,
          provenance: "UNOBSERVED",
        });
        expect(vm.label, `${position}/${confidence}`).toBe("POSITION UNREAD");
        expect(vm.tone).toBe("UNREAD");
        expect(vm.isAbsence).toBe(true);
      }
    }
  });

  it("the unread sentence refuses the flat reading and makes no future promise", () => {
    const vm = selectCapitalPosture({ ...base, provenance: "UNOBSERVED" });
    expect(vm.detail).toBe(CAPITAL_UNREAD_DETAIL);
    expect(vm.detail).toContain("not a confirmation that you are flat");
    // The AvailableRChip lesson, generalised: "has not been read YET" tells a
    // trader their next action causes a read. Nothing on this route does.
    expect(vm.detail).not.toMatch(/\byet\b/i);
  });

  it("/command-deck's real adapter lands on UNREAD — this is the live state", () => {
    // Not a hypothetical. This composes the exact owners the page composes, so
    // the day a broker source is wired here, this expectation goes red and
    // forces a deliberate re-read of the disclosure rather than letting the
    // disclosure quietly outlive its condition.
    const scene = deckSceneSignals({ session: "CLOSED", rightOfWay: "NO TRADE" });
    const compiled = compileScene(scene.signals);
    const vm = selectCapitalPosture({
      position: scene.signals.position,
      confidence: scene.signals.positionConfidence,
      provenance: scene.provenance.POSITION,
      capitalAtRisk: compiled.capitalAtRisk,
    });
    expect(scene.provenance.POSITION).toBe("UNOBSERVED");
    expect(vm.label).toBe("POSITION UNREAD");
  });
});

describe("FLAT is a finding, never a headline by default (§14.1)", () => {
  it("prints FLAT only when an observed source confirmed zero", () => {
    const vm = selectCapitalPosture({ ...base, position: "FLAT", confidence: "CONFIRMED" });
    expect(vm.label).toBe("FLAT");
    expect(vm.tone).toBe("SETTLED");
  });

  it("never headlines FLAT on any unconfirmed confidence", () => {
    // This is the 2026-09-03 Alpaca shape: an empty list from a failed fetch.
    for (const confidence of ALL_CONFIDENCES) {
      if (confidence === "CONFIRMED") continue;
      const vm = selectCapitalPosture({ ...base, position: "FLAT", confidence });
      expect(vm.label, confidence).toBe("POSITION UNCONFIRMED");
      expect(vm.label).not.toBe("FLAT");
      expect(vm.detail).toContain("not a confirmation that you are flat");
    }
  });

  it("observed flatness with lingering exposure is not settled", () => {
    // §21's flatten/working-order race. Zero held is not zero at stake.
    const vm = selectCapitalPosture({ ...base, capitalAtRisk: true });
    expect(vm.label).toBe("FLAT");
    expect(vm.tone).toBe("UNSETTLED");
    expect(vm.detail).toContain("can still create exposure");
  });
});

describe("a reported side is never softened", () => {
  it("names the side and marks it exposed", () => {
    for (const position of ["LONG", "SHORT"] as const) {
      const vm = selectCapitalPosture({ ...base, position, confidence: "CONFIRMED" });
      expect(vm.label).toBe(position);
      expect(vm.tone).toBe("EXPOSED");
      expect(vm.isAbsence).toBe(false);
    }
  });

  it("keeps EXPOSED even when the book is stale, and says the size is unproven", () => {
    // Downgrading the tone here would be the wrong direction of error: an
    // unproven size is a reason to look harder, not a reason to relax.
    const vm = selectCapitalPosture({ ...base, position: "LONG", confidence: "STALE" });
    expect(vm.tone).toBe("EXPOSED");
    expect(vm.detail).toContain("STALE");
    expect(vm.detail).toContain("unproven");
  });
});

describe("the line is total and reaches the deck", () => {
  it("returns a non-empty label and detail for every input combination", () => {
    for (const position of ALL_LABELS) {
      for (const confidence of ALL_CONFIDENCES) {
        for (const provenance of ["OBSERVED", "UNOBSERVED"] as const) {
          for (const capitalAtRisk of [true, false]) {
            const vm = selectCapitalPosture({ position, confidence, provenance, capitalAtRisk });
            expect(vm.label.length).toBeGreaterThan(0);
            expect(vm.detail.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("/command-deck renders it inside scene-risk, beside Available R", () => {
    // Source-graph guard: this repo has no DOM in tests, so the join between
    // the selector and the pixel is asserted structurally. The element is
    // pinned INSIDE `scene-risk` rather than merely present on the page —
    // a posture line parked in a collapsed drawer is the exact defect
    // AvailableRChip was created to fix, and it would satisfy a whole-file
    // `toContain`.
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    const start = src.indexOf('data-testid="scene-risk"');
    expect(start, "scene-risk region not found on /command-deck").toBeGreaterThan(-1);
    const end = src.indexOf("</div>", start);
    expect(end).toBeGreaterThan(start);
    const region = src.slice(start, end);
    expect(region).toContain("<AvailableRChip");
    expect(region).toContain("<CapitalPostureLine");
  });

  it("the deck derives the posture from its own scene owners, not a new source", () => {
    // §24: a second CALLER of an owner is fine, a second ANSWER is not. If a
    // future edit hands this selector a freshly-fetched book, the deck gains a
    // capital source that `deckSceneSignals.provenance` still reports as
    // UNOBSERVED — two answers, one page.
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    expect(src).toMatch(/selectCapitalPosture\(\{[\s\S]{0,400}?sceneInput\.signals\.position/);
    expect(src).toMatch(/provenance:\s*sceneInput\.provenance\.POSITION/);
    expect(src).toMatch(/capitalAtRisk:\s*sceneCompilation\.capitalAtRisk/);
  });
});
