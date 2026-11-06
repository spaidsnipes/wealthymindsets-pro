import { describe, expect, it } from "vitest";
import {
  OVERNIGHT_FEED_CARRY_MS,
  overnightFeedCarried,
  quoteSessionClosure,
} from "./canonicalIdentity";
import { readMarketSession } from "./marketSessionClock";
import { marketClockET } from "./canonicalIdentity";
import { chartFeedReading, CHART_LIVE_OBSERVATION_MS } from "@/lib/priceSource";
import { chartBarCountdown } from "@/lib/chart/chartBarCountdown";
import { CANONICAL_FIDELITY_LABELS as L } from "./canonicalFidelityLabels";
import { streamOutranksQuotePoll, TAPE_OUTRANKS_QUOTE_MS } from "./dayReferenceClose";

/**
 * TRUTH BUG — TSLA 15m, Thu 2026-11-05 23:14 CT (Fri 00:14 ET, the overnight
 * equity session). One screen said, at once:
 *   header   SESSION CLOSED — LAST VERIFIED          (quote session: overnight = closed)
 *   tooltip  QUOTE NOT CERTIFIED — Alpaca's IEX quote is stale outside regular hours
 *   strip    a live forming-bar countdown / ● LIVE    (proven closure: overnight = unknown)
 *
 * Trace: provider stamp (tastytrade overnight print) → receipt → session
 * calendar (two owners disagreed) → bar open → bar-close clock (counted down
 * under the wrong owner) → feed capability (the quote session ignored that the
 * stream carries overnight prints) → replay/live. These tests pin THE ROOM:
 * the session owner, the feed grader and the countdown read together must
 * never contradict each other.
 */

const FIFTEEN_MIN = 900;
const at = (iso: string) => Date.parse(iso);

/** Everything the /charts room says about one instant, through its owners. */
function room(symbol: string, nowMs: number, source: string, lastObservedAtMs: number | null, connected = true) {
  const session = quoteSessionClosure(symbol, new Date(nowMs), { source, lastObservedAtMs, nowMs });
  const feed = chartFeedReading(source, connected, true, session.sessionOpen, lastObservedAtMs, nowMs, true);
  const countdown = chartBarCountdown(300, FIFTEEN_MIN, feed.status.live, feed.status.label, session.sessionOpen === false);
  return { session, feed, countdown };
}

/** The contradiction itself, as an executable rule. */
function expectOneVoice(r: ReturnType<typeof room>) {
  if (r.session.sessionOpen === false) {
    expect(r.feed.badge.live).toBe(false);
    expect(r.feed.status.state).not.toBe("LIVE");
    expect(r.countdown.kind).toBe("MARKET_CLOSED");
  }
  if (r.countdown.kind === "LIVE_BAR") {
    expect(r.session.sessionOpen).not.toBe(false);
    expect(r.feed.badge.label).not.toBe(L.SESSION_CLOSED_LAST_VERIFIED);
  }
  if (r.feed.badge.label === L.SESSION_CLOSED_LAST_VERIFIED) {
    expect(r.countdown.kind).toBe("MARKET_CLOSED");
  }
}

// Fri 2026-11-06 00:14 ET = 05:14Z (EST, UTC−5)
const OVERNIGHT = at("2026-11-06T05:14:00Z");

describe("the reported instant: TSLA overnight, Thu 23:14 CT", () => {
  it("a live tastytrade overnight print → session NOT claimed closed, forming bar is honest, one voice", () => {
    const r = room("TSLA", OVERNIGHT, "tastytrade", OVERNIGHT - 2_000);
    expect(r.session.sessionOpen).toBeNull();
    expect(r.session.detail).toContain("arriving on this feed");
    expect(r.feed.status.state).toBe("LIVE");
    expect(r.countdown.kind).toBe("LIVE_BAR");
    expectOneVoice(r);
  });

  it("no overnight feed (IEX quote lane only) → SESSION CLOSED everywhere, no countdown to a forming bar", () => {
    const r = room("TSLA", OVERNIGHT, "alpaca", at("2026-11-05T20:59:00Z"));
    expect(r.session.sessionOpen).toBe(false);
    expect(r.feed.badge.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    expect(r.countdown.kind).toBe("MARKET_CLOSED");
    expectOneVoice(r);
  });

  it("the old two-owner screen is now impossible: proven closure alone is not the room's owner", () => {
    // Without feed evidence the quote session says closed; MainChart now reads
    // the SAME owner, so its countdown cannot be LIVE_BAR under that header.
    const s = quoteSessionClosure("TSLA", new Date(OVERNIGHT));
    expect(s.sessionOpen).toBe(false);
    const c = chartBarCountdown(300, FIFTEEN_MIN, true, L.LIVE_CERTIFIED_QUOTE, s.sessionOpen === false);
    expect(c.kind).toBe("MARKET_CLOSED");
  });

  it("a polled refusal never speaks over a live stream (the IEX tooltip)", () => {
    const now = OVERNIGHT;
    expect(streamOutranksQuotePoll(now - 3_000, null, now)).toBe(true);
    expect(streamOutranksQuotePoll(null, now - 1_000, now)).toBe(true);
    expect(streamOutranksQuotePoll(now - 16_000, null, now)).toBe(false);
    expect(streamOutranksQuotePoll(null, now - TAPE_OUTRANKS_QUOTE_MS, now)).toBe(false);
    expect(streamOutranksQuotePoll(null, null, now)).toBe(false);
    // A future stamp is not a live stream.
    expect(streamOutranksQuotePoll(now + 60_000, null, now)).toBe(false);
  });
});

describe("after-hours (post-market 16:00–20:00 ET)", () => {
  const POST = at("2026-11-05T22:30:00Z"); // Thu 17:30 ET
  it("post-market is a session: never claimed closed, with or without a feed", () => {
    expect(room("TSLA", POST, "tastytrade", POST - 1_000).session.sessionOpen).toBeNull();
    expect(room("TSLA", POST, "alpaca", null, false).session.sessionOpen).toBeNull();
    expectOneVoice(room("TSLA", POST, "tastytrade", POST - 1_000));
  });
  it("a post-market print does not prove the overnight venues are carried", () => {
    const n = at("2026-11-06T01:05:00Z"); // Thu 20:05 ET, overnight
    const lastPost = at("2026-11-06T00:59:00Z"); // 19:59 ET
    expect(overnightFeedCarried({ source: "tastytrade", lastObservedAtMs: lastPost, nowMs: n })).toBe(false);
    expect(room("TSLA", n, "tastytrade", lastPost).session.sessionOpen).toBe(false);
  });
});

describe("closed days", () => {
  it("Saturday is proven closed even if a stamp looks fresh — evidence opens nothing on the weekend", () => {
    const SAT = at("2026-11-07T17:00:00Z");
    const r = room("TSLA", SAT, "tastytrade", SAT - 1_000);
    expect(r.session.sessionOpen).toBe(false);
    expectOneVoice(r);
  });
  it("Friday after 20:00 ET is the weekend close, not an overnight session", () => {
    const FRI = at("2026-11-07T01:30:00Z"); // Fri 20:30 ET
    const r = room("TSLA", FRI, "tastytrade", FRI - 1_000);
    expect(r.session.sessionOpen).toBe(false);
    expectOneVoice(r);
  });
  it("futures keep their own closure (Globex weekend) and ignore the equity overnight rule", () => {
    const SAT = at("2026-11-07T17:00:00Z");
    expect(room("NQ1!", SAT, "tastytrade", SAT - 1_000).session.sessionOpen).toBe(false);
    expect(room("NQ1!", OVERNIGHT, "tastytrade", OVERNIGHT - 1_000).session.sessionOpen).toBeNull();
  });
});

describe("delayed / polled feeds are not overnight evidence", () => {
  for (const source of ["yahoo", "finnhub", "alpaca"]) {
    it(`${source}: a fresh-stamped polled quote at night does not withhold closure`, () => {
      const r = room("TSLA", OVERNIGHT, source, OVERNIGHT - 5_000);
      expect(r.session.sessionOpen).toBe(false);
      expect(r.countdown.kind).toBe("MARKET_CLOSED");
      expectOneVoice(r);
    });
  }
});

describe("reconnect", () => {
  it("disconnected for 20 min → closed; first fresh print after reconnect → carried and live", () => {
    const lastBeforeDrop = OVERNIGHT - 20 * 60_000;
    const dropped = room("TSLA", OVERNIGHT, "tastytrade", lastBeforeDrop, false);
    expect(dropped.session.sessionOpen).toBe(false);
    expectOneVoice(dropped);
    const back = room("TSLA", OVERNIGHT + 30_000, "tastytrade", OVERNIGHT + 29_000, true);
    expect(back.session.sessionOpen).toBeNull();
    expect(back.feed.status.live).toBe(true);
    expectOneVoice(back);
  });
});

describe("stale", () => {
  it("a carried overnight feed that went quiet past the carry budget falls back to closed", () => {
    const r = room("TSLA", OVERNIGHT, "tastytrade", OVERNIGHT - OVERNIGHT_FEED_CARRY_MS - 1_000);
    expect(r.session.sessionOpen).toBe(false);
    expectOneVoice(r);
  });
  it("inside the carry budget but past the live budget: not closed, and NOT live (no forming-bar claim)", () => {
    const r = room("TSLA", OVERNIGHT, "tastytrade", OVERNIGHT - CHART_LIVE_OBSERVATION_MS - 60_000);
    expect(r.session.sessionOpen).toBeNull();
    expect(r.feed.status.live).toBe(false);
    expect(r.countdown.kind).toBe("CLOCK_ONLY");
    expectOneVoice(r);
  });
  it("a stamp from the future is not evidence", () => {
    expect(overnightFeedCarried({ source: "tastytrade", lastObservedAtMs: OVERNIGHT + 60_000, nowMs: OVERNIGHT })).toBe(false);
  });
});

describe("missing holiday calendar", () => {
  // Thanksgiving, Thu 2026-11-26 12:00 ET — NYSE is closed, and this codebase holds no holiday table.
  const THANKSGIVING = at("2026-11-26T17:00:00Z");
  it("the schedule says so in its basis instead of pretending holidays cannot happen", () => {
    const r = readMarketSession({ symbol: "TSLA", assetClass: "equity", clock: marketClockET(new Date(THANKSGIVING)), isUsCashIndex: false });
    expect(r?.holidayCalendar).toBe("NOT_LOADED");
    expect(r?.basis).toContain("holiday calendar not loaded");
  });
  it("an unknown holiday is never claimed closed NOR live: with no print, no forming-bar claim", () => {
    const r = room("TSLA", THANKSGIVING, "alpaca", at("2026-11-25T21:00:00Z"));
    expect(r.session.sessionOpen).toBeNull();
    expect(r.feed.status.live).toBe(false);
    expect(r.countdown.kind).not.toBe("LIVE_BAR");
    expectOneVoice(r);
  });
});

describe("replay", () => {
  it("a replay camera's bar time can never stand as overnight evidence", () => {
    // Last Tuesday 14:00 ET, a regular-hours bar the camera is walking.
    const replayBar = at("2026-11-03T19:00:00Z");
    expect(overnightFeedCarried({ source: "tastytrade", lastObservedAtMs: replayBar, nowMs: OVERNIGHT })).toBe(false);
    const r = room("TSLA", OVERNIGHT, "tastytrade", replayBar);
    expect(r.session.sessionOpen).toBe(false);
    expect(r.countdown.kind).toBe("MARKET_CLOSED");
    expectOneVoice(r);
  });
  it("an hourly session clock without feed evidence keeps the old contract (back-compat)", () => {
    expect(quoteSessionClosure("TSLA", new Date(OVERNIGHT)).sessionOpen).toBe(false);
    expect(quoteSessionClosure("TSLA", null).sessionOpen).toBeNull();
    expect(quoteSessionClosure("BTCUSD", new Date(OVERNIGHT), { source: "coinbase", lastObservedAtMs: OVERNIGHT, nowMs: OVERNIGHT }).sessionOpen).toBeNull();
  });
});
