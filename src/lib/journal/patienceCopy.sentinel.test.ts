/**
 * §29 COPY AUDIT — patience / management / review / edge / SpaidBot copy names
 * no emotion, motive or mental state the trader did not write. Facts and
 * questions only. Comments are stripped (they quote the forbidden examples).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");
const FILES = [
  "lib/journal/managementPlan.ts", "lib/journal/managementPlanStore.ts", "lib/journal/managementPlanDraft.ts", "lib/journal/managementDayRules.ts",
  "lib/journal/planVsActual.ts", "lib/journal/planSheriff.ts", "lib/journal/planReview.ts", "lib/journal/planCounterfactual.ts",
  "lib/journal/planAdherence.ts", "lib/journal/planFvgContext.ts", "lib/journal/planFvgCounterfactual.ts", "lib/journal/planLoop.ts",
  "lib/journal/planActualsFromBroker.ts", "lib/journal/planPricePath.ts", "lib/journal/storyReview.ts", "lib/journal/captureReviewEvidence.ts",
  "lib/journal/founderAnalytics.ts", "lib/ai/spaidbotPlanReview.ts", "lib/ai/spaidbotContext.ts",
  "components/journal/ManagementPlanCard.tsx", "components/journal/TodayManagementRules.tsx", "components/journal/PlanAdherenceBySetup.tsx",
  "components/journal/BrokerTruthToday.tsx",
];
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const literals = (s: string) => [...s.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map(m => m[2].replace(/\$\{[^}]*\}/g, "")).concat([...s.matchAll(/>([^<>{}\n]{3,})</g)].map(m => m[1]));
const DIAGNOSES = /\b(afraid|fear(ful|ed)?|scared|panick?(ed|y)?|greed(y)?|impatien(t|ce)|revenge|anxious|nervous|emotional(ly)?|tilt(ed)?|undisciplined|impulsive|by feeling|overconfiden\w*|lack of discipline|you were (?:too )?\w+ed)\b/i;

describe("§29 patience copy names no emotion the trader did not write", () => {
  const texts = FILES.map(f => ({ f, lits: literals(strip(readFileSync(path.join(SRC, f), "utf8"))) }));
  it("scanned real material", () => {
    expect(texts.length).toBeGreaterThan(15);
    expect(texts.reduce((n, t) => n + t.lits.length, 0)).toBeGreaterThan(500);
  });
  it("the detector still catches the shapes it polices (positive control)", () => {
    for (const bad of ["Did I manage it by plan, not by feeling?", "You were afraid to hold", "not emotional insurance", "revenge trade"]) expect(DIAGNOSES.test(bad)).toBe(true);
    for (const ok of ["Reason (your words): ", "You exited before the management condition recorded in your plan."]) expect(DIAGNOSES.test(ok)).toBe(false);
  });
  it("no string in these files diagnoses a feeling, motive or state", () => {
    const hits = texts.flatMap(t => t.lits.filter(l => DIAGNOSES.test(l)).map(l => `${t.f}: ${l.slice(0, 120)}`));
    expect(hits).toEqual([]);
  });
  it("SpaidBot's system prompt forbids naming an unwritten emotion and asks instead", () => {
    const route = readFileSync(path.join(SRC, "app/api/spaidbot/route.ts"), "utf8");
    expect(route).toContain("Never name an emotion, motive or mental state the trader did not write themselves");
    expect(route).toContain("then ASK what caused the change");
  });
});
