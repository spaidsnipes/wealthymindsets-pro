/**
 * BANNED CLAIMS (§57) — one owner, read by the selling-story test and by the
 * marketing-surfaces sweep (night shift 2026-10-07). Patterns unchanged.
 */
export const BANNED: readonly [string, RegExp][] = [
  ["guaranteed outcome", /(?<!\b(?:no|never|not|without)\s+)\bguarantee(d|s)?\b|\brisk[- ]free\b|\bcan(?:'|no)t lose\b|\bsure[- ]fire\b/i],
  ["profit promise", /\b(make|earn|double|grow)\s+(money|profits?|your account)\b|\bconsistent profits?\b|\bget rich\b|\bpassive income\b/i],
  ["win rate / accuracy stat", /\bwin[- ]?rate\b|\b\d{1,3}\s?%\s*(accura|win|success|of traders)/i],
  ["invented stat", /\b\d{1,3}(,\d{3})+\+?\s*(traders|users|members)\b|\b(thousands|millions) of (traders|users|members)\b|\btrusted by\b/i],
  ["testimonial", /\btestimonial|\b(5|five)[- ]star\b|★★★|“[^”]{8,}”\s*[—-]\s*[A-Z]/i],
  ["indicator launch", /\bnow with\b|\bnew indicator\b|\bFVG indicator\b/i],
  ["fill myth as fact", /\b(must|always|will)\s+(be\s+)?fill(ed|s)?\b/i],
  ["feature soup", /\ball[- ]in[- ]one\b/i],
];

export function offenders(text: string): string[] {
  return BANNED.filter(([, re]) => re.test(text)).map(([name]) => name);
}
