/**
 * IS THIS MARKET NEWS? — Garden 18 §XCIII: "Useful. Contextual. No random
 * headline sludge." Serving /news, 2026-10-01: the first headline on the room
 * was a MarketWatch advice column — "My wife never went back to work after
 * raising our kids. Do I have to share my retirement savings 50/50?".
 *
 * A headline that names no instrument, carries no market tag and reads as a
 * personal-advice column is not market news. It is set aside (counted, and
 * one tap brings it back), never deleted. Everything else stays. PURE.
 */
const PERSONAL_ADVICE = [
  /\bmy (wife|husband|spouse|mom|mother|dad|father|son|daughter|kids?|children|sister|brother|boyfriend|girlfriend|partner|in-laws?)\b/i,
  /\b(our|my) (retirement|inheritance|estate|nest egg|savings|mortgage|wedding|divorce)\b/i,
  /\b(moneyist|dear (abby|moneyist)|ask (an|the) advisor)\b/i,
  /^(should|can|do|am|is) (i|we|my)\b/i,
  /\b(inheritance|prenup|alimony|stepchildren|step-?kids)\b/i,
];

export interface RelevanceInput { readonly title: string; readonly sym: string; readonly tags: readonly string[] }

export function isPersonalAdviceColumn(n: RelevanceInput): boolean {
  const namesInstrument = n.sym && n.sym !== "MARKET" && /^[A-Z]{1,5}$/.test(n.sym) && new RegExp(`\\b${n.sym}\\b`).test(n.title);
  if (namesInstrument) return false;
  return PERSONAL_ADVICE.some(re => re.test(n.title));
}
