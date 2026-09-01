import { describe, expect, it, vi } from "vitest";
import { probeAlpacaMarketData } from "./alpacaMarketData";

describe("Alpaca canonical market-data certification", () => {
  it("fails closed without the live credential pair", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const cert = await probeAlpacaMarketData(fetchImpl, { key: "only-key" });
    expect(cert.rows.every((row) => row.status === "NOT_IMPLEMENTED")).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps auth and unproven refusal distinct", async () => {
    const auth = await probeAlpacaMarketData(
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })) as unknown as typeof fetch,
      { key: "key", secret: "secret" },
    );
    expect(auth.rows.find((row) => row.capability === "PRICE")?.status).toBe("BLOCKED_AUTH");

    const unknown = await probeAlpacaMarketData(
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })) as unknown as typeof fetch,
      { key: "key", secret: "secret" },
    );
    expect(unknown.rows.find((row) => row.capability === "PRICE")?.status).toBe("NOT_IMPLEMENTED");
    expect(JSON.stringify(unknown)).not.toMatch(/BLOCKED_ENTITLEMENT|DELAYED/);
  });

  it("certifies only the bounded IEX snapshot dimensions actually observed", async () => {
    const observedAt = "2026-08-31T15:00:00.000Z";
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      latestTrade: { p: 351.25, s: 7, t: observedAt },
      dailyBar: { v: 12345 },
    }), { status: 200 })) as unknown as typeof fetch;
    const cert = await probeAlpacaMarketData(fetchImpl, {
      key: "key",
      secret: "secret",
      canarySymbol: "tsla",
      now: () => new Date("2026-08-31T15:00:02.000Z"),
    });
    expect(cert.rows.find((row) => row.capability === "PRICE")).toMatchObject({ status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT", stalenessMs: 2000 });
    expect(cert.rows.find((row) => row.capability === "TICKS")).toMatchObject({ status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT" });
    expect(cert.rows.find((row) => row.capability === "EXECUTED_VOLUME")).toMatchObject({ status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT" });
    expect(cert.rows.find((row) => row.capability === "AGGRESSOR_SIDE")?.status).toBe("NOT_IMPLEMENTED");
    expect(cert.cvd).toBe("UNAVAILABLE");
    expect(JSON.stringify(cert)).not.toContain("secret");
  });

  it("rejects malformed, missing, or future-dated provider observations", async () => {
    const future = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      latestTrade: { p: 351.25, s: 7, t: "2026-08-31T15:10:01.000Z" },
    }), { status: 200 })) as unknown as typeof fetch;
    const cert = await probeAlpacaMarketData(future, {
      key: "key",
      secret: "secret",
      now: () => new Date("2026-08-31T15:00:00.000Z"),
    });
    expect(cert.rows.every((row) => row.status === "NOT_IMPLEMENTED")).toBe(true);
  });

  it("does not promote a stale provider trade into an active capability", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      latestTrade: { p: 351.25, s: 7, t: "2026-08-31T14:58:00.000Z" },
    }), { status: 200 })) as unknown as typeof fetch;
    const cert = await probeAlpacaMarketData(fetchImpl, {
      key: "key",
      secret: "secret",
      now: () => new Date("2026-08-31T15:00:00.000Z"),
      maxTradeAgeMs: 60_000,
    });
    expect(cert.rows.find((row) => row.capability === "PRICE")).toMatchObject({ status: "NOT_IMPLEMENTED", fidelity: "NONE" });
    expect(cert.rows.find((row) => row.capability === "PRICE")?.note).toMatch(/stale evidence was not exposed/i);
  });

  it("bounds a hung provider read", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as unknown as typeof fetch;
    const cert = await probeAlpacaMarketData(fetchImpl, { key: "key", secret: "secret", timeoutMs: 250 });
    expect(cert.rows.find((row) => row.capability === "PRICE")?.note).toMatch(/did not respond within 250 ms/i);
  });
});
