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
