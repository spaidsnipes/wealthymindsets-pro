import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CANONICAL_FIDELITY_LABELS as L,
  type CanonicalFidelityLabel,
} from "@/lib/marketData/canonicalFidelityLabels";
import {
  REST_QUOTE_SOURCES,
  priceSourceBadge,
  resolveChartSurfaceBadge,
} from "@/lib/priceSource";
import {
  LIVE_STALENESS_BUDGET_MS,
  compileFeedStanding,
  compileProvenanceSegments,
  compileStandingConditions,
  type FeedObservation,
  type FeedTone,
} from "./osChrome";

const NOW = 1_800_000_000_000;

/**
 * A fully-evidenced observation. Tests take this away one field at a time.
 *
 * `polygon` rather than a WM provider because polygon is the one source that
 * can legitimately reach LIVE — CERTIFIED QUOTE. Building the fixture out of a
 * provider whose realtime certification is NOT established would have hidden
 * the entire defect this file now guards.
 */
const LIVE_OBS: FeedObservation = {
  source: "polygon",
  quotePresent: true,
  lastObservedAtMs: NOW - 1_000,
  connected: true,
  sessionOpen: true,
  // FALSE on the fully-evidenced fixture ON PURPOSE. Bars are the weaker
  // evidence, and defaulting them to present here would let a test reach a
  // confident label with the quote arm broken and never notice.
  barsPresent: false,
};

describe("compileFeedStanding — the badge may only ever sharpen", () => {
  it("says LIVE only with a certified source, a real quote, and a recent print", () => {
    const feed = compileFeedStanding(LIVE_OBS, NOW);
    expect(feed.label).toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(feed.tone).toBe("LIVE");
    expect(feed.established).toBe(true);
    expect(feed.detail).toContain("polygon");
  });

  /**
   * THE CORE LAW. Every mockup the Founder sent paints a green LIVE dot, and
   * the badge appears on every screen in the product — which makes it the
   * cheapest place in the codebase to tell a lie. There must be no way to
   * reach the confident label without the evidence for it.
   */
  it.each([
    ["no source has produced a tick", { source: null }],
    ["nothing has been observed yet", { lastObservedAtMs: null }],
    ["the provider answered with no price", { quotePresent: false }],
  ] as const)("never reaches LIVE when %s", (_why, missing) => {
    const feed = compileFeedStanding({ ...LIVE_OBS, ...missing }, NOW);
    expect(feed.label).toBe("FEED UNKNOWN");
    expect(feed.tone).toBe("UNKNOWN");
    expect(feed.established).toBe(false);
  });

  /**
   * ── FOURTH NESTING OF "THE FRAME IS LESS CERTAIN THAN THE ROOM" ──────────
   *
   * Measured live on wealthymindsetspro.com, /charts, TSLA, 2026-09-17T02:42Z,
   * with ~400 15m candles drawn on screen. Four badges, one question:
   *
   *   masthead   FEED UNKNOWN            ← compiled here, from "no observation yet"
   *   footer     SOURCE UNKNOWN          ← downstream of `established: false`
   *   rail       UNAVAILABLE
   *   chart chip HISTORICAL BARS VERIFIED
   *
   * "No observation yet" was simply untrue: bars had been observed, and a chip
   * inches away certified them. The frame was not grading badly — its argument
   * list had no bar evidence in it, so the honest answer was unreachable.
   */
  describe("bars are an observation even when the quote is not", () => {
    // Exactly the live case: no quote provider answered, bars are on screen.
    const BARS_ONLY: FeedObservation = {
      source: null,
      quotePresent: false,
      lastObservedAtMs: null,
      connected: null,
      sessionOpen: null,
      barsPresent: true,
    };

    it("never says 'no observation yet' over a chart that has bars", () => {
      const feed = compileFeedStanding(BARS_ONLY, NOW);
      expect(feed.label).not.toBe("FEED UNKNOWN");
      expect(feed.detail).not.toBe("no observation yet");
      expect(feed.label).toBe(L.HISTORICAL_BARS_VERIFIED);
    });

    /**
     * The load-bearing half. `compileProvenanceSegments` prints SOURCE UNKNOWN
     * whenever `established` is false, so the footer's claim is downstream of
     * this flag and not of the label — fixing only the label would have left
     * the bottom bar still lying.
     */
    it("establishes the standing, so the footer stops printing SOURCE UNKNOWN", () => {
      const feed = compileFeedStanding(BARS_ONLY, NOW);
      expect(feed.established).toBe(true);
      expect(compileProvenanceSegments(feed, null)).toEqual(["SOURCE HISTORICAL BARS"]);
    });

    it("says SESSION CLOSED rather than a live-sounding reading on a closed market", () => {
      const feed = compileFeedStanding({ ...BARS_ONLY, sessionOpen: false }, NOW);
      expect(feed.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
      expect(feed.established).toBe(true);
    });

    /**
     * ANTI-OVERCORRECTION. The whole point of the original FEED UNKNOWN is
     * that a room with nothing must not read as fine. Bars must rescue the
     * badge ONLY when bars actually exist.
     */
    it("still says FEED UNKNOWN when there is no quote AND no bars", () => {
      const feed = compileFeedStanding({ ...BARS_ONLY, barsPresent: false }, NOW);
      expect(feed.label).toBe("FEED UNKNOWN");
      expect(feed.detail).toBe("no observation yet");
      expect(feed.established).toBe(false);
    });

    /**
     * Bars are the WEAKER evidence and may never outrank a real quote. If this
     * ever inverts, a certified polygon tape would be demoted to "historical"
     * the moment a chart happened to have candles on it — which is always.
     */
    it("never lets bars downgrade a live certified quote", () => {
      const feed = compileFeedStanding({ ...LIVE_OBS, barsPresent: true }, NOW);
      expect(feed.label).toBe(L.LIVE_CERTIFIED_QUOTE);
      expect(feed.detail).toContain("polygon");
    });

    /**
     * ONE OWNER, TWO READERS. The defect recurred because the lesson was
     * extracted and the RULE was copied. Assert the frame and the chip inside
     * the room reach the same words from the same evidence — if someone forks
     * `barsOnlyReading` again, this fails.
     */
    it("agrees, word for word, with the chip the room already renders", () => {
      for (const sessionOpen of [null, false] as const) {
        const frame = compileFeedStanding({ ...BARS_ONLY, sessionOpen }, NOW);
        // `yahoo` with no quote present is the live shape: a recognised
        // provider that answered with nothing, plus candles on screen.
        const chip = resolveChartSurfaceBadge("yahoo", false, true, sessionOpen, {
          present: false,
        });
        expect(frame.label, `sessionOpen=${sessionOpen}`).toBe(chip.label);
      }
    });
  });

  it("a provider nobody recognises is UNKNOWN, never a canon reading", () => {
    // The delegate reports this through two doors — `unresolved` and
    // `availability: "unavailable"` — and its `label` on that path is an
    // internal fallback, not a verdict. Rendering it would put STALE PIPELINE
    // on the masthead for a provider we simply have no grader for.
    const feed = compileFeedStanding({ ...LIVE_OBS, source: "acme-quotes" }, NOW);
    expect(feed.label).toBe("FEED UNKNOWN");
    expect(feed.established).toBe(false);
    expect(feed.label).not.toBe(L.STALE_PIPELINE);
  });

  it("a disconnected transport is an ESTABLISHED reading, not a shrug", () => {
    // "UNKNOWN" here would be false humility: we genuinely know the pipe is
    // down. The canon is violated symmetrically by overclaim and by withholding.
    const feed = compileFeedStanding({ ...LIVE_OBS, connected: false }, NOW);
    expect(feed.label).toBe(L.STALE_PIPELINE);
    expect(feed.established).toBe(true);
    // The canon has one word for both infrastructure failures, so the
    // difference that would change what a trader DOES lives in the detail.
    expect(feed.detail).toBe("transport disconnected");
  });

  it("disconnection outranks freshness — a recent print down a dead pipe is not LIVE", () => {
    const feed = compileFeedStanding({ ...LIVE_OBS, connected: false }, NOW);
    expect(feed.label).not.toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(feed.tone).toBe("IDLE");
  });

  it("keeps the transport arm for providers the delegate never asks about", () => {
    // webull / moomoo / longbridge are graded by provider identity alone —
    // `priceSourceBadge` does not read `connected` on those arms at all. If the
    // frame delegated this case too, the masthead would print ACTIVE DEGRADED
    // over a socket we KNOW is dead. Agreement with the chip is not the goal;
    // the chip has the same hole and this is the surface that can close it.
    expect(compileFeedStanding({ ...LIVE_OBS, source: "webull", connected: false }, NOW).label).toBe(
      L.STALE_PIPELINE,
    );
    expect(priceSourceBadge("webull", false, true, { present: true, fresh: true }).label).toBe(
      L.ACTIVE_DEGRADED,
    );
  });

  describe("CLOSED IS NOT DELAYED — canon law #2, on the badge every screen carries", () => {
    /**
     * A print from Friday afternoon is hours past the 90s freshness budget, so
     * without closure precedence the masthead reads STALE PIPELINE for the
     * whole weekend: an infrastructure alarm raised about a market behaving
     * normally.
     */
    const CLOSED = {
      ...LIVE_OBS,
      source: "webull",
      sessionOpen: false,
      lastObservedAtMs: NOW - 60 * 60 * 1000,
    };

    it("reads SESSION CLOSED rather than raising a pipeline alarm on a stale weekend print", () => {
      const feed = compileFeedStanding(CLOSED, NOW);
      expect(feed.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
      expect(feed.label).not.toBe(L.STALE_PIPELINE);
      expect(feed.established).toBe(true);
    });

    it("does not recite the print's age when age is not the reason", () => {
      // "last print 3600s ago" beside SESSION CLOSED invites the trader to read
      // a normal weekend as decay.
      expect(compileFeedStanding(CLOSED, NOW).detail).not.toContain("ago");
    });

    it("outranks a quiet transport — on a closed market that is the expected condition", () => {
      // Naming it a pipeline fault sends the trader to diagnose infrastructure
      // instead of reading a clock. The frame does not re-state this
      // precedence; it ASKS the delegate whether closure already won.
      expect(compileFeedStanding({ ...CLOSED, connected: false }, NOW).label).toBe(
        L.SESSION_CLOSED_LAST_VERIFIED,
      );
    });

    it("never says LAST VERIFIED without something verified to point at", () => {
      // Closure does not manufacture an observation.
      for (const missing of [
        { source: null },
        { lastObservedAtMs: null },
        { quotePresent: false },
      ]) {
        expect(compileFeedStanding({ ...CLOSED, ...missing }, NOW).label).not.toBe(
          L.SESSION_CLOSED_LAST_VERIFIED,
        );
      }
    });

    it("leaves a continuous market alone — crypto has no session to close", () => {
      // The mirror-image defect: SESSION CLOSED printed over a streaming tape.
      // The exemption now lives ENTIRELY in the delegate — the frame no longer
      // holds even an imported copy of the set, so there is nothing left to
      // drift.
      const crypto = compileFeedStanding({ ...LIVE_OBS, source: "coinbase", sessionOpen: false }, NOW);
      expect(crypto.label).toBe(L.LIVE_CERTIFIED_QUOTE);
    });

    it("treats an unresolved session as unresolved, not as open", () => {
      // `null` must not round up to `true`.
      expect(compileFeedStanding({ ...LIVE_OBS, sessionOpen: null }, NOW).label).toBe(
        L.LIVE_CERTIFIED_QUOTE,
      );
      expect(compileFeedStanding({ ...CLOSED, sessionOpen: null }, NOW).label).not.toBe(
        L.SESSION_CLOSED_LAST_VERIFIED,
      );
    });
  });

  /**
   * ── THE DEFECT THAT KEPT EVERY ROOM FROM PUBLISHING ────────────────────────
   *
   * This field used to be `fidelity: CapabilityFidelity | null` — a
   * CERTIFICATION verdict. `certifySource` is the only producer of one, it runs
   * against provider probes on the server, and no trading surface calls it. So
   * on the real `/charts` path the only honest value was `null`, and the
   * masthead read FEED UNKNOWN while the chip six inches below it read ACTIVE
   * DEGRADED with a price and a change.
   *
   * These are the five production providers. Each one asserts the masthead and
   * the chip reach the SAME canon word from the SAME evidence — which they now
   * cannot fail to do, because there is only one ladder and the frame is a
   * reader of it. The table is the receipt that the wire is finally buildable.
   */
  describe("one ladder — the masthead and the chip cannot disagree", () => {
    const CASES = [
      ["polygon", true, "a certified realtime tape", L.LIVE_CERTIFIED_QUOTE],
      ["coinbase", true, "a continuous crypto tape", L.LIVE_CERTIFIED_QUOTE],
      ["alpaca", true, "IEX realtime", L.LIVE_CERTIFIED_QUOTE],
      ["webull", true, "an active provider with no certification yet", L.ACTIVE_DEGRADED],
      ["finnhub", undefined, "a delayed consolidated quote", L.ACTIVE_DEGRADED],
      ["yahoo", undefined, "a delayed consolidated quote", L.ACTIVE_DEGRADED],
    ] as const;

    it.each(CASES)("%s — %s reads the same on both surfaces", (source, fresh, _why, expected) => {
      const masthead = compileFeedStanding({ ...LIVE_OBS, source }, NOW);
      const chip = priceSourceBadge(source, true, true, { present: true, fresh });
      expect(masthead.label, `masthead for ${source}`).toBe(expected);
      expect(chip.label, `chip for ${source}`).toBe(expected);
      expect(masthead.label).toBe(chip.label);
    });

    it("finnhub and yahoo used to be the unpublishable cases, and are the point", () => {
      // No certification is resolved for either, so the old compiler's only
      // legal input was `null` ⇒ FEED UNKNOWN, beside a chip reading ACTIVE
      // DEGRADED. The masthead now speaks.
      for (const source of ["finnhub", "yahoo"] as const) {
        const feed = compileFeedStanding({ ...LIVE_OBS, source }, NOW);
        expect(feed.label).not.toBe("FEED UNKNOWN");
        expect(feed.established).toBe(true);
      }
    });

    /**
     * A REST-quote provider publishes on a minutes cadence BY DESIGN. Measuring
     * it against a seconds-scale tape budget reports `fresh: false`, which
     * short-circuits the delegate to STALE PIPELINE — an infrastructure alarm
     * raised about a provider behaving exactly as specified. Canon law 3: the
     * absence of a per-trade tape is a MISSING CAPABILITY, not a stalled pipe.
     *
     * The set is imported from the module that owns it, so a provider added
     * there is covered here without anyone remembering to come back.
     */
    it("never measures a polled provider against a tape budget", () => {
      for (const source of REST_QUOTE_SOURCES) {
        const feed = compileFeedStanding({
          ...LIVE_OBS,
          source,
          lastObservedAtMs: NOW - 10 * LIVE_STALENESS_BUDGET_MS,
        }, NOW);
        expect(feed.label, `${source} slandered as a pipeline fault`).not.toBe(L.STALE_PIPELINE);
      }
      // POSITIVE CONTROL: a tape provider at the same age IS stale, so the
      // assertion above is exempting these sources rather than passing vacuously.
      expect(
        compileFeedStanding({
          ...LIVE_OBS,
          source: "polygon",
          lastObservedAtMs: NOW - 10 * LIVE_STALENESS_BUDGET_MS,
        }, NOW).label,
      ).toBe(L.STALE_PIPELINE);
    });
  });

  /**
   * THE GUARD THAT SURVIVES THE NEXT LABEL.
   *
   * The frame no longer decides WHICH reading applies — but it still decides
   * what colour each reading wears, and a tone is a claim a trader reads from
   * across the room. `Record<CanonicalFidelityLabel, FeedTone>` makes TypeScript
   * require every canon label as a key, so the day the Visual Systems Canon
   * grows an eighth label `tsc` fails HERE instead of that label arriving at
   * the masthead and falling through to the green pip.
   *
   * A runtime assertion could not do this: the hazard is a value that does not
   * exist yet, and you cannot write a test case for a label nobody has declared.
   */
  it("assigns a deliberate tone to every reading the canon can produce", () => {
    const expected: Record<CanonicalFidelityLabel, FeedTone> = {
      [L.LIVE_CERTIFIED_QUOTE]: "LIVE",
      [L.DELAYED_BY_ENTITLEMENT]: "DELAYED",
      [L.HISTORICAL_BARS_VERIFIED]: "DELAYED",
      [L.ACTIVE_DEGRADED]: "DELAYED",
      // A WALL IS NOT A LAG. The trader who reads "delayed" waits; the trader
      // who reads a wall goes and fixes an account.
      [L.BLOCKED_BY_ENTITLEMENT]: "IDLE",
      [L.STALE_PIPELINE]: "IDLE",
      [L.SESSION_CLOSED_LAST_VERIFIED]: "IDLE",
    };
    // The three the compiler can reach from real evidence today, checked
    // against the same table the implementation is keyed by.
    expect(compileFeedStanding(LIVE_OBS, NOW).tone).toBe(expected[L.LIVE_CERTIFIED_QUOTE]);
    expect(compileFeedStanding({ ...LIVE_OBS, source: "webull" }, NOW).tone).toBe(
      expected[L.ACTIVE_DEGRADED],
    );
    expect(compileFeedStanding({ ...LIVE_OBS, connected: false }, NOW).tone).toBe(
      expected[L.STALE_PIPELINE],
    );
  });

  /**
   * The chrome appears on every screen. If it speaks its own dialect of
   * fidelity, the product disagrees with itself in the one place the user
   * always looks — which is how "NO FEED" got quarantined in the first place.
   */
  it("every established label is a CANONICAL_FIDELITY_LABELS value — no private dialect", () => {
    const canon = new Set<string>(Object.values(L));
    const observations: FeedObservation[] = [
      LIVE_OBS,
      { ...LIVE_OBS, connected: false },
      { ...LIVE_OBS, source: "webull" },
      { ...LIVE_OBS, source: "finnhub" },
      { ...LIVE_OBS, source: "webull", sessionOpen: false },
      { ...LIVE_OBS, lastObservedAtMs: NOW - LIVE_STALENESS_BUDGET_MS - 5_000 },
    ];
    for (const obs of observations) {
      const feed = compileFeedStanding(obs, NOW);
      expect(feed.established, "fixture must produce an established reading").toBe(true);
      expect(canon, `"${feed.label}" is not canon vocabulary`).toContain(feed.label);
    }
    // POSITIVE CONTROL: the check would notice an invented label.
    expect(canon).not.toContain("NO FEED");
  });

  it("goes STALE past the budget, and reports the real age rather than hiding it", () => {
    const feed = compileFeedStanding({
      ...LIVE_OBS,
      lastObservedAtMs: NOW - LIVE_STALENESS_BUDGET_MS - 5_000,
    }, NOW);
    expect(feed.label).toBe(L.STALE_PIPELINE);
    expect(feed.detail).toContain("95s ago");
  });

  it("holds LIVE right up to the budget — a thin tape is not a broken one", () => {
    // A badge that flickers on truthful data gets ignored, which costs more
    // truth than the precision buys.
    const feed = compileFeedStanding({
      ...LIVE_OBS,
      lastObservedAtMs: NOW - LIVE_STALENESS_BUDGET_MS,
    }, NOW);
    expect(feed.label).toBe(L.LIVE_CERTIFIED_QUOTE);
  });

  it("a print stamped in the future is UNKNOWN, not maximally fresh", () => {
    // Reading a negative age as "0ms old" turns a clock disagreement into a
    // LIVE badge — the failure mode is silent and always flatters us. Graded
    // BEFORE the budget, so a bad clock can never become the `fresh: true` the
    // delegate would then certify.
    const feed = compileFeedStanding({ ...LIVE_OBS, lastObservedAtMs: NOW + 60_000 }, NOW);
    expect(feed.label).toBe("FEED UNKNOWN");
    expect(feed.established).toBe(false);
  });

  it("an unknown transport does not block a well-evidenced reading", () => {
    // `connected: null` means "we did not ask", which is different from "we
    // asked and it is down". Rounding it DOWN would print STALE PIPELINE over a
    // live alpaca tape purely because a room stayed silent about its socket.
    expect(compileFeedStanding({ ...LIVE_OBS, connected: null }, NOW).label).toBe(
      L.LIVE_CERTIFIED_QUOTE,
    );
    expect(compileFeedStanding({ ...LIVE_OBS, source: "alpaca", connected: null }, NOW).label).toBe(
      L.LIVE_CERTIFIED_QUOTE,
    );
  });
});

describe("compileStandingConditions — zero open items is not the same as no ledger", () => {
  const RESOLVED = { rightOfWay: "ACTION", rightOfWayResolved: true };

  it("a null ledger reads UNKNOWN and wears the unresolved look, never PAID", () => {
    const [debt] = compileStandingConditions({ openEvidenceItems: null, ...RESOLVED });
    expect(debt.value).toBe("UNKNOWN");
    expect(debt.unresolved).toBe(true);
    // The whole point: an unopened ledger must not read as a clean bill of health.
    expect(debt.alert).toBe(false);
    expect(debt.value).not.toBe("PAID");
  });

  it("an actually-empty ledger reads PAID and is neither unresolved nor alarming", () => {
    const [debt] = compileStandingConditions({ openEvidenceItems: 0, ...RESOLVED });
    expect(debt.value).toBe("PAID");
    expect(debt.unresolved).toBe(false);
    expect(debt.alert).toBe(false);
  });

  it("open items alarm and state their own count", () => {
    const [debt] = compileStandingConditions({ openEvidenceItems: 3, ...RESOLVED });
    expect(debt.value).toBe("3 OPEN");
    expect(debt.alert).toBe(true);
  });

  it("an unresolved Right of Way never alarms — absence of a reading is not a bad reading", () => {
    const [, row] = compileStandingConditions({
      openEvidenceItems: 0,
      rightOfWay: "UNKNOWN",
      rightOfWayResolved: false,
    });
    expect(row.unresolved).toBe(true);
    expect(row.alert).toBe(false);
  });

  it("a resolved non-ACTION verdict alarms — WAIT is a real reading, and a restraining one", () => {
    const [, row] = compileStandingConditions({
      openEvidenceItems: 0,
      rightOfWay: "WAIT",
      rightOfWayResolved: true,
    });
    expect(row.unresolved).toBe(false);
    expect(row.alert).toBe(true);
  });

  it("compiles exactly the two conditions the frame renders, in a stable order", () => {
    // The rail and the provenance bar both map this array. If the order
    // drifted, the two renderings would silently disagree about which is which.
    const rows = compileStandingConditions({ openEvidenceItems: 1, ...RESOLVED });
    expect(rows.map((r) => r.label)).toEqual(["Evidence Debt", "Right of Way"]);
  });
});

describe("compileProvenanceSegments — the bottom bar cannot smuggle a claim", () => {
  it("reports UNKNOWN as the source when the feed reading is not established", () => {
    const feed = compileFeedStanding({ ...LIVE_OBS, source: null }, NOW);
    expect(compileProvenanceSegments(feed, null)).toEqual(["SOURCE UNKNOWN"]);
  });

  it("omits the AS OF slot entirely rather than rendering an em-dash placeholder", () => {
    // "AS OF —" occupies the slot where a timestamp belongs and reads as one
    // at a glance. No segment is more honest than an empty one.
    const feed = compileFeedStanding(LIVE_OBS, NOW);
    expect(compileProvenanceSegments(feed, null)).toHaveLength(1);
    expect(compileProvenanceSegments(feed, "10:42:17 ET")).toEqual([
      "SOURCE POLYGON · CERTIFIED REALTIME",
      "AS OF 10:42:17 ET",
    ]);
  });

  it("omits the SOURCE slot entirely when there is no feed standing to report", () => {
    // `null` here is not "the feed is unknown" — the frame passes null only
    // when a room has DECLARED it carries no feed (FEEDLESS_SURFACE). There is
    // no pipeline, so there is no source, so naming one — even as UNKNOWN —
    // invents the subject. Same reasoning as the AS OF slot above, and the
    // reason this function takes `FeedStanding | null` rather than requiring
    // a standing: the absence has to be representable to be honoured.
    expect(compileProvenanceSegments(null, null)).toEqual([]);
  });

  it("still stamps AS OF for a feedless room — a room without a feed can still know when", () => {
    // The Vault has no pipeline but does know when it last wrote to itself.
    // Dropping both segments together would be tidier and wrong: the two slots
    // answer different questions and only one of them has gone quiet.
    expect(compileProvenanceSegments(null, "10:42:17 ET")).toEqual(["AS OF 10:42:17 ET"]);
  });
});

/**
 * THE WIRE.
 *
 * Everything above proves the compiler grades evidence correctly. None of it
 * proves anything is ON SCREEN — and for two commits, nothing was: no room in
 * the product published a `feed` at all, so the masthead read FEED UNKNOWN on
 * every surface no matter how well this file passed.
 *
 * The Drive names that condition PARTIAL_FRUIT: code advanced, no runtime
 * consumes it. These are the tests that would have failed then and must fail
 * again the day the primary trading surface stops publishing.
 *
 * They are source scans because this repo has no DOM environment. Each carries
 * a POSITIVE CONTROL showing the scan can detect its own law's absence — a
 * structural test that cannot fail is documentation wearing a test's clothes.
 */
describe("the primary trading surface actually publishes a feed observation", () => {
  const CHARTS = readFileSync(
    new URL("../../components/chart/ChartsDashboard.tsx", import.meta.url),
    "utf8",
  );

  /** The single publish call, isolated so other code cannot satisfy the scan. */
  const publishCall = (() => {
    const start = CHARTS.indexOf("usePublishOsStanding({");
    expect(start, "/charts must publish an OS standing at all").toBeGreaterThan(-1);
    const end = CHARTS.indexOf("});", start);
    expect(end).toBeGreaterThan(start);
    return CHARTS.slice(start, end);
  })();

  it("publishes a feed — not a surface and a Right of Way and nothing else", () => {
    expect(publishCall).toMatch(/feed:\s*\{/);
  });

  it("POSITIVE CONTROL — the scan can tell a publish call that omits the feed", () => {
    const withoutFeed = publishCall.replace(/feed:\s*\{/, "notTheFeed: {");
    expect(withoutFeed, "the replace must have removed something").not.toBe(publishCall);
    expect(withoutFeed).not.toMatch(/feed:\s*\{/);
  });

  it("supplies every field the observation requires, so the compiler is never starved", () => {
    // A publish that omitted `lastObservedAtMs` would typecheck as `undefined`
    // nowhere — it is required — but a publish that passed a literal `null` for
    // it would compile FEED UNKNOWN forever while looking wired. Name the real
    // sources instead.
    for (const field of ["source:", "quotePresent:", "lastObservedAtMs", "connected", "sessionOpen", "barsPresent"]) {
      expect(publishCall, `the feed must carry ${field}`).toContain(field);
    }
  });

  it("never hands the grader the string 'unavailable' as if it were a vendor", () => {
    // priceSourceBadge resolves providers by name. "unavailable" is the hook's
    // word for the ABSENCE of one; passing it through would ask the ladder to
    // grade a company that does not exist, and it would answer FEED UNKNOWN
    // with a `detail` blaming a provider by that name.
    expect(publishCall).toMatch(/source === "unavailable" \? null : source/);
  });

  it("reads the observation time from the hook rather than from the wall clock", () => {
    // Date.now() here would report the age of our POLL, not of the print — the
    // exact fabrication that makes a stale weekend quote look ~0ms fresh.
    expect(publishCall).not.toMatch(/Date\.now\(\)/);
    expect(publishCall).toContain("lastObservedAtMs,");
  });
});

describe("the hook dates every price it accepts, not just the ones with a side", () => {
  const HOOK = readFileSync(new URL("../../hooks/useWebSocket.ts", import.meta.url), "utf8");

  it("the unsigned observation path stamps the feed — it is the live equity path", () => {
    // This path deliberately stays out of recentTicks because it carries no
    // aggressor side. That made it the one accept site with a moving price and
    // no readable time, which is precisely why /charts could not say how old
    // its own number was.
    const start = HOOK.indexOf("const processUnsignedObservation");
    expect(start, "the unsigned observation path must exist").toBeGreaterThan(-1);
    const body = HOOK.slice(start, HOOK.indexOf("}, [getIntervalSec]);", start));
    expect(body).toContain("lastObservedAtRef.current");
  });

  it("POSITIVE CONTROL — the scan can tell that path if it went back to discarding time", () => {
    const start = HOOK.indexOf("const processUnsignedObservation");
    const body = HOOK.slice(start, HOOK.indexOf("}, [getIntervalSec]);", start));
    const stripped = body.replace(/lastObservedAtRef\.current/g, "someOtherRef.current");
    expect(stripped).not.toBe(body);
    expect(stripped).not.toContain("lastObservedAtRef.current");
  });

  it("a synthetic seed tick can never date the feed", () => {
    // processTick accepts non-observed seed ticks so the chart is not blank
    // before real data lands. If those dated the feed, an empty chart would
    // report itself as having just heard from the market.
    expect(HOOK).toMatch(/if \(isReal && Number\.isFinite\(tick\.time\) && tick\.time > 0\)/);
  });

  it("clears the observation time on symbol change", () => {
    // Otherwise the new symbol inherits the previous symbol's freshness and the
    // badge reports AAPL's liveness over TSLA's chart.
    expect(HOOK).toMatch(/lastObservedAtRef\.current = null;/);
  });
});

describe("useFeedEvaluationClock — the frame's clock, and why 0 is safe", () => {
  const CLOCK = readFileSync(
    new URL("../marketData/useProvenSessionClosure.ts", import.meta.url),
    "utf8",
  );

  it("its pre-mount value compiles to UNKNOWN, never to LIVE", () => {
    // The hook returns 0 on the server and on the first client render. Feed
    // that to the compiler with a perfectly live observation: a 0 clock puts
    // every real print in the future, and the clock guard must catch it.
    const feed = compileFeedStanding(LIVE_OBS, 0);
    expect(feed.label).toBe("FEED UNKNOWN");
    expect(feed.established).toBe(false);
    expect(feed.detail).toContain("clock");
  });

  it("actually ticks — a clock pinned at mount cannot detect a feed going quiet", () => {
    expect(CLOCK).toMatch(/setInterval/);
  });

  it("ticks faster than the staleness budget it is compared against", () => {
    // Otherwise a dead feed stays green for longer than the budget it is
    // supposed to enforce.
    const declared = CLOCK.match(/intervalMs = (\d[\d_]*)/);
    expect(declared, "the default interval must be declared literally").not.toBeNull();
    expect(Number(declared![1].replace(/_/g, ""))).toBeLessThan(LIVE_STALENESS_BUDGET_MS);
  });

  it("the frame supplies the clock, so rooms never carry one in their publication", () => {
    const FRAME = readFileSync(
      new URL("../../components/os/WMOperatingSystem.tsx", import.meta.url),
      "utf8",
    );
    expect(FRAME).toContain("useFeedEvaluationClock()");
    // Rooms publish through a value-compared effect; a clock inside that
    // payload would re-publish the entire standing on every tick.
    const CHARTS = readFileSync(
      new URL("../../components/chart/ChartsDashboard.tsx", import.meta.url),
      "utf8",
    );
    expect(CHARTS).not.toContain("evaluatedAtMs");
  });
});
