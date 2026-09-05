"use client";

import { useEffect, useState } from "react";
import { provenSessionClosure } from "./canonicalIdentity";

/**
 * Hydration-safe session-closure truth for client surfaces.
 *
 * Reading the clock during render is the exact mechanism behind five prior
 * React #418 hydration bugs in this codebase — "HeroTruth Date.now() at
 * render" was the fifth. The server also has no business guessing the
 * viewer's local weekday. So this returns `null` ("not established") on the
 * server and on the first client render, then settles to the proven value
 * after mount.
 *
 * Because `null` leaves every downstream label exactly as it was, the settle
 * can only ever retire a false ACTIVE claim — it can never introduce one.
 *
 * Re-evaluates at the next local midnight so a tab left open across the
 * Friday→Saturday boundary stops asserting an active session all weekend.
 */
export function useProvenSessionClosure(symbol: string): false | null {
  const now = useSessionClockDate();
  return now ? provenSessionClosure(symbol, now) : null;
}

/**
 * The same mount-safe clock, without a symbol bound to it.
 *
 * Surfaces that badge many symbols inside a `.map()` must call this ONCE at
 * component level and then invoke the pure `provenSessionClosure(sym, now)`
 * per row. Calling a hook inside that loop is the React #310 "hooks called in
 * JSX" defect this codebase has already had to fix once.
 *
 * Returns `null` on the server and first client render, then the current
 * local date — re-evaluated at the next local midnight.
 */
export function useSessionClockDate(): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const evaluate = () => setNow(new Date());
    evaluate();

    const at = new Date();
    const nextMidnight = new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1).getTime();
    const timer = setTimeout(evaluate, Math.max(1_000, nextMidnight - at.getTime()));
    return () => clearTimeout(timer);
  }, []);

  return now;
}
