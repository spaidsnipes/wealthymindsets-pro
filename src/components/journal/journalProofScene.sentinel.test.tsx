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
      expect(html).not.toContain('data-testid="review-ask-spaidbot"');
      expect(setItem).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("the scene path has no write in its source; the Review rows are readOnly; the switch needs token AND a signed-in trader", () => {
    for (const f of ["components/journal/JournalProofScene.tsx", "lib/journal/journalProofFixture.ts"]) {
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
