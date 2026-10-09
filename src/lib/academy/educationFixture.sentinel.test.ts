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

  it("the quiz can be taken in the scene: result on screen, a banner, and no progress or note read or written", () => {
    const page = read("src/app/education/page.tsx");
    // Banner and the pass line are on the page, signed-in only.
    expect(page).toMatch(/const on = educationFixtureOn\(window\.location\.search, !!sceneUser\);/);
    expect(page).toMatch(/data-testid="education-scene-banner"/);
    expect(page).toMatch(/data-testid="education-scene-pass"/);
    // The verified mark is set on the page (setMods) BEFORE the scene returns without persisting.
    const mark = page.slice(page.indexOf("const markLessonComplete"), page.indexOf("const allLessons"));
    expect(mark.indexOf("setMods(next);")).toBeGreaterThan(-1);
    expect(mark.indexOf("setMods(next);")).toBeLessThan(mark.indexOf('=== "education-fixture"'));
    expect(mark.indexOf("setScenePass(")).toBeLessThan(mark.indexOf("persistAcademyProgress("));
    // Saved progress and saved notes are not read in the scene; a typed note is not written.
    const init = page.slice(page.indexOf("const [mods, setMods]"), page.indexOf("const [expandedId"));
    expect(init.indexOf('=== "education-fixture") return MODULES;')).toBeLessThan(init.indexOf("localStorage.getItem(EDU_KEY)"));
    expect(init.indexOf('=== "education-fixture") return MODULES;')).toBeGreaterThan(-1);
    const noteRead = page.indexOf('if (proofFixtureScene(window.location.search) === "education-fixture") { setReadState("READ"); setText(""); return; }');
    expect(noteRead).toBeGreaterThan(-1);
    expect(noteRead).toBeLessThan(page.indexOf("readAcademyNote(() => window.localStorage, KEY)"));
    const noteWrite = page.slice(page.indexOf("const onChange = (v: string) => {"), page.indexOf("persistAcademyNote(() => window.localStorage, KEY, v)"));
    expect(noteWrite).toMatch(/=== "education-fixture"\) return;/);
    // The pass screen never says the lesson is recorded while the scene is on (found on serving 0dd1130).
    const result = page.slice(page.indexOf("{score}/{qs.length} correct"), page.indexOf('"Score 70%+ to pass the knowledge check."'));
    expect(result.indexOf('=== "education-fixture"')).toBeGreaterThan(-1);
    expect(result.indexOf("EDUCATION_FIXTURE_PASS_LINE")).toBeLessThan(result.indexOf("Closing records this lesson complete in this browser."));
    expect(result.indexOf("EDUCATION_FIXTURE_PASS_LINE")).toBeGreaterThan(-1);
    // Every storage write in the page: the two guarded ones above, plus one unrelated click handler (a chart preference).
    expect(page.match(/persistAcademyProgress\(|persistAcademyNote\(/g)!.length).toBe(2);
  });

  it("Academy progress is not written under the scene", () => {
    const page = read("src/app/education/page.tsx");
    const guard = page.indexOf('if (proofFixtureScene(window.location.search) === "education-fixture") return;');
    const write = page.indexOf("persistAcademyProgress(localStorage, EDU_KEY");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(write);
  });
});
