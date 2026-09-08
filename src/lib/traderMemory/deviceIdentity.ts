/**
 * WHICH DEVICE IS THIS — the witness half of decision identity.
 *
 * `sharedPositionAuthority.ClientIntentWrite` requires a `deviceId`, and
 * `mintDecisionId` requires a witness for the birth. Neither could be
 * satisfied, because nothing in the repo knew which machine it was running
 * on. This is that one thing, and it is deliberately the ONLY one (H21): a
 * second device-id producer would mean the iPad introduced itself by one name
 * when it recorded intent and another when it read the position back, and
 * every cross-device answer would be wrong in a way nobody could see.
 *
 * WHAT THIS IS NOT. It is not a user id, not a session id, not an analytics
 * fingerprint, and it is not derived from anything about the machine or the
 * person. It is an opaque random string that this browser remembers, and it
 * exists for exactly one sentence: "the intent came from a different device
 * than the one asking."
 *
 * SSR AND PRIVATE MODE. Server render has no storage, and a locked-down
 * browser can throw on access. Both return UNKNOWN rather than minting a
 * throwaway: an id that changes every render would make one device look like
 * hundreds, which is worse than admitting the device is unnamed.
 */

const STORAGE_KEY = "wm.device-id.v1";

/** A device that could not name itself. Distinct from "not asked yet". */
export const UNKNOWN_DEVICE_ID = "" as const;

let cached: string | null = null;

/**
 * The id for this browser, stable across reloads, or UNKNOWN_DEVICE_ID.
 *
 * `makeId` is injected so the Sentinels never touch real randomness and can
 * prove the SECOND call returns the FIRST call's value — which is the entire
 * property worth having.
 */
export function thisDeviceId(makeId: () => string = defaultMakeId): string {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return UNKNOWN_DEVICE_ID;

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing !== null && existing.trim() !== "") {
      cached = existing;
      return cached;
    }
    const minted = makeId();
    if (minted.trim() === "") return UNKNOWN_DEVICE_ID;
    window.localStorage.setItem(STORAGE_KEY, minted);
    cached = minted;
    return cached;
  } catch {
    // Storage denied. The device is unnamed, and says so.
    return UNKNOWN_DEVICE_ID;
  }
}

/** Test seam only. Production never needs to forget which device it is. */
export function resetDeviceIdCacheForTests(): void {
  cached = null;
}

function defaultMakeId(): string {
  const c = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return `dev_${c.randomUUID()}`;
  return `dev_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}
