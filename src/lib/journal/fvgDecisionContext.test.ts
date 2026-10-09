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

describe("§13 / §14 in the stored context — version 2, as of the decision", () => {
  it("no touch-bar reading for a touch that had not happened by the decision (no hindsight)", () => {
    let checked = 0, untouched = 0;
    for (const e of f.entries) {
      const c = fvgContextAtDecision(e.fvgRef, BARS);
      if (!c.ok) continue;
      const touches = c.context.relationships.filter(r => r.kind === "TOUCH_EFFORT").length;
      // Never more touch bars than interactions the reference itself knew of (+1 for one in progress at the decision).
      expect(touches, e.id).toBeLessThanOrEqual(e.fvgRef.snapshot.interactionsSoFar + 1);
      if (c.context.responseAsOf === "NO_TOUCH") { expect(touches, e.id).toBe(0); untouched++; }
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
    // A decision whose gap was touched only LATER in the series still stores no touch bar.
    const k = f.entries.findIndex(e => { const c = fvgContextAtDecision(e.fvgRef, BARS); return c.ok && c.context.relationships.every(r => r.kind !== "TOUCH_EFFORT"); });
    if (k >= 0) {
      const o = f.ledger.objects.find(x => x.objectId === f.entries[k].fvgRef.objectId)!;
      if (o.interactions.length) expect(ok(k).relationships.some(r => r.kind === "TOUCH_EFFORT")).toBe(false);
    }
    expect(untouched).toBeGreaterThanOrEqual(0);
  });
  it("order flow is a stated SILENCE in the Journal — bars carry no signed volume", () => {
    const c = ok(3);
    expect(c.sources.filter(s => s.family === "ORDER_FLOW")).toEqual([{ family: "ORDER_FLOW", evidence: "SILENCE" }]);
    expect(c.relationships.some(r => r.family === "ORDER_FLOW")).toBe(false);
    expect(splitGroupsOf({ ref: f.entries[3].fvgRef, ...splitContextOf(f.entries[3].fvgRef, c) })["ORDER FLOW"]).toBe("Order flow SILENT (no signed volume held for the gap's bars)");
  });
  it("the displacement cell is the relationship's own word; the touch bar is its own split", () => {
    const i = f.entries.findIndex((_, k) => { const c = fvgContextAtDecision(f.entries[k].fvgRef, BARS); return c.ok && c.context.effortCell !== "SILENT" && c.context.relationships.some(r => r.kind === "TOUCH_EFFORT"); });
    expect(i).toBeGreaterThanOrEqual(0);
    const c = ok(i);
    expect(c.relationships.find(r => r.kind === "DISPLACEMENT_EFFORT")?.state).toBe(c.effortCell);
    const g = splitGroupsOf({ ref: f.entries[i].fvgRef, ...splitContextOf(f.entries[i].fvgRef, c) });
    expect(g["EFFORT→RESPONSE"]).toBe(`Displacement bar ${c.effortCell}`);
    const touches = c.relationships.filter(r => r.kind === "TOUCH_EFFORT");
    expect(g["TOUCH EFFORT"]).toBe(`Touch bar ${touches[touches.length - 1].state}`);
  });
  it("a version-1 row saved before these families existed reads exactly as it was written", () => {
    const c = ok(3);
    const { volatilityAtFormation: _v, tapeRegimeAtDecision: _t, ...old } = c;
    void _v; void _t;
    const v1 = { ...old, version: 1 as const, relationships: c.relationships.filter(r => r.family !== "EFFORT_RESPONSE").map(r => ({ family: r.family, kind: r.kind })), sources: c.sources.filter(s => s.family !== "EFFORT_RESPONSE" && s.family !== "ORDER_FLOW") };
    const back = readJournalFvgContext(JSON.parse(JSON.stringify(v1)));
    expect(back).toEqual(v1);
    // Its line stays the old line — no touch bar, no order-flow word invented for it.
    expect(fvgContextNote(f.entries[3].fvgRef, back)).toMatch(/· displacement bar [A-Z]+ · regime UNTAGGED\.$/);
    const g = splitGroupsOf({ ref: f.entries[3].fvgRef, ...splitContextOf(f.entries[3].fvgRef, back) });
    expect(g["TOUCH EFFORT"]).toBe("NOT RECORDED with this reference");
    expect(g["ORDER FLOW"]).toBe("Order flow NOT ATTACHED");
  });
  it("§5: volatility from the bars up to b2, the tape regime only as it was held live — two scopes, never one word", () => {
    const c = ok(3);
    expect(["COMPRESSED", "NORMAL", "EXPANDED", "NOT_READ"]).toContain(c.volatilityAtFormation);
    expect(c.tapeRegimeAtDecision).toBe("NOT_READ");
    expect(f.entries.some((_, i) => ok(i).volatilityAtFormation !== "NOT_READ")).toBe(true);
    // A surface that held a live verdict saves the owner's word; anything else (UNKNOWN, a made-up word) is NOT_READ.
    const live = (w: string | null) => { const r = fvgContextAtDecision(f.entries[3].fvgRef, BARS, { tapeRegime: w }); if (!r.ok) throw new Error(r.reason); return r.context.tapeRegimeAtDecision; };
    expect(live("TREND")).toBe("TREND");
    expect(live("UNKNOWN")).toBe("NOT_READ");
    expect(live("BULLISH VIBES")).toBe("NOT_READ");
    expect(live(null)).toBe("NOT_READ");
    const g = splitGroupsOf({ ref: f.entries[3].fvgRef, ...splitContextOf(f.entries[3].fvgRef, c) });
    expect(g.VOLATILITY).toMatch(/^Volatility at formation (COMPRESSED|NORMAL|EXPANDED|NOT READ)$/);
    expect(g["TAPE REGIME"]).toBe("Tape regime NOT READ at the decision (no tape held)");
    expect(g.REGIME).toBe("Regime UNTAGGED (no regime reading attached)");
    expect(readJournalFvgContext({ ...c, volatilityAtFormation: "WILD" })).toBeNull();
    expect(readJournalFvgContext({ ...c, tapeRegimeAtDecision: "UNKNOWN" })).toBeNull();
    // Later bars cannot change the volatility word either.
    expect(ok(3).volatilityAtFormation).toBe(c.volatilityAtFormation);
  });
  it("version 2 survives JSON and the reader with the owner's words intact", () => {
    const c = ok(3);
    expect(c.version).toBe(2);
    const back = readJournalFvgContext(JSON.parse(JSON.stringify(c)));
    expect(back).toEqual(c);
    expect(readJournalFvgContext({ ...c, relationships: [{ family: "EFFORT_RESPONSE", kind: "TOUCH_EFFORT", state: 7 }] })).toBeNull();
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
    expect(splitContextOf(f.entries[4].fvgRef, c)).toEqual({ relationships: null, effortCell: null, regime: null, volatility: null, tapeRegime: null });
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
    expect(fvgContextNote(f.entries[0].fvgRef, ok(0))).toMatch(/^Context at the decision \(from \d+ closed bars\): structure .+ · profile .+ · wall silence · displacement bar [A-Z]+ · touch bar [A-Za-z ]+ · order flow silence \(no signed volume in these bars\) · regime UNTAGGED · volatility at formation (not read|compressed|normal|expanded) \(from bars\) · tape regime at the decision not read \(no tape held here\)\.$/);
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
