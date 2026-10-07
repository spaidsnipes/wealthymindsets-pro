import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FVG_ACADEMY_MODULE, FVG_DEFINITION, FVG_EXAMPLES_EMPTY_LINE, FVG_LAYER_PENDING_NOTE, FVG_LESSONS,
  FVG_MYTH_CARD, FVG_MYTH_LESSONS, FVG_NO_GUARANTEE, FVG_QUIZ_BANK, fvgChartLink, fvgCourseText,
  fvgLessonHref, fvgTaggedExamples,
} from "./fvgCourse";
import { CONCEPT_EDUCATION, educationFor } from "@/lib/chart/inventionEducation";
import { parseProofScene } from "@/lib/chart/proofScene";
import { academyLessonContentStatus, summarizeAcademyLessons } from "@/lib/educationProgressTruth";

const page = readFileSync("src/app/education/page.tsx", "utf8");
const moduleSeed = page.slice(page.indexOf("const MODULES"), page.indexOf("const LEVEL_COLOR"));

/** Claims that a gap has to be revisited. Only the MYTH card may say it, framed as a myth. */
const MUST_FILL = /\b(must|always|will(?:\s+always)?|has\s+to|have\s+to|bound\s+to|guaranteed\s+to|certain\s+to)\s+(be\s+)?(fill|filled|fills|refill|revisit|return)/i;

describe("Garden 19 §33 — the FVG course lives IN the one Academy", () => {
  it("is registered once in the Academy catalogue, from its owner", () => {
    expect(moduleSeed.match(/FVG_ACADEMY_MODULE\.id/g)?.length).toBe(1);
    expect(moduleSeed).toContain("FVG_LESSONS.map(");
    expect(moduleSeed).not.toMatch(/completed:\s*true/);
    // no second Academy route
    expect(() => readFileSync("src/app/fvg-academy/page.tsx")).toThrow();
    expect(() => readFileSync("src/app/education/fvg/page.tsx")).toThrow();
  });

  it("does not collide with an existing module id", () => {
    const ids = [...moduleSeed.matchAll(/\{ id:(\d+),/g)].map(m => Number(m[1]));
    expect(ids).not.toContain(FVG_ACADEMY_MODULE.id);
  });

  it("has exactly 21 lessons, numbered 1..21 with unique ids, in the §33 order", () => {
    expect(FVG_LESSONS).toHaveLength(21);
    FVG_LESSONS.forEach((l, i) => { expect(l.n).toBe(i + 1); expect(l.id).toBe(`fvg-${i + 1}`); });
    expect(new Set(FVG_LESSONS.map(l => l.id)).size).toBe(21);
    const order = ["imbalance", "three-candle", "bullish", "bearish", "displacement", "touch", "partial", "full mitigation", "rejection", "time-to-return", "structure", "profile", "order flow", "trade-through", "memory", "statistics", "risk", "patience", "management", "psychology", "edge"];
    FVG_LESSONS.forEach((l, i) => expect(l.title.toLowerCase(), l.id).toContain(order[i]));
    for (const l of FVG_LESSONS) {
      expect(l.lede.length, l.id).toBeGreaterThan(20);
      expect(l.body.length, l.id).toBeGreaterThan(0);
      expect(l.look.length, l.id).toBeGreaterThan(0);
      expect(l.duration).toMatch(/^\d+m$/);
    }
  });

  it("teaches the coded definition's exact rules", () => {
    const t = fvgCourseText().join("\n");
    expect(t).toContain("low(b3) > high(b1)");
    expect(t).toContain("[high(b1), low(b3)]");
    expect(t).toContain("high(b3) < low(b1)");
    expect(t).toContain("[high(b3), low(b1)]");
    expect(t).toMatch(/wicks, not bodies/i);
    expect(t).toMatch(/created at the close of b3/i);
    expect(t).toContain(`max(1 tick, 0.10 × ATR14)`);
    expect(t).toMatch(/first bar, after creation, whose wick reaches the near edge/);
    expect(t).toMatch(/less than 50% of the way/);
    expect(t).toMatch(/2 or more consecutive closes inside/);
    expect(t).toMatch(/closes? back outside on the origin side,? without full mitigation/);
    expect(t).toMatch(/close beyond the far boundary invalidates/i);
    expect(FVG_DEFINITION).toMatchObject({ id: "FVG_3C", version: 1, bars: 3, minTicks: 1, minAtrFraction: 0.1, atrPeriod: 14, deepPenetration: 0.5, acceptanceCloses: 2 });
  });

  it("carries the MYTH card verbatim and §32's no-guarantee sentence", () => {
    expect(FVG_MYTH_CARD.myth).toBe("MYTH: Every FVG must fill.");
    expect(FVG_MYTH_CARD.better).toBe("BETTER QUESTION: What happened to this defined territory under this instrument, timeframe, session, regime and observation horizon?");
    expect(FVG_MYTH_LESSONS).toContain(1);
    expect(FVG_NO_GUARANTEE).toBe("No guaranteed return should be assumed. WM Pro tracks what actually happens.");
    expect(fvgCourseText().join("\n")).toContain(FVG_NO_GUARANTEE);
  });

  it("never claims a gap has to be revisited — outside the myth framing", () => {
    expect(MUST_FILL.test(FVG_MYTH_CARD.myth)).toBe(true); // the sweep would catch it
    for (const s of fvgCourseText()) expect(MUST_FILL.test(s), s).toBe(false);
    for (const q of FVG_QUIZ_BANK) {
      // A quiz may list a myth as a WRONG answer, never as the right one or the explanation.
      expect(MUST_FILL.test(q.choices[q.correct]), q.q).toBe(false);
      expect(MUST_FILL.test(q.explain), q.q).toBe(false);
    }
    const ui = readFileSync("src/components/education/FvgLessonBody.tsx", "utf8") + readFileSync("src/components/education/FvgDiagram.tsx", "utf8");
    expect(ui).not.toMatch(/must fill/i);
    const rec = CONCEPT_EDUCATION.FVG_IMBALANCE;
    for (const v of Object.values(rec)) if (typeof v === "string") expect(MUST_FILL.test(v), v).toBe(false);
  });

  it("the knowledge check is about this definition and well-formed", () => {
    expect(FVG_QUIZ_BANK.length).toBeGreaterThanOrEqual(10);
    for (const q of FVG_QUIZ_BANK) {
      expect(q.choices.length).toBe(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(4);
      expect(new Set(q.choices).size).toBe(4);
    }
    expect(page).toContain("getBank(lesson.title, lesson.id)");
  });
});

describe("§32 — the ⓘ FVG record in the one education registry", () => {
  it("is complete and deep-links to lesson 1", () => {
    const r = CONCEPT_EDUCATION.FVG_IMBALANCE;
    for (const f of ["what", "question", "evidence", "appears", "grammar", "full", "partial", "degraded", "firstTouch", "canon"] as const) {
      expect(r[f].trim().length, f).toBeGreaterThan(8);
    }
    expect(educationFor("FVG_IMBALANCE")).toBe(r);
    expect(r.grammar).toContain(FVG_NO_GUARANTEE);
    expect(r.academy.lessonId).toBe(FVG_LESSONS[0].id);
    expect(r.academy.href).toBe(fvgLessonHref(1));
    expect(r.academy.title).toBe(FVG_LESSONS[0].title);
    expect(r.canon).toMatch(/lesson 1/);
    expect(r.grammar).toContain(`${FVG_DEFINITION.deepPenetration * 100}%`);
    expect(r.grammar).toContain(`${FVG_DEFINITION.acceptanceCloses}+ consecutive closes`);
  });

  it("the page opens a lesson from ?lesson=", () => {
    expect(page).toContain('q.get("lesson")');
    expect(fvgLessonHref(7)).toBe("/education?lesson=fvg-7");
  });
});

describe("§35 — Show me on a chart", () => {
  it("before the chart release: opens /charts with the pending note", () => {
    const l = fvgChartLink(FVG_LESSONS[0], false);
    expect(l).toEqual({ href: "/charts", shipped: false, note: FVG_LAYER_PENDING_NOTE });
    expect(FVG_LAYER_PENDING_NOTE).toMatch(/arrives with the chart release/);
  });

  it("after: a clean proof scene with the FVG tool on, every token one proofScene understands", () => {
    for (const lesson of FVG_LESSONS) {
      const l = fvgChartLink(lesson, true);
      expect(l.href).toMatch(/^\/charts\?scene=clean&on=fvg(,[A-Za-z:]+)*$/);
      const scene = parseProofScene(l.href.slice(l.href.indexOf("?")));
      expect(scene.clean).toBe(true);
      for (const tok of lesson.alsoOn) {
        expect(Object.keys(scene.overrides).some(k => k.endsWith(tok)), `${lesson.id}:${tok}`).toBe(true);
      }
    }
  });
});

describe("§36 — Show me my examples", () => {
  it("finds only FVG-tagged journal records", () => {
    const ex = fvgTaggedExamples([
      { id: "a", symbol: "NQ1!", date: "2026-10-01", result: "win", tags: ["FVG"] },
      { id: "b", symbol: "ES1!", date: "2026-10-02", tags: ["imbalance"] },
      { id: "c", symbol: "TSLA", date: "2026-10-03", tags: [], setup: "Fair Value Gap" },
      { id: "d", symbol: "BTC", tags: ["fomo"] },
      null, "junk", 7,
    ]);
    expect(ex.map(e => e.id)).toEqual(["a", "c"]);
    expect(fvgTaggedExamples([])).toEqual([]);
    expect(FVG_EXAMPLES_EMPTY_LINE).toMatch(/once your Journal holds trades tagged FVG/);
  });
});

describe("progress — the Academy's own browser-local persistence, per-lesson truth", () => {
  it("FVG lessons are published content; the rest keep the catalogue status", () => {
    expect(academyLessonContentStatus("fvg-1")).toBe("AVAILABLE");
    expect(academyLessonContentStatus("of-1")).toBe("COMING_SOON");
    const s = summarizeAcademyLessons([{ id: "fvg-1", completed: true }, { id: "of-1", completed: true }, { id: "fvg-2", completed: false }]);
    expect(s).toEqual({ verifiedCompleted: 1, priorPracticeMarks: 1, total: 3, verifiedPercent: 33 });
  });

  it("uses the existing persistence, labelled browser-local", () => {
    expect(page).toContain("persistAcademyProgress(localStorage, EDU_KEY");
    expect(page).toContain("Progress saved in this browser after verified readback.");
    const course = readFileSync("src/lib/academy/fvgCourse.ts", "utf8");
    expect(course).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });
});

describe("aligned to docs/operations/FVG-METHODOLOGY.md", () => {
  it("teaches the methodology's own words", () => {
    const doc = readFileSync("docs/operations/FVG-METHODOLOGY.md", "utf8");
    const t = fvgCourseText().join("\n");
    for (const phrase of ["zero-width gap is not a gap", "near edge", "NOT_ATTACHED", "not probabilities", "DESCRIPTIVE"]) {
      expect(doc, phrase).toContain(phrase);
      expect(t.replace(/NOT ATTACHED/g, "NOT_ATTACHED"), phrase).toContain(phrase);
    }
    expect(doc).toMatch(/A doji or a counter-body `b2` is not an FVG under v1/);
    expect(t).toMatch(/A doji b2 is not an FVG under this version/);
  });
});
