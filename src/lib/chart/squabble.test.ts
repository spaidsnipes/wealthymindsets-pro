import { describe, expect, it } from "vitest";
import { FIGHT_MS, PUNCH_MS, ROUND_MS, selectSquabble, squabbleReceipt, roundWordShown, type SquabblePrint } from "./squabble";

const T0 = Date.UTC(2026, 10, 12, 15, 30); // a :30 fight
const pr = (msIn: number, price: number, size: number, side: "buy" | "sell"): SquabblePrint => ({ time: T0 + msIn, price, size, side });

describe("selectSquabble — the fight is read from the signed tape", () => {
  it("refuses without a signed tape and without prints in this fight", () => {
    expect(selectSquabble([], T0 + 1000, { signedTape: false }).reason).toBe("NO_SIGNED_TAPE");
    expect(selectSquabble([pr(-FIGHT_MS, 100, 1, "buy")], T0 + 1000).reason).toBe("NO_PRINTS_THIS_FIGHT");
  });

  it("R1 buyers out-trade and price rises → PUMP, BULLS take it; R2 live; R3 waiting", () => {
    const ps: SquabblePrint[] = [];
    for (let k = 0; k < 20; k++) ps.push(pr(k * PUNCH_MS + 1000, 100 + k * 0.5, 5, "buy"), pr(k * PUNCH_MS + 2000, 100 + k * 0.5, 1, "sell"));
    ps.push(pr(ROUND_MS + 1000, 110, 1, "buy"));
    const f = selectSquabble(ps, T0 + ROUND_MS + 30_000);
    expect(f.reason).toBe("DRAWN");
    expect(f.rounds[0].word).toBe("PUMP");
    expect(f.rounds[0].winner).toBe("BULLS");
    expect(f.rounds[1].live).toBe(true);
    expect(f.rounds[2].word).toBe("WAITING");
    expect(f.score).toEqual({ bulls: 1, bears: 0 });
    expect(squabbleReceipt(f)).toMatch(/^DRAWN\|R1:PUMP\|R2:/);
  });

  it("a single 15 s punch that moves price ≥ 3× the median punch move with its own side is a HAYMAKER", () => {
    const ps: SquabblePrint[] = [];
    let p = 100;
    for (let k = 0; k < 19; k++) { p += k % 2 ? 0.25 : -0.25; ps.push(pr(k * PUNCH_MS + 500, p, 2, k % 2 ? "buy" : "sell")); }
    ps.push(pr(19 * PUNCH_MS + 500, p - 5, 40, "sell"));
    const f = selectSquabble(ps, T0 + ROUND_MS - 1);
    const r1 = f.rounds[0];
    expect(r1.word).toBe("HAYMAKER");
    expect(r1.haymakerSide).toBe("SELL");
    expect(roundWordShown(r1)).toBe("HAYMAKER ↓");
    expect(f.haymakers).toBe(1);
  });

  it("effort one way, price the other → ABSORBED (never called a win)", () => {
    const ps: SquabblePrint[] = [];
    for (let k = 0; k < 20; k++) ps.push(pr(k * PUNCH_MS + 500, 100 - k * 0.5, k === 0 ? 1 : 6, "buy"), pr(k * PUNCH_MS + 900, 100 - k * 0.5, 1, "sell"));
    // R2 opens so R1 is closed
    ps.push(pr(ROUND_MS + 500, 90, 1, "buy"));
    const f = selectSquabble(ps, T0 + ROUND_MS + 10_000);
    expect(f.rounds[0].word).toBe("ABSORBED");
    expect(f.rounds[0].winner).toBe("BEARS");
  });

  it("a round that began before the tape this page heard says NO TAPE, never a guess", () => {
    const ps = [pr(ROUND_MS + 60_000, 100, 1, "buy"), pr(ROUND_MS + 75_000, 101, 1, "buy")];
    const f = selectSquabble(ps, T0 + ROUND_MS + 90_000);
    expect(f.rounds[0].word).toBe("NO_TAPE");
    expect(f.rounds[0].winner).toBeNull();
  });
});

import { announcerLine, minuteExchanges } from "./squabble";
describe("three-round stack + announcer", () => {
  const base = { reason: "DRAWN" as const, fightStartMs: 0, fightEndMs: 900_000, score: { bulls: 0, bears: 0 }, tapeFromMs: 0, liveSlot: 0 };
  const round = (n: 1 | 2 | 3, punches: { t0: number; net: number; haymaker?: boolean; side?: "BUY" | "SELL" }[], winner: "BULLS" | "BEARS" | "EVEN" | null = null) => ({
    n, startMs: (n - 1) * 300_000, endMs: n * 300_000, punches: punches.map((p, i) => ({ slot: i, side: p.side ?? (p.net > 0 ? "BUY" : "SELL"), move: 0, strength: 1, prints: 1, haymaker: !!p.haymaker, price: 1, ...p })),
    buy: 0, sell: 0, move: null, word: "CLINCH" as const, haymakerSide: null, winner, live: false, future: false,
  });
  it("splits a round into five 1m exchanges from its own punches (null when silent)", () => {
    const ex = minuteExchanges(round(1, [{ t0: 0, net: 5 }, { t0: 15_000, net: -2 }, { t0: 130_000, net: -4 }]) as never);
    expect(ex.map(e => e.net)).toEqual([3, null, -4, null, null]);
  });
  it("speaks only on an observed change", () => {
    const f = { ...base, rounds: [round(1, [], "BEARS"), round(2, [])], liveRound: 2 as const, haymakers: 0 };
    expect(announcerLine(null, f as never)).toBeNull();
    expect(announcerLine({ fight: 0, round: 1, hay: 0 }, f as never)).toBe("Round two. Bears took it. Get 'em Bulls!");
    expect(announcerLine({ fight: 0, round: 2, hay: 0 }, f as never)).toBeNull();
  });
});
