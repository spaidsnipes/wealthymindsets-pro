import { describe, it, expect } from "vitest";
import { fmpFetch, type FmpTransport } from "./fmpClient";

/** Build a transport that records the URL it was called with. */
function recorder(resp: { ok?: boolean; body?: unknown; throws?: boolean }) {
  const calls: string[] = [];
  const transport: FmpTransport = async (url) => {
    calls.push(url);
    if (resp.throws) throw new Error("network");
    return { ok: resp.ok ?? true, json: async () => resp.body };
  };
  return { transport, calls };
}

describe("fmpFetch — canonical FMP egress", () => {
  it("encodes the raw path exactly once and hits /api/fmp", async () => {
    const { transport, calls } = recorder({ body: [{ symbol: "AAPL" }] });
    await fmpFetch("/v3/profile/AAPL,MSFT", { transport });
    expect(calls[0]).toBe("/api/fmp?path=%2Fv3%2Fprofile%2FAAPL%2CMSFT");
    // Decoding the query param yields the original raw path (no double-encoding).
    expect(decodeURIComponent(calls[0].split("path=")[1])).toBe("/v3/profile/AAPL,MSFT");
  });

  it("returns the parsed JSON body on success", async () => {
    const body = [{ symbol: "AAPL", mktCap: 123 }];
    const { transport } = recorder({ body });
    expect(await fmpFetch("/v3/profile/AAPL", { transport })).toEqual(body);
  });

  it("returns null on a non-OK response", async () => {
    const { transport } = recorder({ ok: false, body: { error: "bad" } });
    expect(await fmpFetch("/v3/options/AAPL", { transport })).toBeNull();
  });

  it("returns null on an FMP error payload (error / Error Message)", async () => {
    expect(await fmpFetch("/x", { transport: recorder({ body: { error: "limit" } }).transport })).toBeNull();
    expect(await fmpFetch("/x", { transport: recorder({ body: { "Error Message": "invalid" } }).transport })).toBeNull();
  });

  it("passes through arrays and non-error objects unchanged", async () => {
    expect(await fmpFetch("/x", { transport: recorder({ body: [] }).transport })).toEqual([]);
    expect(await fmpFetch("/x", { transport: recorder({ body: { chain: [1, 2] } }).transport })).toEqual({ chain: [1, 2] });
  });

  it("never throws — returns null on transport failure", async () => {
    const { transport } = recorder({ throws: true });
    expect(await fmpFetch("/v3/options/AAPL", { transport })).toBeNull();
  });

  it("returns null for a blank path without calling the transport", async () => {
    const { transport, calls } = recorder({ body: {} });
    expect(await fmpFetch("  ", { transport })).toBeNull();
    expect(calls).toEqual([]);
  });
});
