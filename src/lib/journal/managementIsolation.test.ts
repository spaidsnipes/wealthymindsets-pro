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
    // The owner is set BEFORE the account reaches React state (the journal reads in a state initializer),
    // and an expired session stamps the account its legacy rows belonged to.
    expect(auth).toMatch(/claimOwner\(u, true\);\s*setUser\(u\);/);
    expect(auth).toMatch(/stampLegacyOwner\(readCachedUser\(\)\?\.id\);\s*writeCachedUser\(null\);/);
    const page = readFileSync(path.join(SRC, "app/journal/page.tsx"), "utf8");
    expect(page).toContain("if (!keys || keys.canonical !== hydratedKeyRef.current) return;");
    for (const f of ["app/profile/page.tsx", "components/layout/shellPanels.tsx", "components/chart/PnLStatsPanel.tsx"]) {
      expect(readFileSync(path.join(SRC, f), "utf8"), f).not.toContain(`getItem("wm_journal_entries")`);
    }
    const iso = readFileSync(path.join(SRC, "lib/logoutIsolation.ts"), "utf8");
    for (const k of ["wm:management-plan:v1:", "wm:management-plan-draft:v1:", "wm:management-day-rules:v1:", "wm:management-plan:v1", "wm:management-plan-draft:v1", "wm:management-day-rules:v1"]) expect(iso, k).toContain(`"${k}"`);
  });
});

describe("journal stores under the same owner (Garden 19, 2026-10-08): the Founder's book is never dropped or hidden", () => {
  // A book as a browser really holds it: hand-formatted spacing, unicode, an entry without an id,
  // fields WM does not know — the bytes must arrive untouched, not re-serialized.
  const FOUNDER_BOOK = `[ {"id":"j1","date":"2026-09-30","symbol":"MNQ1!","pnl":125.5,"notes":"waited for the retest — patient ✓"},\n {"id":"j2","date":"2026-10-01","symbol":"ES1!","pnl":-40,"unknownField":{"x":[1,2,3]}},\n {"date":"2026-10-02","symbol":"NQ1!","pnl":0} ]`;
  const OLD_BOOK = `[{"id":"old-1","date":"2026-08-01","symbol":"MES1!"}]`;
  const FOUNDER_REVIEWS = `{"wmd_1":{"marks":{"READ":"HELD"},"notes":{},"lesson":"sized down","repeat":"","updatedAt":1759800000000},"tastytrade|1234|wmd_2":{"marks":{},"notes":{},"lesson":"","repeat":"","planWhy":"news","updatedAt":1759800001000}}`;
  const FOUNDER_TICKETS = `[{"clientOrderId":"c-1","atMs":${NOW},"ticket":{"broker":"tastytrade","instrumentType":"Future","action":"Buy to Open","qty":1}}]`;
  function legacyJournal() {
    local.setItem("wm_journal_entries", FOUNDER_BOOK);
    local.setItem("wm-journal", OLD_BOOK);
    local.setItem("wm_story_review_v1", FOUNDER_REVIEWS);
    session.setItem("wm:journal-ticket-at-send:v1", FOUNDER_TICKETS);
  }
  beforeEach(() => { vi.stubGlobal("localStorage", local); });

  it("matching cached-user marker → EVERY existing entry adopted byte for byte (book, old book, review answers, tickets)", async () => {
    const { readJournalStorage, readJournalRaw } = await import("@/lib/traderMemory/adapters/journalStorage");
    const { readStoryReviews } = await import("./storyReview");
    legacyJournal();
    setManagementOwner("founder-id", undefined, "founder-id");
    expect(local.getItem("wm_journal_entries:founder-id")).toBe(FOUNDER_BOOK);
    expect(local.getItem("wm-journal:founder-id")).toBe(OLD_BOOK);
    expect(local.getItem("wm_story_review_v1:founder-id")).toBe(FOUNDER_REVIEWS);
    expect(session.getItem("wm:journal-ticket-at-send:v1:founder-id")).toBe(FOUNDER_TICKETS);
    for (const k of ["wm_journal_entries", "wm-journal", "wm_story_review_v1"]) expect(local.getItem(k)).toBeNull();
    expect(session.getItem("wm:journal-ticket-at-send:v1")).toBeNull();
    // …and every surface reads all of it back.
    const read = readJournalStorage(local);
    expect(read.status).toBe("RESOLVED_CANONICAL");
    expect(read.records).toHaveLength(3);
    expect(read.records).toEqual(JSON.parse(FOUNDER_BOOK));
    expect(readJournalRaw(local)).toBe(FOUNDER_BOOK);
    expect(Object.keys(readStoryReviews()).sort()).toEqual(["tastytrade|1234|wmd_2", "wmd_1"]);
    expect(readStoryReviews()["tastytrade|1234|wmd_2"].planWhy).toBe("news");
  });

  it("the member already has a book: union by id — none of either side dropped", async () => {
    const { readJournalStorage } = await import("@/lib/traderMemory/adapters/journalStorage");
    local.setItem("wm_journal_entries:founder-id", `[{"id":"j2","date":"2026-10-01","symbol":"ES1!","pnl":-40},{"id":"new","date":"2026-10-08","symbol":"MNQ1!"}]`);
    legacyJournal();
    setManagementOwner("founder-id", undefined, "founder-id");
    const ids = readJournalStorage(local).records.map(r => (r as { id?: string }).id ?? "(no id)");
    expect(ids).toEqual(["j2", "new", "j1", "(no id)"]);
    expect(local.getItem("wm_journal_entries")).toBeNull();
  });

  it("different marker → HELD: the other member opens an empty book; the Founder's bytes stay exactly where they were", async () => {
    const { readJournalStorage, writeJournalStorage } = await import("@/lib/traderMemory/adapters/journalStorage");
    const { readStoryReviews } = await import("./storyReview");
    legacyJournal();
    setManagementOwner("user-B", undefined, "founder-id");
    expect(readJournalStorage(local).status).toBe("ABSENT");
    expect(readStoryReviews()).toEqual({});
    expect(writeJournalStorage(local, "[]")).toBe(true);           // B writes only B's own key
    expect(local.getItem("wm_journal_entries")).toBe(FOUNDER_BOOK);
    expect(local.getItem("wm_story_review_v1")).toBe(FOUNDER_REVIEWS);
    expect(session.getItem("wm:journal-ticket-at-send:v1")).toBe(FOUNDER_TICKETS);
    // The Founder signs in later on this browser (his cached account is the marker again): all of it is his.
    setManagementOwner("founder-id", undefined, "founder-id");
    expect(local.getItem("wm_journal_entries:founder-id")).toBe(FOUNDER_BOOK);
    expect(local.getItem("wm_journal_entries:user-B")).toBe("[]");
  });

  it("no marker → HELD; a session that EXPIRED stamps the account, so that member adopts after a reload and nobody else does", async () => {
    const { readJournalStorage } = await import("@/lib/traderMemory/adapters/journalStorage");
    const { stampLegacyOwner } = await import("./managementOwner");
    legacyJournal();
    setManagementOwner("founder-id", undefined, null);
    expect(readJournalStorage(local).status).toBe("ABSENT");
    expect(local.getItem("wm_journal_entries")).toBe(FOUNDER_BOOK);
    stampLegacyOwner("founder-id");                                   // the 401 path in AuthContext
    stampLegacyOwner("user-B");                                       // never re-pointed
    resetManagementOwnerForTests();
    setManagementOwner("user-B", undefined, "user-B");               // B's own marker does not outrank the stamp
    expect(local.getItem("wm_journal_entries")).toBe(FOUNDER_BOOK);
    setManagementOwner("founder-id", undefined, null);
    expect(local.getItem("wm_journal_entries:founder-id")).toBe(FOUNDER_BOOK);
    expect(local.getItem(LEGACY_OWNER_STAMP_KEY)).toBeNull();
  });

  it("a guest reads no book and writes none; nothing is removed", async () => {
    const { readJournalStorage, writeJournalStorage } = await import("@/lib/traderMemory/adapters/journalStorage");
    legacyJournal();
    setManagementOwner(null, undefined, "founder-id");
    expect(readJournalStorage(local).status).toBe("UNAVAILABLE");
    expect(writeJournalStorage(local, "[]")).toBe(false);
    expect(local.getItem("wm_journal_entries")).toBe(FOUNDER_BOOK);
  });

  it("sign-out purges every member's book, review answers and tickets (suffixed keys too)", () => {
    legacyJournal();
    setManagementOwner("founder-id", undefined, "founder-id");
    local.setItem("wm_journal_entries:user-B", "[]");
    expect(clearOwnerScopedLocalStorage()).toBeGreaterThan(4);
    expect([...local.m.keys()].filter(k => /^(wm_journal_entries|wm-journal|wm_story_review_v1)/.test(k))).toEqual([]);
    expect([...session.m.keys()].filter(k => k.startsWith("wm:journal-ticket-at-send:v1"))).toEqual([]);
  });

  it("TRADER-CLAIMED: held with no marker and no stamp → a count (never contents); claim pressed → adopted identically", async () => {
    const { readJournalStorage } = await import("@/lib/traderMemory/adapters/journalStorage");
    const { claimHeldLegacyRows, heldLegacyRows } = await import("./managementOwner");
    const { heldClaimLine } = await import("@/components/journal/HeldJournalClaim");
    legacyJournal();
    local.setItem(MANAGEMENT_PLAN_KEY, JSON.stringify({ wmd_L: JSON.parse(JSON.stringify(plan("wmd_L", NOW - 60_000))) }));
    const planRaw = local.getItem(MANAGEMENT_PLAN_KEY);
    setManagementOwner("founder-id", undefined, null);               // cache cleared / copied profile: nothing ties them
    expect(readJournalStorage(local).status).toBe("ABSENT");
    const held = heldLegacyRows();
    expect(held).toEqual({ journalEntries: 3, otherStores: 3 });     // plans + reviews + tickets
    const line = heldClaimLine(held!);
    expect(line).toBe("This browser holds 3 journal entries saved before entries were tied to an account (with saved plans or review answers from that time). If they're yours:");
    expect(line).not.toMatch(/MNQ1!|retest|sized down|news/);       // a count, never the contents
    expect(claimHeldLegacyRows()).toBeNull();                         // nothing left held
    expect(local.getItem("wm_journal_entries:founder-id")).toBe(FOUNDER_BOOK);
    expect(local.getItem("wm-journal:founder-id")).toBe(OLD_BOOK);
    expect(local.getItem("wm_story_review_v1:founder-id")).toBe(FOUNDER_REVIEWS);
    expect(session.getItem("wm:journal-ticket-at-send:v1:founder-id")).toBe(FOUNDER_TICKETS);
    expect(local.getItem(`${MANAGEMENT_PLAN_KEY}:founder-id`)).toBe(planRaw);
    expect(readJournalStorage(local).records).toEqual(JSON.parse(FOUNDER_BOOK));
    expect(heldLegacyRows()).toBeNull();
  });

  it("claim NOT pressed → still held, nothing lost; a guest is never offered a claim and cannot claim", async () => {
    const { claimHeldLegacyRows, heldLegacyRows } = await import("./managementOwner");
    legacyJournal();
    setManagementOwner("founder-id", undefined, null);
    expect(heldLegacyRows()?.journalEntries).toBe(3);
    setManagementOwner("founder-id", undefined, null);               // reloads, re-renders: no press, no move
    expect(local.getItem("wm_journal_entries")).toBe(FOUNDER_BOOK);
    expect(local.getItem("wm_story_review_v1")).toBe(FOUNDER_REVIEWS);
    expect(local.getItem("wm_journal_entries:founder-id")).toBeNull();
    setManagementOwner(null);
    expect(heldLegacyRows()).toBeNull();
    expect(claimHeldLegacyRows()).toBeNull();
    expect(local.getItem("wm_journal_entries")).toBe(FOUNDER_BOOK);
    const src = readFileSync(path.join(SRC, "components/journal/HeldJournalClaim.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(1_000);
    expect(src).toContain("if (!armed) { setArmed(true); return; }");   // two presses
    expect(readFileSync(path.join(SRC, "app/journal/page.tsx"), "utf8")).toContain("<HeldJournalClaim />");
  });
});
