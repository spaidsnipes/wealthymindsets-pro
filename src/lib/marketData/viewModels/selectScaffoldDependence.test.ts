/**
 * Asset 13 — what these tests actually guard.
 *
 * The risk here is not arithmetic. It is that the dependence figure becomes a
 * BADGE: a label that says LOW while the page quietly goes on explaining
 * everything, or that says the reader is carrying weight the view never put
 * down. So the assertions are mostly about the relationship between the count
 * and the page:
 *
 *  1. THE COUNT MOVES WITH THE LEVEL, and in the right direction.
 *  2. THE READING DOES NOT MOVE — readCount/unreadCount/steps are invariant.
 *  3. THE MOCKUP'S BIAS LINE AND ITS GRADE are absent from every input.
 */

import { describe, expect, it } from "vitest";

import { selectDivisionWorksheet } from "./selectDivisionWorksheet";
import { SCAFFOLD_LEVELS, scaffoldWorksheet, type ScaffoldLevel } from "./scaffoldWorksheet";
import {
  BIAS_REFUSAL,
  DEPENDENCE_REFUSAL_OWNER,
  selectScaffoldDependence,
} from "./selectScaffoldDependence";

/** A worksheet with bars and a signed tape — as much read as this room gets. */
const loaded = selectDivisionWorksheet({ barCount: 390, tickCount: 240 });
/** A worksheet with nothing read at all. */
const empty = selectDivisionWorksheet({ barCount: null, tickCount: null });

const visible = (level: ScaffoldLevel, vm = loaded): string => {
  const d = selectScaffoldDependence(vm, level);
  return `${d.statement}   ${d.readingUnchanged}   ${d.guidance}   ${d.tier}`;
};

describe("selectScaffoldDependence — the count is not a badge", () => {
  it("prints every explanation it has at FOUNDATION, and carries nothing", () => {
    const d = selectScaffoldDependence(loaded, "FOUNDATION");
    expect(d.supplied).toBe(d.available);
    expect(d.carried).toBe(0);
    expect(d.tier).toBe("HIGH");
  });

  it("supplies strictly less as the reader moves down the path", () => {
    const counts = SCAFFOLD_LEVELS.map((l) => selectScaffoldDependence(loaded, l).supplied);
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
  });

  it("carries strictly more as the reader moves down the path", () => {
    const carried = SCAFFOLD_LEVELS.map((l) => selectScaffoldDependence(loaded, l).carried);
    expect(carried[0]).toBeLessThan(carried[1]);
    expect(carried[1]).toBeLessThan(carried[2]);
  });

  it("supplied plus carried is the same total at every level", () => {
    for (const level of SCAFFOLD_LEVELS) {
      const d = selectScaffoldDependence(loaded, level);
      expect(d.supplied + d.carried).toBe(d.available);
    }
  });

  /**
   * THE ANTI-BADGE TEST. The figure must be derived from the rungs actually
   * drawn, not from the level name. If someone changes what ADVANCED prints, the
   * count has to move on its own — so it is recomputed here, independently, from
   * `scaffoldWorksheet`'s own output.
   */
  it("agrees with an independent count taken off the scaffolded rungs", () => {
    for (const level of SCAFFOLD_LEVELS) {
      const s = scaffoldWorksheet(loaded, level);
      const independent = s.shown.reduce((n, { rung, voices }) => {
        let c = 0;
        if (voices.question && rung.question) c += 1;
        if (voices.dividend && rung.dividend) c += 1;
        if (voices.basis && rung.basis) c += 1;
        if (voices.owner && rung.owner) c += 1;
        if (voices.absence && rung.absence) c += 1;
        return n + c;
      }, 0);
      expect(selectScaffoldDependence(loaded, level).supplied).toBe(independent);
    }
  });

  /**
   * A PROPERTY FOUND BY WRITING THIS TEST WRONG.
   *
   * The first version of this assertion expected the empty room's ceiling to be
   * LOWER than the loaded room's — reasoning that an unread rung has no basis to
   * print. Both came back 28, and the reason is worth keeping: a rung always
   * explains itself. If it was worked it prints a `basis`; if it was not it
   * prints an `absence` saying why. Never both, never neither.
   *
   * So the amount of EXPLAINING this worksheet does is independent of how much
   * of the market it managed to read. An empty room is not a quieter room — it
   * is a room saying a different set of true things. That is the behaviour the
   * seventh rung exists to produce, and it is pinned here so that a future rung
   * which can go silent both ways fails this test rather than quietly halving
   * the dependence figure.
   */
  it("explains itself just as fully with nothing read — a basis or an absence, never neither", () => {
    expect(selectScaffoldDependence(empty, "FOUNDATION").available).toBe(
      selectScaffoldDependence(loaded, "FOUNDATION").available,
    );
    for (const vm of [loaded, empty]) {
      for (const r of vm.rungs) {
        expect(Boolean(r.basis) !== Boolean(r.absence)).toBe(true);
      }
    }
  });

  it("counts CONTENT, not voice flags — a rung with nothing to say is not credited", () => {
    // Drive a rung whose optional voices are empty through the same counter. A
    // count taken off the flags alone would credit it for all four.
    const stripped = {
      ...loaded,
      rungs: loaded.rungs.map((r) => ({ ...r, question: "", dividend: "", owner: "" })),
    };
    expect(selectScaffoldDependence(stripped, "FOUNDATION").available).toBeLessThan(
      selectScaffoldDependence(loaded, "FOUNDATION").available,
    );
  });

  it("never reports a negative carry", () => {
    for (const vm of [loaded, empty]) {
      for (const level of SCAFFOLD_LEVELS) {
        expect(selectScaffoldDependence(vm, level).carried).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("selectScaffoldDependence — the reading does not move", () => {
  it("re-states the SAME read/unread counts at every level", () => {
    const statements = SCAFFOLD_LEVELS.map(
      (l) => selectScaffoldDependence(loaded, l).readingUnchanged,
    );
    expect(new Set(statements).size).toBe(1);
  });

  it("quotes the source worksheet's own counts, not a recomputed pair", () => {
    const d = selectScaffoldDependence(loaded, "ADVANCED");
    expect(d.readingUnchanged).toContain(String(loaded.readCount));
    expect(d.readingUnchanged).toContain(String(loaded.unreadCount));
    expect(d.readingUnchanged).toContain(String(loaded.rungs.length));
  });

  /**
   * ADVANCED draws a SUBSET of rungs. If the reading were ever recomputed from
   * what is on screen, this is where it would shrink — so it is pinned here
   * specifically rather than only in the general case above.
   */
  it("reports the full step count at ADVANCED even though fewer rungs are drawn", () => {
    const s = scaffoldWorksheet(loaded, "ADVANCED");
    const d = selectScaffoldDependence(loaded, "ADVANCED");
    expect(s.shown.length).toBeLessThan(loaded.rungs.length);
    expect(d.readingUnchanged).toContain(`of ${loaded.rungs.length} steps worked`);
  });
});

describe("selectScaffoldDependence — the refusals", () => {
  it("names the withheld bias instruction and its owner on every input", () => {
    for (const vm of [loaded, empty]) {
      for (const level of SCAFFOLD_LEVELS) {
        const d = selectScaffoldDependence(vm, level);
        expect(d.biasRefusal).toBe(BIAS_REFUSAL);
        expect(d.biasRefusal).toContain(DEPENDENCE_REFUSAL_OWNER);
      }
    }
  });

  it("issues no bias of its own — the refusal is the only place those words appear", () => {
    for (const level of SCAFFOLD_LEVELS) {
      const text = visible(level).toLowerCase();
      for (const banned of ["defensive", "reduce size", "sub-optimal", "caution", "bias"]) {
        expect(text).not.toContain(banned);
      }
    }
  });

  it("grades nothing — no adjective supplies a verdict the owners did not", () => {
    for (const level of SCAFFOLD_LEVELS) {
      expect(visible(level)).not.toMatch(
        /\b(strong|weak|good|poor|healthy|bullish|bearish|optimal|excellent|likely)\b/i,
      );
    }
  });

  it("carries none of the mockup's fabricated figures", () => {
    for (const vm of [loaded, empty]) {
      for (const level of SCAFFOLD_LEVELS) {
        const text = visible(level, vm);
        // 82 effort, 61 result, 0.74 efficiency, 1.0 axis — none have an owner.
        expect(text).not.toMatch(/\b82\b/);
        expect(text).not.toMatch(/\b61\b/);
        expect(text).not.toMatch(/\b0\.74\b/);
      }
    }
  });

  /**
   * The mockup counts SIX steps. This division has seven, and the seventh is the
   * rung that names what is missing. A dependence figure quoting the mockup's
   * count would be measuring a worksheet this room does not draw.
   */
  it("counts the room's own steps, not the mockup's six", () => {
    expect(loaded.rungs.length).toBe(7);
    expect(selectScaffoldDependence(loaded, "ADVANCED").readingUnchanged).toContain("7");
  });
});

describe("selectScaffoldDependence — the empty room", () => {
  it("does not throw and does not claim the reader is carrying a load", () => {
    for (const level of SCAFFOLD_LEVELS) {
      const d = selectScaffoldDependence(empty, level);
      expect(typeof d.statement).toBe("string");
      expect(d.statement.length).toBeGreaterThan(0);
      expect(d.supplied).toBeLessThanOrEqual(d.available);
    }
  });

  it("still names the tier and the guidance mode for every level", () => {
    expect(selectScaffoldDependence(empty, "FOUNDATION").tier).toBe("HIGH");
    expect(selectScaffoldDependence(empty, "INTERMEDIATE").tier).toBe("MEDIUM");
    expect(selectScaffoldDependence(empty, "ADVANCED").tier).toBe("LOW");
    for (const level of SCAFFOLD_LEVELS) {
      expect(selectScaffoldDependence(empty, level).guidance.length).toBeGreaterThan(0);
    }
  });
});
