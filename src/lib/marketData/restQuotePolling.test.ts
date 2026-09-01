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
