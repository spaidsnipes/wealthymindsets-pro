import { describe, expect, it } from "vitest";
import { selectCanonicalSessionToken } from "./canonicalIdentity";

const tok = (symbol: string, iso: string) => selectCanonicalSessionToken({ symbol, at: new Date(iso) });

describe("open-session owner — the published weekly hours, each verdict with its basis", () => {
  it("the measured defect: TSLA / NQ1! / EURUSD on Wed 2026-10-07 13:20 ET are OPEN, not 'SESSION ?'", () => {
    for (const s of ["TSLA", "NQ1!", "EURUSD", "SPY"]) {
      const r = tok(s, "2026-10-07T17:20:00Z");
      expect(r.token, s).toBe("OPEN");
      expect(r.established, s).toBe(true);
    }
    expect(tok("TSLA", "2026-10-07T17:20:00Z").detail).toBe("regular hours 09:30–16:00 ET · holiday calendar not loaded");
  });

  it("US equities: OVERNIGHT 20:00–04:00 on weeknights, PRE, OPEN, POST; CLOSED on the weekend (EDT)", () => {
    expect(tok("AAPL", "2026-10-07T07:59:00Z").token).toBe("OVERNIGHT"); // Wed 03:59
    expect(tok("AAPL", "2026-10-07T08:00:00Z").token).toBe("PRE");    // 04:00
    expect(tok("AAPL", "2026-10-07T13:29:00Z").token).toBe("PRE");    // 09:29
    expect(tok("AAPL", "2026-10-07T13:30:00Z").token).toBe("OPEN");   // 09:30
    expect(tok("AAPL", "2026-10-07T19:59:00Z").token).toBe("OPEN");   // 15:59
    expect(tok("AAPL", "2026-10-07T20:00:00Z").token).toBe("POST");   // 16:00
    expect(tok("AAPL", "2026-10-07T23:59:00Z").token).toBe("POST");   // 19:59
    expect(tok("AAPL", "2026-10-08T00:00:00Z").token).toBe("OVERNIGHT"); // Wed 20:00
    // Night shift 2026-10-07: TSLA printed 5m bars at 21:10 CDT under a CLOSED plaque.
    expect(tok("TSLA", "2026-10-08T02:15:00Z").token).toBe("OVERNIGHT"); // Wed 22:15 ET
    expect(tok("TSLA", "2026-10-08T02:15:00Z").detail).toContain("off-exchange");
    expect(tok("AAPL", "2026-10-10T00:30:00Z").token).toBe("CLOSED");    // Fri 20:30 ET
    expect(tok("AAPL", "2026-10-11T12:00:00Z").token).toBe("CLOSED");    // Sun 08:00 ET
    expect(tok("AAPL", "2026-10-12T00:30:00Z").token).toBe("OVERNIGHT"); // Sun 20:30 ET
  });

  it("DST: the NYSE open follows New York, not UTC (spring forward 2026-03-08, fall back 2026-11-01)", () => {
    // Fri 2026-03-06 is EST: 09:30 ET = 14:30Z.
    expect(tok("AAPL", "2026-03-06T14:30:00Z").token).toBe("OPEN");
    expect(tok("AAPL", "2026-03-06T13:30:00Z").token).toBe("PRE");
    // Mon 2026-03-09 is EDT: 09:30 ET = 13:30Z.
    expect(tok("AAPL", "2026-03-09T13:30:00Z").token).toBe("OPEN");
    expect(tok("AAPL", "2026-03-09T13:29:00Z").token).toBe("PRE");
    // Mon 2026-11-02 is EST again: 13:30Z is 08:30 ET.
    expect(tok("AAPL", "2026-11-02T13:30:00Z").token).toBe("PRE");
    expect(tok("AAPL", "2026-11-02T14:30:00Z").token).toBe("OPEN");
  });

  it("CME Globex: Sunday 18:00 ET reopen across DST, the daily 17:00–18:00 break, Friday 17:00 close", () => {
    // Sun 2026-03-08 (EDT from 02:00): 18:00 ET = 22:00Z.
    expect(tok("NQ1!", "2026-03-08T21:59:00Z").token).toBe("CLOSED");
    expect(tok("NQ1!", "2026-03-08T22:00:00Z").token).toBe("OPEN");
    // Sun 2026-11-01 (EST from 02:00): 18:00 ET = 23:00Z.
    expect(tok("ES1!", "2026-11-01T22:30:00Z").token).toBe("CLOSED");
    expect(tok("ES1!", "2026-11-01T23:00:00Z").token).toBe("OPEN");
    // Wed 2026-10-07 daily break 17:00–18:00 EDT = 21:00–22:00Z.
    const brk = tok("CL1!", "2026-10-07T21:30:00Z");
    expect(brk.token).toBe("CLOSED");
    expect(brk.detail).toContain("daily maintenance break");
    expect(tok("GC1!", "2026-10-07T22:00:00Z").token).toBe("OPEN");
    // Fri 2026-10-09 17:00 EDT = 21:00Z.
    expect(tok("NQ1!", "2026-10-09T20:59:00Z").token).toBe("OPEN");
    expect(tok("NQ1!", "2026-10-09T21:00:00Z").token).toBe("CLOSED");
  });

  it("CBOT grains and CME livestock keep other hours — no Globex verdict is borrowed for them", () => {
    expect(tok("ZC1!", "2026-10-07T17:20:00Z").established).toBe(false);
    expect(tok("HE1!", "2026-10-07T17:20:00Z").established).toBe(false);
  });

  it("spot FX: Sunday 17:00 → Friday 17:00 ET", () => {
    expect(tok("EURUSD", "2026-10-11T20:59:00Z").token).toBe("CLOSED"); // Sun 16:59 EDT
    expect(tok("EURUSD", "2026-10-11T21:00:00Z").token).toBe("OPEN");   // Sun 17:00 EDT
    expect(tok("EURUSD", "2026-10-09T21:00:00Z").token).toBe("CLOSED"); // Fri 17:00 EDT
    expect(tok("USDJPY", "2026-10-07T03:00:00Z").token).toBe("OPEN");   // Tue 23:00 EDT
  });

  it("crypto is 24X7 at every hour; US cash indices are OPEN only while calculated", () => {
    expect(tok("BTC-USD", "2026-10-10T12:00:00Z").token).toBe("24X7");
    expect(tok("SPX", "2026-10-07T20:10:00Z").token).toBe("OPEN");   // 16:10 ET, still calculating
    expect(tok("SPX", "2026-10-07T20:20:00Z").token).toBe("CLOSED"); // 16:20 ET
  });

  it("never emits a store-key token, and every chip fits tight chrome", () => {
    const hours = Array.from({ length: 24 * 7 }, (_, h) => new Date(Date.UTC(2026, 9, 4, h)).toISOString());
    for (const s of ["TSLA", "SPY", "NQ1!", "GC1!", "EURUSD", "BTC", "SPX", "ZC1!"]) {
      for (const iso of hours) {
        const { token, detail } = tok(s, iso);
        // OVERNIGHT is a schedule verdict (2026-10-07), not a canonicalSession() store key.
        expect(["RTH", "EXTENDED", "ETH"]).not.toContain(token);
        expect(token.length).toBeLessThanOrEqual(9);
        expect(detail.length).toBeGreaterThan(10);
      }
    }
  });
});
