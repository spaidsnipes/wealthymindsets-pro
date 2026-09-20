/**
 * B-501 · TABS — SAME DECISION_ID. The vault tank that lets one decision
 * survive a tab boundary, a reload, and a trip away from its own symbol.
 *
 * ── THE SHEET, QUOTED BY EFFECT ─────────────────────────────────────────────
 *
 * B-501 draws six tabs — ARCHITECTURAL, STRUCTURAL, MEP, PLUMBING, ELECTRICAL,
 * FIRE PROTECTION — and every one of them shows the SAME glass elements for
 * `DECISION_ID = D-501-G01`. The sheet's own words: "All tabs show the same
 * glass elements." "Consistent visibility maintained."
 *
 * The contractor index states it as a rule rather than a picture: the same
 * DECISION_ID follows the decision through tabs, glasses, mobile, journal,
 * inspect, and broker expression — and you do NOT mint a new ID for zoom,
 * overlay, refresh, symbol change, or inspect.
 *
 * ── THE DEFECT THIS OWNER NAMES ─────────────────────────────────────────────
 *
 * MEASURED on production /charts, 2026-09-20, two tabs open on the same
 * browser profile against the serving Worker:
 *
 *   tab A localStorage keys ........ 48
 *   tab B localStorage keys ........ 48
 *   wm.device-id.v1 ................ dev_282b7987-… in BOTH
 *   keys matching /decision/i ...... []          ← in both
 *   [data-decision-id] in the DOM .. 0           ← in both
 *
 * Two findings, and the second is the one that matters:
 *
 *   1. The identity is React state and nothing else. It dies with the tab.
 *      Every tab that crosses permission mints its own `wmd_…`, so the same
 *      trader, on the same device, looking at the same instrument, is two
 *      decisions. That is the aliasing failure `decisionIdentity.ts` was
 *      written to prevent, arriving through the one door it does not watch.
 *
 *   2. The transport was never missing. Both tabs already read the SAME
 *      `wm.device-id.v1` out of the SAME origin's localStorage. Decision
 *      identity simply never got on it.
 *
 * ── WHY THIS IS A SEPARATE MODULE ───────────────────────────────────────────
 *
 * `decisionIdentity.ts` says of itself: "PURE MODULE — no React, no I/O, no
 * Supabase." That is not a style note, it is what makes identity reproducible
 * in a test and identical between the server that mints and the client that
 * reads. Persistence therefore lives HERE, and the pure module stays clean.
 *
 * The direction of trust is one-way: this module may hand a rehydrated
 * identity BACK to the pure layer, but it may never mint. Anything read off
 * disk is suspect until `isDecisionId` has looked at it — which is the exact
 * case that function's header was written for: "a persisted `decisionId: 42`
 * … was accepted and handed downstream wearing a brand that promised it had
 * been minted."
 *
 * ── WHY THE KEY CARRIES OWNER AND UNDERLYING ────────────────────────────────
 *
 * The stored unit is a `ScopedDecisionIdentity`, so the key must be scoped the
 * same way or the scope check becomes a lie told by the filename. Owner-first,
 * because `logoutIsolation.ts` purges by owner and an unscoped decision key
 * would let User B inherit User A's decision — a far worse bug than the one
 * being fixed.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────
 *
 * It does not sync ACROSS devices. `bornOnDeviceId` is preserved exactly as
 * minted, so a decision rehydrated in a second tab still names the device that
 * actually witnessed its birth. A cross-device claim would need a server and
 * is not what B-501 draws — the sheet's six tabs are six views of one machine.
 */

import type { ScopedDecisionIdentity } from "@/lib/expressionShortlist";

import {
  DECISION_IDENTITY_LAW_VERSION,
  isDecisionId,
  type DecisionBirthCause,
  type DecisionIdentity,
} from "./decisionIdentity";

/**
 * Same-tab notification. The `storage` event famously does NOT fire in the tab
 * that performed the write, so a pair is required: this for here, `storage`
 * for there. `useLearningGenomeBundle` and `paperTrade` both already carry the
 * pair; this is the same idiom, not a new one.
 */
export const DECISION_CONTINUITY_CHANGED_EVENT =
  "wm:decision-continuity:changed:v1";

const VERSION = 1 as const;

/** Owner-scoped prefix. `logoutIsolation` matches on this. */
export const DECISION_CONTINUITY_KEY_PREFIX = "wm:decision-identity:v1:";

interface DecisionContinuityEnvelope {
  readonly version: typeof VERSION;
  readonly owner: string;
  readonly underlying: string;
  readonly identity: DecisionIdentity;
}

type StoragePort = Pick<Storage, "getItem" | "setItem">;

/**
 * The four causes, as a runtime list. `satisfies` ties it to the union, so
 * widening `DecisionBirthCause` a third time without widening this list is a
 * compile error rather than a decision that silently fails to rehydrate.
 */
const BIRTH_CAUSES = [
  "PERMISSION_GRANTED",
  "EXPLICIT_INTENT",
  "RECORDED_WAIT",
  "MANUAL_MODE_ENTERED",
] as const satisfies readonly DecisionBirthCause[];

function isBirthCause(value: unknown): value is DecisionBirthCause {
  return (
    typeof value === "string"
    && (BIRTH_CAUSES as readonly string[]).includes(value)
  );
}

/**
 * The key for one scene, or null when the scene is not nameable.
 *
 * A blank owner or underlying returns null rather than a key with an empty
 * segment: `wm:decision-identity:v1::AAPL` would be a real key that every
 * signed-out visitor shares, which is the collision this scoping exists to
 * prevent.
 */
export function decisionContinuityKey(
  owner: string | null | undefined,
  underlying: string | null | undefined,
): string | null {
  const o = owner?.trim() ?? "";
  const u = underlying?.trim() ?? "";
  if (o === "" || u === "") return null;
  return `${DECISION_CONTINUITY_KEY_PREFIX}${encodeURIComponent(o)}:${encodeURIComponent(u)}`;
}

function browserStorage(): StoragePort | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Private mode / storage denied. Continuity is unavailable, and the caller
    // learns that as `null` — an absence, never a freshly minted substitute.
    return null;
  }
}

/**
 * Is this parsed blob really an identity that was minted by the pure layer?
 *
 * Every field is checked, including `lawVersion`. A v2 identity read by v1
 * code must be refused, not coerced: the whole point of a law version is that
 * the reader admits when it does not understand what it found.
 */
function isDecisionIdentity(value: unknown): value is DecisionIdentity {
  if (!value || typeof value !== "object") return false;
  const id = value as Record<string, unknown>;
  return (
    id.lawVersion === DECISION_IDENTITY_LAW_VERSION
    && isDecisionId(id.decisionId)
    && typeof id.bornAt === "number"
    && Number.isFinite(id.bornAt)
    && isBirthCause(id.bornFrom)
    && typeof id.bornOnDeviceId === "string"
    && id.bornOnDeviceId.trim() !== ""
  );
}

/**
 * The decision already born on this scene, from a previous tab or a previous
 * life of this one. `null` means "none found" AND "found something I could not
 * vouch for" — deliberately the same answer, because both must lead the caller
 * to the same place: disclose the absence, wait for a real birth.
 *
 * The envelope's own `owner`/`underlying` are re-checked against the arguments
 * even though the key already encodes them. A key can be written by hand, and
 * a scope that only the filename asserts is not a scope.
 */
export function readSceneDecision(
  owner: string | null | undefined,
  underlying: string | null | undefined,
  storage: StoragePort | null = browserStorage(),
): ScopedDecisionIdentity | null {
  const key = decisionContinuityKey(owner, underlying);
  if (!key || !storage) return null;

  const o = owner!.trim();
  const u = underlying!.trim();

  try {
    const raw = storage.getItem(key);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as Partial<DecisionContinuityEnvelope>;
    if (
      parsed.version !== VERSION
      || parsed.owner !== o
      || parsed.underlying !== u
      || !isDecisionIdentity(parsed.identity)
    ) {
      return null;
    }
    return { underlying: u, owner: o, identity: parsed.identity };
  } catch {
    return null;
  }
}

function dispatchChanged(key: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DECISION_CONTINUITY_CHANGED_EVENT, { detail: { key } }),
  );
}

/**
 * Record a born decision so the next tab finds it instead of minting a second
 * one. Returns whether the decision is actually durable — a `false` here means
 * continuity will NOT hold, and a caller that shows a continuity claim must
 * not show one on `false`.
 *
 * The write is read back before success is reported, for the reason
 * `morningPrepStorage` already established: a quota-exceeded `setItem` can
 * fail without throwing on some engines, and an unverified write is how a
 * surface comes to promise memory it does not have.
 */
export function writeSceneDecision(
  scoped: ScopedDecisionIdentity,
  options: {
    storage?: StoragePort | null;
    onChanged?: (key: string) => void;
  } = {},
): boolean {
  const key = decisionContinuityKey(scoped.owner, scoped.underlying);
  const storage =
    options.storage === undefined ? browserStorage() : options.storage;
  if (!key || !storage || !isDecisionIdentity(scoped.identity)) return false;

  const serialized = JSON.stringify({
    version: VERSION,
    owner: scoped.owner.trim(),
    underlying: scoped.underlying.trim(),
    identity: scoped.identity,
  } satisfies DecisionContinuityEnvelope);

  try {
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) return false;
    (options.onChanged ?? dispatchChanged)(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Does this `storage` event concern decision continuity at all?
 *
 * Exported because the filtering is the part that is easy to get wrong and
 * impossible to see wrong: a listener that forgets the `storageArea` check
 * will also fire for sessionStorage, and one that forgets the prefix will
 * recompute on every unrelated key the app writes.
 */
export function isDecisionContinuityStorageEvent(
  event: Pick<StorageEvent, "key" | "storageArea">,
  localStorageArea: Storage | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): boolean {
  if (!event.key || !event.key.startsWith(DECISION_CONTINUITY_KEY_PREFIX)) {
    return false;
  }
  if (
    event.storageArea
    && localStorageArea
    && event.storageArea !== localStorageArea
  ) {
    return false;
  }
  return true;
}
