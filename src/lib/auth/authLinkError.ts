/**
 * What a guest reads when an emailed sign-in / recovery link comes back with an
 * error (garden pass 2026-10-05).
 *
 * The login and reset pages used to print the URL fragment's
 * `error_description` verbatim. That text is whatever the link says — anyone
 * can mail a WM link whose fragment reads "your account is locked, call …" and
 * the page would show it in WM's own error style. The fragment is only ever
 * CLASSIFIED here; its words never reach the screen.
 */
export const AUTH_LINK_EXPIRED = "That link has expired. Request a fresh email and try again.";
export const AUTH_LINK_INVALID = "That link did not work. Request a fresh email and try again.";
export const AUTH_UNREACHABLE = "Could not reach the sign-in service just now. Check your connection and try again.";

export function authLinkErrorMessage(rawDescription: string | null | undefined): string {
  const raw = (rawDescription ?? "").replace(/\+/g, " ");
  return /expired/i.test(raw) ? AUTH_LINK_EXPIRED : AUTH_LINK_INVALID;
}

/** A thrown fetch failure ("TypeError: Failed to fetch") is not a sentence. */
export function authFailureMessage(error: unknown, fallback: string): string {
  if (error instanceof TypeError) return AUTH_UNREACHABLE;
  return error instanceof Error && error.message ? error.message : fallback;
}
