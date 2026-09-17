import { describe, expect, it } from "vitest";

import { compileFeedStanding } from "@/lib/os/osChrome";
import { selectMarketIntelFeedObservation } from "./selectMarketIntelFeedObservation";

const AT = 1_758_000_000_000;

/** The measured-live state: NQ1!, socket down, no provider. */
const SOCKET_DOWN = {
  linkState: "TRANSPORT_DOWN",
  source: "unavailable",
  lastObservedAtMs: null,
  connected: false,
  sessionOpen: null,
} as const;

/** A provider answering with a usable tick. */
const OBSERVING = {
  linkState: "OBSERVED",
  source: "coinbase",
  lastObservedAtMs: AT - 5_000,
  connected: true,
  sessionOpen: null,
} as const;

describe("selectMarketIntelFeedObservation — what the live monitor actually saw", () => {
  it("THE DEFECT ITSELF — an observing monitor stops compiling to FEED UNKNOWN", () => {
    // The case that was UNREACHABLE before this room published anything at all.
    const standing = compileFeedStanding(selectMarketIntelFeedObservation(OBSERVING), AT);
    expect(standing.label).not.toBe("FEED UNKNOWN");
    expect(standing.established).toBe(true);
    expect(standing.detail).toContain("coinbase");
  });

  it("THE MEASURED STATE — socket down still reads FEED UNKNOWN, and that is TRUE", () => {
    // Measured live 2026-09-17: NQ1!, "CONNECTION Socket down", "PRICE FEED No
    // price provider". Publishing must not invent a reading for this; the atom
    // is that the OTHER case became reachable, not that this one changed.
    const obs = selectMarketIntelFeedObservation(SOCKET_DOWN);
    expect(obs.source).toBeNull();
    expect(obs.quotePresent).toBe(false);
    expect(obs.lastObservedAtMs).toBeNull();
    expect(compileFeedStanding(obs, AT).label).toBe("FEED UNKNOWN");
  });

  it("reports the dead socket as a READING, not as an absence of information", () => {
    // This is the whole difference between "I was not told" and "the transport
    // is down". `null` would throw away the one thing the room does know.
    expect(selectMarketIntelFeedObservation(SOCKET_DOWN).connected).toBe(false);
    expect(selectMarketIntelFeedObservation(OBSERVING).connected).toBe(true);
  });

  it("refuses to round the hook's 'unavailable' up to a named provider", () => {
    // "unavailable" is the hook's word for "nobody answered". Passing it
    // through asks the badge to grade a vendor that does not exist.
    const obs = selectMarketIntelFeedObservation({
      ...OBSERVING,
      source: "unavailable",
    });
    expect(obs.source).toBeNull();
    expect(obs.quotePresent).toBe(false);
  });

  it("refuses a named provider whose link never reached OBSERVED", () => {
    // A configured vendor is not an observation. Every non-OBSERVED link state
    // the monitor distinguishes must stay silent about having seen a price.
    for (const linkState of ["TRANSPORT_DOWN", "SOURCE_DISOWNED", "NO_PRINT_YET", ""]) {
      const obs = selectMarketIntelFeedObservation({
        ...OBSERVING,
        linkState,
      });
      expect(obs.source, linkState).toBeNull();
      expect(obs.quotePresent, linkState).toBe(false);
      expect(obs.lastObservedAtMs, linkState).toBeNull();
    }
  });

  it("refuses zero, negative and non-finite observation epochs", () => {
    for (const lastObservedAtMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        selectMarketIntelFeedObservation({ ...OBSERVING, lastObservedAtMs }).lastObservedAtMs,
        String(lastObservedAtMs),
      ).toBeNull();
    }
  });

  it("carries the room's proven session verdict through unchanged, including null", () => {
    // Tri-state on purpose. Rounding an unresolved calendar up to "open" is how
    // a badge asserts an active session on a Sunday.
    for (const sessionOpen of [true, false, null] as const) {
      expect(
        selectMarketIntelFeedObservation({ ...OBSERVING, sessionOpen }).sessionOpen,
        String(sessionOpen),
      ).toBe(sessionOpen);
    }
  });

  it("draws no chart, so it claims no bars", () => {
    expect(selectMarketIntelFeedObservation(OBSERVING).barsPresent).toBe(false);
    expect(selectMarketIntelFeedObservation(SOCKET_DOWN).barsPresent).toBe(false);
  });

  it("does not grade its own fidelity — it publishes evidence only", () => {
    expect(Object.keys(selectMarketIntelFeedObservation(OBSERVING)).sort()).toEqual([
      "barsPresent",
      "connected",
      "lastObservedAtMs",
      "quotePresent",
      "sessionOpen",
      "source",
    ]);
  });

  it("a provider clock ahead of ours is not rounded into a reading", () => {
    const standing = compileFeedStanding(
      selectMarketIntelFeedObservation({ ...OBSERVING, lastObservedAtMs: AT + 60_000 }),
      AT,
    );
    expect(standing.label).toBe("FEED UNKNOWN");
    expect(standing.established).toBe(false);
  });
});
