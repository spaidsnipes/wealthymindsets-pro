/**
 * WHOSE PLANS ARE THESE — member isolation for the management stores
 * (plans, pre-trade drafts, Morning Prep day rules) AND the journal stores (the
 * journal book, review answers, tickets as sent). Garden 19 isolation audit.
 *
 * These stores live in this browser's localStorage. Two different members on
 * the SAME browser must never read each other's rows, and a guest reads none:
 *
 *   · every management key is suffixed with the signed-in member's id
 *     (`wm:management-plan:v1:<id>`), so member B's reads cannot reach A's;
 *   · a guest (auth resolved, nobody signed in) has NO key: reads are empty and
 *     writes are refused — a guest's draft never waits for the next member;
 *   · sign-out still purges every management key (logoutIsolation prefixes);
 *   · the unsuffixed LEGACY keys (rows saved before isolation) are ADOPTED only by
 *     the member they can be tied to (legacyRowsBelongTo: the browser's last-known
 *     account before this sign-in): their rows move into that member's suffixed
 *     key (merged when both exist — no row is ever dropped), then the legacy key
 *     is removed. Untied rows are HELD (unread, never deleted, never handed over).
 *     A guest never adopts and never removes them. The journal book moves BYTE
 *     FOR BYTE when the member has none yet (the Founder's entries are never
 *     re-serialized, filtered, dropped or hidden from him).
 *
 * AuthContext is the one writer of the current owner. Before it has spoken, a
 * browser has no key either (nothing is read or written under a guess). Outside
 * a browser (unit tests, server) the unsuffixed key is used so the pure stores
 * stay testable with an injected storage.
 */

export const MANAGEMENT_BASE_KEYS = ["wm:management-plan:v1", "wm:management-plan-draft:v1", "wm:management-day-rules:v1"] as const;
/**
 * The member's journal stores, under the SAME owner (Garden 19, 2026-10-08 — one owner, not a copy):
 * the journal book (canonical + the older "wm-journal" key), review answers in the trader's own
 * words, and — in sessionStorage — tickets as sent awaiting "Add to Journal".
 */
export const JOURNAL_MEMBER_BASE_KEYS = ["wm_journal_entries", "wm-journal", "wm_story_review_v1"] as const;
export const SESSION_MEMBER_BASE_KEYS = ["wm:journal-ticket-at-send:v1"] as const;
/** Every localStorage base this owner keys per member and adopts from. */
export const MEMBER_LOCAL_BASE_KEYS = [...MANAGEMENT_BASE_KEYS, ...JOURNAL_MEMBER_BASE_KEYS] as const;
export const MANAGEMENT_OWNER_EVENT = "wm:management-owner";

/** undefined = never set · null = resolved guest · string = signed-in member id. */
let owner: string | null | undefined;
const listeners = new Set<() => void>();

const inBrowser = () => typeof window !== "undefined";

/** The storage key for a management store under the current owner, or null when nobody may read or write. */
export function managementKey(base: string): string | null {
  if (typeof owner === "string") return `${base}:${encodeURIComponent(owner)}`;
  if (owner === null) return null;
  return inBrowser() ? null : base;
}

export function currentManagementOwner(): string | null | undefined {
  return owner;
}

type OwnerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const parse = (raw: string | null): unknown => { if (!raw) return null; try { return JSON.parse(raw); } catch { return undefined; } };
const isMap = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, k: string) => (isMap(v) && typeof v[k] === "number" ? (v[k] as number) : null);

const identityOf = (row: unknown, field: string): string =>
  isMap(row) && typeof row[field] === "string" && (row[field] as string) !== "" ? `${field}:${row[field] as string}` : `json:${JSON.stringify(row)}`;

/** List union: every one of mine, then every legacy row mine does not already hold. */
function unionList(legacy: unknown[], mine: unknown[], field: string): unknown[] {
  const have = new Set(mine.map(r => identityOf(r, field)));
  return [...mine, ...legacy.filter(r => !have.has(identityOf(r, field)))];
}

/**
 * Merge legacy rows into a member's rows — never dropping one. `undefined` = the two cannot be
 * merged safely, so the legacy rows are HELD where they are (never overwritten, never deleted).
 *   plans    map Decision_ID → snapshot: union; the same decision in both keeps the EARLIER freeze
 *            (first freeze wins);
 *   drafts   map market → draft: union; the same market keeps the NEWER draft;
 *   rules    one day's object: the NEWER one (an older day's rules would be dropped by its reader anyway);
 *   journal  entry list: union by entry id — every one of the member's entries, then every legacy entry
 *            the member does not already hold (an entry without an id is compared byte for byte);
 *   reviews  map entry → review: union; the same entry keeps the NEWER review;
 *   tickets  list: union by client order id.
 */
export function mergeManagementRows(base: string, legacy: unknown, mine: unknown): unknown {
  if (mine == null) return legacy;
  if (legacy == null) return mine;
  if (base === "wm:management-day-rules:v1") return (num(legacy, "updatedAtMs") ?? 0) > (num(mine, "updatedAtMs") ?? 0) ? legacy : mine;
  if (base === "wm_journal_entries" || base === "wm-journal") return Array.isArray(legacy) && Array.isArray(mine) ? unionList(legacy, mine, "id") : undefined;
  if (base === "wm:journal-ticket-at-send:v1") return Array.isArray(legacy) && Array.isArray(mine) ? unionList(legacy, mine, "clientOrderId") : undefined;
  if (!isMap(legacy) || !isMap(mine)) return base.startsWith("wm:management-") ? mine : undefined;
  const out: Record<string, unknown> = { ...legacy };
  for (const [k, v] of Object.entries(mine)) {
    const l = out[k];
    if (l === undefined) { out[k] = v; continue; }
    if (base === "wm:management-plan:v1") {
      const lf = num(l, "frozenAtMs") ?? Infinity, mf = num(v, "frozenAtMs") ?? Infinity;
      out[k] = mf <= lf ? v : l;
    } else {
      const key = base === "wm_story_review_v1" ? "updatedAt" : "updatedAtMs";
      out[k] = (num(v, key) ?? 0) >= (num(l, key) ?? 0) ? v : l;
    }
  }
  return out;
}

/** The member's own key for a base (used by adopt; readers go through managementKey). */
export const memberKeyOf = (base: string, memberId: string): string => `${base}:${encodeURIComponent(memberId)}`;

function adoptBase(base: string, memberId: string, st: OwnerStorage): void {
  let legacyRaw: string | null = null;
  try { legacyRaw = st.getItem(base); } catch { return; }
  if (legacyRaw == null) return;
  const legacy = parse(legacyRaw);
  if (legacy === undefined) return;   // unreadable: left in place for a human, never destroyed
  const key = memberKeyOf(base, memberId);
  let mineRaw: string | null = null;
  try { mineRaw = st.getItem(key); } catch { return; }
  // The member has no rows yet: the legacy BYTES move exactly as they are (byte for byte —
  // nothing re-serialized, nothing filtered), verified by readback before the legacy key goes.
  // The member already has rows: union them (merge) — no row from either side is dropped.
  let next: string;
  if (mineRaw == null) next = legacyRaw;
  else {
    const mine = parse(mineRaw);
    if (mine === undefined) return;
    const merged = mergeManagementRows(base, legacy, mine);
    if (merged === undefined) return;   // cannot merge safely: HELD
    next = JSON.stringify(merged);
  }
  try {
    st.setItem(key, next);
    if (st.getItem(key) !== next) return;   // not verified: the legacy key stays; nothing is lost
    st.removeItem(base);
  } catch { /* storage full: the legacy key stays; nothing is lost */ }
}

/** Move each legacy key's rows into the member's suffixed key (byte for byte, or merged), then remove the legacy key. */
export function adoptLegacyManagementRows(memberId: string, st: OwnerStorage, session?: OwnerStorage | null): void {
  for (const base of MEMBER_LOCAL_BASE_KEYS) adoptBase(base, memberId, st);
  if (session) for (const base of SESSION_MEMBER_BASE_KEYS) adoptBase(base, memberId, session);
}

/**
 * Set by AuthContext whenever the signed-in member is known (id) or auth has
 * resolved to nobody (null). A member ADOPTS any legacy (unsuffixed) rows; a
 * guest touches nothing.
 */
export const LEGACY_OWNER_STAMP_KEY = "wm:management-owner:v1";

/**
 * Whether legacy rows may be handed to `memberId`: only when they can be TIED
 * to that member — the browser's last-known account (AuthContext's cached user,
 * read before this load's sign-in replaced it) or an older owner stamp names
 * the same member. No marker, or another member's marker → HOLD: the rows stay
 * in the legacy key, unread by every surface (readers only open suffixed keys),
 * never deleted and never handed over. Sign-out purges legacy keys, so held
 * rows only exist after a session expired without one.
 */
export function legacyRowsBelongTo(memberId: string, marker: string | null | undefined, st: Pick<Storage, "getItem"> | null): boolean {
  let stamp: string | null = null;
  try { stamp = st?.getItem(LEGACY_OWNER_STAMP_KEY) ?? null; } catch { stamp = null; }
  // A stamp written when that account's session EXPIRED (stampLegacyOwner) is the stronger tie:
  // it names whose rows these were before anyone else signed in on this browser.
  const tie = stamp ?? ((typeof marker === "string" && marker.trim()) ? marker.trim() : null);
  return tie === memberId;
}

const anyLegacyRows = (st: Pick<Storage, "getItem">): boolean =>
  MEMBER_LOCAL_BASE_KEYS.some(b => { try { return st.getItem(b) != null; } catch { return false; } });

/**
 * A session ended WITHOUT a sign-out (the server said the cookie is no longer valid): stamp the
 * account the legacy rows on this browser belonged to, so the next sign-in of THAT member adopts
 * them even after a reload cleared the cached account — and nobody else does. Written only when
 * legacy rows exist and no stamp is there yet (the first account wins; it is never re-pointed).
 */
export function stampLegacyOwner(memberId: string | null | undefined, storage?: OwnerStorage | null): void {
  const id = typeof memberId === "string" ? memberId.trim() : "";
  if (!id) return;
  const st = storage ?? (inBrowser() ? (() => { try { return window.localStorage; } catch { return null; } })() : null);
  if (!st || !anyLegacyRows(st)) return;
  try { if (st.getItem(LEGACY_OWNER_STAMP_KEY) == null) st.setItem(LEGACY_OWNER_STAMP_KEY, id); } catch { /* skip */ }
}

export function setManagementOwner(next: string | null, storage?: OwnerStorage | null, legacyMarker?: string | null, sessionStorage?: OwnerStorage | null): void {
  const id = typeof next === "string" && next.trim() ? next.trim() : null;
  const changed = id !== owner;
  owner = id;
  const st = storage ?? (inBrowser() ? (() => { try { return window.localStorage; } catch { return null; } })() : null);
  const ss = sessionStorage ?? (storage ? null : inBrowser() ? (() => { try { return window.sessionStorage ?? null; } catch { return null; } })() : null);
  if (st && id && legacyRowsBelongTo(id, legacyMarker, st)) {
    adoptLegacyManagementRows(id, st, ss);
    // The stamp goes only once every legacy row has moved (a row that could not move keeps its tie).
    if (!anyLegacyRows(st)) { try { st.removeItem(LEGACY_OWNER_STAMP_KEY); } catch { /* skip */ } }
  }
  if (changed) notifyOwnerListeners();
}

function notifyOwnerListeners(): void {
  for (const l of [...listeners]) { try { l(); } catch { /* a listener never blocks auth */ } }
  if (inBrowser()) { try { window.dispatchEvent(new Event(MANAGEMENT_OWNER_EVENT)); } catch { /* no events */ } }
}

const localOf = (storage?: OwnerStorage | null): OwnerStorage | null =>
  storage ?? (inBrowser() ? (() => { try { return window.localStorage; } catch { return null; } })() : null);
const sessionOf = (storage?: OwnerStorage | null, session?: OwnerStorage | null): OwnerStorage | null =>
  session ?? (storage ? null : inBrowser() ? (() => { try { return window.sessionStorage ?? null; } catch { return null; } })() : null);

export interface HeldLegacyRows {
  /** Readable journal entries held (the canonical legacy book, else the older one). Counted, never shown. */
  readonly journalEntries: number;
  /** Held plans / plan drafts / day rules / review answers / tickets present (stores, not contents). */
  readonly otherStores: number;
}

/**
 * TRADER-CLAIMED PATH (Garden 19, 2026-10-08). Rows saved before isolation that no marker or stamp
 * could tie to anyone are HELD. A signed-in member is told only HOW MANY journal entries this browser
 * holds — never what they say — and may claim them. Null for a guest, before auth, or when nothing is held.
 */
export function heldLegacyRows(storage?: OwnerStorage | null, session?: OwnerStorage | null): HeldLegacyRows | null {
  if (typeof owner !== "string") return null;
  const st = localOf(storage);
  if (!st) return null;
  const ss = sessionOf(storage, session);
  const count = (base: string): number | null => {
    try { const v = parse(st.getItem(base)); return Array.isArray(v) ? v.length : null; } catch { return null; }
  };
  const journalEntries = count("wm_journal_entries") ?? count("wm-journal") ?? 0;
  const present = (s: OwnerStorage | null, b: string) => { try { return s?.getItem(b) != null; } catch { return false; } };
  const otherStores = [...MANAGEMENT_BASE_KEYS, "wm_story_review_v1"].filter(b => present(st, b)).length
    + SESSION_MEMBER_BASE_KEYS.filter(b => present(ss, b)).length;
  return journalEntries > 0 || otherStores > 0 ? { journalEntries, otherStores } : null;
}

/**
 * The member pressed "Bring them into my journal" (and confirmed). Adopts every held store into the
 * CURRENT member's keys through the same move as a tied sign-in (byte for byte when the member has
 * none; union otherwise; unreadable rows stay held). Only ever called from that confirmed press.
 * Returns what is still held afterwards (null = nothing).
 */
export function claimHeldLegacyRows(storage?: OwnerStorage | null, session?: OwnerStorage | null): HeldLegacyRows | null {
  if (typeof owner !== "string") return null;
  const st = localOf(storage);
  if (!st) return null;
  adoptLegacyManagementRows(owner, st, sessionOf(storage, session));
  if (!anyLegacyRows(st)) { try { st.removeItem(LEGACY_OWNER_STAMP_KEY); } catch { /* skip */ } }
  notifyOwnerListeners();   // every open surface re-reads the member's own keys
  return heldLegacyRows(storage, session);
}

export function subscribeManagementOwner(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Tests only: forget the owner (back to "never set"). */
export function resetManagementOwnerForTests(): void {
  owner = undefined;
  listeners.clear();
}
