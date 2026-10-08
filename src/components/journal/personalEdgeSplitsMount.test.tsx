/**
 * §23/§24 mounted on the REAL Personal Edge block (PlanAdherenceBySetup → PlanAdherenceView), with
 * honest empty states for a book that has no gap references / no frozen plans yet.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/journal", useSearchParams: () => new URLSearchParams() }));

import { journalFixture } from "@/lib/journal/journalProofFixture";
import { managementCounterfactual } from "@/lib/journal/planManagementCounterfactual";
import { FVG_SPLITS_CONTEXT_NOTE, FVG_SPLITS_EMPTY_LINE, PLAN_ADHERENCE_EMPTY_LINE, PlanAdherenceView } from "./PlanAdherenceBySetup";

const noop = () => {};
const markup = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/&#x27;/g, "'");
const view = (p: Partial<React.ComponentProps<typeof PlanAdherenceView>>) =>
  markup(<PlanAdherenceView rows={[]} fvgRows={[]} edge={null} edgeNote={null} showEdge={false} onCompare={noop} {...p} />);

describe("Personal Edge: context splits + did management help, on the real block", () => {
  it("a book with no frozen plan and no gap reference (the Founder's today): two honest lines, no table, no 0%", () => {
    const html = view({ splits: [], management: null });
    expect(html).toContain(PLAN_ADHERENCE_EMPTY_LINE);
    expect(html).toContain(FVG_SPLITS_EMPTY_LINE);
    expect(html).not.toMatch(/fvg-split-row|management-counterfactual|0%/);
  });
  it("with references and plans: the splits (with the NOT RECORDED note) and the management lines render", () => {
    const f = journalFixture();
    const html = view({ rows: f.adherence, splits: f.splits, management: f.management });
    expect(html.match(/data-testid="fvg-split-row"/g)?.length ?? 0).toBeGreaterThan(9);
    expect(html).toContain(FVG_SPLITS_CONTEXT_NOTE);
    expect(html).toContain('data-testid="management-counterfactual"');
  });
  it("plans but no path loaded: management says INSUFFICIENT with its n, never a guessed plan-alone R", () => {
    const f = journalFixture();
    const m = managementCounterfactual(f.entries.map(e => ({ plan: e.plan, actuals: e.actuals, path: null, result: f.planResults[e.id], realizedR: e.realizedR })));
    expect(m.departed.n).toBe(0);
    const html = view({ rows: f.adherence, splits: [], management: m });
    expect(html).toContain("INSUFFICIENT EVIDENCE — 0 of 20 departed trades with a plan-alone result");
    expect(html).toContain(FVG_SPLITS_EMPTY_LINE);
  });
  it("the live component computes both from the trader's own book (no fetch, no write)", () => {
    const src = readFileSync(path.resolve(__dirname, "PlanAdherenceBySetup.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(2_000);
    expect(src).toContain("setSplits(refd.length ? fvgContextSplits(");
    expect(src).toContain("setManagement(reviewed.length ? managementCounterfactual(");
    expect(src).toContain("splits={splits} management={management} q41={q41}");
    expect(src).toContain("setQ41(gapDs.length ? { fill: fillTargetComparison(gapDs), evidence: additionalEvidenceComparison(gapDs) } : null);");
  });
});
