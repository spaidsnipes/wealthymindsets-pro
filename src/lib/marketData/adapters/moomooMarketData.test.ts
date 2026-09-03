import { describe, it, expect, vi } from "vitest";
import { probeMoomooMarketData } from "./moomooMarketData";

/** Build a mock fetch that returns the given JSON body + status per URL match. */
function mockFetch(routes: Array<{ match: string; status: number; body: unknown }>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes.find((r) => url.includes(r.match));
    if (!route) throw new Error(`unexpected fetch ${url}`);
    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      json: async () => route.body,
    } as Response;
  }) as unknown as typeof fetch;
}

const status = (cert: Awaited<ReturnType<typeof probeMoomooMarketData>>, cap: string) =>
  cert.rows.find((r) => r.capability === cap)!.status;

describe("probeMoomooMarketData — honest bridge-state → certification mapping", () => {
  it("no bridge configured → all NOT_IMPLEMENTED, CVD UNAVAILABLE, nothing certified", async () => {
    const cert = await probeMoomooMarketData(mockFetch([]), { bridgeUrl: "" });
    expect(cert.source).toBe("moomoo");
    expect(cert.rows.every((r) => r.status === "NOT_IMPLEMENTED")).toBe(true);
    expect(cert.rows.find((r) => r.capability === "TICKS")?.note).toMatch(/MOOMOO_BRIDGE_URL is missing/i);
    expect(cert.certifiedCount).toBe(0);
    expect(cert.cvd).toBe("UNAVAILABLE");
  });

  it("bridge /health unreachable → PRICE NOT_IMPLEMENTED with honest note", async () => {
    const cert = await probeMoomooMarketData(
      mockFetch([{ match: "/health", status: 502, body: { ok: false } }]),
      { bridgeUrl: "https://bridge.example" },
    );
    expect(status(cert, "PRICE")).toBe("NOT_IMPLEMENTED");
    expect(cert.certifiedCount).toBe(0);
  });

  it("network throw on /health is caught → NOT_IMPLEMENTED (never crashes)", async () => {
    const throwing = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const cert = await probeMoomooMarketData(throwing, { bridgeUrl: "https://bridge.example" });
    expect(status(cert, "PRICE")).toBe("NOT_IMPLEMENTED");
  });

  it("bounds a hanging health probe so one bridge cannot freeze the provider matrix", async () => {
    vi.useFakeTimers();
    try {
      const hanging = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
        }),
      ) as unknown as typeof fetch;
      const pending = probeMoomooMarketData(hanging, { bridgeUrl: "https://bridge.example", timeoutMs: 250 });
      await vi.advanceTimersByTimeAsync(250);
      const cert = await pending;
      expect(status(cert, "PRICE")).toBe("NOT_IMPLEMENTED");
      expect(cert.rows.find((row) => row.capability === "PRICE")?.note).toMatch(/BRIDGE UNREACHABLE/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("bridge up but OpenD offline → every market capability BLOCKED_AUTH", async () => {
    const cert = await probeMoomooMarketData(
      mockFetch([{ match: "/health", status: 200, body: { ok: true, opend_reachable: false, sdk_version: "10.10.7008" } }]),
      { bridgeUrl: "https://bridge.example" },
    );
    for (const cap of ["PRICE", "BARS", "TICKS", "EXECUTED_VOLUME", "AGGRESSOR_SIDE", "DEPTH", "OPTIONS", "FUTURES"]) {
      expect(status(cert, cap), cap).toBe("BLOCKED_AUTH");
    }
    // Broker rows we never probe stay honest NOT_IMPLEMENTED.
    expect(status(cert, "ACCOUNT")).toBe("NOT_IMPLEMENTED");
    // OpenD offline still means no executed evidence → CVD UNAVAILABLE.
    expect(cert.cvd).toBe("UNAVAILABLE");
    // The note names the concrete Founder action.
    expect(cert.rows.find((r) => r.capability === "PRICE")!.note).toMatch(/OpenD gateway offline/i);
  });

  it("OpenD reachable + canary quote returns data → PRICE ACTIVE_DEGRADED (snapshot)", async () => {
    const cert = await probeMoomooMarketData(
      mockFetch([
        { match: "/health", status: 200, body: { ok: true, opend_reachable: true, sdk_version: "10.10.7008" } },
        { match: "/quote", status: 200, body: { ok: true, quotes: [{ code: "US.AAPL", last: 312.04, update_time: "2026-08-31 09:45:00" }] } },
      ]),
      { bridgeUrl: "https://bridge.example", bridgeToken: "secret", canarySymbol: "US.AAPL" },
    );
    const price = cert.rows.find((r) => r.capability === "PRICE")!;
    expect(price.status).toBe("ACTIVE_DEGRADED");
    expect(price.fidelity).toBe("SNAPSHOT");
    expect(cert.certifiedCount).toBe(0); // DEGRADED is not CERTIFIED — never rounded up
  });

  it("OpenD reachable + empty quote → PRICE NOT_IMPLEMENTED because entitlement is unproven", async () => {
    const cert = await probeMoomooMarketData(
      mockFetch([
        { match: "/health", status: 200, body: { ok: true, opend_reachable: true, sdk_version: "10.10.7008" } },
        { match: "/quote", status: 200, body: { ok: true, quotes: [] } },
      ]),
      { bridgeUrl: "https://bridge.example", bridgeToken: "secret", canarySymbol: "US.AAPL" },
    );
    const price = cert.rows.find((r) => r.capability === "PRICE")!;
    expect(price.status).toBe("NOT_IMPLEMENTED");
    expect(price.note).toMatch(/entitlement is not proven/i);
    expect(cert.certifiedCount).toBe(0);
  });

  it("rejects a wrong-symbol or malformed quote instead of certifying price", async () => {
    const cert = await probeMoomooMarketData(
      mockFetch([
        { match: "/health", status: 200, body: { ok: true, opend_reachable: true } },
        { match: "/quote", status: 200, body: { ok: true, quotes: [{ code: "US.TSLA", last: 351.12, update_time: "2026-08-31 09:45:00" }] } },
      ]),
      { bridgeUrl: "https://bridge.example", bridgeToken: "secret", canarySymbol: "US.AAPL" },
    );
    expect(status(cert, "PRICE")).toBe("NOT_IMPLEMENTED");
  });

  it("maps rejected bridge credentials to BLOCKED_AUTH", async () => {
    const cert = await probeMoomooMarketData(
      mockFetch([
        { match: "/health", status: 200, body: { ok: true, opend_reachable: true } },
        { match: "/quote", status: 401, body: { ok: false, error: "bad token" } },
      ]),
      { bridgeUrl: "https://bridge.example", bridgeToken: "secret", canarySymbol: "US.AAPL" },
    );
    expect(status(cert, "PRICE")).toBe("BLOCKED_AUTH");
  });

  it("does not convert an unclassified bridge 403 into auth or entitlement", async () => {
    const cert = await probeMoomooMarketData(
      mockFetch([
        { match: "/health", status: 200, body: { ok: true, opend_reachable: true } },
        { match: "/quote", status: 403, body: { ok: false } },
      ]),
      { bridgeUrl: "https://bridge.example", bridgeToken: "secret", canarySymbol: "US.AAPL" },
    );
    const price = cert.rows.find((row) => row.capability === "PRICE")!;
    expect(price.status).toBe("NOT_IMPLEMENTED");
    expect(price.note).toMatch(/ACCESS UNPROVEN/i);
    expect(price.note).toMatch(/failed edge/i);
    expect(price.note).not.toMatch(/entitlement blocked/i);
  });

  it("bounds a hanging authenticated quote probe", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes("/health")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ ok: true, opend_reachable: true }),
          } as Response);
        }
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
        });
      }) as unknown as typeof fetch;
      const pending = probeMoomooMarketData(fetchImpl, {
        bridgeUrl: "https://bridge.example",
        bridgeToken: "secret",
        canarySymbol: "US.AAPL",
        timeoutMs: 250,
      });
      await vi.advanceTimersByTimeAsync(250);
      const cert = await pending;
      expect(status(cert, "PRICE")).toBe("NOT_IMPLEMENTED");
      expect(cert.rows.find((row) => row.capability === "PRICE")?.note).toMatch(/transport error/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("OpenD reachable but no token/symbol → PRICE stays PENDING (NOT_IMPLEMENTED, not claimed)", async () => {
    const cert = await probeMoomooMarketData(
      mockFetch([{ match: "/health", status: 200, body: { ok: true, opend_reachable: true, sdk_version: "10.10.7008" } }]),
      { bridgeUrl: "https://bridge.example" },
    );
    expect(status(cert, "PRICE")).toBe("NOT_IMPLEMENTED");
    expect(cert.rows.find((r) => r.capability === "PRICE")?.note).toMatch(/MOOMOO_BRIDGE_TOKEN is missing/i);
    expect(cert.rows.find((r) => r.capability === "TICKS")?.note).toMatch(/no authenticated tick retrieval/i);
  });

  it("OpenD reachable with token but no canary names the exact unexercised edge", async () => {
    const cert = await probeMoomooMarketData(
      mockFetch([{ match: "/health", status: 200, body: { ok: true, opend_reachable: true, sdk_version: "10.10.7008" } }]),
      { bridgeUrl: "https://bridge.example", bridgeToken: "secret" },
    );
    expect(status(cert, "PRICE")).toBe("NOT_IMPLEMENTED");
    expect(cert.rows.find((r) => r.capability === "PRICE")?.note).toMatch(/CANARY NOT SELECTED/i);
    expect(cert.rows.find((r) => r.capability === "TICKS")?.note).toMatch(/no symbol-scoped tick retrieval/i);
  });
});
