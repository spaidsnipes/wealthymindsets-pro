/**
 * §31 SpaidBot × management — the panel PUBLISHES the two management fields of
 * the context it would send (Decision_ID present? + the plan line), so they can
 * be read on the page without a provider call (coordinator order 2026-10-09).
 * One builder, not two; no request on open; a labelled sample plan in the
 * journal proof scene produces the line.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { contextWithAsk, reviewDecisionAsk } from "@/lib/ai/spaidbotAsk";
import { SPAIDBOT_NO_PLAN, spaidbotContextPublish, withSceneDecisionId, withScenePlan } from "@/lib/ai/spaidbotContext";
import { formatPlanContextLine } from "@/lib/ai/spaidbotPlanReview";
import { journalFixture } from "@/lib/journal/journalProofFixture";
import { fvgReferenceSentence } from "@/lib/journal/fvgDecisionReference";

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");

describe("spaidbotContextPublish — the two fields, as they would be sent", () => {
  it("no decision and no plan → no / 'no plan'", () => {
    expect(spaidbotContextPublish({})).toEqual({ decision: "no", plan: SPAIDBOT_NO_PLAN });
    expect(spaidbotContextPublish({ decisionId: null, plan: null })).toEqual({ decision: "no", plan: "no plan" });
    expect(spaidbotContextPublish({ decisionId: "  ", plan: "  " })).toEqual({ decision: "no", plan: "no plan" });
    expect(spaidbotContextPublish({ decisionId: 7, plan: { a: 1 } })).toEqual({ decision: "no", plan: "no plan" });
  });

  it("a decision with no plan → yes / 'no plan' (the Founder's account today: decision scenes, zero stored plans)", () => {
    const ctx = withScenePlan(withSceneDecisionId({ symbol: "NQ1!" }, "member-1", () => ({ identity: { decisionId: "DEC-1" } }) as never), () => null);
    expect(spaidbotContextPublish(ctx)).toEqual({ decision: "yes", plan: "no plan" });
  });

  it("a decision with a frozen plan → yes / the SAME line the send path puts in the body", () => {
    const e = journalFixture().entries[0]!;
    const ctx = withScenePlan(withSceneDecisionId({ symbol: e.symbol }, "member-1", () => ({ identity: { decisionId: e.plan.base.decisionId } }) as never), () => e.plan);
    const pub = spaidbotContextPublish(ctx);
    expect(pub.decision).toBe("yes");
    expect(pub.plan).toBe(formatPlanContextLine(e.plan));
    expect(pub.plan).toBe(ctx.plan);
    expect(pub.plan.startsWith("plan frozen at the ticket's send:")).toBe(true);
  });
});

describe("the journal proof scene's sample door → a labelled sample plan produces the plan line (§31 on a fixture)", () => {
  it("the door's ask, through the panel's builder on a page with no chart context, publishes decision yes + the sample plan line", () => {
    const e = journalFixture().entries[0]!;
    // What StoryReviewRow.askDecision builds for the ONE sample door (sampleAskDoor).
    const ask = reviewDecisionAsk({
      question: "What should I look at in this decision?",
      fvgReferenceSentence: fvgReferenceSentence(e.fvgRef),
      symbol: null,
      decisionId: e.plan.base.decisionId,
      planLine: formatPlanContextLine(e.plan),
    });
    const pub = spaidbotContextPublish(contextWithAsk({}, ask));
    expect(pub.decision).toBe("yes");
    expect(e.plan.base.decisionId.startsWith("SAMPLE-DEC-")).toBe(true);
    expect(pub.plan).toBe(formatPlanContextLine(e.plan));
    expect(pub.plan).toMatch(/^plan frozen at the ticket's send: /);
    // No word a plan line may not carry.
    expect(pub.plan).not.toMatch(/probab|forecast|score|must fill|guarante/i);
  });

  it("only the sample door borrows the sample plan's Decision_ID; a real row still sends its own or none", () => {
    const row = read("components/journal/BrokerTruthToday.tsx");
    expect(row).toContain("decisionId: planDecisionId ?? (sampleAskDoor ? plan?.plan?.base.decisionId ?? null : null),");
    expect(read("components/journal/JournalProofScene.tsx")).toContain("sampleAskDoor={i === 0}");
  });
});

describe("the panel publishes from the ONE builder and makes no request to do it", () => {
  const panel = read("components/layout/SpaidBotButton.tsx");

  it("one builder: the send path and the publish both go through peekContext; contextWithAsk is called once", () => {
    expect(panel.match(/contextWithAsk\(/g)).toHaveLength(1);
    expect(panel).toContain("const peekContext = useCallback(() => contextWithAsk(getChartContext(), askRef.current), [getChartContext]);");
    expect(panel).toMatch(/const getContext = useCallback\(\(\) => \{\s*const ctx = peekContext\(\);\s*askRef\.current = null;/);
    expect(panel).toContain("setPublished(open ? spaidbotContextPublish(peekContext()) : null);");
    expect(panel).toContain("context: getContext(),");
  });

  it("no fetch on open: the panel's only request is the send; the publish effect and the owner hold none", () => {
    expect(panel.match(/\bfetch\(/g)).toHaveLength(1);
    expect(panel).toMatch(/const res = await fetch\("\/api\/spaidbot", \{\s*method: "POST"/);
    const effect = panel.slice(panel.indexOf("const [published, setPublished]"), panel.indexOf("/* ── Send to Claude"));
    expect(effect.length).toBeGreaterThan(100);
    expect(effect).not.toMatch(/fetch\(|setItem\(|sendToClaude|send\(/);
    expect(read("lib/ai/spaidbotContext.ts")).not.toMatch(/fetch\(|setItem\(|localStorage|sessionStorage/);
  });

  it("the attributes sit on the panel's boundary line, and the publish is re-read when an ask arrives or a question has gone", () => {
    expect(panel).toContain('<p data-testid="spaidbot-boundary" data-ctx-decision={published?.decision} data-ctx-plan={published?.plan}');
    expect(panel).toContain("}, [open, askSeq, messages.length, peekContext]);");
    expect(panel).toMatch(/askRef\.current = ask;\s*setAskSeq\(n => n \+ 1\);/);
  });
});
