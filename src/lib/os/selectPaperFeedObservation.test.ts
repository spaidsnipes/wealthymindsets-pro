import { describe, expect, it } from "vitest";

import { compileFeedStanding } from "@/lib/os/osChrome";
import {
  SESSION_TOKEN_CLOSED,
  SESSION_TOKEN_CONTINUOUS,
  SESSION_TOKEN_UNKNOWN,
} from "@/lib/marketData/canonicalIdentity";
import { initialPaperQuoteReadiness } from "@/lib/marketData/viewModels/selectPaperQuoteReadiness";
import type { PaperQuoteReadiness } from "@/lib/marketData/viewModels/selectPaperQuoteReadiness";
import { selectPaperFeedObservation } from "./selectPaperFeedObservation";

const AT = 1_758_000_000_000;

function readiness(over: Partial<PaperQuoteReadiness> = {}): PaperQuoteReadiness {
  return {
    ...initialPaperQuoteReadiness(),
    status: "DELAYED",
    actionable: true,
    price: 29_738,
    observedAt: AT - 60_000,
    availableAt: AT - 59_000,
    receivedAt: AT - 58_000,
    ageMs: 60_000,
    ...over,
  };
}

describe("selectPaperFeedObservation — the evidence /paper actually holds", () => {
  it("THE DEFECT ITSELF — an observed price stops compiling to FEED UNKNOWN", () => {
    // Measured live 2026-09-17 on production: the room printed $29,738.00
    // while the frame above it said FEED UNKNOWN and the footer said SOURCE
    // UNKNOWN. This is that exact screen, as a test.
    const standing = compileFeedStanding(
      selectPaperFeedObservation({ readiness: readiness(), sessionToken: SESSION_TOKEN_UNKNOWN }),
      AT,
    );
    expect(standing.label).not.toBe("FEED UNKNOWN");
    expect(standing.established).toBe(true);
    // `established` is what the provenance footer reads to decide between the
    // detail and SOURCE UNKNOWN, so this is the second wrong pixel closing.
    // RE-PINNED under WM-CHART-PROV-EMERG-01 (leak measured live
    // 2026-09-17 as `SOURCE YAHOO · OBSERVED`). What this line
    // protects — the standing rests on a NAMED provider, not on
    // nothing — moved to `provenance`, which no chrome renders.
    expect(standing.provenance).toBe("yahoo");
    expect(standing.detail).not.toContain("yahoo");
  });

  it("names no provider before one has answered — FEED UNKNOWN is then TRUE", () => {
    // The fix must not become "always say yahoo". On first paint the room has
    // polled nothing, and the open question is the correct reading.
    const obs = selectPaperFeedObservation({
      readiness: initialPaperQuoteReadiness(),
      sessionToken: SESSION_TOKEN_UNKNOWN,
    });
    expect(obs.source).toBeNull();
    expect(obs.quotePresent).toBe(false);
    expect(obs.lastObservedAtMs).toBeNull();
    expect(compileFeedStanding(obs, AT).label).toBe("FEED UNKNOWN");
  });

  it("a missing readiness entry is silence, not an observation", () => {
    for (const r of [null, undefined]) {
      const obs = selectPaperFeedObservation({ readiness: r, sessionToken: SESSION_TOKEN_UNKNOWN });
      expect(obs.source).toBeNull();
      expect(obs.quotePresent).toBe(false);
    }
  });

  it("BOTH halves required — a price with no timestamp is not an observation", () => {
    // A provider that answered without observing is the case
    // `compileFeedStanding` refuses to grade. Naming it would manufacture the
    // evidence the badge then certifies.
    expect(
      selectPaperFeedObservation({
        readiness: readiness({ observedAt: null }),
        sessionToken: SESSION_TOKEN_UNKNOWN,
      }).source,
    ).toBeNull();
    expect(
      selectPaperFeedObservation({
        readiness: readiness({ price: null }),
        sessionToken: SESSION_TOKEN_UNKNOWN,
      }).source,
    ).toBeNull();
  });

  it("refuses a non-positive or non-finite price", () => {
    for (const price of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        selectPaperFeedObservation({
          readiness: readiness({ price }),
          sessionToken: SESSION_TOKEN_UNKNOWN,
        }).quotePresent,
        `price ${String(price)}`,
      ).toBe(false);
    }
  });

  it("SESSION ? maps to null and NOT to false — unknown is not closed", () => {
    // Rounding "no exchange calendar" down to closed would have the badge
    // assert a shut market at 11am on a Tuesday.
    expect(
      selectPaperFeedObservation({ readiness: readiness(), sessionToken: SESSION_TOKEN_UNKNOWN })
        .sessionOpen,
    ).toBeNull();
    expect(
      selectPaperFeedObservation({ readiness: readiness(), sessionToken: SESSION_TOKEN_CLOSED })
        .sessionOpen,
    ).toBe(false);
    expect(
      selectPaperFeedObservation({ readiness: readiness(), sessionToken: SESSION_TOKEN_CONTINUOUS })
        .sessionOpen,
    ).toBe(true);
  });

  it("reports no transport it does not have, and no bars it does not draw", () => {
    // /paper polls REST and renders a book, a ticket and a blotter. Claiming
    // a connected socket, or on-screen OHLCV history, would be the same
    // overclaim in the opposite direction from the one being cured.
    const obs = selectPaperFeedObservation({
      readiness: readiness(),
      sessionToken: SESSION_TOKEN_CONTINUOUS,
    });
    expect(obs.connected).toBeNull();
    expect(obs.barsPresent).toBe(false);
  });

  it("does not grade its own fidelity — it publishes evidence only", () => {
    // priceSourceBadge is the single writer. The observation carries no label.
    const obs = selectPaperFeedObservation({
      readiness: readiness(),
      sessionToken: SESSION_TOKEN_CONTINUOUS,
    });
    expect(Object.keys(obs).sort()).toEqual([
      "barsPresent",
      "connected",
      "lastObservedAtMs",
      "quotePresent",
      "sessionOpen",
      "source",
    ]);
  });

  it("a 20-minute-old REST quote is still graded, not slandered as a stall", () => {
    // yahoo is a REST_QUOTE_SOURCE. Measuring a minutes-cadence provider
    // against a seconds-scale tape budget would report STALE PIPELINE for a
    // provider behaving exactly as specified.
    const standing = compileFeedStanding(
      selectPaperFeedObservation({
        readiness: readiness({ observedAt: AT - 20 * 60_000 }),
        sessionToken: SESSION_TOKEN_UNKNOWN,
      }),
      AT,
    );
    expect(standing.label).not.toBe("STALE PIPELINE");
    expect(standing.established).toBe(true);
  });

  it("a provider clock ahead of ours is not rounded into a reading", () => {
    const standing = compileFeedStanding(
      selectPaperFeedObservation({
        readiness: readiness({ observedAt: AT + 60_000 }),
        sessionToken: SESSION_TOKEN_UNKNOWN,
      }),
      AT,
    );
    expect(standing.label).toBe("FEED UNKNOWN");
    expect(standing.established).toBe(false);
  });
});
