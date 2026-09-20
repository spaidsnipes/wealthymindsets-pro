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

import {
  selectInspectTicket,
  MIN_PRINTS_FOR_DELTA,
  INSPECT_TICKET_VERSION,
  type InspectPrint,
  type TicketRowId,
} from "./selectInspectTicket";

const BAR_OPEN_MS = 1_750_000_000_000;
const SPAN_15M = 900_000;

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

describe("fidelity is an owed debt, printed as one", () => {
  it("the row exists and always reads UNREAD, naming the absent owner", () => {
    // The plate prints `98.7%`. Dropping the row would hide the debt; filling
    // it would be a confidence score for a measurement nobody took.
    for (const vm of [base(), base({ prints: [] }), base({ barOpenMs: null })]) {
      const f = rowOf(vm, "FIDELITY");
      expect(f.state).toBe("UNREAD");
      expect(f.value).toBeNull();
      expect(f.absence).toMatch(/CanonicalBar/);
    }
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
    ];
    let sentencesChecked = 0;
    for (const vm of states) {
      const sentences = [
        vm.reachNote,
        vm.footprintDoorNote,
        ...vm.rows.flatMap(r => [r.basis, r.absence].filter((s): s is string => s !== null)),
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
