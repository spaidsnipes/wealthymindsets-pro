import { describe, expect, it, vi } from "vitest";
import { optionContractObservationTiming, optionsReadFailure, optionsReceiptAge, readOptionsResponse } from "./optionsChainRead";

const contract = { symbol: "TSLA260918C00350000", contractType: "call", expirationDate: "2026-09-18", strike: 350, bid: 2.1, ask: 2.3, volume: 37 };
const observedContract = { ...contract, quoteTimestamp: "2026-09-09T19:59:59Z" };
const response = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: vi.fn(async () => body) });

describe("options chain failed-edge projection", () => {
  it("consumes the body of a rejected response to retain a proven host-config edge", async () => {
    const res = response(503, { source: "fmp", edge: "NOT CONFIGURED", missing: ["do-not-reflect"], error: "private-error" });
    const result = await readOptionsResponse(res);
    expect(res.json).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: false, failure: optionsReadFailure("NOT CONFIGURED") });
    expect(JSON.stringify(result)).not.toMatch(/do-not-reflect|private-error/);
  });

  it.each([
    [401, "AUTH BLOCKED"], [403, "REQUEST DENIED"], [429, "RATE LIMITED"],
    [408, "TIMEOUT"], [504, "TIMEOUT"], [500, "PROVIDER ERROR"],
    [502, "PROVIDER ERROR"], [503, "PROVIDER ERROR"], [400, "UNKNOWN"], [404, "UNKNOWN"],
  ])("classifies HTTP %i without inventing an entitlement cause", async (status, edge) => {
    const result = await readOptionsResponse(response(Number(status), { error: "delayed by entitlement", edge: "BLOCKED_ENTITLEMENT" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.edge).toBe(edge);
    expect(JSON.stringify(result)).not.toContain("BLOCKED_ENTITLEMENT");
    expect(JSON.stringify(result)).not.toContain("delayed by entitlement");
  });

  it.each([
    { source: "unknown", edge: "NOT CONFIGURED" },
    { source: "fmp", edge: "unknown" },
    { error: "FMP_KEY is missing" }, null, [],
  ])("does not infer configuration failure from prose or an unrecognized receipt", async body => {
    const result = await readOptionsResponse(response(503, body));
    expect(result).toEqual({ ok: false, failure: optionsReadFailure("PROVIDER ERROR") });
  });

  it("preserves the WM Alpaca route's exact invalid-response receipt", async () => {
    const result = await readOptionsResponse(response(502, {
      source: "alpaca",
      edge: "INVALID RESPONSE",
      error: "private route detail",
    }));
    expect(result).toEqual({ ok: false, failure: optionsReadFailure("INVALID RESPONSE") });
    expect(JSON.stringify(result)).not.toContain("private route detail");
  });

  it.each([
    ["TRANSPORT", "could not complete the provider request"],
    ["DECODE", "received a response it could not decode"],
    ["NORMALIZE", "could not validate the provider contract schema"],
  ])("projects the exact %s stage through reviewed static copy", async (stage, copy) => {
    const result = await readOptionsResponse(response(502, {
      source: "alpaca", edge: "INVALID RESPONSE", stage,
      error: "private provider detail",
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.message).toContain(copy);
    expect(JSON.stringify(result)).not.toContain("private provider detail");
  });

  it("ignores an unrecognized invalid-response stage", async () => {
    const result = await readOptionsResponse(response(502, {
      source: "alpaca", edge: "INVALID RESPONSE", stage: "PRIVATE_STAGE",
    }));
    expect(result).toEqual({ ok: false, failure: optionsReadFailure("INVALID RESPONSE") });
  });

  it("preserves only the WM route's exact redirect-blocked receipt", async () => {
    const exact = await readOptionsResponse(response(502, {
      source: "alpaca", edge: "REDIRECT BLOCKED", error: "private redirect target",
    }));
    expect(exact).toEqual({ ok: false, failure: optionsReadFailure("REDIRECT BLOCKED") });
    expect(JSON.stringify(exact)).not.toContain("private redirect target");
    expect(await readOptionsResponse(response(502, { source: "other", edge: "REDIRECT BLOCKED" })))
      .toEqual({ ok: false, failure: optionsReadFailure("PROVIDER ERROR") });
  });

  it("does not let a contradictory body override an HTTP authentication failure", async () => {
    expect(await readOptionsResponse(response(401, { source: "fmp", edge: "NOT CONFIGURED" })))
      .toEqual({ ok: false, failure: optionsReadFailure("AUTH BLOCKED") });
  });

  it.each([[], { chain: [] }, { optionChain: [] }])("names an empty validated list NO EVENTS", async body => {
    expect(await readOptionsResponse(response(200, body))).toEqual({ ok: false, failure: optionsReadFailure("NO EVENTS") });
  });

  it.each([null, { price: 10 }, { chain: [null] }, { chain: [contract, contract] }, { chain: [{ ...contract, bid: -1 }] }])("fails closed on malformed or duplicate contracts", async body => {
    expect(await readOptionsResponse(response(200, body))).toEqual({ ok: false, failure: optionsReadFailure("INVALID RESPONSE") });
  });

  it.each([200, 401, 503])("handles malformed HTTP %i JSON without exposing a raw exception", async status => {
    const result = await readOptionsResponse({ ok: status === 200, status, json: async () => { throw new Error("https://provider.invalid?apikey=private-fixture"); } });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/private-fixture|apikey|provider.invalid/);
    if (!result.ok) expect(result.failure.edge).toBe(status === 200 ? "INVALID RESPONSE" : status === 401 ? "AUTH BLOCKED" : "PROVIDER ERROR");
  });

  it("preserves observed sizes and quotes without adding missing values or certification", async () => {
    const result = await readOptionsResponse(response(200, { chain: [contract] }));
    expect(result).toEqual({ ok: true, contracts: [contract], receipt: {
      source: "unknown", fidelity: "UNKNOWN", coverage: "UNKNOWN", newestProviderTimestamp: null,
    } });
    expect(JSON.stringify(result)).not.toMatch(/certified|live|entitlement|last/);
  });

  it("accepts only an exact Alpaca indicative source receipt", async () => {
    const result = await readOptionsResponse(response(200, {
      source: "alpaca", fidelity: "INDICATIVE", coverage: "PARTIAL",
      newestProviderTimestamp: "2026-09-09T19:59:59Z", chain: [observedContract],
    }));
    expect(result).toEqual({ ok: true, contracts: [observedContract], receipt: {
      source: "alpaca", fidelity: "INDICATIVE", coverage: "PARTIAL",
      newestProviderTimestamp: "2026-09-09T19:59:59Z",
    } });
  });

  it.each([
    [{ ...observedContract, quoteTimestamp: undefined }],
    [{ ...observedContract, bid: undefined, ask: undefined }],
    [{ ...observedContract, last: 2.2 }],
    [{ ...observedContract, tradeTimestamp: "2026-09-09T19:59:58Z" }],
  ])("rejects an Alpaca envelope with an unbound price or timestamp leg", async forged => {
    const result = await readOptionsResponse(response(200, {
      source: "alpaca", fidelity: "INDICATIVE", coverage: "COMPLETE",
      newestProviderTimestamp: "2026-09-09T19:59:59Z", chain: forged,
    }));
    expect(result).toEqual({ ok: false, failure: optionsReadFailure("INVALID RESPONSE") });
  });

  it("rejects a page-newest timestamp not derived from accepted contract observations", async () => {
    const result = await readOptionsResponse(response(200, {
      source: "alpaca", fidelity: "INDICATIVE", coverage: "COMPLETE",
      newestProviderTimestamp: "2026-09-09T20:00:00Z", chain: [observedContract],
    }));
    expect(result).toEqual({ ok: false, failure: optionsReadFailure("INVALID RESPONSE") });
  });

  it("withholds an Alpaca source receipt when no provider timestamp is proven", async () => {
    const result = await readOptionsResponse(response(200, {
      source: "alpaca", fidelity: "INDICATIVE", coverage: "COMPLETE",
      newestProviderTimestamp: null, chain: [contract],
    }));
    expect(result.ok && result.receipt.source).toBe("unknown");
  });

  it("has no sticky failure state: a new response can recover normally", async () => {
    expect((await readOptionsResponse(response(503, {}))).ok).toBe(false);
    expect((await readOptionsResponse(response(200, [contract]))).ok).toBe(true);
  });

  it("waits for the body rather than prematurely certifying response headers", async () => {
    let complete!: (value: unknown) => void;
    const pending = new Promise<unknown>(resolve => { complete = resolve; });
    let settled = false;
    const result = readOptionsResponse({ ok: true, status: 200, json: () => pending }).then(value => { settled = true; return value; });
    await Promise.resolve();
    expect(settled).toBe(false);
    complete([contract]);
    expect((await result).ok).toBe(true);
  });
});

describe("options receipt age", () => {
  const now = Date.parse("2026-09-10T05:15:00Z");

  it.each([
    ["2026-09-10T05:14:30Z", "less than 1m old", "RECENT"],
    ["2026-09-10T04:55:00Z", "20m old", "RECENT"],
    ["2026-09-10T04:45:00Z", "30m old", "RECENT"],
    ["2026-09-10T04:44:59.999Z", "30m old", "STALE"],
    ["2026-09-10T04:44:00Z", "31m old", "STALE"],
    ["2026-09-10T04:35:00Z", "40m old", "STALE"],
    ["2026-09-10T04:15:00Z", "1h 0m old", "STALE"],
    ["2026-09-09T19:59:00Z", "9h 16m old", "STALE"],
  ])("formats %s as an observed age without session inference", (timestamp, label, timing) => {
    expect(optionsReceiptAge(timestamp, now)).toEqual({ label, timing });
  });

  it.each([
    [null, "timestamp unavailable"],
    ["not-a-date", "timestamp unavailable"],
    ["2026-09-10T05:15:00.001Z", "provider timestamp ahead"],
    ["2026-09-10T05:16:00Z", "provider timestamp ahead"],
    ["2026-09-10T05:17:00Z", "provider timestamp ahead"],
  ])("fails closed for timestamp %s", (timestamp, label) => {
    expect(optionsReceiptAge(timestamp, now)).toEqual({ label, timing: "UNVERIFIED" });
  });

  it("fails closed when the comparison clock is unavailable", () => {
    expect(optionsReceiptAge("2026-09-10T05:14:30Z", Number.NaN))
      .toEqual({ label: "time comparison unavailable", timing: "UNVERIFIED" });
  });
});

describe("exact option-contract observation timing", () => {
  const now = Date.parse("2026-09-10T05:15:00Z");

  it.each([
    [{}, "UNVERIFIED", "UNVERIFIED", false],
    [{ quoteTimestamp: "not-a-date", tradeTimestamp: "still-not-a-date" }, "UNVERIFIED", "UNVERIFIED", false],
    [{ quoteTimestamp: "2026-09-10T05:15:00.001Z", tradeTimestamp: "2026-09-10T05:16:00Z" }, "UNVERIFIED", "UNVERIFIED", false],
    [{ quoteTimestamp: "2026-09-10T04:45:00Z" }, "RECENT", "UNVERIFIED", true],
    [{ quoteTimestamp: "2026-09-10T04:44:59.999Z" }, "STALE", "UNVERIFIED", true],
    [{ quoteTimestamp: "2026-09-10T04:55:00Z", tradeTimestamp: "2026-09-10T05:16:00Z" }, "RECENT", "UNVERIFIED", true],
    [{ quoteTimestamp: "2026-09-10T04:00:00Z", tradeTimestamp: "2026-09-10T04:45:00Z" }, "STALE", "RECENT", true],
  ] as const)("classifies exact observations %#", (contract, quote, trade, reviewable) => {
    expect(optionContractObservationTiming(contract, now)).toMatchObject({
      quote: { timing: quote },
      trade: { timing: trade },
      reviewable,
    });
  });

  it("recovers after the local clock advances beyond a provider timestamp", () => {
    const contract = { quoteTimestamp: "2026-09-10T05:15:00.001Z" };
    expect(optionContractObservationTiming(contract, now).reviewable).toBe(false);
    expect(optionContractObservationTiming(contract, now + 2).quote.timing).toBe("RECENT");
    expect(optionContractObservationTiming(contract, now + 2).reviewable).toBe(true);
  });
});
