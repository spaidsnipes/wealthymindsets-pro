/** Morning Prep's intention → the ticket's plan card (read-only) → frozen with the plan per Decision_ID. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { writeMorningPrepEntries, type MorningPrepEntry } from "@/lib/traderMemory/morningPrepStorage";

import type { FillCaptureIntent } from "./journalCaptureFromFill";
import { freezeAtTicketSend, freezePaperFillPlans, writeDraft } from "./managementPlanDraft";
import { readPlanForDecision } from "./managementPlanStore";
import { resetManagementOwnerForTests, setManagementOwner } from "./managementOwner";
import { INTENTION_SOURCE, intentionOf, readTodaysIntention } from "./morningPrepIntention";

const T0 = Date.parse("2026-10-07T14:30:00Z");
const M = 60_000;
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const entry = (over: Partial<MorningPrepEntry>): MorningPrepEntry => ({ id: "e", date: new Date(T0 - 60 * M).toISOString(), routine: "Wait for the ORB retest; no chasing.", mood: "calm", checklist: [], createdAt: T0 - 60 * M, ...over });
const ticket: FillCaptureIntent = { decisionId: "wmd_int", broker: "tastytrade", instrumentType: "Future", chartSymbol: "MNQ1!", action: "Buy to Open", qty: 1, orderType: "Limit", limitPx: 21400, protectiveStopPx: 21380, targetPx: 21450, sentAtMs: T0 };

afterEach(() => resetManagementOwnerForTests());

it("the scanned source is not empty", () => {
  expect(readFileSync(path.resolve(process.cwd(), "src/components/journal/ManagementPlanCard.tsx"), "utf8").length).toBeGreaterThan(3000);
});

describe("which words are today's intention", () => {
  it("the latest entry of the same market day, saved before the moment, with words in it", () => {
    expect(intentionOf([entry({})], T0)).toBe("Wait for the ORB retest; no chasing.");
    expect(intentionOf([entry({}), entry({ id: "b", routine: "Later words", createdAt: T0 - 10 * M })], T0)).toBe("Later words");
    expect(intentionOf([entry({ createdAt: T0 + M })], T0)).toBeNull();                                  // written after the send
    expect(intentionOf([entry({ date: new Date(T0 - 2 * 86_400_000).toISOString() })], T0)).toBeNull();  // another day
    expect(intentionOf([entry({ routine: "   " })], T0)).toBeNull();
    expect(intentionOf([], T0)).toBeNull();
  });
  it("read only for the signed-in member, from Morning Prep's own store", () => {
    const st = mem();
    writeMorningPrepEntries("u1", [entry({})], { storage: st, onChanged: () => {} });
    expect(readTodaysIntention(T0, st)).toBeNull();          // no member
    setManagementOwner("u1", st);
    expect(readTodaysIntention(T0, st)).toBe("Wait for the ORB retest; no chasing.");
    setManagementOwner("u2", st);
    expect(readTodaysIntention(T0, st)).toBeNull();          // another member's prep is never read
  });
});

describe("frozen with the plan per Decision_ID", () => {
  it("at the ticket's send: the intention fills the plan's context, its source named", () => {
    const st = mem();
    setManagementOwner("u1", st);
    writeMorningPrepEntries("u1", [entry({})], { storage: st, onChanged: () => {} });
    expect(freezeAtTicketSend(st, ticket, T0)).toBe("FROZEN");
    const s = readPlanForDecision(st, "wmd_int")!;
    expect(s.base.context).toMatchObject({ value: "Wait for the ORB retest; no chasing.", state: "RECORDED", source: INTENTION_SOURCE });
  });
  it("the trader's own context wins; no prep → nothing invented", () => {
    const st = mem();
    setManagementOwner("u1", st);
    writeMorningPrepEntries("u1", [entry({})], { storage: st, onChanged: () => {} });
    writeDraft(st, "MNQ1!", { context: "my own words" }, T0 - 5 * M);
    freezeAtTicketSend(st, ticket, T0);
    expect(readPlanForDecision(st, "wmd_int")!.base.context.value).toBe("my own words");
    const st2 = mem();
    setManagementOwner("u1", st2);
    freezeAtTicketSend(st2, ticket, T0);
    expect(readPlanForDecision(st2, "wmd_int")!.base.context.state).toBe("UNRECORDED");
  });
  it("at a paper fill too (a draft is required there, as before)", () => {
    const st = mem();
    setManagementOwner("u1", st);
    writeMorningPrepEntries("u1", [entry({})], { storage: st, onChanged: () => {} });
    writeDraft(st, "MNQ1!", { invalidation: "loses ORL" }, T0 - 5 * M);
    expect(freezePaperFillPlans(st, [{ symbol: "MNQ1!", side: "buy", px: 21400, ts: T0, decisionId: "wmd_paper" }])).toBe(1);
    expect(readPlanForDecision(st, "wmd_paper")!.base.context).toMatchObject({ value: "Wait for the ORB retest; no chasing.", source: INTENTION_SOURCE });
  });
  it("the card shows it read-only, and says whether it joins the freeze", () => {
    const card = readFileSync(path.resolve(process.cwd(), "src/components/journal/ManagementPlanCard.tsx"), "utf8");
    expect(card).toContain('data-testid="plan-day-intention"');
    expect(card).toContain("Today&apos;s intention (Morning Prep):");
    expect(card).toContain('setIntention(props.mode === "ticket" ? readTodaysIntention(Date.now()) : null);');
  });
});
