/**
 * Frames captured from serving /api/market-data/webull/stream, 2026-09-27
 * 04:14Z (BTCUSD, US_CRYPTO) — decoded by Webull's own schema.
 */
import { describe, expect, it } from "vitest";

import { decodeWebullFrame } from "./webullQuotePayload";

// Exactly as the route's JSON carried them.
const QUOTE = JSON.parse(String.raw`"\n'\n\u0006BTCUSD\u0012\t950160802\u001a\r1790482442804\"\u0003RTH\u0012\u0010\n\b85319.01\u0012\u00040.05\u001a\u0015\n\b83633.03\u0012\t0.0181021"`) as string;

describe("Webull real-time frames", () => {
  it("a QUOTE frame: field 2 is the ask, field 3 the bid, with Webull's timestamp", () => {
    const f = decodeWebullFrame("quote", QUOTE);
    expect(f).toEqual({
      kind: "QUOTE",
      basic: { symbol: "BTCUSD", atMs: 1790482442804, session: "RTH" },
      ask: { price: 85319.01, size: 0.05 },
      bid: { price: 83633.03, size: 0.0181021 },
    });
  });

  it("a SNAPSHOT frame carries the last price", () => {
    // Built with Webull's field numbers: basic, trade_time, price, open.
    const s = (n: number, v: string) => String.fromCharCode((n << 3) | 2, v.length) + v;
    const basic = s(1, "BTCUSD") + s(3, "1790482495802") + s(4, "RTH");
    const frame = s(1, basic) + s(2, "1790482495802") + s(3, "84472.94") + s(4, "84366.91");
    const f = decodeWebullFrame("snapshot", frame);
    expect(f).toMatchObject({ kind: "SNAPSHOT", price: 84472.94, open: 84366.91, basic: { symbol: "BTCUSD", atMs: 1790482495802 } });
  });

  it("garbage, a truncated frame or an unknown topic decode to null — never a half price", () => {
    expect(decodeWebullFrame("quote", "ÿÿÿ")).toBeNull();
    expect(decodeWebullFrame("quote", QUOTE.slice(0, 20))).toBeNull();
    expect(decodeWebullFrame("depth", QUOTE)).toBeNull();
  });
});
