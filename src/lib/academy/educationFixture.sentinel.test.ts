/**
 * /education?scene=education-fixture — SAMPLE "Show me my examples" (2026-10-09).
 * Signed-in only, a banner on screen, the member's journal never read, nothing written.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { PROOF_FIXTURE_SCENES, proofFixtureScene } from "@/lib/chart/proofScene";
import { journalFixture } from "@/lib/journal/journalProofFixture";

const ROOT = resolve(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("education-fixture proof scene", () => {
  it("is a named fixture scene", () => {
    expect(PROOF_FIXTURE_SCENES).toContain("education-fixture");
    expect(proofFixtureScene("?scene=education-fixture&lesson=fvg-9")).toBe("education-fixture");
    expect(proofFixtureScene("?lesson=fvg-9")).toBeNull();
  });

  it("the sample examples come through the real selector and every door lands in the journal proof scene", () => {
    const ex = journalFixture().examples;
    expect(ex.length).toBeGreaterThan(0);
    for (const e of ex) {
      expect(e.symbol).toBe("SAMPLE-FVG");
      expect(e.href.startsWith("/journal?scene=journal-fixture#")).toBe(true);
    }
  });

  it("signed-in only; the member's journal is not read in the scene; a banner is on screen", () => {
    const body = read("src/components/education/FvgLessonBody.tsx");
    expect(body).toMatch(/return signedIn && proofFixtureScene\(search\) === "education-fixture";/);
    const fn = body.slice(body.indexOf("function MyExamples()"), body.indexOf("export function FvgExamplesView"));
    // The fixture branch returns before the storage read.
    expect(fn.indexOf("journalFixture().examples")).toBeGreaterThan(-1);
    expect(fn.indexOf("journalFixture().examples")).toBeLessThan(fn.indexOf("readJournalStorage(window.localStorage)"));
    expect(fn).toMatch(/setExamples\(\[\.\.\.journalFixture\(\)\.examples\]\);\s*return;/);
    expect(fn).toMatch(/data-testid="education-proof-banner"/);
    expect(fn).toMatch(/JOURNAL_FIXTURE_BANNER/);
    // No write anywhere in the lesson body.
    expect(body).not.toMatch(/localStorage\.setItem|\.setItem\(/);
  });

  it("Academy progress is not written under the scene", () => {
    const page = read("src/app/education/page.tsx");
    const guard = page.indexOf('if (proofFixtureScene(window.location.search) === "education-fixture") return;');
    const write = page.indexOf("persistAcademyProgress(localStorage, EDU_KEY");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(write);
  });
});
