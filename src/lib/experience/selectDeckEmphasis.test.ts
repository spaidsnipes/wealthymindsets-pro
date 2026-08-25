/**
 * selectDeckEmphasis tests — the job-emphasis mapping must be total over every
 * ExperienceMode, change only presentation (lead + which drawer opens), and
 * put the right surface in front of the human's current job.
 */

import { describe, it, expect } from "vitest";
import {
  selectDeckEmphasis,
  surfaceOrder,
  DECK_EMPHASIS_VERSION,
  type DeckSurface,
} from "./selectDeckEmphasis";
import { EXPERIENCE_MODES } from "./decisionContextBus";

const ALL_SURFACES: readonly DeckSurface[] = ["STORY", "WHY", "PASSPORT", "RECEIPT"];

describe("selectDeckEmphasis", () => {
  it("exposes a stable version", () => {
    expect(DECK_EMPHASIS_VERSION).toBe("wm.deck-emphasis.v1");
  });

  it("is total over every ExperienceMode with a non-empty rationale", () => {
    for (const mode of EXPERIENCE_MODES) {
      const e = selectDeckEmphasis(mode);
      expect(e.mode).toBe(mode);
      expect(["STORY", "WHY", "PASSPORT", "RECEIPT"]).toContain(e.lead);
      expect(e.rationale.length).toBeGreaterThan(0);
    }
  });

  it("leads WAIT and EXECUTE with WHY / WHY NOT and emphasises it", () => {
    for (const mode of ["WAIT", "EXECUTE"] as const) {
      const e = selectDeckEmphasis(mode);
      expect(e.lead).toBe("WHY");
      expect(e.emphasizeWhy).toBe(true);
    }
  });

  it("leads OBSERVE with the Object DNA passport and opens it", () => {
    const e = selectDeckEmphasis("OBSERVE");
    expect(e.lead).toBe("PASSPORT");
    expect(e.passportOpen).toBe(true);
    expect(e.receiptOpen).toBe(false);
  });

  it("opens the Decision Receipt in management + reflection jobs", () => {
    for (const mode of ["MANAGE", "REVIEW", "LEARN"] as const) {
      const e = selectDeckEmphasis(mode);
      expect(e.lead).toBe("RECEIPT");
      expect(e.receiptOpen).toBe(true);
    }
  });

  it("forces no live drawer open during PREP (pre-bell reflection)", () => {
    const e = selectDeckEmphasis("PREP");
    expect(e.lead).toBe("STORY");
    expect(e.passportOpen).toBe(false);
    expect(e.receiptOpen).toBe(false);
    expect(e.emphasizeWhy).toBe(false);
  });

  it("only ever opens one contextual drawer by default (never competes for attention)", () => {
    for (const mode of EXPERIENCE_MODES) {
      const e = selectDeckEmphasis(mode);
      const openCount = Number(e.passportOpen) + Number(e.receiptOpen);
      expect(openCount).toBeLessThanOrEqual(1);
    }
  });

  it("ranks every surface exactly once with the lead first (a full permutation)", () => {
    for (const mode of EXPERIENCE_MODES) {
      const e = selectDeckEmphasis(mode);
      // A permutation: same length, no duplicates, contains every surface.
      expect(e.order).toHaveLength(ALL_SURFACES.length);
      expect(new Set(e.order).size).toBe(ALL_SURFACES.length);
      for (const surface of ALL_SURFACES) expect(e.order).toContain(surface);
      // The lead always physically floats to the top.
      expect(e.order[0]).toBe(e.lead);
    }
  });

  it("maps surfaceOrder to a contiguous 0-based rank, lead === 0, never leaves a surface unplaced", () => {
    for (const mode of EXPERIENCE_MODES) {
      const e = selectDeckEmphasis(mode);
      expect(surfaceOrder(e, e.lead)).toBe(0);
      const ranks = ALL_SURFACES.map((s) => surfaceOrder(e, s)).sort((a, b) => a - b);
      expect(ranks).toEqual([0, 1, 2, 3]);
    }
  });

  it("reproduces the pure per-job order exactly when no signals are supplied", () => {
    for (const mode of EXPERIENCE_MODES) {
      expect(selectDeckEmphasis(mode, undefined).order).toEqual(selectDeckEmphasis(mode).order);
    }
  });

  it("keeps the lead fixed and the order a full permutation under any signals", () => {
    const signalMatrix = [
      { hasUnresolvedContradiction: true, hasSealedReceipt: false },
      { hasUnresolvedContradiction: true, hasSealedReceipt: true },
      { hasUnresolvedContradiction: false, hasSealedReceipt: false },
      { hasUnresolvedContradiction: false, hasSealedReceipt: true },
    ];
    for (const mode of EXPERIENCE_MODES) {
      const lead = selectDeckEmphasis(mode).lead;
      for (const signals of signalMatrix) {
        const e = selectDeckEmphasis(mode, signals);
        expect(e.order[0]).toBe(lead); // lead never moves
        expect(new Set(e.order).size).toBe(ALL_SURFACES.length);
        for (const s of ALL_SURFACES) expect(e.order).toContain(s);
      }
    }
  });

  it("raises WHY directly under the lead when a blocker is live (unless WHY already leads)", () => {
    // OBSERVE leads with PASSPORT — a live contradiction should float WHY to 2nd.
    const observe = selectDeckEmphasis("OBSERVE", { hasUnresolvedContradiction: true });
    expect(observe.order[0]).toBe("PASSPORT");
    expect(observe.order[1]).toBe("WHY");
    // WAIT already leads with WHY — the signal must not create a duplicate/no-op.
    const wait = selectDeckEmphasis("WAIT", { hasUnresolvedContradiction: true });
    expect(wait.order[0]).toBe("WHY");
    expect(new Set(wait.order).size).toBe(ALL_SURFACES.length);
  });

  it("sinks an empty Receipt to last so it never outranks a live surface", () => {
    // OBSERVE's pure order puts RECEIPT last already; pick REVIEW where RECEIPT leads
    // (must stay — it's the lead) and MANAGE. Use PREP where RECEIPT is last anyway,
    // and OBSERVE where RECEIPT is already last — assert it STAYS last, never rises.
    for (const mode of ["PREP", "OBSERVE", "WAIT", "EXECUTE"] as const) {
      const e = selectDeckEmphasis(mode, { hasSealedReceipt: false });
      expect(e.order[e.order.length - 1]).toBe("RECEIPT");
    }
    // When the Receipt LEADS the job (REVIEW/MANAGE/LEARN), emptiness cannot demote
    // it below the lead — the job still owns the lead.
    for (const mode of ["MANAGE", "REVIEW", "LEARN"] as const) {
      const e = selectDeckEmphasis(mode, { hasSealedReceipt: false });
      expect(e.order[0]).toBe("RECEIPT");
    }
  });
});
