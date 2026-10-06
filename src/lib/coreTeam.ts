// WealthyMindsets Core Team — these accounts get blue check + crown W badge
// and unlimited free music uploads.
// Add actual email addresses here when the user provides them.
export const CORE_TEAM_HANDLES = new Set([
  "@spaidedfx",      // SpaidFX (CEO)
  "@spaidfx",
  "@pslim",          // P Slim / PD
  "@pd",
  "@wink",           // Wink
  "@jukes",          // Jukes
  "@petey",          // Petey
  "@noosleepspaid",  // current test handle
]);

export const CORE_TEAM_EMAILS = new Set([
  "dhill5711@gmail.com",  // SpaidFX — fill in others when received
]);

/**
 * Core team is proven by the account's VERIFIED sign-in email only (ATHOS order
 * P0.1, 2026-10-05). A handle is display identity a new account can claim:
 * "@petey" or "@pd" taken by anyone wore the verified core-team shield and the
 * "Unlimited Access" crown. `handle` is accepted and ignored so callers keep
 * their signature; CORE_TEAM_HANDLES stays as a roster, never as proof.
 */
export function isCoreTeam(_handle?: string | null, email?: string | null): boolean {
  return !!email && CORE_TEAM_EMAILS.has(email.toLowerCase().trim());
}
