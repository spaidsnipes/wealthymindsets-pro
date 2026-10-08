/**
 * Member isolation for the management stores (plans, plan-card drafts, today's
 * rules) — ONE owner: managementOwner (per-member suffixed keys). Two members on
 * the same browser never see each other's rows; a guest sees none; legacy
 * (pre-isolation) rows are ADOPTED only by the member they can be tied to,
 * otherwise HELD — never deleted, never handed over.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearOwnerScopedLocalStorage } from "@/lib/logoutIsolation";
import { JOURNAL_STORAGE_KEY } from "@/lib/traderMemory/adapters/journalStorage";
import { MANAGEMENT_DAY_RULES_KEY, readDayRules, writeDayRules } from "./managementDayRules";
import { LEGACY_OWNER_STAMP_KEY, mergeManagementRows, resetManagementOwnerForTests, setManagementOwner } from "./managementOwner";
import { planSnapshotFromTicket } from "./managementPlan";
import { MANAGEMENT_PLAN_DRAFT_KEY, readDraft, writeDraft } from "./managementPlanDraft";
import { MANAGEMENT_PLAN_KEY, freezePlanOnce, readAllPlans } from "./managementPlanStore";
import { STORY_REVIEW_STORAGE_KEY } from "./storyReview";
import { TICKET_AT_SEND_KEY } from "./ticketAtSendStore";

const SRC = path.resolve(__dirname, "../..");
const NOW = Date.parse("2026-10-07T14:30:00Z");
function mem() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => m.clear(), m,
  };
}
const plan = (id: string, at = NOW) => planSnapshotFromTicket({ decisionId: id, broker: "tastytrade", instrumentType: "Future", chartSymbol: "MNQ1!", action: "Buy to Open", qty: 1, protectiveStopPx: 21380, targetPx: 21450, sentAtMs: at });
/** Write a member's rows through the real stores (in a "browser", so keys are suffixed). */
function writeAs(local: ReturnType<typeof mem>, tag: string) {
  freezePlanOnce(local, plan(`wmd_${tag}`));
  writeDraft(local, "MNQ1!", { invalidationPx: 21385, conditions: [`rule ${tag}`] }, NOW);
  writeDayRules(local, { conditions: [`day rule ${tag}`], expectedHoldMin: 20, sessionPlan: "NY open" }, NOW);
}
const seen = (local: ReturnType<typeof mem>) => ({ plans: Object.keys(readAllPlans(local)), draft: readDraft(local, "MNQ1!")?.plan.conditions ?? null, rules: readDayRules(local, NOW)?.conditions ?? null });

let local: ReturnType<typeof mem>, session: ReturnType<typeof mem>;
beforeEach(() => {
  local = mem(); session = mem();
  vi.stubGlobal("window", { localStorage: local, sessionStorage: session, dispatchEvent: () => true });
  resetManagementOwnerForTests();
});
afterEach(() => { vi.unstubAllGlobals(); resetManagementOwnerForTests(); });

describe("per-member keys: two members on one browser, and a guest", () => {
  it("A's rows are under A's key; B reads nothing of A's and writes under B's own; A comes back to A's rows", () => {
    setManagementOwner("user-A");
    writeAs(local, "A");
    expect(seen(local)).toEqual({ plans: ["wmd_A"], draft: ["rule A"], rules: ["day rule A"] });
    expect(local.getItem(`${MANAGEMENT_PLAN_KEY}:user-A`)).not.toBeNull();
    setManagementOwner("user-B");               // A's session ended without a sign-out; B signs in
    expect(seen(local)).toEqual({ plans: [], draft: null, rules: null });
    writeAs(local, "B");
    expect(seen(local).plans).toEqual(["wmd_B"]);
    setManagementOwner("user-A");
    expect(seen(local).plans).toEqual(["wmd_A"]);
  });
  it("a guest reads none and writes none", () => {
    setManagementOwner("user-A");
    writeAs(local, "A");
    setManagementOwner(null);
    expect(seen(local)).toEqual({ plans: [], draft: null, rules: null });
    expect(freezePlanOnce(local, plan("wmd_guest"))).toBe("NOT_STORED");
    expect(writeDraft(local, "ES1!", { invalidationPx: 1 }, NOW)).toBeNull();
  });
  it("sign-out purges every member's management rows plus the journal, review answers and tickets at send", () => {
    setManagementOwner("user-A");
    writeAs(local, "A");
    local.setItem(JOURNAL_STORAGE_KEY, "[]");
    local.setItem(STORY_REVIEW_STORAGE_KEY, "{}");
    session.setItem(TICKET_AT_SEND_KEY, "[]");
    expect(clearOwnerScopedLocalStorage()).toBeGreaterThan(4);
    expect([...local.m.keys()].filter(k => k.startsWith("wm:management-"))).toHaveLength(0);
    for (const k of [JOURNAL_STORAGE_KEY, STORY_REVIEW_STORAGE_KEY]) expect(local.getItem(k)).toBeNull();
    expect(session.getItem(TICKET_AT_SEND_KEY)).toBeNull();
    setManagementOwner("user-B");
    expect(seen(local)).toEqual({ plans: [], draft: null, rules: null });
  });
});

describe("legacy (pre-isolation) rows: ADOPT only when tied to the member, otherwise HOLD", () => {
  function legacy() {
    local.setItem(MANAGEMENT_PLAN_KEY, JSON.stringify({ wmd_L: JSON.parse(JSON.stringify(plan("wmd_L", NOW - 60_000))) }));
    local.setItem(MANAGEMENT_PLAN_DRAFT_KEY, JSON.stringify({ "MNQ1!": { plan: { conditions: ["legacy rule"] }, updatedAtMs: NOW - 1000 } }));
    local.setItem(MANAGEMENT_DAY_RULES_KEY, JSON.stringify({ day: "2026-10-07", conditions: ["legacy day rule"], expectedHoldMin: null, sessionPlan: null, updatedAtMs: NOW - 1000 }));
  }
  it("matching marker (the browser's last-known account is this member) → adopted into the member's key; legacy keys removed", () => {
    legacy();
    setManagementOwner("user-A", undefined, "user-A");
    expect(seen(local)).toEqual({ plans: ["wmd_L"], draft: ["legacy rule"], rules: ["legacy day rule"] });
    for (const k of [MANAGEMENT_PLAN_KEY, MANAGEMENT_PLAN_DRAFT_KEY, MANAGEMENT_DAY_RULES_KEY]) expect(local.getItem(k)).toBeNull();
    setManagementOwner("user-B", undefined, "user-A");   // a different member after the adopt sees nothing
    expect(seen(local)).toEqual({ plans: [], draft: null, rules: null });
  });
  it("an older owner stamp also ties the rows; it is cleared after the adopt", () => {
    legacy();
    local.setItem(LEGACY_OWNER_STAMP_KEY, "user-A");
    setManagementOwner("user-A", undefined, null);
    expect(seen(local).plans).toEqual(["wmd_L"]);
    expect(local.getItem(LEGACY_OWNER_STAMP_KEY)).toBeNull();
  });
  it("merge when the member already has rows: no row dropped; same decision keeps the earlier freeze; same market keeps the newer draft", () => {
    setManagementOwner("user-A");
    freezePlanOnce(local, plan("wmd_A"));
    freezePlanOnce(local, plan("wmd_L", NOW));                  // the same decision, frozen LATER under the member key
    writeDraft(local, "ES1!", { invalidationPx: 2 }, NOW);
    legacy();
    resetManagementOwnerForTests();
    setManagementOwner("user-A", undefined, "user-A");
    const plans = readAllPlans(local);
    expect(Object.keys(plans).sort()).toEqual(["wmd_A", "wmd_L"]);
    expect(plans.wmd_L.frozenAtMs).toBe(NOW - 60_000);          // first freeze wins
    expect(readDraft(local, "ES1!")).not.toBeNull();             // the member's own draft kept
    expect(readDraft(local, "MNQ1!")?.plan.conditions).toEqual(["legacy rule"]);
    expect(mergeManagementRows("wm:management-plan-draft:v1", { X: { updatedAtMs: 5 } }, { X: { updatedAtMs: 9 } })).toEqual({ X: { updatedAtMs: 9 } });
  });
  it("different marker → HELD: unread by the member, never deleted, never handed over", () => {
    legacy();
    setManagementOwner("user-B", undefined, "user-A");
    expect(seen(local)).toEqual({ plans: [], draft: null, rules: null });
    expect(local.getItem(MANAGEMENT_PLAN_KEY)).toContain("wmd_L");
    expect(local.getItem(`${MANAGEMENT_PLAN_KEY}:user-B`)).toBeNull();
  });
  it("no marker → HELD", () => {
    legacy();
    setManagementOwner("user-B", undefined, null);
    expect(seen(local).plans).toEqual([]);
    expect(local.getItem(MANAGEMENT_PLAN_KEY)).toContain("wmd_L");
  });
  it("a guest never adopts and never removes legacy rows", () => {
    legacy();
    setManagementOwner(null, undefined, "user-A");
    expect(seen(local).plans).toEqual([]);
    expect(local.getItem(MANAGEMENT_PLAN_KEY)).toContain("wmd_L");
  });
  it("an unreadable legacy row is left in place, not destroyed", () => {
    local.setItem(MANAGEMENT_PLAN_KEY, "{not json");
    setManagementOwner("user-A", undefined, "user-A");
    expect(local.getItem(MANAGEMENT_PLAN_KEY)).toBe("{not json");
  });
});

describe("one owner, wired", () => {
  it("AuthContext sets the owner with the last-known-account marker; the old guard is gone; the prefixes are on the sign-out list", () => {
    const auth = readFileSync(path.join(SRC, "contexts/AuthContext.tsx"), "utf8");
    expect(auth.length).toBeGreaterThan(5_000);
    expect(auth).toContain("setManagementOwner(user.id, undefined, legacyMarkerRef.current ?? null)");
    expect(auth).toContain("legacyMarkerRef.current = readCachedUser()?.id ?? null");
    expect(auth).not.toMatch(/guardManagementOwner|managementOwnerGuard/);
    const iso = readFileSync(path.join(SRC, "lib/logoutIsolation.ts"), "utf8");
    for (const k of ["wm:management-plan:v1:", "wm:management-plan-draft:v1:", "wm:management-day-rules:v1:", "wm:management-plan:v1", "wm:management-plan-draft:v1", "wm:management-day-rules:v1"]) expect(iso, k).toContain(`"${k}"`);
  });
});
