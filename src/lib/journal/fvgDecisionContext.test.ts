/** §40: the context a gap decision was taken in, kept with the journal entry — read as of the decision, never later. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { barsClosedBy, contextFor, FVG_CONTEXT_KIND, fvgContextAtDecision, fvgContextNote, readJournalFvgContext, splitContextOf } from "./fvgDecisionContext";
import { hydrateJournalEntries } from "./hydrateJournalEntries";
import { journalFixture, journalFixtureBars } from "./journalProofFixture";
import { fvgContextSplits, splitGroupsOf } from "./planFvgContextSplits";

const f = journalFixture();
const BARS = journalFixtureBars();
const ok = (i: number) => { const r = fvgContextAtDecision(f.entries[i].fvgRef, BARS); if (!r.ok) throw new Error(r.reason); return r.context; };

describe("fvgContextAtDecision — as of the decision", () => {
  it("every sample decision gets a context from the bars that had closed by then", () => {
    let n = 0;
    for (const e of f.entries) {
      const r = fvgContextAtDecision(e.fvgRef, BARS);
      expect(r.ok, e.id).toBe(true);
      if (!r.ok) continue;
      n++;
      const c = r.context;
      expect(c).toMatchObject({ kind: FVG_CONTEXT_KIND, version: 2, objectId: e.fvgRef.objectId, decisionAtMs: e.fvgRef.decisionAtMs, readAsOfMs: e.fvgRef.readAsOfMs });
      expect(c.barsRead).toBe(barsClosedBy(BARS, e.fvgRef.readAsOfMs).length);
      expect(c.barsRead).toBeLessThan(BARS.length);
      expect(c.sources.map(s => s.family).sort()).toEqual(expect.arrayContaining(["PROFILE", "STRUCTURE", "WALL"]));
      expect(c.sources.filter(s => s.family === "WALL").every(s => s.evidence === "SILENCE")).toBe(true);   // bars carry no chain or book
      expect(c.regime).toBe("UNTAGGED");
    }
    expect(n).toBe(24);
  });
  it("FUTURE-LEAK TEST: bars after the decision change nothing — the context from all bars equals the context from only the closed ones", () => {
    for (const i of [0, 5, 11, 23]) {
      const e = f.entries[i];
      const closed = barsClosedBy(BARS, e.fvgRef.readAsOfMs);
      const fromClosed = fvgContextAtDecision(e.fvgRef, closed.concat(BARS.slice(closed.length, closed.length + 1)));   // one unclosed bar present
      const fromAll = fvgContextAtDecision(e.fvgRef, BARS);
      expect(fromAll).toEqual(fromClosed);
      // …and wildly different later bars still change nothing.
      const twisted = BARS.map((b, k) => (k >= closed.length ? { ...b, open: b.open * 3, high: b.high * 3, low: b.low * 3, close: b.close * 3, volume: 999_999 } : b));
      expect(fvgContextAtDecision(e.fvgRef, twisted)).toEqual(fromAll);
    }
  });
  it("refuses rather than guesses: too few bars, or a gap not yet in the closed bars", () => {
    const e = f.entries[0];
    expect(fvgContextAtDecision(e.fvgRef, BARS.slice(0, 2))).toEqual({ ok: false, reason: "Too few closed bars at the decision time to read its context." });
    const early = { ...e.fvgRef, readAsOfMs: BARS[10].asOf, decisionAtMs: BARS[10].asOf };
    const r = fvgContextAtDecision(early, BARS);
    expect(r.ok).toBe(false);
  });
  it("a market with no traded volume has a SILENT displacement cell — never a cell from placeholder volume", () => {
    const e = f.entries[0];
    const fx = { ...e.fvgRef, symbol: "EURUSD", objectId: e.fvgRef.objectId.replace("SAMPLE-FVG", "EURUSD") };
    const bars = BARS.map(b => ({ ...b, symbolId: "EURUSD", barId: b.barId.replace("SAMPLE-FVG", "EURUSD") }));
    const r = fvgContextAtDecision(fx, bars);
    if (r.ok) expect(r.context.effortCell).toBe("SILENT");
    else expect(r.reason.length).toBeGreaterThan(10);
  });
});

describe("stored context: read back whole or not at all", () => {
  it("survives JSON and the reader unchanged", () => {
    const c = ok(3);
    expect(readJournalFvgContext(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });
  it("anything malformed is dropped whole", () => {
    const c = ok(3);
    for (const bad of [null, "FVG = YES", [], { ...c, kind: "X" }, { ...c, version: 3 }, { ...c, objectId: "nope" }, { ...c, effortCell: "GREAT" }, { ...c, regime: "" },
      { ...c, readAsOfMs: c.decisionAtMs + 1 }, { ...c, sources: [{ family: "MOOD", evidence: "x" }] }, { ...c, relationships: "none" }, { ...c, barsRead: Number.NaN }]) {
      expect(readJournalFvgContext(bad), JSON.stringify(bad)?.slice(0, 60)).toBeNull();
    }
  });
  it("a context is only used with the reference it was read with", () => {
    const c = ok(3);
    expect(contextFor(f.entries[3].fvgRef, c)).toBe(c);
    expect(contextFor(f.entries[4].fvgRef, c)).toBeNull();
    expect(contextFor({ ...f.entries[3].fvgRef, decisionAtMs: f.entries[3].fvgRef.decisionAtMs + 1 }, c)).toBeNull();
    expect(splitContextOf(f.entries[4].fvgRef, c)).toEqual({ relationships: null, effortCell: null, regime: null });
  });
  it("the journal's own loader keeps it beside its reference, and drops it when the reference is gone or it is damaged", () => {
    const c = ok(2);
    const entry = (extra: Record<string, unknown>) => ({ id: "x", date: "2026-01-05", symbol: "SAMPLE-FVG", side: "long", entry: 100, exit: 101, size: 1, pnl: 1, pct: 1, tags: [], notes: "", mood: "neutral", result: "win",
      processQuality: "UNRESOLVED", processOutcome: "UNRESOLVED", starred: false, images: [], voiceSec: 0, setup: "S", mistakes: "", lessons: "", emojis: [], ...extra });
    const [both, noRef, damaged] = hydrateJournalEntries([
      entry({ fvgRef: f.entries[2].fvgRef, fvgContext: c }), entry({ id: "y", fvgContext: c }), entry({ id: "z", fvgRef: f.entries[2].fvgRef, fvgContext: { ...c, effortCell: "GREAT" } }),
    ]).entries;
    expect(both.fvgContext).toEqual(c);
    expect(noRef.fvgContext).toBeUndefined();
    expect(damaged.fvgRef).toBeDefined();
    expect(damaged.fvgContext).toBeUndefined();
  });
});

describe("the splits become real on a real book (§23) — and stay NOT RECORDED without a context", () => {
  it("with the stored context: structure / profile / wall / effort / regime are named groups", () => {
    const e = f.entries[0];
    const g = splitGroupsOf({ ref: e.fvgRef, ...splitContextOf(e.fvgRef, ok(0)) });
    for (const d of ["STRUCTURE", "PROFILE", "WALL", "EFFORT→RESPONSE", "REGIME"] as const) expect(g[d], d).not.toBe("NOT RECORDED with this reference");
    expect(g.WALL).toBe("wall owner SILENCE");
    expect(g.REGIME).toBe("Regime UNTAGGED (no regime reading attached)");
  });
  it("without it: NOT RECORDED, exactly as before", () => {
    const g = splitGroupsOf({ ref: f.entries[0].fvgRef, ...splitContextOf(f.entries[0].fvgRef, null) });
    for (const d of ["STRUCTURE", "PROFILE", "WALL", "EFFORT→RESPONSE", "REGIME"] as const) expect(g[d], d).toBe("NOT RECORDED with this reference");
  });
  it("24 decisions with contexts: every dimension still counts each decision once", () => {
    const rows = fvgContextSplits(f.entries.map((e, i) => ({ ref: e.fvgRef, ...splitContextOf(e.fvgRef, ok(i)), realizedR: e.realizedR })));
    for (const d of ["STRUCTURE", "PROFILE", "WALL", "EFFORT→RESPONSE", "REGIME"] as const) {
      expect(rows.filter(r => r.dimension === d).reduce((s, r) => s + r.decisions, 0), d).toBe(24);
      expect(rows.filter(r => r.dimension === d).some(r => r.group.startsWith("NOT RECORDED")), d).toBe(false);
    }
  });
  it("the note the trader reads names each part, or says not recorded", () => {
    expect(fvgContextNote(f.entries[0].fvgRef, null)).toBe("Context at the decision: not recorded with this reference.");
    expect(fvgContextNote(f.entries[0].fvgRef, ok(0))).toMatch(/^Context at the decision \(from \d+ closed bars\): structure .+ · profile .+ · wall silence · displacement bar [A-Z]+ · touch bar [A-Za-z ]+ · order flow silence \(no signed volume in these bars\) · regime UNTAGGED\.$/);
  });
});

describe("wired through the journal", () => {
  const read = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");
  it("the field reads it with the reference and clears it with the reference; the page saves it; Personal Edge reads it", () => {
    const field = read("components/journal/JournalFvgReferenceField.tsx");
    expect(field.length).toBeGreaterThan(3_000);
    expect(field).toContain("const c = fvgContextAtDecision(r.ref, bars.bars);");
    expect(field).toContain("onContext?.(c.ok ? c.context : undefined);");
    expect(field).toContain("onClick={() => { onChange(undefined); onContext?.(undefined); }}");
    const page = read("app/journal/page.tsx");
    expect(page).toContain("onContext={ctx => setForm(f => ({ ...f, fvgContext: ctx }))}");
    expect(read("components/journal/PlanAdherenceBySetup.tsx")).toContain("...splitContextOf(e.fvgRef!, e.fvgContext),");
    expect(read("lib/journal/hydrateJournalEntries.ts")).toContain("readJournalFvgReference(value.fvgRef) && readJournalFvgContext(value.fvgContext)");
  });
  it("the module is pure: no storage, no network", () => {
    const src = read("lib/journal/fvgDecisionContext.ts").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/localStorage|sessionStorage|fetch\(|window\./);
  });
});
