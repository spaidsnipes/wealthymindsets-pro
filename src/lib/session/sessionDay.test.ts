import { describe, expect, it } from "vitest";
import {
  checkpointBlocks, emptySessionDay, enterResult, futuresRoot, lockNow, lockStanding, markSignedOut,
  readGiveback, readSessionDay, readToeWhooper, storedSessionDay,
} from "./sessionDay";

const D = "2026-11-12";
const day = (p: Partial<ReturnType<typeof emptySessionDay>> = {}) => ({ ...emptySessionDay(D), ...p });

describe("target lock", () => {
  it("locks when the typed result reaches the target, and the peak follows the result up only", () => {
    let d = enterResult(day({ targetCents: 30_000 }), 41_000, 1);
    expect(d.lock?.reason).toBe("TARGET_HIT");
    d = enterResult(d, 31_250, 2);
    expect(d.peakCents).toBe(41_000);
  });
  it("locks at the max loss", () => {
    expect(enterResult(day({ maxLossCents: 25_000 }), -25_000, 1).lock?.reason).toBe("MAX_LOSS");
  });
  it("does not lock below the target, or when the auto lock is off", () => {
    expect(enterResult(day({ targetCents: 30_000 }), 29_999, 1).lock).toBeNull();
    expect(enterResult(day({ targetCents: 30_000, lockOnTarget: false }), 50_000, 1).lock).toBeNull();
  });
  it("UNTIL_SIGN_IN lifts only after signing out and back in", () => {
    const d = lockNow(day(), "DONE", 5);
    expect(lockStanding(d, true).locked).toBe(true);
    const out = markSignedOut(d, 6);
    expect(lockStanding(out, false).locked).toBe(true);
    expect(lockStanding(out, true)).toEqual({ locked: false, lift: true });
  });
  it("REST_OF_DAY holds through a sign-in and drops at the next market day", () => {
    const d = markSignedOut(lockNow(day({ lockMode: "REST_OF_DAY" }), "DONE", 5), 6);
    expect(lockStanding(d, true).locked).toBe(true);
    const tomorrow = readSessionDay(storedSessionDay(d), "2026-11-13");
    expect(tomorrow.lock).toBeNull();
    expect(tomorrow.netCents).toBeNull();
    expect(tomorrow.lockMode).toBe("REST_OF_DAY");
  });
  it("drops malformed storage whole", () => {
    expect(readSessionDay({ kind: "nope" }, D)).toEqual(emptySessionDay(D));
    expect(readSessionDay("x", D)).toEqual(emptySessionDay(D));
  });
});

describe("giveback and the Toe Whooper", () => {
  it("measures giveback only from a green peak", () => {
    expect(readGiveback({ netCents: 31_250, peakCents: 41_000 }).fraction).toBeCloseTo(0.2378, 3);
    expect(readGiveback({ netCents: -5_000, peakCents: -1_000 }).known).toBe(false);
  });
  it("gives no verdict on an empty day", () => {
    expect(readToeWhooper(day()).known).toBe(false);
  });
  it("names each verdict from his own numbers", () => {
    expect(readToeWhooper(day({ netCents: 31_250, peakCents: 41_000, targetCents: 30_000 }))).toMatchObject({ verdict: "WHIPPED_THEM_TOES" });
    expect(readToeWhooper(day({ netCents: -25_000, peakCents: 0, maxLossCents: 25_000 }))).toMatchObject({ verdict: "TOES_GOT_WHIPPED" });
    expect(readToeWhooper(day({ netCents: 10_000, peakCents: 40_000, targetCents: 50_000 }))).toMatchObject({ verdict: "TOES_GOT_WHIPPED" });
    expect(readToeWhooper(day({ netCents: 12_000, peakCents: 15_000, targetCents: 30_000 }))).toMatchObject({ verdict: "WENT_THE_DISTANCE" });
  });
});

describe("the MNQ → NQ checkpoint", () => {
  it("reads futures roots from every spelling the chart uses", () => {
    expect(futuresRoot("MNQ1!")).toBe("MNQ");
    expect(futuresRoot("/NQZ6")).toBe("NQ");
    expect(futuresRoot("NQ=F")).toBe("NQ");
    expect(futuresRoot("TSLA")).toBeNull();
  });
  it("asks only on a micro → its own full size, and only while armed", () => {
    expect(checkpointBlocks({ checkpointArmed: true }, "MNQ1!", "NQ1!")).toBe(true);
    expect(checkpointBlocks({ checkpointArmed: true }, "MES1!", "ES1!")).toBe(true);
    expect(checkpointBlocks({ checkpointArmed: true }, "MNQ1!", "ES1!")).toBe(false);
    expect(checkpointBlocks({ checkpointArmed: true }, "NQ1!", "MNQ1!")).toBe(false);
    expect(checkpointBlocks({ checkpointArmed: false }, "MNQ1!", "NQ1!")).toBe(false);
  });
});
