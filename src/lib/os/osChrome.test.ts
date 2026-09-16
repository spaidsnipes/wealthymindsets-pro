import { describe, expect, it } from "vitest";
import { CANONICAL_FIDELITY_LABELS as L } from "@/lib/marketData/canonicalFidelityLabels";
import { priceSourceBadge } from "@/lib/priceSource";
import {
  LIVE_STALENESS_BUDGET_MS,
  compileFeedStanding,
  compileProvenanceSegments,
  compileStandingConditions,
  type FeedObservation,
} from "./osChrome";

const NOW = 1_800_000_000_000;

/** A fully-evidenced observation. Tests take this away one field at a time. */
const LIVE_OBS: FeedObservation = {
  source: "webull",
  fidelity: "REALTIME",
  lastObservedAtMs: NOW - 1_000,
  evaluatedAtMs: NOW,
  connected: true,
  sessionOpen: true,
};

describe("compileFeedStanding — the badge may only ever sharpen", () => {
  it("says LIVE only with a source, a REALTIME certification, and a recent print", () => {
    const feed = compileFeedStanding(LIVE_OBS);
    expect(feed.label).toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(feed.tone).toBe("LIVE");
    expect(feed.established).toBe(true);
    expect(feed.detail).toContain("webull");
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
    ["no certification has resolved", { fidelity: null }],
  ] as const)("never reaches LIVE when %s", (_why, missing) => {
    const feed = compileFeedStanding({ ...LIVE_OBS, ...missing });
    expect(feed.label).toBe("FEED UNKNOWN");
    expect(feed.tone).toBe("UNKNOWN");
    expect(feed.established).toBe(false);
  });

  it("a disconnected transport is an ESTABLISHED reading, not a shrug", () => {
    // "UNKNOWN" here would be false humility: we genuinely know the pipe is
    // down. The canon is violated symmetrically by overclaim and by withholding.
    const feed = compileFeedStanding({ ...LIVE_OBS, connected: false });
    expect(feed.label).toBe(L.STALE_PIPELINE);
    expect(feed.established).toBe(true);
    // The canon has one word for both infrastructure failures, so the
    // difference that would change what a trader DOES lives in the detail.
    expect(feed.detail).toBe("transport disconnected");
  });

  it("disconnection outranks freshness — a recent print down a dead pipe is not LIVE", () => {
    const feed = compileFeedStanding({ ...LIVE_OBS, connected: false });
    expect(feed.label).not.toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(feed.tone).toBe("IDLE");
  });

  describe("CLOSED IS NOT DELAYED — canon law #2, on the badge every screen carries", () => {
    /**
     * A print from Friday afternoon is hours past the 90s freshness budget, so
     * before this branch existed the masthead read STALE PIPELINE for the whole
     * weekend: an infrastructure alarm raised about a market behaving normally.
     */
    const CLOSED = { ...LIVE_OBS, sessionOpen: false, lastObservedAtMs: NOW - 60 * 60 * 1000 };

    it("reads SESSION CLOSED rather than raising a pipeline alarm on a stale weekend print", () => {
      const feed = compileFeedStanding(CLOSED);
      expect(feed.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
      expect(feed.label).not.toBe(L.STALE_PIPELINE);
      expect(feed.established).toBe(true);
    });

    it("outranks the entitlement arm — that is what the canon law literally says", () => {
      expect(compileFeedStanding({ ...CLOSED, fidelity: "DELAYED" }).label).toBe(
        L.SESSION_CLOSED_LAST_VERIFIED,
      );
    });

    it("outranks a quiet transport — on a closed market that is the expected condition", () => {
      // Naming it a pipeline fault sends the trader to diagnose infrastructure
      // instead of reading a clock.
      expect(compileFeedStanding({ ...CLOSED, connected: false }).label).toBe(
        L.SESSION_CLOSED_LAST_VERIFIED,
      );
    });

    it("never says LAST VERIFIED without something verified to point at", () => {
      // Closure does not manufacture an observation. Same precedence as
      // priceSourceBadge, and for the same reason.
      for (const missing of [{ source: null }, { lastObservedAtMs: null }, { fidelity: null }]) {
        expect(compileFeedStanding({ ...CLOSED, ...missing }).label).not.toBe(
          L.SESSION_CLOSED_LAST_VERIFIED,
        );
      }
    });

    it("leaves a continuous market alone — crypto has no session to close", () => {
      // The mirror-image defect: SESSION CLOSED printed over a streaming tape.
      // The set is imported from priceSource, so this can never drift apart
      // from the chip that renders beside it.
      const crypto = compileFeedStanding({
        ...LIVE_OBS,
        source: "coinbase",
        sessionOpen: false,
      });
      expect(crypto.label).toBe(L.LIVE_CERTIFIED_QUOTE);
    });

    it("treats an unresolved session as unresolved, not as open", () => {
      // `null` must not round up to `true`. A room that has not resolved the
      // calendar changes nothing about the ladder.
      expect(compileFeedStanding({ ...LIVE_OBS, sessionOpen: null }).label).toBe(
        L.LIVE_CERTIFIED_QUOTE,
      );
      expect(compileFeedStanding({ ...CLOSED, sessionOpen: null }).label).toBe(L.STALE_PIPELINE);
    });

    /**
     * THE REASON THIS BRANCH EXISTS AT ALL.
     *
     * Two compilers grade the same fact — `compileFeedStanding` for the OS
     * masthead and `priceSourceBadge` for the chart chip — and they render six
     * inches apart on one screen. Two owners of one fact do not fail loudly;
     * they simply disagree on the day the case arises. This asserts the case
     * that used to disagree, across BOTH owners, so a later edit to either
     * ladder that re-opens the contradiction fails here by name.
     */
    it("agrees with priceSourceBadge — the chip and the masthead read the same words", () => {
      const masthead = compileFeedStanding(CLOSED);
      const chip = priceSourceBadge("webull", true, false, { present: true, fresh: false });
      expect(masthead.label).toBe(chip.label);
    });
  });

  it("a certified-delayed provider can never wear LIVE, however fresh the print", () => {
    const feed = compileFeedStanding({ ...LIVE_OBS, fidelity: "DELAYED" });
    expect(feed.label).toBe(L.DELAYED_BY_ENTITLEMENT);
    expect(feed.label).not.toBe(L.LIVE_CERTIFIED_QUOTE);
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
      { ...LIVE_OBS, fidelity: "DELAYED" },
      { ...LIVE_OBS, fidelity: "SNAPSHOT" },
      { ...LIVE_OBS, lastObservedAtMs: NOW - LIVE_STALENESS_BUDGET_MS - 5_000 },
    ];
    for (const obs of observations) {
      const feed = compileFeedStanding(obs);
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
    });
    expect(feed.label).toBe(L.STALE_PIPELINE);
    expect(feed.detail).toContain("95s ago");
  });

  it("holds LIVE right up to the budget — a thin tape is not a broken one", () => {
    // A badge that flickers on truthful data gets ignored, which costs more
    // truth than the precision buys.
    const feed = compileFeedStanding({
      ...LIVE_OBS,
      lastObservedAtMs: NOW - LIVE_STALENESS_BUDGET_MS,
    });
    expect(feed.label).toBe(L.LIVE_CERTIFIED_QUOTE);
  });

  it("a print stamped in the future is UNKNOWN, not maximally fresh", () => {
    // Reading a negative age as "0ms old" turns a clock disagreement into a
    // LIVE badge — the failure mode is silent and always flatters us.
    const feed = compileFeedStanding({ ...LIVE_OBS, lastObservedAtMs: NOW + 60_000 });
    expect(feed.label).toBe("FEED UNKNOWN");
    expect(feed.established).toBe(false);
  });

  it("SNAPSHOT fidelity reports the limited capability, never promoted to LIVE", () => {
    const feed = compileFeedStanding({ ...LIVE_OBS, fidelity: "SNAPSHOT" });
    expect(feed.label).toBe(L.HISTORICAL_BARS_VERIFIED);
    expect(feed.label).not.toBe(L.LIVE_CERTIFIED_QUOTE);
    expect(feed.tone).toBe("DELAYED");
  });

  it("an unknown transport does not block a well-evidenced reading", () => {
    // `connected: null` means "we did not ask", which is different from
    // "we asked and it is down". Only the latter is NO FEED.
    expect(compileFeedStanding({ ...LIVE_OBS, connected: null }).label).toBe(L.LIVE_CERTIFIED_QUOTE);
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
    const feed = compileFeedStanding({ ...LIVE_OBS, source: null });
    expect(compileProvenanceSegments(feed, null)).toEqual(["SOURCE UNKNOWN"]);
  });

  it("omits the AS OF slot entirely rather than rendering an em-dash placeholder", () => {
    // "AS OF —" occupies the slot where a timestamp belongs and reads as one
    // at a glance. No segment is more honest than an empty one.
    const feed = compileFeedStanding(LIVE_OBS);
    expect(compileProvenanceSegments(feed, null)).toHaveLength(1);
    expect(compileProvenanceSegments(feed, "10:42:17 ET")).toEqual([
      "SOURCE WEBULL · REALTIME",
      "AS OF 10:42:17 ET",
    ]);
  });
});
