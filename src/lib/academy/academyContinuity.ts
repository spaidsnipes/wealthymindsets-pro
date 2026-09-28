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
  const from = safeChartsReturn(fromPath) ?? INSTRUMENT_VIEW_ROUTE;
  return `/education?lesson=${encodeURIComponent(LEARN_LESSON[kind].lessonId)}&from=${encodeURIComponent(from)}`;
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
