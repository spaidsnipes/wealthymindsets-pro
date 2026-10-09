/**
 * Profile Personal Edge · departures with their lesson doors (design call 2026-10-09): a door only at a
 * sufficient sample, through the journal's own mapping; no door and the reason while INSUFFICIENT EVIDENCE.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/profile", useSearchParams: () => new URLSearchParams() }));

import { PLAN_ADHERENCE_EMPTY_LINE } from "@/components/journal/PlanAdherenceBySetup";
import { journalFixture } from "@/lib/journal/journalProofFixture";
import { DEPARTURES, departureRows } from "@/lib/journal/planAdherence";
import { lessonForFinding } from "@/lib/journal/planLoop";
import type { PlanVsActualResult } from "@/lib/journal/planVsActual";
import { DepartureLessonRowsFor, noDepartureLine } from "./DepartureLessonRows";

const f = journalFixture();
const sample = (n: number) => f.entries.slice(0, n).map(e => f.planResults[e.id]);
const result = (id: string, departures: string[], decidable = true): PlanVsActualResult => ({
  decisionId: id, findings: departures.map(d => ({ id: d })) as never, primary: (departures[0] ?? "PLAN_FOLLOWED") as never,
  exitDecidable: decidable, hindsightRisk: false, emotionalReason: "unknown", emotionalReasonSource: "NOT RECORDED",
});
const html = (rs: readonly PlanVsActualResult[]) => renderToStaticMarkup(<DepartureLessonRowsFor results={rs} />).replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

describe("departureRows — the count, the sample, and the door", () => {
  it("below 20 decided: every row is INSUFFICIENT EVIDENCE, has NO door, and says why with the count", () => {
    const rows = departureRows(sample(7));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.state).toBe("INSUFFICIENT EVIDENCE");
      expect(r.door).toBeNull();
      expect(r.decided).toBe(7);
      expect(r.why).toBe("INSUFFICIENT EVIDENCE — 7 of 20 decided trades so far, so no lesson is suggested from a sample this small.");
      expect(r.line).not.toMatch(/%/);                    // a count, never a rate
    }
  });
  it("at 20 or more decided: MEASURED, a rate, and the door from the JOURNAL's mapping (not a copy)", () => {
    const rows = departureRows(sample(24));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.state).toBe("MEASURED");
      expect(r.decided).toBe(24);
      expect(r.why).toBeNull();
      expect(r.door).toEqual(lessonForFinding(r.id));
      expect(r.door!.label).toMatch(/^Lesson \d+ · /);
      expect(r.line).toMatch(/ on \d+ of 24 decided trades \(\d+%\)\.$/);
      expect(DEPARTURES).toContain(r.id);
    }
    expect(rows.map(r => r.count)).toEqual([...rows.map(r => r.count)].sort((a, b) => b - a));   // most frequent first
  });
  it("exactly at the threshold: 19 → no door, 20 → door", () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => result(`d${i}`, i < 3 ? ["MOVED_STOP_WITHOUT_PLAN_BASIS"] : []));
    expect(departureRows(mk(19))[0]).toMatchObject({ count: 3, decided: 19, state: "INSUFFICIENT EVIDENCE", door: null });
    expect(departureRows(mk(20))[0]).toMatchObject({ count: 3, decided: 20, state: "MEASURED", line: "Moved stop without plan basis on 3 of 20 decided trades (15%)." });
    expect(departureRows(mk(20))[0].door).toEqual(lessonForFinding("MOVED_STOP_WITHOUT_PLAN_BASIS"));
  });
  it("undecidable trades and by-plan behaviours are never counted as departures; one trade counts once per kind", () => {
    const rows = departureRows([
      result("a", ["MOVED_TARGET", "MOVED_TARGET"]), result("b", ["MOVED_TARGET"], false), result("c", ["REDUCED_PER_PLAN", "PLAN_FOLLOWED"]),
      { ...result("d", ["MOVED_TARGET"]), decisionId: null },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "MOVED_TARGET", count: 1, decided: 2 });
  });
});

describe("the rows on the profile", () => {
  it("7-trade sample: rows with the reason, and not one lesson link", () => {
    const h = html(sample(7));
    expect(h).toContain('data-testid="edge-departures"');
    expect(h.match(/data-testid="edge-departure-row" data-state="INSUFFICIENT EVIDENCE"/g)?.length ?? 0).toBeGreaterThan(0);
    expect(h).not.toContain('data-testid="edge-departure-study"');
    expect(h).toContain("so no lesson is suggested from a sample this small.");
  });
  it("24-trade sample: every row carries 'Study: Lesson N · title →' to /education", () => {
    const h = html(sample(24));
    const rows = h.match(/data-testid="edge-departure-row" data-state="MEASURED"/g) ?? [];
    const doors = h.match(/data-testid="edge-departure-study"[^>]*href="\/education\?lesson=fvg-\d+"[^>]*>Study: Lesson \d+ · [^<]+ →<\/a>/g) ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(doors).toHaveLength(rows.length);
    expect(h).not.toContain('data-testid="edge-departure-why"');
  });
  it("no frozen plan at all → the journal's own empty line; plans but no departure → said with the count", () => {
    expect(html([])).toContain(PLAN_ADHERENCE_EMPTY_LINE);
    expect(html([result("a", []), result("b", [])])).toContain("Departures from your plans: none found in 2 decided trades.");
    expect(noDepartureLine(0)).toMatch(/no trade with a frozen plan could be compared yet/);
    expect(noDepartureLine(1)).toBe("Departures from your plans: none found in 1 decided trade.");
  });
  it("no verdict about the trader in any row", () => {
    const text = [...departureRows(sample(24)), ...departureRows(sample(7))].flatMap(r => [r.line, r.why ?? "", r.door?.label ?? ""]).join(" ");
    expect(text.length).toBeGreaterThan(200);
    expect(text).not.toMatch(/\b(afraid|fear\w*|greed\w*|impatien\w*|impulsiv\w*|undisciplined|should have|mistake|bad|poor|weak)\b/i);
  });
});

describe("one mapping, one reader, wired", () => {
  const read = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");
  it("the door comes from planLoop.lessonForFinding — no second lesson table", () => {
    const adherence = read("lib/journal/planAdherence.ts");
    expect(adherence).toContain("door: measured ? lessonForFinding(id) : null,");
    for (const f2 of ["lib/journal/planAdherence.ts", "components/profile/DepartureLessonRows.tsx"]) {
      expect(read(f2), f2).not.toMatch(/fvg-\d+|\/education\?lesson/);
    }
  });
  it("the profile mounts it; the proof scene shows it for the 7 and 24 books; the Ledger analytics share the one reader", () => {
    expect(read("app/profile/page.tsx")).toContain("<DepartureLessonRows />");
    expect(read("components/profile/ProfileProofScene.tsx")).toContain("<DepartureLessonRowsFor results={departureSample(b.size)} />");
    const fa = read("components/journal/FounderAnalytics.tsx");
    expect(fa).toContain("readPlanResultsFromJournal()");
    expect(fa).not.toContain("function readPlanReviews(");
    const reader = read("components/journal/usePlanResults.ts");
    expect(reader.length).toBeGreaterThan(800);
    expect(reader).not.toMatch(/setItem\(|removeItem\(|fetch\(/);
  });
});
