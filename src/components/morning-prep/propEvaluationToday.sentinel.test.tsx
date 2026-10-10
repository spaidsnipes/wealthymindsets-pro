/**
 * Morning prep · "Prop evaluation · today" (Founder order §7, 2026-10-10):
 * owner only; reads the desk's own record through the desk's reader and
 * engine; the rules, never a target — no dollar amount phrased as something
 * to make today.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/morning-prep", useSearchParams: () => new URLSearchParams() }));

import { EMPTY_PROP_INPUTS, PROP_STORAGE_KIND, formatCents, pct, propSampleInputs, readPropEvaluation, type PropStored } from "@/lib/journal/propEvaluation";
import { PROP_TODAY_EMPTY_LINE, PROP_TODAY_RULES_LINE, PropEvaluationTodayView, propDeskHasEntry } from "./PropEvaluationToday";

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const stored = (inputs = propSampleInputs()): PropStored => ({ kind: PROP_STORAGE_KIND, version: 1, inputs, scenarioRowsCents: [] });

describe("the card", () => {
  it("reads the desk's numbers through the desk's own engine — not a copy", () => {
    const s = stored();
    const r = readPropEvaluation(s.inputs);
    const t = text(renderToStaticMarkup(<PropEvaluationTodayView stored={s} />));
    expect(t).toContain("PROP EVALUATION · TODAY");
    if (r.remainingCents.known) expect(t).toContain(`Remaining requirement ${formatCents(r.remainingCents.value)}`);
    if (r.bestDayShare.known) expect(t).toContain(`Best-day share ${pct(r.bestDayShare.value)}`);
    if (r.minimumFurtherProfitableDays.known) expect(t).toContain(`Fewest further profitable days the arithmetic allows ${r.minimumFurtherProfitableDays.value}`);
    expect(t).toContain("Drawdown headroom");
    expect(t).toContain(PROP_TODAY_RULES_LINE);
  });

  it("UNVERIFIED is said until the trader stamps it; a stamped record says when", () => {
    const un = text(renderToStaticMarkup(<PropEvaluationTodayView stored={stored({ ...propSampleInputs(), verifiedAtMs: null })} />));
    expect(un).toContain("UNVERIFIED — not yet read back from the firm's dashboard");
    const ok = text(renderToStaticMarkup(<PropEvaluationTodayView stored={stored({ ...propSampleInputs(), verifiedAtMs: Date.UTC(2026, 9, 9, 13, 0) })} />));
    expect(ok).toContain("Read back from the firm's dashboard · Oct 9, 9:00 AM EDT");
  });

  it("a drawdown floor that is not known reads UNKNOWN — never guessed", () => {
    const t = text(renderToStaticMarkup(<PropEvaluationTodayView stored={stored({ ...propSampleInputs(), drawdownMethod: "UNKNOWN", drawdownFloorCents: null })} />));
    expect(t).toMatch(/Drawdown headroom UNKNOWN —/);
  });

  it("nothing entered → one line pointing at the desk, no figures", () => {
    for (const s of [null, stored(EMPTY_PROP_INPUTS)]) {
      expect(propDeskHasEntry(s)).toBe(false);
      const t = text(renderToStaticMarkup(<PropEvaluationTodayView stored={s} />));
      expect(t).toContain(PROP_TODAY_EMPTY_LINE);
      expect(t).not.toMatch(/\$\d/);
    }
  });

  it("NO dollar amount is phrased as something to make today", () => {
    const t = text(renderToStaticMarkup(<PropEvaluationTodayView stored={stored()} />));
    // The page's words and the code's strings (comments stripped — they describe the rule).
    const src = read("components/morning-prep/PropEvaluationToday.tsx").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(src.length).toBeGreaterThan(1500);
    for (const s of [t, src]) {
      expect(s).not.toMatch(/\b(make|earn|aim for|go for|need)\b[^.]{0,40}\$\d/i);
      expect(s).not.toMatch(/today'?s? (target|goal|quota)|to make today|need(ed)? today|\$[\d,.]+ today|today'?s? remaining/i);
    }
    expect(t).toContain("These are the rules, not a target for today. No trade is required.");
  });
});

describe("who sees it, and what it touches", () => {
  it("owner only: the door renders nothing unless the server says OWNER; the page mounts it only for a signed-in member", () => {
    const src = read("components/morning-prep/PropEvaluationToday.tsx");
    expect(src.length).toBeGreaterThan(2000);
    expect(src).toContain('if (audience !== "OWNER" || !user?.id || stored === undefined) return null;');
    expect(src).toContain("useBrokerAudience()");
    expect(read("app/morning-prep/page.tsx")).toContain("{ownerId ? <PropEvaluationToday /> : null}");
  });

  it("it reads the desk's own key and reader, and writes nothing", () => {
    const src = read("components/morning-prep/PropEvaluationToday.tsx").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(src).toContain("memberKeyOf(PROP_EVALUATION_BASE_KEY, user.id)");
    expect(src).toContain("readPropStored(");
    expect(src).toContain("readPropEvaluation(");
    expect(src).not.toMatch(/setItem|removeItem|fetch\(|consistencyLimit \*|requiredForLargestCents/);
    // The desk itself is not edited by this lane (the ticket lane owns it).
    expect(src).not.toContain("PropEvaluationDesk");
  });

  it("the prep checklist carries his workflow items, appended after the existing ones (saved checklists unchanged), and the card points at them", () => {
    const page = read("app/morning-prep/page.tsx");
    const starter = /const STARTER_CHECKLIST = \[([\s\S]*?)\];/.exec(page)?.[1] ?? "";
    const items = [...starter.matchAll(/^\s*"([^"]+)",/gm)].map(m => m[1]);
    expect(items.length).toBe(13);
    expect(items.slice(0, 11)).toEqual([
      "Mental state honest — logged mood", "Economic calendar reviewed", "Key levels prepared (support / resistance / VWAP / POC)",
      "Session and hours selected", "Risk per trade set", "Maximum daily loss set", "Market scenario written (best / base / worst)",
      "Primary intention written", "News / catalysts reviewed", "Execution focus chosen (setup type / entry rules)", "Hydration + focus reset (5 min breathwork)",
    ]);
    expect(items.slice(11)).toEqual([
      "Opening range marked (first 5 / 15 minutes) and the plan for a break vs a failure written",
      "Order flow read at the levels (delta / absorption / big trades) — no trade without a read",
    ]);
    const t = text(renderToStaticMarkup(<PropEvaluationTodayView stored={stored()} />));
    expect(t).toContain("Your prep checklist on this page holds the levels (support, resistance, VWAP, POC), the opening range and the order-flow read.");
  });
});
