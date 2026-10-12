import { describe, expect, it } from "vitest";
import {
  REST_QUOTE_NO_TAPE_POLL_MS,
  REST_QUOTE_WITH_TAPE_POLL_MS,
  restQuoteNextPollDelayMs,
} from "./restQuotePolling";

describe("restQuoteNextPollDelayMs", () => {
  it("keeps a bounded display snapshot when no tape is elected", () => {
    expect(restQuoteNextPollDelayMs(null)).toBe(REST_QUOTE_NO_TAPE_POLL_MS);
  });

  it.each(["polygon", "finnhub", "alpaca", "coinbase", "binance", "moomoo", "webull"] as const)(
    "backs redundant snapshots off while %s owns the tape",
    (source) => expect(restQuoteNextPollDelayMs(source)).toBe(REST_QUOTE_WITH_TAPE_POLL_MS),
  );
});

import { REST_QUOTE_REFUSED_POLL_MS } from "./restQuotePolling";

describe("a refused poll backs off (2026-10-12: no delayed fallback stands behind it)", () => {
  it("waits a minute after a refusal or no answer, with or without a tape", () => {
    expect(REST_QUOTE_REFUSED_POLL_MS).toBe(60_000);
    expect(restQuoteNextPollDelayMs(null, false)).toBe(60_000);
    expect(restQuoteNextPollDelayMs("tastytrade", false)).toBe(60_000);
    expect(restQuoteNextPollDelayMs(null, true)).toBe(REST_QUOTE_NO_TAPE_POLL_MS);
  });
});
