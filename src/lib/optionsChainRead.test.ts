import { describe, expect, it, vi } from "vitest";
import { optionsReadFailure, readOptionsResponse } from "./optionsChainRead";

const contract = { symbol: "TSLA260918C00350000", contractType: "call", expirationDate: "2026-09-18", strike: 350, bid: 2.1, ask: 2.3, volume: 37 };
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
      newestProviderTimestamp: "2026-09-09T19:59:59Z", chain: [contract],
    }));
    expect(result).toEqual({ ok: true, contracts: [contract], receipt: {
      source: "alpaca", fidelity: "INDICATIVE", coverage: "PARTIAL",
      newestProviderTimestamp: "2026-09-09T19:59:59Z",
    } });
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
