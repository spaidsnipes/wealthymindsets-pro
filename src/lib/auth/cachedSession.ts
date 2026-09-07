/**
 * WHO WM THINKS THE TRADER IS, READ RATHER THAN ASSERTED.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * `AuthContext` restored the signed-in account from localStorage like this:
 *
 *   const raw = localStorage.getItem("wm_session_v1");
 *   return raw ? (JSON.parse(raw) as WMUser) : null;
 *
 * Nothing checks that the parsed value is a user. And the route guard's test
 * for "is someone signed in" is TRUTHINESS — `if (!user) return
 * "SIGN_IN_REQUIRED"`. So any truthy JSON becomes a signed-in trader. Measured
 * against the code as it stood, with a real route-guard call:
 *
 *   `{}` / `"corrupted"` / `[]` / `42`
 *       -> truthy, gate = PROFILE_SETUP_REQUIRED
 *       -> the guard runs `router.replace("/profile?setup=1")` on EVERY
 *          navigation. The trader is not signed out, they are TRAPPED on the
 *          profile-setup screen, with no explanation and no way back. Clearing
 *          site data is the only exit and nothing on screen says so.
 *
 *   `{"id":123,...}`
 *       -> truthy, gate = READY, and the whole app runs authenticated under a
 *          NUMERIC identity. Owner-scoped reads and writes then key off `123`.
 *          Measured: the journal book returned a snapshot stamped `ownerId:
 *          123`, which no string-keyed comparison will ever match again.
 *
 *   `{"id":null,...}`
 *       -> truthy, gate = READY, id null. Signed in, and every owner-scoped
 *          surface reads empty. The trader is shown their own account with an
 *          empty journal: "your book is gone" rather than "sign in again".
 *
 * ── Why refusing costs nothing ───────────────────────────────────────────────
 *
 * This cache is an OPTIMISATION. Its entire job is to prevent a flash of
 * /login while `/api/auth/me` answers, and that endpoint — which verifies the
 * httpOnly cookie server-side — is the authority either way. So a cache WM
 * cannot read is worth exactly one login flash, while a cache WM pretends to
 * read costs the trader their account screen.
 *
 * §14.1: an unreadable identity must not resolve toward the reassuring answer.
 * "Someone is signed in" is the reassuring answer. NULL is the honest one.
 */

import { isStoredRecord, readStoredText } from "@/lib/storedShape";

export interface WMUser {
  id:             string;
  email:          string;
  displayName?:   string;
  handle?:        string;
  avatar?:        string;        // data URL or remote URL
  bio?:           string;
  botName?:       string;        // durable, follows the account
  timezone?:      string;
  bgColor?:       string;        // profile background color pref
  profileComplete: boolean;
  verified?:      boolean;       // blue checkmark
  ceo?:           boolean;       // WM core team crown badge
}

/**
 * REFUSED, because without them there is no account: a non-empty string `id`
 * and a non-empty string `email`. `id` is what every owner-scoped store in the
 * app keys on; `email` is how the trader recognises whose account they are
 * looking at. A session missing either is not a partial session, it is not a
 * session.
 *
 * KEPT with fallbacks, because a display preference WM cannot read is not a
 * reason to sign someone out: everything else is optional, and the flags are
 * read strictly (`=== true`) so a truthy string never grants a verified badge
 * or core-team crown that the account does not hold.
 */
export function hydrateCachedUser(value: unknown): WMUser | null {
  if (!isStoredRecord(value)) return null;

  const id = readStoredText(value.id);
  const email = readStoredText(value.email);
  if (id === undefined || email === undefined) return null;

  return {
    id,
    email,
    displayName: readStoredText(value.displayName),
    handle: readStoredText(value.handle),
    avatar: readStoredText(value.avatar),
    bio: readStoredText(value.bio),
    botName: readStoredText(value.botName),
    timezone: readStoredText(value.timezone),
    bgColor: readStoredText(value.bgColor),
    // Strictly `true`. A stored `"false"`, `1` or `{}` is not a completed
    // profile, and is certainly not a verified account or a core-team crown.
    profileComplete: value.profileComplete === true,
    verified: value.verified === true,
    ceo: value.ceo === true,
  };
}

/**
 * Read the cached session from a storage port, or null.
 *
 * Never throws: unparseable bytes, a storage read that is denied (Safari
 * private mode, blocked third-party contexts) and a value that is not a user
 * all resolve the same way — WM does not know who this is, so it asks the
 * server, which is the authority anyway.
 */
export function readCachedSession(
  storage: { getItem(key: string): string | null },
  key: string,
): WMUser | null {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch { return null; }
  if (raw === null) return null;
  try {
    return hydrateCachedUser(JSON.parse(raw));
  } catch { return null; }
}
