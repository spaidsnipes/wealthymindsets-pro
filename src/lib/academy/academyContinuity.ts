/**
 * ACADEMY CONTINUITY (Garden 16 master order §53: "MARKETOBJECT → LEARN THIS →
 * same symbol/context → ACADEMY → practice → … → return to market").
 *
 * The door only opens where the Academy holds a real lesson for what the
 * trader selected — no lesson is invented for a selection that has none.
 * `from` is always an instrument-view path (never an open redirect).
 */
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

export type LearnableSelection = "ANATOMY" | "PRINT" | "PROFILE_LEVEL";

/** Selection → the Academy lesson that teaches it (ids from /education's catalogue). */
export const LEARN_LESSON: Readonly<Record<LearnableSelection, { readonly lessonId: string; readonly title: string }>> = {
  ANATOMY: { lessonId: "sm-1", title: "Absorption: When Large Players Absorb Selling" },
  PRINT: { lessonId: "fp-2", title: "Aggressive vs Passive Order Flow" },
  PROFILE_LEVEL: { lessonId: "fp-4", title: "Volume Profile: POC, VAH, VAL" },
};

export function learnHref(kind: LearnableSelection, fromPath: string): string {
  // From another room that carries a market (the Command Deck), return to the
  // market room ON that market, not a bare route (hallway audit 2026-10-04).
  const from = safeChartsReturn(fromPath) ?? chartsReturnFor(fromPath) ?? INSTRUMENT_VIEW_ROUTE;
  return `/education?lesson=${encodeURIComponent(LEARN_LESSON[kind].lessonId)}&from=${encodeURIComponent(from)}`;
}

/** The market room on the symbol / timeframe another room's query names, or null. */
function chartsReturnFor(fromPath: string): string | null {
  const query = fromPath.split("?", 2)[1];
  if (!query) return null;
  const q = new URLSearchParams(query);
  const sym = (q.get("symbol") ?? "").trim().toUpperCase();
  if (!/^[\^/]?[A-Z0-9][A-Z0-9.\-!/=]{0,14}$/.test(sym)) return null;
  const tf = q.get("tf");
  const out = new URLSearchParams({ symbol: sym, ...(tf && /^[0-9A-Za-z]{1,4}$/.test(tf) ? { tf } : {}) });
  return safeChartsReturn(`${INSTRUMENT_VIEW_ROUTE}?${out.toString()}`);
}

/** Only a same-origin instrument-view path survives; anything else is refused (null). */
export function safeChartsReturn(from: string | null | undefined): string | null {
  if (!from) return null;
  const [path, query] = from.split("?", 2);
  if (path !== INSTRUMENT_VIEW_ROUTE) return null;
  if (query !== undefined && !/^[A-Za-z0-9_\-.%!=&,:]*$/.test(query)) return null;
  return from;
}

/** "TSLA 5m" from a /charts return path, for the Back button's words. */
export function returnLabel(from: string): string {
  try {
    const u = new URL(from, "https://x.invalid");
    const s = u.searchParams.get("symbol"), tf = u.searchParams.get("tf");
    return [s, tf].filter(Boolean).join(" ") || "the market";
  } catch { return "the market"; }
}
