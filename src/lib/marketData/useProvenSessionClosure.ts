"use client";

import { useEffect, useState } from "react";
import { provenSessionClosure } from "./canonicalIdentity";
// The sampling interval is declared where the compiler that TOLERATES it lives.
// Two numbers — one here, one there — is how "our clock is 15s coarse" and "we
// forgive 15s of coarseness" silently stop being the same statement.
import { FEED_CLOCK_SAMPLE_INTERVAL_MS } from "@/lib/os/osChrome";

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
/**
 * The frame's clock for grading how OLD an observation is — not the calendar.
 *
 * `useSessionClockDate` re-evaluates at midnight, which is right for "is the
 * session closed" and useless for "has the tape gone quiet": pinned at mount,
 * it would measure every later print as arriving BEFORE the present and report
 * a clock disagreement on a perfectly healthy feed.
 *
 * So this ticks, and it is deliberately the only thing in the OS that does.
 * `intervalMs` should divide the staleness budget it is being compared against,
 * so a feed cannot sit visibly dead for longer than one tick before the badge
 * says so.
 *
 * Returns 0 on the server and on the first client render — the same "not
 * established" contract as its sibling. 0 is safe rather than flattering: any
 * real observation is stamped after the epoch, so a 0 clock produces a negative
 * age, which the compiler reads as unestablished rather than as fresh.
 */
export function useFeedEvaluationClock(intervalMs = FEED_CLOCK_SAMPLE_INTERVAL_MS): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    // ONE SAMPLED INSTANT PER INTERVAL, SHARED. The masthead (OS frame) and the
    // chart room's rail each ran their own timer with its own phase, so one
    // could sample at T+89s (LIVE) and the other at T+91s (STALE) about the
    // same print (Sentinel, 2026-09-25). Every reader now subscribes to the
    // same ticker, so every badge grades against the same "now".
    return subscribeFeedClock(Math.max(1_000, intervalMs), setNow);
  }, [intervalMs]);

  return now;
}

type ClockListener = (now: number) => void;
const feedClocks = new Map<number, { now: number; listeners: Set<ClockListener>; timer: ReturnType<typeof setInterval> }>();

/** Exported for tests: one timer per interval, shared by every subscriber. */
export function subscribeFeedClock(intervalMs: number, listener: ClockListener): () => void {
  let clock = feedClocks.get(intervalMs);
  if (!clock) {
    const created = { now: Date.now(), listeners: new Set<ClockListener>(), timer: setInterval(() => {
      created.now = Date.now();
      for (const l of created.listeners) l(created.now);
    }, intervalMs) };
    clock = created;
    feedClocks.set(intervalMs, clock);
  }
  clock.listeners.add(listener);
  listener(clock.now);
  const c = clock;
  return () => {
    c.listeners.delete(listener);
    if (c.listeners.size === 0) { clearInterval(c.timer); feedClocks.delete(intervalMs); }
  };
}

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
