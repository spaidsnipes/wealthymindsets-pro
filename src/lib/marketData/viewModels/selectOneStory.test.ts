import { describe, it, expect } from "vitest";
import { selectOneStory } from "./selectOneStory";
import type { StoryVM } from "./selectMarketStory";
import type { DecisionChainNode } from "./selectDecisionChain";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";

/**
 * Tests lock the Founder 2029 Integration Glue canon §7 ONE STORY
 * COMPILER shape (PRIMARY / CONTRADICTION / MISSING / DECISION).
 * Composes existing canonical view models — the outputs must never
 * disagree with the underlying compilers.
 */

const node = (label: string, indicator: DecisionChainNode["indicator"]): DecisionChainNode => ({
  key: label.toLowerCase(),
  label,
  verdict: "TEST",
  resolution: "RESOLVED",
  narrative: "test",
  indicator,
});

const story = (chapter: string | null, contradictions: readonly string[] = []): StoryVM => ({
  current: chapter
    ? {
        chapter: chapter as StoryVM["current"] extends infer T ? T extends { chapter: infer C } ? C : never : never,
        enteredAt: 1_700_000_000_000,
        resolution: "RESOLVED",
        evidence: [],
        contradictions,
      }
    : null,
  recent: [],
  resolution: chapter ? "RESOLVED" : "UNKNOWN",
});

const perm = (verdict: PermissionVM["verdict"]): PermissionVM =>
  ({ verdict } as PermissionVM);

describe("selectOneStory — canon §7 shape guarantee", () => {
  it("empty inputs → honest 'cannot be resolved' primary + no decision authorization", () => {
    const vm = selectOneStory({ story: null, chainNodes: undefined, permission: null });
    expect(vm.primary).toBe("Market state cannot be resolved yet.");
    expect(vm.contradiction).toBeNull();
    expect(vm.missing).toBeNull();
    expect(vm.decision.value).toBe("UNKNOWN");
    expect(vm.debt).toBeNull();
  });

  it("known chapter → mapped preset primary sentence", () => {
    const vm = selectOneStory({
      story: story("TREND_EXPANSION"),
      chainNodes: [node("Regime", "OK")],
      permission: perm("ALLOWED"),
    });
    expect(vm.primary).toContain("expanding");
  });

  it("unmapped chapter → renders lowercase spaced fallback (never blank)", () => {
    const vm = selectOneStory({
      story: story("SOME_NEW_CHAPTER"),
      chainNodes: undefined,
      permission: null,
    });
    expect(vm.primary).toContain("some new chapter");
  });

  it("contradiction surfaces the first item from the current chapter", () => {
    const vm = selectOneStory({
      story: story("BREAKOUT", ["Participation weakening at the range edge."]),
      chainNodes: undefined,
      permission: null,
    });
    expect(vm.contradiction).toBe("Participation weakening at the range edge.");
  });

  it("missing evidence surfaces as a compact phrase with count and labels", () => {
    const vm = selectOneStory({
      story: story("BREAKOUT"),
      chainNodes: [
        node("Regime", "OK"),
        node("Aggression", "UNKNOWN"),
        node("CLC", "UNKNOWN"),
      ],
      permission: perm("ALLOWED"),
    });
    expect(vm.missing).toContain("2 evidence nodes unpaid");
    expect(vm.missing).toContain("aggression");
    expect(vm.missing).toContain("clc");
  });

  it("decision.value cannot be ACTION when missing evidence exists — canon rejection #1 preserved", () => {
    const vm = selectOneStory({
      story: story("TREND_EXPANSION"),
      chainNodes: [
        node("Regime", "OK"),
        node("Aggression", "UNKNOWN"),
      ],
      permission: perm("ALLOWED"), // permission ALLOWED, but debt gates it
    });
    expect(vm.decision.value).toBe("WAIT");
    expect(vm.missing).not.toBeNull();
  });

  it("decision becomes ACTION only when nothing is missing AND permission ALLOWED AND no warn", () => {
    const vm = selectOneStory({
      story: story("TREND_EXPANSION"),
      chainNodes: [node("Regime", "OK"), node("Direction", "OK")],
      permission: perm("ALLOWED"),
    });
    expect(vm.decision.value).toBe("ACTION");
    expect(vm.missing).toBeNull();
  });

  it("debt is attached so consumers may render the raw list", () => {
    const vm = selectOneStory({
      story: null,
      chainNodes: [node("A", "OK"), node("B", "UNKNOWN")],
      permission: null,
    });
    expect(vm.debt).not.toBeNull();
    expect(vm.debt!.total).toBe(2);
    expect(vm.debt!.missing).toBe(1);
  });

  it("null story with reason falls back to the story's reason string", () => {
    const s: StoryVM = { current: null, recent: [], resolution: "UNKNOWN", reason: "Provider offline." };
    const vm = selectOneStory({ story: s, chainNodes: undefined, permission: null });
    expect(vm.primary).toBe("Provider offline.");
  });
});
