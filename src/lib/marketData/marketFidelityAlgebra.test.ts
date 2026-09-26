/**
 * THE ALGEBRA'S LAWS.
 *
 * Written against the canon's four lines rather than against the
 * implementation, so that a rewrite has to keep the LAW and is free to change
 * the code. Each block names the lie it stops.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_MARKET_FIDELITIES,
  canCompileIntent,
  canGo,
  canPaint,
  canWait,
  fidelityFromPipelineLabel,
  FIDELITY_REASONS,
  MARKET_FIDELITIES,
  paintTreatment,
  readMarketFidelity,
  type BrokerHonesty,
  type MarketFidelity,
} from "./marketFidelityAlgebra";
import {
  ALL_CANONICAL_FIDELITY_LABELS,
  CANONICAL_FIDELITY_LABELS,
} from "./canonicalFidelityLabels";

const AS_OF = 1_764_000_000_000;
const read = (f: MarketFidelity) => readMarketFidelity(f, AS_OF);

const ALL_BROKER: readonly BrokerHonesty[] = ["CAPABLE", "ACK", "REJECT", "FILL", "UNVERIFIED"];

describe("the closed five — an open zoo does not help", () => {
  it("IS EXACTLY FIVE, and the set is the canon's set", () => {
    // A sixth value is the fidelity-soup failure by name. This is the test that
    // makes adding one a deliberate act rather than a convenient one.
    expect(new Set(ALL_MARKET_FIDELITIES)).toEqual(
      new Set(["INDICATIVE", "EXECUTABLE", "PARTIAL", "DEGRADED", "STALE"]),
    );
  });

  it("does not admit a REASON where a fidelity belongs", () => {
    // The canon: "Do not promote these to peer badges." The type system makes
    // that a compile error; this proves the two vocabularies stay disjoint, so
    // nobody can widen one into the other and still pass.
    for (const reason of Object.values(FIDELITY_REASONS)) {
      expect(ALL_MARKET_FIDELITIES as readonly string[]).not.toContain(reason);
    }
  });
});

describe("fidelity without asOf is a mood", () => {
  it("REFUSES TO BUILD A READING WITH NO asOf — it does not default one", () => {
    // Defaulting to Date.now() here is precisely the move that stamped a
    // 12-hour-old close as now (ff40d5f). The refusal IS the repair.
    for (const bad of [null, undefined, NaN, Infinity, -Infinity]) {
      expect(readMarketFidelity("EXECUTABLE", bad as number | null), String(bad)).toBeNull();
    }
  });

  it("keeps the asOf it was given, unrounded and unhelpful", () => {
    expect(readMarketFidelity("INDICATIVE", 0)?.asOf).toBe(0);
    expect(readMarketFidelity("INDICATIVE", AS_OF)?.asOf).toBe(AS_OF);
  });

  it("a null reading can do nothing at all", () => {
    expect(canPaint(null)).toBe(false);
    expect(canCompileIntent(null, "CAPABLE")).toBe(false);
    expect(paintTreatment(null)).toBe("NONE");
  });
});

describe("paint? — fidelity ∈ {INDICATIVE, EXECUTABLE, PARTIAL, DEGRADED}", () => {
  it("paints the four and refuses STALE", () => {
    for (const f of ["INDICATIVE", "EXECUTABLE", "PARTIAL", "DEGRADED"] as const) {
      expect(canPaint(read(f)), f).toBe(true);
    }
    expect(canPaint(read("STALE"))).toBe(false);
  });

  it("STALE IS DIMMED, NOT DELETED — FALSE_RIPENESS is about strength, not absence", () => {
    // "Freeze or dim", not "draw nothing". A stale bar that vanishes is its own
    // H1 defect in the other direction: the trader stops seeing the market
    // because the house stopped trusting the clock.
    expect(paintTreatment(read("STALE"))).toBe("DIM");
    expect(paintTreatment(read("STALE"))).not.toBe("NONE");
  });

  it("wears the wound on PARTIAL and DEGRADED, and only there", () => {
    expect(paintTreatment(read("PARTIAL"))).toBe("WOUNDED");
    expect(paintTreatment(read("DEGRADED"))).toBe("WOUNDED");
    expect(paintTreatment(read("INDICATIVE"))).toBe("FULL");
    expect(paintTreatment(read("EXECUTABLE"))).toBe("FULL");
  });
});

describe("intent? — EXECUTABLE **AND** broker ≠ UNVERIFIED", () => {
  it("NEEDS BOTH HALVES — this is the lie the module exists to stop", () => {
    // "An EXECUTABLE badge on a canvas the adapter does not own is a lie."
    // A surface checking only the market half draws exactly that.
    expect(canCompileIntent(read("EXECUTABLE"), "UNVERIFIED")).toBe(false);
    expect(canCompileIntent(read("EXECUTABLE"), "CAPABLE")).toBe(true);
  });

  it("A LIVE INDICATIVE CHART WITH A GOOD BROKER STILL MAY NOT COMPILE INTENT", () => {
    // The other half, and the one a broker-centric reading would miss. The
    // adapter being healthy says nothing about whether THIS price is its price.
    for (const b of ALL_BROKER) {
      for (const f of ["INDICATIVE", "PARTIAL", "DEGRADED", "STALE"] as const) {
        expect(canCompileIntent(read(f), b), `${f}/${b}`).toBe(false);
      }
    }
  });

  it("treats an absent broker as UNVERIFIED, not as permission", () => {
    // Silence from the capital domain is not consent from it.
    expect(canCompileIntent(read("EXECUTABLE"), null)).toBe(false);
    expect(canCompileIntent(read("EXECUTABLE"), undefined)).toBe(false);
  });

  it("the honest common case is honest: INDICATIVE market, UNVERIFIED broker", () => {
    // The canon calls this combination honest in so many words. It must not be
    // an error state — it simply cannot compile an intent.
    const r = read("INDICATIVE");
    expect(canPaint(r)).toBe(true);
    expect(canCompileIntent(r, "UNVERIFIED")).toBe(false);
  });
});

describe("GO? — and fidelity never overrides Evidence Debt", () => {
  const ok = { reading: read("EXECUTABLE"), broker: "CAPABLE" as const, debt: { unpaid: 0 }, availableR: 1.8 };

  it("passes only when all four hold", () => {
    expect(canGo(ok)).toBe(true);
  });

  it("AN UNPAID GATE STOPS A GO THAT EVERY OTHER DOMAIN ALLOWS", () => {
    // The guard rail the canon states twice because it is the one that gets
    // lost. A perfect feed and a live broker do not buy past an unasked
    // question.
    expect(canGo({ ...ok, debt: { unpaid: 1 } })).toBe(false);
  });

  it("A NULL LEDGER IS NOT AN EMPTY LEDGER — H1, at the gate", () => {
    // "We did not compute the debt" read as "there is no debt" is how a GO gets
    // issued on a question nobody asked.
    expect(canGo({ ...ok, debt: null })).toBe(false);
    expect(canGo({ ...ok, debt: undefined })).toBe(false);
  });

  it("UNKNOWN AVAILABLE R IS NOT ZERO R", () => {
    for (const bad of [null, undefined, NaN, Infinity]) {
      expect(canGo({ ...ok, availableR: bad as number | null }), String(bad)).toBe(false);
    }
    // A measured zero is a finding, and it is a real answer to "can capital
    // take this invalidation?" — the gate is knowledge, not magnitude.
    expect(canGo({ ...ok, availableR: 0 })).toBe(true);
  });

  it("inherits the intent refusal rather than re-deriving it", () => {
    expect(canGo({ ...ok, reading: read("DEGRADED") })).toBe(false);
    expect(canGo({ ...ok, broker: "UNVERIFIED" })).toBe(false);
    expect(canGo({ ...ok, reading: null })).toBe(false);
  });
});

describe("WAIT? — always legal", () => {
  it("IS LEGAL IN EVERY STATE THERE IS", () => {
    // Not a decorative test. If WAIT is ever conditional, the house has started
    // requiring permission to decline — and a complete WAIT is a FINISHED
    // state, not an incomplete GO.
    expect(canWait()).toBe(true);
  });
});

describe("the one door from the seven pipeline labels", () => {
  // What every caller on the trading surfaces truly knows today (2026-09-26):
  // no execution adapter owns any canvas price. `OWNED` is the hypothetical
  // caller that does, and exists here only to prove the door still opens.
  const NOT_OWNED = { adapterOwnsCanvasPrice: false } as const;
  const OWNED = { adapterOwnsCanvasPrice: true } as const;

  it("MAPS ALL SEVEN — no label falls through into a guess", () => {
    for (const execution of [null, NOT_OWNED, OWNED]) {
      for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
        const out = fidelityFromPipelineLabel(label, execution);
        expect(ALL_MARKET_FIDELITIES, label).toContain(out.fidelity);
      }
    }
  });

  it("CLOSED IS NOT DELAYED, AND CLOSED IS NOT STALE", () => {
    // The canon is explicit, and this is the mapping most likely to be got
    // wrong: a closed session showing its last verified picture is a CORRECT
    // reading of a market that is not trading.
    const out = fidelityFromPipelineLabel(CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED, null);
    expect(out.fidelity).toBe(MARKET_FIDELITIES.INDICATIVE);
    expect(out.reasons).toEqual([]);
  });

  /*
    REPLACED PIN, 2026-09-26. This block used to assert
      "only the certified live quote earns EXECUTABLE"
    with the door taking the label alone — i.e. that LIVE — CERTIFIED QUOTE IS
    EXECUTABLE, unconditionally. That pinned the lie this module's own header
    names: "An EXECUTABLE badge on a canvas the adapter does not own is a lie."
    A fresh quote proves FRESH; it proves nothing about who will route an order
    at it (Garden 16 §13, "CONNECTED ≠ EXECUTABLE"). The old strength is kept —
    exactly one label may EVER earn EXECUTABLE — and the new truth is added
    beside it: it earns it only with an ownership receipt.
  */
  it("CONNECTED ≠ EXECUTABLE — a certified live quote without an execution owner is INDICATIVE", () => {
    for (const execution of [null, NOT_OWNED]) {
      const out = fidelityFromPipelineLabel(CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE, execution);
      expect(out.fidelity, `execution=${JSON.stringify(execution)}`).toBe(MARKET_FIDELITIES.INDICATIVE);
      expect(out.reasons).toEqual([]);
      // INDICATIVE is the STRONGEST non-executable class: it still paints at
      // full strength, because the quote itself is sound.
      expect(paintTreatment(readMarketFidelity(out.fidelity, AS_OF, out.reasons))).toBe("FULL");
    }
  });

  it("NO CALLER WITHOUT AN OWNERSHIP RECEIPT CAN REACH EXECUTABLE — through any label", () => {
    for (const execution of [null, NOT_OWNED]) {
      const executable = ALL_CANONICAL_FIDELITY_LABELS.filter(
        (l) => fidelityFromPipelineLabel(l, execution).fidelity === MARKET_FIDELITIES.EXECUTABLE,
      );
      expect(executable, `execution=${JSON.stringify(execution)}`).toEqual([]);
    }
  });

  it("a JS caller's non-boolean ownership never opens the door", () => {
    // `=== true` rather than truthiness. A stringly "false" is truthy.
    for (const junk of [undefined, "false", "true", 1, {}]) {
      const out = fidelityFromPipelineLabel(
        CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
        { adapterOwnsCanvasPrice: junk as unknown as boolean },
      );
      expect(out.fidelity, String(junk)).toBe(MARKET_FIDELITIES.INDICATIVE);
    }
  });

  it("with an ownership receipt, only the certified live quote earns EXECUTABLE", () => {
    // The equal-strength replacement for the old pin: ownership is necessary,
    // and it is not sufficient — a degraded, stale or walled label stays what
    // it is no matter who owns the adapter.
    const executable = ALL_CANONICAL_FIDELITY_LABELS.filter(
      (l) => fidelityFromPipelineLabel(l, OWNED).fidelity === MARKET_FIDELITIES.EXECUTABLE,
    );
    expect(executable).toEqual([CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE]);
  });

  it("ownership changes ONLY the certified live quote — every other label folds identically", () => {
    for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
      if (label === CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE) continue;
      expect(fidelityFromPipelineLabel(label, OWNED), label).toEqual(
        fidelityFromPipelineLabel(label, NOT_OWNED),
      );
    }
  });

  it("entitlement delay is a KNOWN WOUND, not a stale clock", () => {
    // Delayed by contract is a different fact from delayed by failure, and
    // flattening them would tell the trader the pipeline is broken when it is
    // working exactly as purchased.
    const out = fidelityFromPipelineLabel(CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT, null);
    expect(out.fidelity).toBe(MARKET_FIDELITIES.DEGRADED);
    expect(out.reasons).toContain(FIDELITY_REASONS.DELAYED);
  });

  it("a PARTIAL TAPE (IEX only) is a named wound, not 'No reason recorded'", () => {
    // Found 2026-09-26: the Alpaca IEX path folded to DEGRADED with reasons [],
    // so the plaque read DEGRADED beside "No reason recorded against this reading."
    const out = fidelityFromPipelineLabel(CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED, null, { partial: true });
    expect(out.fidelity).toBe(MARKET_FIDELITIES.DEGRADED);
    expect(out.reasons).toEqual([FIDELITY_REASONS.PARTIAL_TAPE]);
    // The label alone cannot name it — ACTIVE DEGRADED also covers a delayed
    // consolidated quote, which is NOT a partial tape. No witness, no reason.
    for (const tape of [undefined, null, { partial: false }, { partial: "true" as unknown as boolean }]) {
      expect(
        fidelityFromPipelineLabel(CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED, null, tape).reasons,
        JSON.stringify(tape),
      ).toEqual([]);
    }
    // PARTIAL_TAPE is a reason, never a fidelity; and only ACTIVE DEGRADED carries it.
    expect(ALL_MARKET_FIDELITIES as readonly string[]).not.toContain(FIDELITY_REASONS.PARTIAL_TAPE);
    for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
      if (label === CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED) continue;
      expect(fidelityFromPipelineLabel(label, null, { partial: true }), label).toEqual(
        fidelityFromPipelineLabel(label, null),
      );
    }
  });

  it("a wall carries QUARANTINED as a REASON and never as a fidelity", () => {
    const out = fidelityFromPipelineLabel(CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT, null);
    expect(out.reasons).toContain(FIDELITY_REASONS.QUARANTINED);
    expect(out.fidelity).not.toBe("QUARANTINED" as MarketFidelity);
  });

  it("NO PIPELINE LABEL BUYS A GO ON ITS OWN", () => {
    // The composition law, checked end to end through the real door: even the
    // certified live quote with an owned adapter needs a broker, a paid ledger
    // and a known R.
    for (const execution of [null, NOT_OWNED, OWNED]) {
      for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
        const { fidelity, reasons } = fidelityFromPipelineLabel(label, execution);
        const reading = readMarketFidelity(fidelity, AS_OF, reasons);
        expect(canGo({ reading, broker: "UNVERIFIED", debt: { unpaid: 0 }, availableR: 1 })).toBe(false);
      }
    }
  });

  it("WITHOUT AN OWNER, NO LABEL COMPILES AN INTENT — even beside a CAPABLE broker", () => {
    // The /charts composition exactly: a fresh crypto tape, a broker that
    // answered, and no adapter routing at this price. Before 2026-09-26 this
    // compiled, because the door handed the quote EXECUTABLE.
    for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
      const { fidelity, reasons } = fidelityFromPipelineLabel(label, NOT_OWNED);
      const reading = readMarketFidelity(fidelity, AS_OF, reasons);
      expect(canCompileIntent(reading, "CAPABLE"), label).toBe(false);
    }
  });
});
