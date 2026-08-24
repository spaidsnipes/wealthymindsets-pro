/**
 * logoutIsolation — bounded owner-local localStorage cleanup for
 * sign-out flows.
 *
 * Founder Nectar Persistence Authority:
 *   "logout/account transition clears owner-local symbol, Nectar and
 *    canonical runtime state without deleting server history"
 *
 * Today sessionSymbolStore, paperTrade, WMS points, journal, and
 * profile-draft storage are all keyed by intrinsic feature name
 * (not by owner). On a shared browser User B would inherit User A's
 * state on sign-in. This module is the single canonical list of
 * owner-scoped browser-local keys to purge on sign-out.
 *
 * NOT touched here (separately owned, per Sentinel boundary):
 *   · wm:nectar:coverage-continuity:v1   (sessionNectar owner)
 *   · wm_settings                        (theme / font size are device prefs, not user data)
 *   · wm-install-dismissed               (PWA install prompt state, device-level)
 *   · wm-watchlist-prices                (cache, not user data)
 *   · wm-tape-symbols                    (ticker tape customization, device-level)
 *   · HM_CACHE_PREFIX + tf               (heatmap %s cache, not user data)
 *
 * Extends automatically when a new owner-scoped key appears — add
 * it to OWNER_SCOPED_KEYS + a matching clear... helper.
 *
 * Never throws. Individual removals are wrapped so one storage
 * failure never blocks the sign-out flow.
 */

const OWNER_SCOPED_KEYS: readonly string[] = [
  "wm-profile",           // profile draft (avatar, bio, botName)
  "wm-profile-avatar",    // avatar data URL
  "wm-profile-bg",        // profile background color
  "wm-radio-liked",       // liked radio tracks
  "wm_songs",             // user-uploaded music tracks
  "wm_watchlists",        // user watchlist collections
  "wm_quick_syms",        // SearchPanel quick-access symbols
  "wm_scanner_starred",   // scanner starred symbols
  "wm_scanner_alerted",   // scanner alerted symbols
  "wm_journal_entries",   // journal entries (owner-specific)
  "wm_edu_progress",      // education module completion / notes
  "wm_api_keys",          // user-supplied NewsAPI / X bearer credentials
  "wm_creator_waitlist",  // creator waitlist email, handle and tier
] as const;

/** Dynamic per-lesson Academy notes share this exact owner-scoped prefix. */
const OWNER_SCOPED_PREFIXES: readonly string[] = ["wm-notes-"] as const;

/**
 * clearOwnerScopedLocalStorage — removes every owner-scoped
 * localStorage key. Called from AuthContext.signOut /
 * signOutAllDevices in addition to the three domain-specific
 * clearers (clearAllSessionSymbols, clearPaperState, clearWMSState).
 *
 * Returns the count of keys actually removed for observability
 * (though the sign-out flow does not consult it).
 */
export function clearOwnerScopedLocalStorage(): number {
  if (typeof window === "undefined") return 0;
  let removed = 0;
  const keys = new Set<string>(OWNER_SCOPED_KEYS);

  // Snapshot dynamic keys before removing anything so storage index shifts do
  // not skip a lesson note. Each enumeration operation is isolated: private
  // mode or a single broken key must not prevent the fixed owner keys from
  // being cleared.
  try {
    const length = window.localStorage.length;
    for (let index = 0; index < length; index += 1) {
      try {
        const key = window.localStorage.key(index);
        if (key && OWNER_SCOPED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          keys.add(key);
        }
      } catch { /* skip only this storage index */ }
    }
  } catch { /* fixed owner keys still clear below */ }

  for (const key of keys) {
    try {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
        removed += 1;
      }
    } catch { /* private mode / quota — skip this key */ }
  }
  return removed;
}

/**
 * A server logout request is best-effort from the browser's point of view.
 * Owner-local data must still be cleared when that request is offline or
 * otherwise rejects. Each cleanup is isolated so one broken store cannot
 * prevent the remaining owner state from being removed.
 */
export async function completeLocalSignOut(
  serverLogout: Promise<unknown>,
  cleanups: readonly (() => void)[],
): Promise<void> {
  // Attach the rejection handler immediately, but never put a slow network
  // request in front of browser-local privacy cleanup.
  const settledServerLogout = serverLogout.catch(() => {
    // The server session may remain active, but this browser must not retain
    // the previous owner's local data. The next authenticated request remains
    // responsible for reporting the server-side session truth.
  });

  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch {
      // Keep clearing independent owner-local domains.
    }
  }

  await settledServerLogout;
}
