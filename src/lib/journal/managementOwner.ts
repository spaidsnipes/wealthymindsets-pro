/**
 * WHOSE PLANS ARE THESE — member isolation for the management stores
 * (plans, pre-trade drafts, Morning Prep day rules). Garden 19 isolation audit.
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
 *     A guest never adopts and never removes them.
 *
 * AuthContext is the one writer of the current owner. Before it has spoken, a
 * browser has no key either (nothing is read or written under a guess). Outside
 * a browser (unit tests, server) the unsuffixed key is used so the pure stores
 * stay testable with an injected storage.
 */

export const MANAGEMENT_BASE_KEYS = ["wm:management-plan:v1", "wm:management-plan-draft:v1", "wm:management-day-rules:v1"] as const;
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

/**
 * Merge legacy rows into a member's rows — never dropping one.
 *   plans   map Decision_ID → snapshot: union; the same decision in both keeps the EARLIER freeze
 *           (first freeze wins), with the later one's amendments kept if it has more of them;
 *   drafts  map market → draft: union; the same market keeps the NEWER draft;
 *   rules   one day's object: the NEWER one (an older day's rules would be dropped by its reader anyway).
 */
export function mergeManagementRows(base: string, legacy: unknown, mine: unknown): unknown {
  if (mine == null) return legacy;
  if (legacy == null) return mine;
  if (base === "wm:management-day-rules:v1") return (num(legacy, "updatedAtMs") ?? 0) > (num(mine, "updatedAtMs") ?? 0) ? legacy : mine;
  if (!isMap(legacy) || !isMap(mine)) return mine;
  const out: Record<string, unknown> = { ...legacy };
  for (const [k, v] of Object.entries(mine)) {
    const l = out[k];
    if (l === undefined) { out[k] = v; continue; }
    if (base === "wm:management-plan:v1") {
      const lf = num(l, "frozenAtMs") ?? Infinity, mf = num(v, "frozenAtMs") ?? Infinity;
      out[k] = mf <= lf ? v : l;
    } else {
      out[k] = (num(v, "updatedAtMs") ?? 0) >= (num(l, "updatedAtMs") ?? 0) ? v : l;
    }
  }
  return out;
}

/** Move each legacy key's rows into the member's suffixed key (merging), then remove the legacy key. */
export function adoptLegacyManagementRows(memberId: string, st: OwnerStorage): void {
  for (const base of MANAGEMENT_BASE_KEYS) {
    let legacyRaw: string | null = null;
    try { legacyRaw = st.getItem(base); } catch { continue; }
    if (legacyRaw == null) continue;
    const legacy = parse(legacyRaw);
    if (legacy === undefined) continue;   // unreadable: left in place for a human, never destroyed
    const key = `${base}:${encodeURIComponent(memberId)}`;
    let mineRaw: string | null = null;
    try { mineRaw = st.getItem(key); } catch { continue; }
    const mine = parse(mineRaw);
    if (mine === undefined) continue;
    try {
      st.setItem(key, JSON.stringify(mergeManagementRows(base, legacy, mine)));
      st.removeItem(base);
    } catch { /* storage full: the legacy key stays; nothing is lost */ }
  }
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
  const tie = (typeof marker === "string" && marker.trim()) ? marker.trim() : stamp;
  return tie === memberId;
}

export function setManagementOwner(next: string | null, storage?: OwnerStorage | null, legacyMarker?: string | null): void {
  const id = typeof next === "string" && next.trim() ? next.trim() : null;
  const changed = id !== owner;
  owner = id;
  const st = storage ?? (inBrowser() ? (() => { try { return window.localStorage; } catch { return null; } })() : null);
  if (st && id && legacyRowsBelongTo(id, legacyMarker, st)) {
    adoptLegacyManagementRows(id, st);
    try { st.removeItem(LEGACY_OWNER_STAMP_KEY); } catch { /* skip */ }
  }
  if (changed) {
    for (const l of [...listeners]) { try { l(); } catch { /* a listener never blocks auth */ } }
    if (inBrowser()) { try { window.dispatchEvent(new Event(MANAGEMENT_OWNER_EVENT)); } catch { /* no events */ } }
  }
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
