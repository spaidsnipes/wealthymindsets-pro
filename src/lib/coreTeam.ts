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

export function isCoreTeam(handle?: string | null, email?: string | null): boolean {
  if (email && CORE_TEAM_EMAILS.has(email.toLowerCase().trim())) return true;
  if (!handle) return false;
  const v = handle.toLowerCase().trim();
  return CORE_TEAM_HANDLES.has(v.startsWith("@") ? v : `@${v}`);
}
