/** §29 — the trader's own labels: only he chooses, never inferred, counted beside the departure, MEASURED at ≥ 20, cleared by erasure. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SelfReportChooser } from "@/components/journal/SelfReportChooser";
import { erasePlanForDecision } from "./managementPlanErase";
import { freezePlanSnapshot } from "./managementPlan";
import { freezePlanOnce } from "./managementPlanStore";
import { composePlanReview } from "./planReview";
import type { PlanVsActualResult } from "./planVsActual";
import { readSelfReport, SELF_REPORT_ASK, SELF_REPORT_LABELS, SELF_REPORT_RULE, selfReportByDeparture, selfReportLine, toggleSelfReport, type SelfReportId } from "./selfReport";
import { parseStoryReviews, STORY_REVIEW_STORAGE_KEY } from "./storyReview";

const SRC = path.resolve(__dirname, "../..");
const result = (id: string, departures: string[], decidable = true): PlanVsActualResult => ({
  decisionId: id, findings: departures.map(d => ({ id: d })) as never, primary: (departures[0] ?? "PLAN_FOLLOWED") as never,
  exitDecidable: decidable, hindsightRisk: false, emotionalReason: "unknown", emotionalReasonSource: "NOT RECORDED",
});
const EARLY = "EXITED_BEFORE_PLANNED_CONDITION";

describe("the labels and the trader's press", () => {
  it("the eight the order names, in its order", () => {
    expect(SELF_REPORT_LABELS.map(l => l.words)).toEqual(["fear", "impatience", "FOMO", "revenge", "over-management", "hesitation", "overconfidence", "a deliberate change of plan"]);
  });
  it("a press adds a label, a second press takes it off; unknown or repeated values are dropped", () => {
    expect(toggleSelfReport(undefined, "FEAR")).toEqual(["FEAR"]);
    expect(toggleSelfReport(["FEAR"], "IMPATIENCE")).toEqual(["FEAR", "IMPATIENCE"]);
    expect(toggleSelfReport(["FEAR", "IMPATIENCE"], "FEAR")).toEqual(["IMPATIENCE"]);
    expect(readSelfReport(["IMPATIENCE", "IMPATIENCE", "LAZY", 7, null, "FEAR"])).toEqual(["FEAR", "IMPATIENCE"]);
    expect(readSelfReport("FEAR")).toEqual([]);
    expect(readSelfReport(undefined)).toEqual([]);
  });
  it("the line says what the trader LABELLED — and says nothing when he has not", () => {
    expect(selfReportLine(["IMPATIENCE", "FEAR"])).toBe("You labelled this: fear, impatience.");
    expect(selfReportLine([])).toBeNull();
    expect(selfReportLine(undefined)).toBeNull();
  });
});

describe("never inferred: a review with no label gets none, whatever the trade did", () => {
  it("composePlanReview never returns or sets a label; the classifier has no access to them", () => {
    const plan = freezePlanSnapshot({ decisionId: "d", frozenAt: "TICKET_SEND", atMs: 0, source: "t", plan: { direction: "LONG", entryPx: 100, stopPx: 98, targetPx: 104 } })!;
    const r = composePlanReview({ plan, actuals: { direction: "LONG", entry: { atMs: 1000, px: 100, qty: 1 }, exits: [{ atMs: 200_000, px: 100.4, qty: 1 }], adds: [], stopMoves: [], targetMoves: [], source: "t" }, path: { barMs: 60_000, source: "t", bars: [0, 1, 2, 3].map(i => ({ t: i * 60_000, l: 99.5, h: 100.6, c: 100 })) } });
    expect(JSON.stringify(r)).not.toMatch(/selfReport|"FEAR"|"IMPATIENCE"|"FOMO"|"REVENGE"/);
    for (const f of ["lib/journal/planVsActual.ts", "lib/journal/planReview.ts", "lib/journal/planSheriff.ts", "lib/journal/planAdherence.ts", "lib/ai/spaidbotPlanReview.ts"]) {
      expect(readFileSync(path.join(SRC, f), "utf8"), f).not.toMatch(/selfReport|toggleSelfReport|SELF_REPORT/);
    }
  });
  it("parseStoryReviews keeps only labels that were stored, cleaned; a review without them has no field", () => {
    const all = parseStoryReviews(JSON.stringify({ a: { marks: {}, lesson: "", repeat: "", updatedAt: 1, selfReport: ["IMPATIENCE", "NOPE"] }, b: { marks: {}, lesson: "", repeat: "", updatedAt: 1 } }));
    expect(all.a.selfReport).toEqual(["IMPATIENCE"]);
    expect("selfReport" in all.b).toBe(false);
  });
});

describe("counted beside the departure — a share only at ≥ 20", () => {
  const rows = (n: number, labelEvery: number, label: SelfReportId = "IMPATIENCE") =>
    Array.from({ length: n }, (_, i) => ({ result: result(`d${i}`, [EARLY]), labels: i % labelEvery === 0 ? [label] : [] }));
  it("19 trades with the departure: counts only, INSUFFICIENT EVIDENCE, no percentage", () => {
    const [r] = selfReportByDeparture(rows(19, 2));
    expect(r).toMatchObject({ departure: EARLY, trades: 19, labelled: 10, state: "INSUFFICIENT EVIDENCE" });
    expect(r.line).toBe("“Exited before planned condition” on 19 decided trades: you labelled 10 yourself — impatience 10; 9 carry no label. INSUFFICIENT EVIDENCE — 19 of 20 for a share.");
    expect(r.line).not.toMatch(/%/);
  });
  it("20 trades: MEASURED, each label with its share of that departure", () => {
    const mixed = [...rows(20, 2), ].map((x, i) => (i === 1 ? { ...x, labels: ["FEAR" as const, "IMPATIENCE" as const] } : x));
    const [r] = selfReportByDeparture(mixed);
    expect(r).toMatchObject({ trades: 20, labelled: 11, state: "MEASURED" });
    expect(r.line).toBe("Of 20 decided trades with “exited before planned condition”, you labelled 11 yourself — impatience 11 (55%), fear 1 (5%); 9 carry no label.");
  });
  it("a departure nobody labelled still shows — silence is visible, not hidden", () => {
    const [r] = selfReportByDeparture(Array.from({ length: 3 }, (_, i) => ({ result: result(`d${i}`, ["MOVED_TARGET"]) })));
    expect(r.line).toBe("“Moved target without plan basis” on 3 decided trades: you labelled none. INSUFFICIENT EVIDENCE — 3 of 20 for a share.");
  });
  it("labels on trades WITHOUT a departure, or on undecidable trades, are not counted against any departure", () => {
    expect(selfReportByDeparture([{ result: result("a", []), labels: ["FEAR"] }, { result: result("b", [EARLY], false), labels: ["FEAR"] }, { result: { ...result("c", [EARLY]), decisionId: null }, labels: ["FEAR"] }])).toEqual([]);
  });
  it("no verdict word in any line — only 'you labelled'", () => {
    const text = [...selfReportByDeparture(rows(25, 3)), ...selfReportByDeparture(rows(5, 1, "REVENGE"))].map(r => r.line).join(" ");
    expect(text).toMatch(/you labelled/);
    expect(text).not.toMatch(/\b(you were|you felt|because of|caused by|should have|mistake|problem|weakness|tendency|you tend)\b/i);
  });
});

describe("erasure clears the labels with the plan", () => {
  it("erasePlanForDecision removes the trader's labels and the why; marks and lesson stay", () => {
    const m = new Map<string, string>();
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
    freezePlanOnce(st, freezePlanSnapshot({ decisionId: "wmd_e", frozenAt: "TICKET_SEND", atMs: 1, source: "t", plan: { direction: "LONG", stopPx: 1 } }));
    st.setItem(STORY_REVIEW_STORAGE_KEY, JSON.stringify({ wmd_e: { marks: { READ: "HELD" }, lesson: "keep", repeat: "", updatedAt: 2, selfReport: ["FOMO"] }, other: { marks: {}, lesson: "", repeat: "", updatedAt: 2, selfReport: ["FEAR"] } }));
    const receipt = erasePlanForDecision(st, "wmd_e");
    expect(receipt).toEqual({ planRemoved: true, planWhyCleared: 1 });
    const after = parseStoryReviews(st.getItem(STORY_REVIEW_STORAGE_KEY));
    expect(after.wmd_e.selfReport).toBeUndefined();
    expect(after.wmd_e.lesson).toBe("keep");
    expect(after.wmd_e.marks).toEqual({ READ: "HELD" });
    expect(after.other.selfReport).toEqual(["FEAR"]);          // another decision's labels are untouched
  });
});

describe("the chooser: not on the glass until asked; nothing pre-selected; read-only cannot press", () => {
  const html = (p: Partial<React.ComponentProps<typeof SelfReportChooser>>) => renderToStaticMarkup(<SelfReportChooser labels={undefined} onChange={() => {}} {...p} />);
  it("closed by default: one quiet button, and NOT ONE label word in the markup", () => {
    const h = html({});
    expect(h).toContain(SELF_REPORT_ASK);
    expect(h).toContain('data-open="no"');
    for (const l of SELF_REPORT_LABELS) expect(h, l.words).not.toContain(`>${l.words}<`);
    expect(h).not.toContain('data-testid="self-report-chip"');
  });
  it("open: eight chips, none pressed, and the rule in the trader's sight", () => {
    const h = html({ startOpen: true });
    expect(h.match(/data-testid="self-report-chip"/g) ?? []).toHaveLength(8);
    expect(h).not.toContain('aria-pressed="true"');
    expect(h).toContain(SELF_REPORT_RULE);
  });
  it("his chosen label shows as pressed and as his line; read-only disables the chips and hides the opener", () => {
    const h = html({ startOpen: true, labels: ["IMPATIENCE"], readOnly: true });
    expect(h.match(/aria-pressed="true"/g) ?? []).toHaveLength(1);
    expect(h).toContain("You labelled this: impatience.");
    expect(h).toMatch(/<fieldset data-testid="self-report-chips" disabled=""/);
    expect(html({ readOnly: true })).not.toContain(SELF_REPORT_ASK);
  });
});

describe("ONE OWNER OF THE WORDS — sentinel", () => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
  };
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const files = [...walk(path.join(SRC, "lib/journal")), ...walk(path.join(SRC, "components/journal")), ...walk(path.join(SRC, "components/profile")), ...walk(path.join(SRC, "lib/ai"))];
  it("scans real material", () => { expect(files.length).toBeGreaterThan(80); });
  it("no other journal / review / profile / SpaidBot source file carries a label word in a string", () => {
    const WORD = /\b(fear|impatience|FOMO|revenge|over-management|hesitation|overconfidence)\b/i;
    const offenders: string[] = [];
    for (const f of files) {
      const rel = path.relative(SRC, f).split(path.sep).join("/");
      if (rel === "lib/journal/selfReport.ts") continue;
      // The journal entry's own MOOD field (older than §29) is also chosen by the trader on his entry form;
      // its option values are data in the entry's shape, not a reading WM makes. Named here, not waved through.
      const moodValue = rel === "lib/journal/hydrateJournalEntries.ts" ? /^fomo$/ : null;
      const lits = [...strip(readFileSync(f, "utf8")).matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map(m => m[2]);
      // A label ID used as data by a proof scene is a reference to the owner, not a second copy of the words.
      for (const l of lits) if (WORD.test(l) && !/^(FEAR|IMPATIENCE|FOMO|REVENGE|OVER_MANAGEMENT|HESITATION|OVERCONFIDENCE)$/.test(l) && !(moodValue && moodValue.test(l))) offenders.push(`${rel}: ${l.slice(0, 80)}`);
    }
    expect(offenders).toEqual([]);
  });
  it("a label is SET only from the trader's press: toggleSelfReport is called in one place, inside an onClick", () => {
    const callers = files.filter(f => /toggleSelfReport\(/.test(strip(readFileSync(f, "utf8")))).map(f => path.relative(SRC, f).split(path.sep).join("/")).sort();
    expect(callers).toEqual(["components/journal/SelfReportChooser.tsx", "lib/journal/selfReport.ts"]);
    const chooser = strip(readFileSync(path.join(SRC, "components/journal/SelfReportChooser.tsx"), "utf8"));
    expect(chooser).toContain("onClick={() => onChange(toggleSelfReport(labels, l.id))}");
    const row = strip(readFileSync(path.join(SRC, "components/journal/BrokerTruthToday.tsx"), "utf8"));
    expect(row).toContain("<SelfReportChooser labels={r.selfReport} readOnly={readOnly} onChange={next => save({ ...r, selfReport: next })} />");
    // …and nothing writes `selfReport:` into a review except that save and the store's own cleaner.
    const writers = files.filter(f => /selfReport:\s/.test(strip(readFileSync(f, "utf8")))).map(f => path.relative(SRC, f).split(path.sep).join("/")).sort();
    expect(writers).toEqual(["components/journal/BrokerTruthToday.tsx", "lib/journal/managementPlanErase.ts", "lib/journal/storyReview.ts"]);
  });
});
