import { describe, it, expect, vi } from "vitest";
import { probeMoomooTicks, readMoomooTicks, type FetchLike } from "./moomooTicksClient";
import type { MoomooTickRow } from "./moomooTicks";

const RECEIVED = 1_756_000_000_000;
const PROCESSED = RECEIVED + 50;

const buyRow: MoomooTickRow = {
  code: "US.TSLA",
  seq: 4021,
  time: "2026-08-31 09:30:01.250",
  timestamp_ms: 1_756_000_000_000,
  price: 248.13,
  volume: 120,
  turnover: 29775.6,
  direction: "BUY",
  type: "AUTO_MATCH",
};

const CONFIG = { bridgeUrl: "https://bridge.local/", bridgeToken: "shh" };

/** Build a fake fetch that returns a given status + JSON body. */
const jsonFetch = (status: number, body: unknown): FetchLike =>
  vi.fn(async () => ({ status, json: async () => body })) as unknown as FetchLike;

describe("probeMoomooTicks — transport truth, no secret leakage", () => {
  it("is NOT CONFIGURED when the bridge URL or token is absent (no fetch attempted)", async () => {
    const fetchImpl = vi.fn() as unknown as FetchLike;
    const a = await probeMoomooTicks(fetchImpl, { bridgeUrl: "", bridgeToken: "x" }, "US.TSLA");
    const b = await probeMoomooTicks(fetchImpl, { bridgeUrl: "https://b", bridgeToken: "" }, "US.TSLA");
    expect(a.configured).toBe(false);
    expect(b.configured).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends the bearer token + no-store and reports transportReached with status/body", async () => {
    const fetchImpl = jsonFetch(200, { ok: true, ticks: [buyRow] });
    const input = await probeMoomooTicks(fetchImpl, CONFIG, "US.TSLA", 50);
    expect(input.transportReached).toBe(true);
    expect(input.httpStatus).toBe(200);
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://bridge.local/ticks?symbols=US.TSLA&num=50");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer shh" });
    expect((init as RequestInit).cache).toBe("no-store");
  });

  it("clamps num into 1..1000", async () => {
    const fetchImpl = jsonFetch(200, { ok: true, ticks: [] });
    await probeMoomooTicks(fetchImpl, CONFIG, "US.TSLA", 999999);
    const [url] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("num=1000");
  });

  it("a thrown transport error becomes transportReached:false with the message (never throws)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED 127.0.0.1:8790");
    }) as unknown as FetchLike;
    const input = await probeMoomooTicks(fetchImpl, CONFIG, "US.TSLA");
    expect(input.transportReached).toBe(false);
    expect(input.transportError).toContain("ECONNREFUSED");
  });

  it("times out a hanging bridge read instead of freezing the authenticated route", async () => {
    vi.useFakeTimers();
    try {
      const hanging = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
        }),
      ) as unknown as FetchLike;
      const pending = probeMoomooTicks(hanging, { ...CONFIG, timeoutMs: 250 }, "US.TSLA");
      await vi.advanceTimersByTimeAsync(250);
      const input = await pending;
      expect(input.transportReached).toBe(false);
      expect(input.transportError).toBe("Bridge read timed out after 250 ms.");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("readMoomooTicks — transport + honest label + canonical events", () => {
  it("normalizes real prints into RECEIVING with canonical events", async () => {
    const fetchImpl = jsonFetch(200, {
      ok: true,
      ticks: [buyRow, { ...buyRow, seq: 4022, price: 248.2, volume: 5, direction: "SELL" }],
      source: "moomoo-opend",
    });
    const { status, events } = await readMoomooTicks(fetchImpl, CONFIG, {
      providerCode: "US.TSLA",
      appSymbol: "TSLA",
    }, RECEIVED, PROCESSED);
    expect(status.label).toBe("RECEIVING");
    expect(status.eventCount).toBe(2);
    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe("TRADE");
    expect(events[0].normalizedSymbol).toBe("TSLA");
  });

  it("defaults to DELAYED mode (never asserts uncertified realtime)", async () => {
    const fetchImpl = jsonFetch(200, { ok: true, ticks: [buyRow] });
    const { events } = await readMoomooTicks(
      fetchImpl,
      CONFIG,
      { providerCode: "US.TSLA", appSymbol: "TSLA" },
      RECEIVED,
      PROCESSED,
    );
    expect(events[0].dataMode).toBe("DELAYED");
  });

  it("OpenD down behind a reachable bridge → BRIDGE UNREACHABLE, zero events", async () => {
    const fetchImpl = jsonFetch(502, { ok: false, error: "OpenD not reachable on 127.0.0.1:11111", source: "moomoo-opend" });
    const { status, events } = await readMoomooTicks(fetchImpl, CONFIG, { providerCode: "US.TSLA", appSymbol: "TSLA" });
    expect(status.label).toBe("BRIDGE UNREACHABLE");
    expect(events).toEqual([]);
  });

  it("a rejected token → AUTH BLOCKED, zero events", async () => {
    const fetchImpl = jsonFetch(401, { ok: false, error: "missing or bad bearer token" });
    const { status, events } = await readMoomooTicks(fetchImpl, CONFIG, { providerCode: "US.TSLA", appSymbol: "TSLA" });
    expect(status.label).toBe("AUTH BLOCKED");
    expect(events).toEqual([]);
  });

  it("no config → NOT CONFIGURED, zero events", async () => {
    const fetchImpl = vi.fn() as unknown as FetchLike;
    const { status, events } = await readMoomooTicks(fetchImpl, {}, { providerCode: "US.TSLA", appSymbol: "TSLA" });
    expect(status.label).toBe("NOT CONFIGURED");
    expect(events).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
