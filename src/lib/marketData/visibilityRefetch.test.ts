/**
 * A GLANCE AT ANOTHER APP IS NOT A REASON TO RE-POLL EVERY PROVIDER.
 *
 * MEASURED, /command-deck 2026-09-08, freshly reloaded page: 4 visibilitychange
 * events produced 28 quote requests through TickerTape's `onVisible`, against a
 * 10-second poll interval. Each visible -> hidden -> visible flicker was 140ms
 * wide and each one bought a full 14-symbol provider round.
 *
 * INSTRUMENT DISCLOSURE, stated here so a future reader is not misled: the
 * dispatcher of those events was the preview harness, not the app. The event
 * RATE is an artifact and is not claimed as a production observation. What is
 * not an artifact is the component's response — a 140ms round trip must not
 * cost a full provider round — and on a phone the dispatcher is real: iOS fires
 * visibilitychange on every app switch, screen lock and notification-shade
 * pull.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_REFETCH_INTERVAL_MS,
  selectVisibilityRefetch,
} from "./visibilityRefetch";

const NOW = 1_757_000_000_000;
const base = { visibilityState: "visible", inFlight: false, now: NOW } as const;

describe("visibility refetch — is a round actually owed?", () => {
  it("does not buy a provider round with a 140ms flicker", () => {
    // The measured defect, at the measured width.
    const verdict = selectVisibilityRefetch({ ...base, lastRoundStartedAt: NOW - 140 });
    expect(verdict.kind).toBe("SKIP");
    expect(verdict.kind === "SKIP" && verdict.reason).toBe("NOT_DUE");
    expect(verdict.kind === "SKIP" && verdict.dueInMs).toBe(DEFAULT_REFETCH_INTERVAL_MS - 140);
  });

  it("DOES refetch after a real background, which is why the handler exists", () => {
    // Browsers throttle or suspend timers in a hidden tab. Returning after
    // eight minutes must produce data, or the fix would trade one truth
    // failure for another.
    const verdict = selectVisibilityRefetch({ ...base, lastRoundStartedAt: NOW - 480_000 });
    expect(verdict.kind).toBe("REFETCH");
    expect(verdict.kind === "REFETCH" && verdict.reason).toBe("OVERDUE");
    expect(verdict.kind === "REFETCH" && verdict.overdueByMs).toBe(480_000 - DEFAULT_REFETCH_INTERVAL_MS);
  });

  it("always refetches a surface that has never observed anything", () => {
    const verdict = selectVisibilityRefetch({ ...base, lastRoundStartedAt: null });
    expect(verdict.kind).toBe("REFETCH");
    expect(verdict.kind === "REFETCH" && verdict.reason).toBe("NEVER_FETCHED");
  });

  it("skips while a round is already running, even when long overdue", () => {
    // Overlapping rounds do not produce fresher data. They race over which
    // writes last and double the load on rate-limited free providers.
    const verdict = selectVisibilityRefetch({
      ...base, inFlight: true, lastRoundStartedAt: NOW - 600_000,
    });
    expect(verdict.kind).toBe("SKIP");
    expect(verdict.kind === "SKIP" && verdict.reason).toBe("IN_FLIGHT");
  });

  it("skips on the HIDDEN edge — the event fires on both", () => {
    // A handler that forgot this check would poll a backgrounded tab forever,
    // which is the battery and rate-limit failure this whole module prevents.
    for (const state of ["hidden", "prerender"]) {
      const verdict = selectVisibilityRefetch({ ...base, visibilityState: state, lastRoundStartedAt: null });
      expect(verdict.kind).toBe("SKIP");
      expect(verdict.kind === "SKIP" && verdict.reason).toBe("STILL_HIDDEN");
    }
  });

  it("hidden outranks never-fetched: a hidden tab is never owed a round", () => {
    const verdict = selectVisibilityRefetch({
      ...base, visibilityState: "hidden", lastRoundStartedAt: null,
    });
    expect(verdict.kind).toBe("SKIP");
  });

  it("holds the boundary exactly", () => {
    expect(selectVisibilityRefetch({ ...base, lastRoundStartedAt: NOW - DEFAULT_REFETCH_INTERVAL_MS }).kind).toBe("REFETCH");
    expect(selectVisibilityRefetch({ ...base, lastRoundStartedAt: NOW - DEFAULT_REFETCH_INTERVAL_MS + 1 }).kind).toBe("SKIP");
  });

  it("treats a future stamp as skew and skips, the safe direction", () => {
    const verdict = selectVisibilityRefetch({ ...base, lastRoundStartedAt: NOW + 60_000 });
    expect(verdict.kind).toBe("SKIP");
  });

  it("honours a caller's own interval instead of assuming ten seconds", () => {
    // useWebSocket's REST cadence is source-dependent (restQuoteNextPollDelayMs).
    expect(selectVisibilityRefetch({ ...base, lastRoundStartedAt: NOW - 2_500, intervalMs: 2_000 }).kind).toBe("REFETCH");
    expect(selectVisibilityRefetch({ ...base, lastRoundStartedAt: NOW - 2_500, intervalMs: 30_000 }).kind).toBe("SKIP");
  });
});

const CALL_SITES = [
  ["src/components/layout/TickerTape.tsx", "the shell ticker tape"],
  ["src/components/chart/WatchlistPanel.tsx", "the chart watchlist"],
  ["src/hooks/useWebSocket.ts", "the REST quote fallback"],
] as const;

describe("every visibility-triggered refetch consults the one owner", () => {
  for (const [file, what] of CALL_SITES) {
    const src = fs.readFileSync(path.join(process.cwd(), file), "utf8");

    it(`${what} asks selectVisibilityRefetch rather than re-deriving the rule`, () => {
      expect(src).toContain('from "@/lib/marketData/visibilityRefetch"');
      expect(src).toContain("selectVisibilityRefetch({");
    });

    it(`${what} has no bare "visible? fetch" handler left`, () => {
      // The exact shape of the defect, in all three files. A second copy of
      // this rule is a second place for it to drift back.
      expect(src).not.toMatch(
        /visibilityState\s*===\s*"visible"\s*\)\s*(do|doFetch|doRestFetch)/,
      );
      expect(src).not.toMatch(/visibilityState\s*!==\s*"visible"\s*\)\s*return;\s*\n\s*if \(restTimer\)/);
    });

    it(`${what} tracks when its last round STARTED`, () => {
      // Without this the owner has nothing to judge and every verdict would be
      // NEVER_FETCHED — i.e. the defect, wearing the fix's clothes.
      expect(src).toMatch(/last(Round|Rest)StartedAt = Date\.now\(\)/);
    });

    it(`${what} guards against a round overlapping itself`, () => {
      expect(src).toMatch(/(inFlight|restFetchInFlight)/);
    });
  }
});
