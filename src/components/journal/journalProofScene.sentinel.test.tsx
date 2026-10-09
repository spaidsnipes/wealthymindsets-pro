/**
 * /journal?scene=journal-fixture — the proof scene writes NOTHING and shows
 * only for a signed-in trader with the token (coordinator order 2026-10-07).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { proofFixtureScene, parseProofScene, NO_PROOF_SCENE } from "@/lib/chart/proofScene";
import { JOURNAL_FIXTURE_BANNER, JOURNAL_FIXTURE_SYMBOL, journalFixture } from "@/lib/journal/journalProofFixture";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/journal", useSearchParams: () => new URLSearchParams() }));

const read = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");

describe("journal proof scene — sample data, read-only, token-gated", () => {
  it("the token parses through the proofScene owner; it is not a chart proof scene", () => {
    expect(proofFixtureScene("?scene=journal-fixture")).toBe("journal-fixture");
    expect(proofFixtureScene("?scene=clean")).toBeNull();
    expect(proofFixtureScene("")).toBeNull();
    expect(parseProofScene("?scene=journal-fixture")).toEqual(NO_PROOF_SCENE);
  });

  it("the fixture is deterministic, synthetic and built from the one engine", () => {
    const a = journalFixture();
    expect(a.entries.length).toBe(24);
    expect(a.entries.every(e => e.id.startsWith("SAMPLE-") && e.symbol === JOURNAL_FIXTURE_SYMBOL)).toBe(true);
    expect(a.entries.every(e => e.fvgRef.objectId.startsWith(`FVG|${JOURNAL_FIXTURE_SYMBOL}|5m|`))).toBe(true);
    expect(Object.keys(a.review)).toHaveLength(24);
    expect(a.counterfactual.claim).toBe("DESCRIPTIVE — not evidence of edge");
    expect(a.examples.length).toBe(24);
    expect(a.examples.every(x => x.href.startsWith("/journal?scene=journal-fixture#SAMPLE-"))).toBe(true);
    expect(journalFixture()).toBe(a);
  });

  it("every sample decision carries a synthetic plan frozen at a sample send; 20 + 4 split → MEASURED + INSUFFICIENT; findings vary", () => {
    const a = journalFixture();
    expect(a.entries.every(e => e.plan.frozenAt === "TICKET_SEND" && e.plan.base.decisionId.startsWith("SAMPLE-DEC-") && e.plan.frozenAtMs < e.entryAtMs)).toBe(true);
    expect(a.entries.filter(e => e.plan.amendments.length).length).toBe(6);
    expect(a.entries.filter(e => e.plan.amendments.every(x => x.newEvidence?.startsWith("sample:"))).length).toBe(24);
    expect(a.adherence.map(r => [r.setup, r.sample, r.state])).toEqual([["SAMPLE gap reclaim", 20, "MEASURED"], ["SAMPLE gap fade", 4, "INSUFFICIENT EVIDENCE"]]);
    const ids = new Set(Object.values(a.planResults).flatMap(r => r.findings.map(f => f.id)));
    for (const id of ["PLAN_FOLLOWED", "EXITED_BEFORE_PLANNED_CONDITION", "EXITED_AFTER_THESIS_INVALIDATION", "HELD_THROUGH_INVALIDATION", "MOVED_STOP_WITHOUT_PLAN_BASIS", "PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE"]) expect(ids.has(id as never), id).toBe(true);
    expect(Object.values(a.planResults).every(r => r.emotionalReason === "unknown")).toBe(true);
  });

  it("a link's fragment lands ON its sample decision: every example href names an id the Review can show", async () => {
    const { fixtureAnchorId, shownFixtureEntries, JOURNAL_FIXTURE_SHOWN } = await import("@/lib/journal/journalProofFixture");
    const a = journalFixture();
    expect(JOURNAL_FIXTURE_SHOWN).toBe(6);
    // Every "Show me my examples" link points at an id the fixture has — and that id is rendered when asked for.
    for (const x of a.examples) {
      const id = fixtureAnchorId(x.href.slice(x.href.indexOf("#")), a.entries);
      expect(id, x.href).not.toBeNull();
      expect(shownFixtureEntries(a.entries, id).some(e => e.id === id), x.href).toBe(true);
    }
    // The case the education lane found: #SAMPLE-24 is past the first six — it is appended, not dropped.
    expect(fixtureAnchorId("#SAMPLE-24", a.entries)).toBe("SAMPLE-24");
    const shown = shownFixtureEntries(a.entries, "SAMPLE-24");
    expect(shown.map(e => e.id)).toEqual(["SAMPLE-1", "SAMPLE-2", "SAMPLE-3", "SAMPLE-4", "SAMPLE-5", "SAMPLE-6", "SAMPLE-24"]);
    // One of the first six adds nothing; an unknown or empty fragment names nothing.
    expect(shownFixtureEntries(a.entries, "SAMPLE-3")).toHaveLength(6);
    expect(shownFixtureEntries(a.entries, null)).toHaveLength(6);
    expect(fixtureAnchorId("#SAMPLE-99", a.entries)).toBeNull();
    expect(fixtureAnchorId("", a.entries)).toBeNull();
    expect(fixtureAnchorId("#%E0%A4%A", a.entries)).toBeNull();          // a malformed fragment never throws
    const scene = read("components/journal/JournalProofScene.tsx");
    expect(scene).toContain("const shown = shownFixtureEntries(f.entries, anchorId);");
    expect(scene).toContain('window.addEventListener("hashchange", read);');
    // Serving 0dd1130 showed two misses, both fixed: "center" left a tall decision's top off-screen, and the
    // in-page sample door fired no hashchange.
    expect(scene).toContain('el.scrollIntoView({ block: "start" });');
    expect(scene).not.toContain('block: "center"');
    expect(scene).toContain("onClickCapture={onDoor}");
    expect(scene).toContain("const late = window.setTimeout(read, 400);");
    expect(scene).toContain('data-anchored={e.id === anchorId ? "yes" : "no"}');
    expect(scene).toContain('data-testid="journal-proof-anchored"');
  });

  it("rendering the scene makes ZERO storage writes and ZERO network calls; the banner is on screen", async () => {
    const setItem = vi.fn();
    const fetchSpy = vi.fn();
    vi.stubGlobal("localStorage", { getItem: () => null, setItem, removeItem: setItem, clear: setItem, key: () => null, length: 0 });
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const { JournalProofScene } = await import("./JournalProofScene");
      const html = renderToStaticMarkup(React.createElement(JournalProofScene));
      expect(html).toContain(JOURNAL_FIXTURE_BANNER);
      expect(html).toContain('data-testid="journal-proof-review"');
      expect(html).toContain('data-testid="plan-fvg"');
      expect(html).toContain('data-testid="journal-proof-edge"');
      expect(html).toContain('data-testid="journal-proof-academy"');
      expect(html).toContain('data-testid="fvg-example-link"');
      expect(html).not.toContain('data-testid="plan-fvg-load"');
      // Management: the three columns, the deviation lines and the plan-alone line on every shown
      // decision; adherence by setup with one MEASURED and one INSUFFICIENT row; no plan card, no
      // price-path loader, no delete — read only.
      expect(html.match(/data-testid="plan-sheriff-market"/g)?.length).toBe(8);   // 6 sample decisions + the tastytrade and Webull readback stories
      expect(html).toContain('data-testid="plan-sheriff-planned"');
      expect(html).toContain('data-testid="plan-sheriff-actual"');
      expect(html).toContain('data-testid="plan-deviations"');
      expect(html).toContain('data-testid="plan-alone"');
      expect(html).toMatch(/data-testid="plan-adherence-by-setup"/);
      expect(html).toMatch(/data-state="MEASURED"[^>]*>\s*<b[^>]*>SAMPLE gap reclaim<\/b>/);
      expect(html).toMatch(/data-state="INSUFFICIENT EVIDENCE"[^>]*>\s*<b[^>]*>SAMPLE gap fade<\/b>/);
      expect(html).not.toContain('data-testid="plan-card"');
      expect(html).not.toContain('data-testid="plan-path-load"');
      expect(html).not.toContain('data-testid="plan-erase"');
      // ONE labelled sample door (2026-10-09): the first sample decision only, with its note.
      expect(html.match(/data-testid="review-ask-spaidbot"/g) ?? []).toHaveLength(1);
      expect(html.match(/data-testid="review-ask-sample-note"/g) ?? []).toHaveLength(1);
      expect(html).toContain("Nothing is sent unless you press Send yourself.");
      expect(html.indexOf('data-testid="review-ask-spaidbot"')).toBeLessThan(html.indexOf('id="SAMPLE-2"'));
      // §26: the eleven management behaviours, one sample trade each, every one found by its class.
      expect(html).toContain('data-testid="journal-proof-behaviours"');
      expect(html.match(/data-testid="journal-proof-behaviour"/g) ?? []).toHaveLength(11);
      expect(html.match(/data-found="yes"/g) ?? []).toHaveLength(11);
      for (const label of ["Took profit before planned condition", "Changed orders repeatedly without plan basis", "Reduced according to plan", "Moved to breakeven according to rule", "Walked away after protection, according to plan", "Moved target without plan basis"]) expect(html, label).toContain(label);
      expect(html).not.toMatch(/impulsiv/i);
      // §41: the two Review questions — the sample book (counts, INSUFFICIENT) and the 48-decision set (MEASURED).
      expect(html).toContain('data-testid="journal-proof-q41-book"');
      expect(html.match(/data-testid="fvg-fill-targets" data-state="INSUFFICIENT EVIDENCE"/g) ?? []).toHaveLength(1);
      expect(html.match(/data-testid="fvg-fill-targets" data-state="MEASURED"/g) ?? []).toHaveLength(1);
      expect(html.match(/data-testid="fvg-additional-evidence" data-state="MEASURED"/g) ?? []).toHaveLength(1);
      expect(html).toContain("0 of 24 gap decisions with a recorded target planned it at the gap&#x27;s far edge");
      expect(html).not.toMatch(/magnet|belie[fv]|mandatory/i);
      // §64: the Sheriff walkthrough — three sample decisions, six steps each.
      expect(html).toContain('data-testid="journal-proof-walkthrough"');
      expect(html.match(/data-testid="journal-proof-walk"/g) ?? []).toHaveLength(3);
      expect(html.match(/data-testid="journal-proof-walk-step"/g) ?? []).toHaveLength(18);
      expect(html).toContain('data-primary="HELD_THROUGH_INVALIDATION"');
      expect(html).toContain("new evidence: sample: a large seller printed at the gap");
      expect(html.match(/Not recorded\. WM does not fill this in\./g) ?? []).toHaveLength(3);
      // Save → reload of a sample entry in a throwaway in-memory store: 9 rows, all the same, verdict stated — and setItem on the real storage never called (below).
      expect(html).toContain('data-verdict="SAME SNAPSHOT AFTER RELOAD"');
      expect(html.match(/data-testid="journal-proof-roundtrip-row" data-same="yes"/g) ?? []).toHaveLength(10);
      expect(html).toMatch(/Context at the decision \(from \d+ closed bars\): structure /);
      expect(html).not.toContain('data-same="no"');
      // Rows that need a Founder action, on a labelled sample: plan lifecycle (6 steps, all holding), Review from a
      // tastytrade and a Webull readback with their UNKNOWN lines, and auto-capture with provenance per field.
      expect(html).toContain('data-testid="journal-proof-lifecycle" data-all-ok="yes"');
      expect(html.match(/data-testid="journal-proof-lifecycle-step" data-ok="yes"/g) ?? []).toHaveLength(6);
      expect(html.match(/data-testid="journal-proof-broker-story"/g) ?? []).toHaveLength(2);
      expect(html).toContain("UNKNOWN: whether tastytrade&#x27;s same-day order list keeps cancelled or replaced Stop orders");
      expect(html).toContain("UNKNOWN: WM reads Webull fills only");
      expect(html).toContain('data-testid="journal-proof-capture" data-ok="yes"');
      expect(html).toContain('data-testid="captured-facts"');
      expect(html).toContain("BROKER-REPORTED");
      expect(html).toContain("UNREPORTED");
      expect(html.match(/SAMPLE — not your account; nothing is saved, fetched or sent/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(setItem).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("the sample Ask SpaidBot door only pre-fills: pressing it makes ZERO requests (none to /api/spaidbot) and writes nothing", async () => {
    const fetchSpy = vi.fn();
    const setItem = vi.fn();
    const heard: unknown[] = [];
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("localStorage", { getItem: () => null, setItem, removeItem: setItem, clear: setItem, key: () => null, length: 0 });
    vi.stubGlobal("window", { dispatchEvent: (ev: { detail?: unknown }) => { heard.push(ev.detail); return true; }, location: { search: "?scene=journal-fixture" } });
    try {
      const ask = await import("@/lib/ai/spaidbotAsk");
      const { fvgReferenceSentence } = await import("@/lib/journal/fvgDecisionReference");
      const e = journalFixture().entries[0]!;
      const off = ask.registerSpaidbotAskListener();
      const sent = ask.askSpaidbot(ask.reviewDecisionAsk({ question: "What should I look at in this decision?", fvgReferenceSentence: fvgReferenceSentence(e.fvgRef), symbol: e.symbol }));
      off();
      expect(sent).toBe(true);
      expect(heard).toHaveLength(1);
      expect((heard[0] as { prompt: string }).prompt).toContain("My journal referenced this FVG at decision time");
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(fetchSpy.mock.calls.filter(c => String(c[0]).includes("/api/spaidbot"))).toHaveLength(0);
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
    // The door's own code holds no request and no storage: the button and the ask owner.
    for (const f of ["components/ai/AskSpaidbotButton.tsx", "lib/ai/spaidbotAsk.ts"]) {
      expect(read(f), f).not.toMatch(/fetch\(|\/api\/|setItem\(|localStorage|sessionStorage|XMLHttpRequest|sendBeacon/);
    }
    // Only the labelled row has it: read-only rows stay doorless unless the scene names them.
    const row = read("components/journal/BrokerTruthToday.tsx");
    expect(row).toContain("{readOnly && !sampleAskDoor ? null : <AskSpaidbotButton");
    expect(row).toContain("{!composed && fvg && !readOnly ? <AskSpaidbotButton");
    expect(read("components/journal/JournalProofScene.tsx").match(/sampleAskDoor/g)).toHaveLength(1);
    expect(read("components/journal/JournalProofScene.tsx")).toContain("sampleAskDoor={i === 0}");
  });

  it("the scene path has no write in its source; the Review rows are readOnly; the switch needs token AND a signed-in trader", () => {
    for (const f of ["components/journal/JournalProofScene.tsx", "lib/journal/journalProofFixture.ts", "lib/journal/managementBehaviours.ts", "lib/journal/planFvgFillTargets.ts", "lib/journal/managementWalkthrough.ts", "lib/journal/journalRoundTrip.ts"]) {
      const src = read(f);
      expect(src.length).toBeGreaterThan(500);
      expect(src, f).not.toMatch(/setItem\(|localStorage|sessionStorage|fetch\(|method:\s*"POST"|indexedDB|writeStoryReview/);
    }
    expect(read("components/journal/JournalProofScene.tsx")).toMatch(/<StoryReviewRow [^>]*readOnly/);
    const row = read("components/journal/BrokerTruthToday.tsx");
    expect(row).toContain("const save = (next: StoryReview) => { if (readOnly) return;");
    expect(row).toContain("{fvgRef && !fvgLoaded && !readOnly ? (");
    const page = read("app/journal/page.tsx");
    expect(page).toMatch(/proofFixtureScene\(`\?\$\{sp\.toString\(\)\}`\) === "journal-fixture" && !!sceneUser/);
    expect(page).toContain("return fixture ? <JournalProofScene /> : <JournalPageInner />;");
  });
});
