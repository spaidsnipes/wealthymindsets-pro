/** §23 "confirmed entries" / §41 "did they wait?" — the confirmation FACT, from the engine's own answer as of the decision. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { FVG_LESSONS } from "@/lib/academy/fvgCourse";
import { AGAINST_GAP_CLOSE_LESSON, CONFIRMING_CLOSE_LESSON, confirmingCloseDoor, confirmingCloseLine, confirmingCloseWords } from "./confirmingClose";
import { barsClosedBy, confirmationFact, fvgContextAtDecision, readJournalFvgContext, type FvgResponseAsOf, type JournalFvgContext } from "./fvgDecisionContext";
import { journalFixture, journalFixtureBars } from "./journalProofFixture";
import { FVG_STUDY_DIMENSIONS, FVG_STUDY_GROUPS, fvgStudyList, waitedGroupOf } from "./planFvgStudy";

const f = journalFixture();
const BARS = journalFixtureBars();
const ctxOf = (i: number): JournalFvgContext => { const r = fvgContextAtDecision(f.entries[i].fvgRef, BARS); if (!r.ok) throw new Error(r.reason); return r.context; };
const withResponse = (r: FvgResponseAsOf | undefined): JournalFvgContext => ({ ...ctxOf(0), responseAsOf: r });

describe("the confirming close has ONE definition — the Academy's", () => {
  it("lesson fvg-9 for a trade with the gap, fvg-14 against it; the words are the lessons' own", () => {
    expect([CONFIRMING_CLOSE_LESSON, AGAINST_GAP_CLOSE_LESSON]).toEqual(["fvg-9", "fvg-14"]);
    const l9 = FVG_LESSONS.find(l => l.id === "fvg-9")!, l14 = FVG_LESSONS.find(l => l.id === "fvg-14")!;
    const w = confirmingCloseWords();
    expect(l9.body).toContain(w.withGap);
    expect(w.withGap).toMatch(/^REJECTION: after the touch, a bar closes back outside on the origin side/);
    expect(w.againstGap).toBe(l14.lede);
    expect(w.againstGap).toMatch(/^A close beyond the far boundary/);
    expect(confirmingCloseDoor()).toEqual({ href: expect.stringContaining("fvg-9"), label: `Lesson 9 · ${l9.title}` });
    expect(confirmingCloseLine()).toContain(w.withGap.replace(/^REJECTION:\s*/, ""));
    expect(confirmingCloseLine()).toContain(w.againstGap);
  });
  it("no other journal source restates the rule", () => {
    for (const p of ["lib/journal/fvgDecisionContext.ts", "lib/journal/planFvgStudy.ts", "components/journal/PlanAdherenceBySetup.tsx"]) {
      const src = readFileSync(path.resolve(__dirname, "../..", p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(src, p).not.toMatch(/closes back outside|close beyond the far boundary/i);
    }
  });
});

describe("confirmationFact — each state, both trade directions", () => {
  it("no touch yet", () => {
    expect(confirmationFact(withResponse("NO_TOUCH"), "BULLISH", "LONG")).toBe("NO_TOUCH_YET");
    expect(confirmationFact(withResponse("NO_TOUCH"), "BEARISH", null)).toBe("NO_TOUCH_YET");     // no side needed to say nothing was touched
  });
  it("with the gap (long a bullish gap, short a bearish one): confirmed only by the engine's REJECTED", () => {
    expect(confirmationFact(withResponse("REJECTED"), "BULLISH", "LONG")).toBe("CONFIRMED_BEFORE");
    expect(confirmationFact(withResponse("REJECTED"), "BEARISH", "SHORT")).toBe("CONFIRMED_BEFORE");
    for (const r of ["OPEN", "NONE", "ACCEPTED", "TRADED_THROUGH"] as const) expect(confirmationFact(withResponse(r), "BULLISH", "LONG"), r).toBe("NOT_YET_CONFIRMED");
  });
  it("against the gap (short a bullish gap, long a bearish one): confirmed only by TRADED_THROUGH", () => {
    expect(confirmationFact(withResponse("TRADED_THROUGH"), "BULLISH", "SHORT")).toBe("CONFIRMED_BEFORE");
    expect(confirmationFact(withResponse("TRADED_THROUGH"), "BEARISH", "LONG")).toBe("CONFIRMED_BEFORE");
    for (const r of ["OPEN", "NONE", "ACCEPTED", "REJECTED"] as const) expect(confirmationFact(withResponse(r), "BULLISH", "SHORT"), r).toBe("NOT_YET_CONFIRMED");
  });
  it("SILENT: no context, a context saved before the field existed, or no recorded side — never guessed", () => {
    expect(confirmationFact(null, "BULLISH", "LONG")).toBe("SILENT");
    expect(confirmationFact(withResponse(undefined), "BULLISH", "LONG")).toBe("SILENT");
    expect(confirmationFact(withResponse("REJECTED"), "BULLISH", null)).toBe("SILENT");
    expect(confirmationFact(withResponse("REJECTED"), "BULLISH", undefined)).toBe("SILENT");
  });
});

describe("the stored answer is the engine's, as of the decision", () => {
  it("every sample context carries one of the engine's words, and matches the reference's own interaction count", () => {
    for (let i = 0; i < f.entries.length; i++) {
      const c = ctxOf(i), ref = f.entries[i].fvgRef;
      expect(["REJECTED", "ACCEPTED", "TRADED_THROUGH", "NONE", "OPEN", "NO_TOUCH"]).toContain(c.responseAsOf);
      expect(c.responseAsOf === "NO_TOUCH", ref.objectId).toBe(ref.snapshot.interactionsSoFar === 0);
    }
  });
  it("FUTURE-LEAK: later bars never turn an OPEN answer into a settled one in a stored context", () => {
    for (let i = 0; i < f.entries.length; i++) {
      const ref = f.entries[i].fvgRef;
      const closed = barsClosedBy(BARS, ref.readAsOfMs);
      const fromClosed = fvgContextAtDecision(ref, closed);
      const fromAll = fvgContextAtDecision(ref, BARS);
      expect(fromAll.ok && fromClosed.ok ? fromAll.context.responseAsOf : "x", ref.objectId).toBe(fromClosed.ok ? fromClosed.context.responseAsOf : "y");
    }
  });
  it("the reader keeps a known answer, accepts an older context without one, and drops a context with an unknown word", () => {
    const c = ctxOf(1);
    expect(readJournalFvgContext(JSON.parse(JSON.stringify(c)))).toEqual(c);
    const { responseAsOf: _gone, ...older } = c;
    expect(readJournalFvgContext(older)).toEqual(older);
    expect(readJournalFvgContext({ ...c, responseAsOf: "CONFIRMED" })).toBeNull();
  });
});

describe("Personal Edge: the WAITED dimension", () => {
  it("four groups, always listed; each decision counted once", () => {
    expect(FVG_STUDY_DIMENSIONS).toEqual(["WHEN", "DEPTH", "AGE", "WAITED"]);
    expect(FVG_STUDY_GROUPS.WAITED).toEqual(["Waited for a confirming close", "Entered before a confirming close", "Entered before any touch", "Confirmation not recorded"]);
    const waited = f.studyRows.filter(r => r.dimension === "WAITED");
    expect(waited.map(r => r.group)).toEqual([...FVG_STUDY_GROUPS.WAITED]);
    expect(waited.reduce((s, r) => s + r.trades, 0)).toBe(f.entries.length);
    expect(waited.find(r => r.group === "Confirmation not recorded")!.trades).toBe(0);     // every sample decision has a context and a side
  });
  it("without a stored context or a side the decision is 'Confirmation not recorded' — never placed by guess", () => {
    const e = f.entries[0];
    const rows = fvgStudyList([{ ref: e.fvgRef, result: null, realizedR: 1 }, { ref: e.fvgRef, result: null, realizedR: 1, context: ctxOf(0), side: null }]).filter(r => r.dimension === "WAITED");
    // Before any touch is a fact either source can state (the reference, or the stored answer); a touched gap needs both the answer and the side.
    const untouched = e.fvgRef.snapshot.interaction === "BEFORE_ANY_TOUCH";
    const expected: Record<string, number> = untouched ? { "Entered before any touch": 2 } : { "Confirmation not recorded": 2 };
    for (const r of rows) expect(r.trades, r.group).toBe(expected[r.group] ?? 0);
  });
  it("the ≥ 20 rule: 19 with a recorded R is INSUFFICIENT EVIDENCE, 20 is MEASURED", () => {
    const e = f.entries[0];
    const c = { ...ctxOf(0), responseAsOf: "REJECTED" as const };
    const side = e.fvgRef.snapshot.direction === "BULLISH" ? "LONG" as const : "SHORT" as const;
    const mk = (n: number) => fvgStudyList(Array.from({ length: n }, () => ({ ref: e.fvgRef, result: null, realizedR: 0.5, context: c, side }))).find(r => r.group === "Waited for a confirming close")!;
    expect(mk(19)).toMatchObject({ trades: 19, rState: "INSUFFICIENT EVIDENCE" });
    expect(mk(19).line).toMatch(/^19 decisions\. Result: INSUFFICIENT EVIDENCE — 19 of 20 with a recorded R\./);
    expect(mk(20)).toMatchObject({ trades: 20, rState: "MEASURED", meanR: 0.5 });
    expect(mk(20).line).toMatch(/^20 decisions\. Result: mean 0\.5R over 20\./);
  });
  it("waitedGroupOf maps each fact to its group", () => {
    expect(waitedGroupOf("CONFIRMED_BEFORE")).toBe("Waited for a confirming close");
    expect(waitedGroupOf("NOT_YET_CONFIRMED")).toBe("Entered before a confirming close");
    expect(waitedGroupOf("NO_TOUCH_YET")).toBe("Entered before any touch");
    expect(waitedGroupOf("SILENT")).toBe("Confirmation not recorded");
  });
});
