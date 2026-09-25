/**
 * Tests for the FL-06 Inspect Ticket compiler.
 *
 * The assertions that matter most are the ones about REFUSAL, because the
 * failure this module exists to prevent is a per-trade number printed for a bar
 * whose trades this room no longer holds. A test suite that only checked the
 * arithmetic on a covered bar would pass while the product invented deltas for
 * every candle on the chart.
 */

import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity } from "@/lib/marketData/canonicalBar";
import {
  selectInspectTicket,
  identityForBar,
  indexBarIdentitiesBySecond,
  MIN_PRINTS_FOR_DELTA,
  INSPECT_TICKET_VERSION,
  type InspectPrint,
  type TicketRowId,
} from "./selectInspectTicket";

const BAR_OPEN_MS = 1_750_000_000_000;
const SPAN_15M = 900_000;
const BAR_ID = `BTC|15m|${BAR_OPEN_MS}|e2`;

const identity = (over: Partial<CanonicalBarIdentity> = {}): CanonicalBarIdentity => ({
  barId: BAR_ID, symbolId: "BTC", sessionId: "RTH-2025-06-15", timeframe: "15m",
  asOf: BAR_OPEN_MS, receivedAt: BAR_OPEN_MS + 1250,
  fidelity: "INDICATIVE", source: "coinbase", provenance: "REST_BACKFILL", truthEpoch: 2,
  ...over,
});

const print = (over: Partial<InspectPrint> = {}): InspectPrint => ({
  price: 100,
  size: 10,
  side: "buy",
  timeMs: BAR_OPEN_MS + 1000,
  trade: true,
  ...over,
});

/** A signed tape sitting squarely inside the selected bar. */
const coveringTape = (): InspectPrint[] => [
  print({ side: "buy", size: 30, timeMs: BAR_OPEN_MS + 1 }),
  print({ side: "buy", size: 20, timeMs: BAR_OPEN_MS + 2 }),
  print({ side: "sell", size: 10, timeMs: BAR_OPEN_MS + 3 }),
  print({ side: "sell", size: 15, timeMs: BAR_OPEN_MS + 4 }),
];

const base = (over = {}) =>
  selectInspectTicket({
    barOpenMs: BAR_OPEN_MS,
    barSpanMs: SPAN_15M,
    price: 5297.75,
    barVolume: 623,
    prints: coveringTape(),
    ...over,
  });

const rowOf = (vm: ReturnType<typeof base>, id: TicketRowId) =>
  vm.rows.find(r => r.id === id)!;

describe("the ticket reads what it can read", () => {
  it("sums a delta from the signed prints inside the bar", () => {
    const vm = base();
    expect(vm.reach).toBe("COVERS_BAR");
    // buy 50, sell 25.
    expect(rowOf(vm, "DELTA").value).toBe("+25");
    expect(rowOf(vm, "DELTA").state).toBe("READ");
  });

  it("divides the heavier side by the lighter and NAMES the side", () => {
    // A bare "2.0:1" does not say who it favours, which is half the reading.
    expect(rowOf(base(), "IMBALANCE").value).toBe("2.0:1 buy");
  });

  it("takes volume from the BAR, never from the tape", () => {
    // The tape inside this bar sums to 75. The bar says 623. If volume were
    // summed from the tape it would silently disagree with the bar the trader
    // is looking at — two volumes for one candle.
    expect(rowOf(base(), "VOLUME").value).toBe("623");
  });

  it("carries the version and a non-empty headline", () => {
    const vm = base();
    expect(vm.version).toBe(INSPECT_TICKET_VERSION);
    expect(vm.headline.length).toBeGreaterThan(0);
  });
});

describe("a bar the tape does not reach is refused, not invented", () => {
  /*
    THE CENTRAL TEST OF THIS FILE. The room holds 50 live prints. Clicking a
    bar from earlier in the session must not produce a delta.
  */
  const staleTicket = () =>
    base({
      prints: coveringTape().map(p => ({ ...p, timeMs: BAR_OPEN_MS + SPAN_15M + 60_000 })),
    });

  it("reports TAPE_IS_ELSEWHERE rather than summing whatever is held", () => {
    expect(staleTicket().reach).toBe("TAPE_IS_ELSEWHERE");
  });

  it("prints NO delta and NO imbalance for that bar", () => {
    const vm = staleTicket();
    expect(
      rowOf(vm, "DELTA").value,
      "a delta was printed for a bar whose trades this room no longer holds. " +
        "That is the beautiful lie in its purest form — a precise signed " +
        "integer describing trades nobody here has.",
    ).toBeNull();
    expect(rowOf(vm, "DELTA").state).toBe("UNREAD");
    expect(rowOf(vm, "IMBALANCE").value).toBeNull();
  });

  it("says WHY, and points at the bar that can be read", () => {
    const vm = staleTicket();
    expect(rowOf(vm, "DELTA").absence).toMatch(/no longer held/i);
    expect(
      rowOf(vm, "DELTA").absence,
      "the trader is told the reading is unavailable and never told what WOULD " +
        "work. The live bar can be read; the ticket must say so.",
    ).toMatch(/live bar/i);
  });

  it("still reads volume — which is the reason to open the ticket at all", () => {
    expect(rowOf(staleTicket(), "VOLUME").state).toBe("READ");
    expect(staleTicket().readCount).toBeGreaterThan(0);
  });
});

describe("an unsigned venue is refused with its own reason", () => {
  const unsigned = () =>
    base({ prints: coveringTape().map(p => ({ ...p, side: null })) });

  it("distinguishes an unsigned tape from an absent one", () => {
    // Two different absences with two different remedies: waiting helps with
    // one and never helps with the other. Collapsing them would tell the
    // trader to wait for a fact the venue will never state.
    expect(unsigned().reach).toBe("TAPE_IS_UNSIGNED");
    expect(base({ prints: [] }).reach).toBe("NO_TAPE");
  });

  it("names the spread-crossing side as the missing fact", () => {
    expect(rowOf(unsigned(), "DELTA").absence).toMatch(/side crossed the spread/i);
  });

  it("refuses below the named print floor rather than at zero", () => {
    const thin = base({
      prints: coveringTape().slice(0, MIN_PRINTS_FOR_DELTA - 1),
    });
    expect(
      thin.reach,
      `${MIN_PRINTS_FOR_DELTA - 1} signed prints produced a delta. A sum over ` +
        `one or two trades is a coin flip wearing a sign.`,
    ).not.toBe("COVERS_BAR");
    expect(rowOf(thin, "DELTA").state).toBe("UNREAD");
  });
});

describe("the unit trap is caught, not silently absorbed", () => {
  it("a seconds-shaped bar time refuses rather than reading", () => {
    /*
      `LegacyOhlcvTuple.time` is epoch SECONDS and `Tick.time` is epoch
      MILLISECONDS, and both are bare `number`. If a caller passed the seconds
      value into `barOpenMs`, every print would land outside every bar. The
      correct behaviour is a refusal — which is what a caller would then see and
      investigate — never a reading.
    */
    const vm = base({ barOpenMs: Math.floor(BAR_OPEN_MS / 1000) });
    expect(vm.reach).toBe("TAPE_IS_ELSEWHERE");
    expect(rowOf(vm, "DELTA").state).toBe("UNREAD");
  });
});

describe("quotes are not prints", () => {
  it("an untagged tick never enters the division", () => {
    // `trade: true` marks a genuine execution. Synthetic price-direction ticks
    // and REST quotes carry a side and a size and would sum perfectly happily.
    const vm = base({ prints: coveringTape().map(p => ({ ...p, trade: false })) });
    expect(vm.reach).toBe("NO_TAPE");
    expect(rowOf(vm, "DELTA").state).toBe("UNREAD");
  });
});

describe("fidelity is the admitted identity's class word, or named as missing", () => {
  it("reads the identity's class, with a basis naming its source and provenance", () => {
    const f = rowOf(base({ identity: identity() }), "FIDELITY");
    expect(f.state).toBe("READ");
    expect(f.value).toBe("INDICATIVE");
    expect(f.basis).toContain("coinbase");
    expect(f.basis).toContain("REST_BACKFILL");
  });

  it("without an identity the row is UNREAD and names the missing identity", () => {
    // The plate prints `98.7%`. Dropping the row would hide the debt; filling
    // it would be a confidence score for a measurement nobody took.
    for (const vm of [base(), base({ prints: [] }), base({ identity: null })]) {
      const f = rowOf(vm, "FIDELITY");
      expect(f.state).toBe("UNREAD");
      expect(f.value).toBeNull();
      expect(f.absence).toMatch(/no canonical identity was admitted for this bar/i);
      expect(vm.lineage.state).toBe("UNREAD");
    }
  });

  it("a seconds-vs-milliseconds mismatch refuses rather than reading", () => {
    // Identity stamped in SECONDS against a bar in milliseconds, and the bar
    // passed in SECONDS against an identity in milliseconds. Both must refuse.
    const secondsIdentity = base({ identity: identity({ asOf: BAR_OPEN_MS / 1000 }) });
    const secondsBar = base({ barOpenMs: BAR_OPEN_MS / 1000, identity: identity() });
    for (const vm of [secondsIdentity, secondsBar]) {
      expect(rowOf(vm, "FIDELITY").state).toBe("UNREAD");
      expect(rowOf(vm, "FIDELITY").absence).toMatch(/different second/i);
      expect(vm.lineage.state).toBe("UNREAD");
      expect(vm.chain.state).toBe("UNREAD");
    }
  });

  it("the forming bar withholds its admitted identity and says why", () => {
    const vm = base({ identity: identity(), barIsForming: true });
    expect(rowOf(vm, "FIDELITY").state).toBe("UNREAD");
    expect(rowOf(vm, "FIDELITY").absence).toMatch(/may still be forming/i);
    expect(vm.lineage).toEqual({ state: "UNREAD", barId: null, absence: expect.stringMatching(/forming/i) });
  });

  it("is never a percentage, and a class this OS does not define is refused", () => {
    for (const fidelity of ["INDICATIVE", "EXECUTABLE", "PARTIAL", "DEGRADED", "STALE"] as const) {
      expect(rowOf(base({ identity: identity({ fidelity }) }), "FIDELITY").value).toBe(fidelity);
    }
    const forged = base({ identity: identity({ fidelity: "98.7%" as never }) });
    expect(rowOf(forged, "FIDELITY").state).toBe("UNREAD");
    expect(JSON.stringify(forged)).not.toContain("98.7");
  });
});

describe("lineage and the chain come from the same identity", () => {
  it("prints BAR · source · provenance · session · epoch · heard, and the barId", () => {
    const vm = base({ identity: identity() });
    expect(vm.lineage).toEqual({
      state: "READ",
      barId: BAR_ID,
      line: `BAR ${BAR_ID} · coinbase · REST_BACKFILL · session RTH-2025-06-15 · epoch 2 · heard +1,250ms`,
    });
    expect(vm.method).toBe(`selectInspectTicket v${INSPECT_TICKET_VERSION}`);
  });

  it("BAR → the object born on this bar → the camera's decision", () => {
    const vm = base({
      identity: identity(),
      chain: {
        objects: [{ objectId: "LEVEL-9", birthBarId: "other-bar" }, { objectId: `ZONE:${BAR_ID}:DEMAND`, birthBarId: BAR_ID }],
        decisionId: "D-1842",
      },
    });
    expect(vm.chain).toMatchObject({ state: "READ", line: `BAR → OBJECT ZONE:${BAR_ID}:DEMAND → DECISION D-1842`, moreObjects: 0 });
  });

  it("no object born here ends the chain early: the decision does not ride on nothing", () => {
    const vm = base({ identity: identity(), chain: { objects: [{ objectId: "LEVEL-9", birthBarId: "other-bar" }], decisionId: "D-1842" } });
    expect(vm.chain).toMatchObject({ state: "READ", line: "BAR → OBJECT none → DECISION none taken", objectId: null, decisionId: null });
  });

  it("prefers the selected object when it was born here, and counts the rest", () => {
    const vm = base({
      identity: identity(),
      chain: {
        objects: [{ objectId: "A", birthBarId: BAR_ID }, { objectId: "B", birthBarId: BAR_ID }],
        selectedObjectId: "B",
        decisionId: null,
      },
    });
    expect(vm.chain).toMatchObject({ state: "READ", line: "BAR → OBJECT B (+1 more born here) → DECISION none taken", moreObjects: 1 });
  });

  it("without an identity the chain has no first link", () => {
    expect(base().chain).toEqual({ state: "UNREAD", absence: expect.stringMatching(/starts at the bar/i) });
  });
});

describe("the room's join: identity by the bar's open second", () => {
  it("indexes each identity at floor(asOf / 1000) and looks bars up by their SECONDS time", () => {
    const index = indexBarIdentitiesBySecond([identity(), identity({ barId: "next", asOf: BAR_OPEN_MS + SPAN_15M })]);
    expect(identityForBar(index, BAR_OPEN_MS / 1000)?.barId).toBe(BAR_ID);
    expect(identityForBar(index, (BAR_OPEN_MS + SPAN_15M) / 1000)?.barId).toBe("next");
    expect(identityForBar(index, null)).toBeNull();
  });

  it("a seconds-stamped identity is not found at the bar's second", () => {
    const index = indexBarIdentitiesBySecond([identity({ asOf: BAR_OPEN_MS / 1000 })]);
    expect(identityForBar(index, BAR_OPEN_MS / 1000)).toBeNull();
  });
});

describe("the door leads somewhere, or is not offered", () => {
  it("opens only when a signed tape reaches the bar", () => {
    expect(base().footprintDoorAvailable).toBe(true);
    expect(base({ prints: [] }).footprintDoorAvailable).toBe(false);
  });

  it("a closed door says which fact closed it", () => {
    expect(base({ prints: [] }).footprintDoorNote).toMatch(/holds no prints/i);
    expect(
      base({ prints: coveringTape().map(p => ({ ...p, side: null })) }).footprintDoorNote,
    ).toMatch(/does not sign/i);
  });
});

describe("no bar at all is a state, not a crash", () => {
  it("compiles a ticket that asks for a click", () => {
    const vm = selectInspectTicket({});
    expect(vm.reach).toBe("NO_BAR");
    expect(vm.headline).toBe("No bar selected");
    expect(vm.rows.length).toBeGreaterThan(0);
    expect(vm.readCount).toBe(0);
    expect(vm.reachNote).toMatch(/click a candle/i);
  });
});

describe("every sentence this compiler can emit is well formed", () => {
  it("ends in a full stop, opens uppercase, and joins no fragments", () => {
    // Same shape rule the arrangement and profile notes are held to. A full
    // stop followed by a lowercase letter shipped to production once already.
    const states = [
      base(),
      base({ prints: [] }),
      base({ prints: coveringTape().map(p => ({ ...p, side: null })) }),
      base({ prints: coveringTape().map(p => ({ ...p, timeMs: 1 })) }),
      base({ barVolume: null }),
      base({ prints: coveringTape().map(p => ({ ...p, side: "buy" as const })) }),
      selectInspectTicket({}),
      base({ identity: identity() }),
      base({ identity: identity(), barIsForming: true }),
      base({ identity: identity({ asOf: 1 }) }),
      base({ identity: identity({ fidelity: "?" as never }) }),
    ];
    let sentencesChecked = 0;
    for (const vm of states) {
      const sentences = [
        vm.reachNote,
        vm.footprintDoorNote,
        ...vm.rows.flatMap(r => [r.basis, r.absence].filter((s): s is string => s !== null)),
        ...(vm.lineage.state === "UNREAD" ? [vm.lineage.absence] : []),
        ...(vm.chain.state === "UNREAD" ? [vm.chain.absence] : []),
      ];
      for (const s of sentences) {
        sentencesChecked++;
        expect(s, `no sentence ends this: ${s}`).toMatch(/\.$/);
        expect(s, `a full stop is followed by a lowercase letter: ${s}`).not.toMatch(/\.\s+[a-z]/);
        expect(s[0], `opens lowercase: ${s}`).not.toMatch(/[a-z]/);
      }
    }
    // Vacuity guard: the loop above proves nothing if it collected no strings.
    expect(sentencesChecked).toBeGreaterThan(20);
  });

  it("an all-one-side bar explains the missing ratio instead of dividing by zero", () => {
    const vm = base({ prints: coveringTape().map(p => ({ ...p, side: "buy" as const })) });
    expect(rowOf(vm, "DELTA").state).toBe("READ");
    const imb = rowOf(vm, "IMBALANCE");
    expect(imb.state).toBe("UNREAD");
    expect(imb.value).not.toBe("Infinity:1 buy");
    expect(imb.absence).toMatch(/same side/i);
  });
});

describe("the plate's illustrative figures never appear as output", () => {
  it("no compiled value is one of the mockup's own numbers", () => {
    // `+132`, `623` as a TAPE reading, `2.1:1` and `98.7` are the picture's.
    // Only `623` may appear, and only because the caller passed it as the bar's
    // real volume — so it is checked against a bar that reports something else.
    const vm = selectInspectTicket({
      barOpenMs: BAR_OPEN_MS,
      barSpanMs: SPAN_15M,
      price: 1,
      barVolume: 7,
      prints: coveringTape(),
    });
    const blob = JSON.stringify(vm);
    for (const ghost of ["+132", "2.1:1", "98.7", "5297.75"]) {
      expect(blob, `the mockup's figure ${ghost} was compiled as output`).not.toContain(ghost);
    }
  });
});
