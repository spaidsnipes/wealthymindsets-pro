/**
 * ONE PAST — the laws, and the silent corruption each one prevents.
 */

import { describe, expect, it } from "vitest";

import * as barModule from "./canonicalBar";
import {
  admitBar,
  canonicalBarIdentity,
  checkBarGeometry,
  isSessionKnown,
  mintBarId,
  SESSION_CONTINUOUS,
  SESSION_UNKNOWN,
  toLegacyTuple,
  type CanonicalBar,
} from "./canonicalBar";

const bar = (over: Partial<CanonicalBar> = {}): CanonicalBar => ({
  barId: "TSLA|1m|1000|e0",
  symbolId: "TSLA",
  sessionId: "s1",
  timeframe: "1m",
  open: 100, high: 105, low: 99, close: 104, volume: 1_000,
  asOf: 1000,
  receivedAt: 2000,
  fidelity: "EXECUTABLE",
  source: "alpaca",
  provenance: "LIVE_STREAM",
  truthEpoch: 0,
  ...over,
});

describe("identity — the same bar redelivered is the same bar", () => {
  it("publishes an identity sidecar without copying a second OHLC record", () => {
    const identity = canonicalBarIdentity(bar());
    expect(identity.barId).toBe("TSLA|1m|1000|e0");
    expect(identity.asOf).toBe(1000);
    expect(identity.fidelity).toBe("EXECUTABLE");
    expect(Object.keys(identity)).not.toEqual(expect.arrayContaining([
      "open", "high", "low", "close", "volume", "time",
    ]));
  });

  it("IS DETERMINISTIC — an id minted per arrival is a double count", () => {
    // Across a reconnect the provider resends 09:31. If the id were minted from
    // a counter or a clock, the chart would hold two 09:31 bars and the volume
    // profile would count that minute twice.
    const a = mintBarId({ symbolId: "TSLA", timeframe: "1m", asOf: 1000, truthEpoch: 0 });
    const b = mintBarId({ symbolId: "TSLA", timeframe: "1m", asOf: 1000, truthEpoch: 0 });
    expect(a).toBe(b);
    expect(a).not.toBeNull();
  });

  it("A CORRECTION IS A NEW BAR, NOT AN OVERWRITE — truthEpoch is inside the id", () => {
    // The trader already looked at the first one and may already have acted on
    // it. The old bar stays addressable and the correction arrives under its
    // own name, so the two can be shown together rather than one silently
    // replacing the other between renders.
    const original = mintBarId({ symbolId: "TSLA", timeframe: "1m", asOf: 1000, truthEpoch: 0 });
    const corrected = mintBarId({ symbolId: "TSLA", timeframe: "1m", asOf: 1000, truthEpoch: 1 });
    expect(corrected).not.toBe(original);
  });

  it("separates symbol and timeframe — a 1m bar is not the 1D bar it lives inside", () => {
    const m = mintBarId({ symbolId: "TSLA", timeframe: "1m", asOf: 1000, truthEpoch: 0 });
    const d = mintBarId({ symbolId: "TSLA", timeframe: "1D", asOf: 1000, truthEpoch: 0 });
    const other = mintBarId({ symbolId: "AAPL", timeframe: "1m", asOf: 1000, truthEpoch: 0 });
    expect(new Set([m, d, other]).size).toBe(3);
  });

  it("REFUSES rather than inventing a placeholder identity", () => {
    // "UNKNOWN" as a symbolId is an invented fact with a timestamp attached.
    expect(mintBarId({ symbolId: "  ", timeframe: "1m", asOf: 1, truthEpoch: 0 })).toBeNull();
    expect(mintBarId({ symbolId: "TSLA", timeframe: "", asOf: 1, truthEpoch: 0 })).toBeNull();
    expect(mintBarId({ symbolId: "TSLA", timeframe: "1m", asOf: NaN, truthEpoch: 0 })).toBeNull();
    expect(mintBarId({ symbolId: "TSLA", timeframe: "1m", asOf: 1, truthEpoch: -1 })).toBeNull();
    expect(mintBarId({ symbolId: "TSLA", timeframe: "1m", asOf: 1, truthEpoch: 1.5 })).toBeNull();
  });
});

describe("geometry — refused, never repaired", () => {
  it("accepts a coherent bar, including a doji with no range at all", () => {
    expect(checkBarGeometry({ open: 100, high: 105, low: 99, close: 104, volume: 1 }).ok).toBe(true);
    expect(checkBarGeometry({ open: 100, high: 100, low: 100, close: 100, volume: 0 }).ok).toBe(true);
  });

  it("REFUSES A HIGH BELOW THE CLOSE RATHER THAN CLAMPING IT", () => {
    // The tempting repair. Clamping high up to close produces a bar shaped like
    // a fact that is not one, silently, at the exact moment the house has just
    // learned its feed is wrong.
    const r = checkBarGeometry({ open: 100, high: 101, low: 99, close: 104, volume: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/manufacture a wick/);
  });

  it("REFUSES A LOW ABOVE THE OPEN for the same reason", () => {
    const r = checkBarGeometry({ open: 100, high: 105, low: 101, close: 104, volume: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/manufacture a wick/);
  });

  it("refuses an inside-out bar rather than silently swapping high and low", () => {
    const r = checkBarGeometry({ open: 100, high: 98, low: 105, close: 100, volume: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/inside out/);
  });

  it("A BAR CANNOT UN-TRADE — negative volume is refused", () => {
    const r = checkBarGeometry({ open: 100, high: 105, low: 99, close: 104, volume: -1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/un-trade/);
  });

  it("refuses non-finite fields one at a time, naming which", () => {
    for (const field of ["open", "high", "low", "close", "volume"] as const) {
      const base = { open: 100, high: 105, low: 99, close: 104, volume: 1 };
      const r = checkBarGeometry({ ...base, [field]: NaN });
      expect(r.ok, field).toBe(false);
      if (!r.ok) expect(r.reason, field).toMatch(new RegExp(`^${field} `));
    }
  });
});

describe("admission — newest arrival does not win, newest truth does", () => {
  it("ADMITS A HIGHER truthEpoch — the pipeline's truth changed", () => {
    expect(admitBar(bar(), bar({ truthEpoch: 1, close: 103 })).admitted).toBe(true);
    // And note what just happened above in the fixture's first draft: a
    // correction with close=106 under high=105 was REFUSED, because geometry is
    // checked before ordering. A corrected bar does not get waved through on
    // the strength of carrying a newer epoch.
    expect(admitBar(bar(), bar({ truthEpoch: 1, close: 106 })).admitted).toBe(false);
  });

  it("REFUSES AN EQUAL EPOCH — the same bar arriving twice is not two bars", () => {
    const r = admitBar(bar(), bar({ receivedAt: 9_999_999 }));
    expect(r.admitted).toBe(false);
    if (!r.admitted) expect(r.reason).toMatch(/does not supersede/);
  });

  it("receivedAt IS NOT THE TIEBREAKER, and this proves it directly", () => {
    // A backfilled 09:31 bar arriving at 14:00 is not newer than the live 13:59
    // bar. If arrival order were consulted anywhere in admitBar, this is the
    // assertion that would catch it.
    expect(admitBar(bar({ truthEpoch: 5, receivedAt: 0 }),
                    bar({ truthEpoch: 3, receivedAt: 9_000_000 })).admitted).toBe(false);
    expect(admitBar(bar({ truthEpoch: 5, receivedAt: 9_000_000 }),
                    bar({ truthEpoch: 6, receivedAt: 0 })).admitted).toBe(true);
  });

  it("REFUSES A BAR FOR A DIFFERENT TIMEFRAME, however new it claims to be", () => {
    // Without this a 1m bar would supersede the 1D bar it lives inside.
    const r = admitBar(bar({ timeframe: "1D" }), bar({ timeframe: "1m", truthEpoch: 99 }));
    expect(r.admitted).toBe(false);
    if (!r.admitted) expect(r.reason).toMatch(/two observations/);
  });

  it("refuses a bar for a different symbol", () => {
    expect(admitBar(bar({ symbolId: "TSLA" }), bar({ symbolId: "AAPL", truthEpoch: 99 })).admitted)
      .toBe(false);
  });

  it("A NEW INSTANT IS AN APPEND, NOT A SUPERSEDE", () => {
    // Admission resolves a collision at ONE asOf. Letting 09:32 "supersede"
    // 09:31 would mean the chart held exactly one bar forever.
    const r = admitBar(bar({ asOf: 1000 }), bar({ asOf: 2000, truthEpoch: 1 }));
    expect(r.admitted).toBe(false);
    if (!r.admitted) expect(r.reason).toMatch(/append, not a supersede/);
  });

  it("refuses an incoherent bar at the door, before any ordering question", () => {
    expect(admitBar(null, bar({ high: 1, low: 500 })).admitted).toBe(false);
  });

  it("admits the first bar, because there is nothing to supersede", () => {
    expect(admitBar(null, bar()).admitted).toBe(true);
  });
});

describe("the one sanctioned door, and the one that is deliberately missing", () => {
  it("narrows to a tuple using asOf — never receivedAt", () => {
    const t = toLegacyTuple(bar({ asOf: 1000, receivedAt: 2000 }));
    expect(t.time).toBe(1000);
    expect(t.close).toBe(104);
  });

  it("OFFERS NO WAY TO BUILD A CANONICAL BAR FROM SIX LOOSE NUMBERS", () => {
    // The laundering function. It would have to invent a symbolId, a fidelity,
    // a source and a provenance the tuple does not contain — and it would be
    // called everywhere within a month precisely because it is convenient.
    // A caller holding only a tuple does not have a canonical bar.
    for (const name of Object.keys(barModule as Record<string, unknown>)) {
      expect(name, `${name} launders a tuple into canonical data`).not.toMatch(
        /^(fromLegacy|fromTuple|fromOhlcv|toCanonical|asCanonical|coerce|parseBar)/i,
      );
    }
  });

  it("CARRIES NO DERIVED READING — a bar is a fact, not an opinion", () => {
    // No delta, no vwap, no imbalance, no isAbsorption. An invention computes
    // FROM bars; the moment a bar carries a reading, two inventions disagree
    // about which reading the bar "has".
    const keys = Object.keys(bar());
    for (const k of keys) {
      expect(k, `${k} is a reading, not a fact`).not.toMatch(
        /delta|vwap|imbalance|absorption|signal|score|confidence|trend|bias/i,
      );
    }
    // What it does carry instead: the provenance that lets a reader decide.
    expect(keys).toContain("provenance");
    expect(keys).toContain("fidelity");
    expect(keys).toContain("truthEpoch");
  });

  it("keeps asOf and receivedAt as two separate fields", () => {
    // Collapsing them into one `time` is how the distinction gets lost, and it
    // is exactly what all three legacy shapes did.
    const keys = Object.keys(bar());
    expect(keys).toContain("asOf");
    expect(keys).toContain("receivedAt");
    expect(keys).not.toContain("time");
  });
});

describe("session identity — a bar may say it does not know, but not pretend", () => {
  it("does not mistake a blank session for a real one", () => {
    // An empty string is how "we never set this" reaches production wearing
    // the costume of a value.
    expect(isSessionKnown("RTH")).toBe(true);
    expect(isSessionKnown(SESSION_UNKNOWN)).toBe(false);
    expect(isSessionKnown("")).toBe(false);
    expect(isSessionKnown("   ")).toBe(false);
  });

  it("REFUSES an EXECUTABLE claim from a bar that cannot place itself in a session", () => {
    // EXECUTABLE means "the adapter will use this price". The same number is a
    // different fact inside RTH than in extended hours, and capital gets
    // attached to the difference — so the claim is not backable here.
    const verdict = admitBar(null, bar({ sessionId: SESSION_UNKNOWN, fidelity: "EXECUTABLE" }));
    expect(verdict.admitted).toBe(false);
    expect(verdict.admitted === false && verdict.reason).toContain("session");
  });

  it("still admits an unknown-session bar at a fidelity that does not overclaim", () => {
    // The live chart has to keep drawing. Refusing every bar whose session we
    // cannot name would amputate the chart to protect a label — which is the
    // capability amputation this board forbids.
    for (const fidelity of ["INDICATIVE", "PARTIAL", "DEGRADED", "STALE"] as const) {
      const verdict = admitBar(null, bar({ sessionId: SESSION_UNKNOWN, fidelity }));
      expect(verdict.admitted, `${fidelity} was refused — the chart goes blank`).toBe(true);
    }
  });

  it("does NOT silently downgrade the fidelity it disagrees with", () => {
    // Rewriting EXECUTABLE to INDICATIVE on the way through would be the
    // convenient repair, and it would hide from the caller that the house
    // disagreed with it. A refusal is visible; a quiet correction is not.
    const verdict = admitBar(null, bar({ sessionId: SESSION_UNKNOWN, fidelity: "EXECUTABLE" }));
    expect(verdict.admitted).toBe(false);
    expect("bar" in verdict, "a refusal that still hands back a bar is not a refusal").toBe(false);
  });

  it("leaves a KNOWN-session EXECUTABLE bar entirely alone", () => {
    // The guard must be about ignorance, not about EXECUTABLE. If it fired on
    // every executable bar it would be a different, much larger change wearing
    // this one's name.
    expect(admitBar(null, bar({ sessionId: "RTH", fidelity: "EXECUTABLE" })).admitted).toBe(true);
  });

  /* ── "NO SESSIONS HERE" IS NOT "I DO NOT KNOW" ───────────────────────────
     Added 2026-09-18 with the second ingress. A crypto spot book has no open,
     no close and no pre/post, so the session question has a real answer and
     the answer is "none". Reporting that as UNKNOWN would claim an absence of
     information where the information exists. */

  it("treats a continuous venue as KNOWN, not as a tidier kind of unknown", () => {
    expect(isSessionKnown(SESSION_CONTINUOUS)).toBe(true);
    expect(SESSION_CONTINUOUS).not.toBe(SESSION_UNKNOWN);
  });

  it("does not refuse EXECUTABLE on a venue that has no RTH to be outside of", () => {
    // This is the one guard SESSION_CONTINUOUS retires, and retiring it is the
    // point: admitBar's objection is "the same price is a different fact
    // inside RTH than outside it." On a book that never closes there is no
    // outside, so enforcing the guard anyway would be superstition.
    expect(admitBar(null, bar({ sessionId: SESSION_CONTINUOUS, fidelity: "EXECUTABLE" })).admitted)
      .toBe(true);
    // And the unknown case must NOT have been loosened along with it.
    expect(admitBar(null, bar({ sessionId: SESSION_UNKNOWN, fidelity: "EXECUTABLE" })).admitted)
      .toBe(false);
  });
});
