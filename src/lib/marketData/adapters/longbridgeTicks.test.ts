import { describe, expect, it, vi } from "vitest";
import { normalizeLongbridgeTrade, readLongbridgeTicks } from "./longbridgeTicks";

const NOW = Date.parse("2026-09-01T20:41:30Z");
const ROW = { price: "355.584", volume: 15, timestamp: "2026-09-01T20:41:24Z", trade_type: "I", direction: "Neutral" };

describe("Longbridge tick normalization", () => {
  it("preserves provider price, size, timestamp, and trade type without inventing aggressor side", () => {
    const event = normalizeLongbridgeTrade(ROW, "TSLA.US", "TSLA", "DELAYED", NOW, NOW + 1, 0);
    expect(event).toMatchObject({ normalizedSymbol: "TSLA", price: 355.584, size: 15, timestampProvider: Date.parse("2026-09-01T20:41:24Z"), aggressorMethod: "NONE", tradeConditions: ["I"] });
  });

  it("refuses malformed, future-clock, and wrong-symbol rows", () => {
    expect(normalizeLongbridgeTrade({ ...ROW, price: 0 }, "TSLA.US", "TSLA", "DELAYED", NOW, NOW, 0)).toBeNull();
    expect(normalizeLongbridgeTrade({ ...ROW, timestamp: "2099-01-01T00:00:00Z" }, "TSLA.US", "TSLA", "DELAYED", NOW, NOW, 0)).toBeNull();
    expect(normalizeLongbridgeTrade(ROW, "NVDA.US", "TSLA", "DELAYED", NOW, NOW, 0)).toBeNull();
  });
});

describe("Longbridge runtime wire", () => {
  it("is truthfully not configured without both bridge names", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await readLongbridgeTicks(fetchImpl, {}, { providerCode: "TSLA.US", appSymbol: "TSLA" });
    expect(result.status.label).toBe("NOT CONFIGURED");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normalizes fresh executed prints but does not certify realtime", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, trades: [ROW] }), { status: 200 })) as unknown as typeof fetch;
    const result = await readLongbridgeTicks(fetchImpl, { bridgeUrl: "https://bridge.example/", bridgeToken: "secret" }, { providerCode: "TSLA.US", appSymbol: "TSLA" }, NOW, NOW + 1);
    expect(result.status).toMatchObject({ label: "RECEIVING", eventCount: 1 });
    expect(result.events[0].dataMode).toBe("DELAYED");
    expect(result.status.detail).not.toMatch(/entitlement blocked/i);
    expect(fetchImpl).toHaveBeenCalledWith("https://bridge.example/ticks?symbol=TSLA.US&count=100", expect.objectContaining({ cache: "no-store" }));
  });

  it("keeps auth, empty, and transport failures distinct", async () => {
    const auth = vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "bad token" }), { status: 401 })) as unknown as typeof fetch;
    expect((await readLongbridgeTicks(auth, { bridgeUrl: "https://b", bridgeToken: "x" }, { providerCode: "TSLA.US", appSymbol: "TSLA" })).status.label).toBe("AUTH BLOCKED");

    const denied = vi.fn(async () => new Response(null, { status: 403 })) as unknown as typeof fetch;
    const deniedResult = await readLongbridgeTicks(denied, { bridgeUrl: "https://b", bridgeToken: "x" }, { providerCode: "TSLA.US", appSymbol: "TSLA" });
    expect(deniedResult.status.label).toBe("ACCESS UNPROVEN");
    expect(deniedResult.status.detail).toMatch(/failed edge/i);
    const empty = vi.fn(async () => new Response(JSON.stringify({ ok: true, trades: [] }), { status: 200 })) as unknown as typeof fetch;
    expect((await readLongbridgeTicks(empty, { bridgeUrl: "https://b", bridgeToken: "x" }, { providerCode: "TSLA.US", appSymbol: "TSLA" })).status.label).toBe("NO EVENTS RECEIVED");
    const down = vi.fn(async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    expect((await readLongbridgeTicks(down, { bridgeUrl: "https://b", bridgeToken: "x" }, { providerCode: "TSLA.US", appSymbol: "TSLA" })).status.label).toBe("BRIDGE UNREACHABLE");
  });
});
