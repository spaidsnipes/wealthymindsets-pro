import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { selectPracticeHonestyLedger } from "./practiceHonestyLedger";
import { withoutPersistedMarks, PERSISTED_MARK_CAVEAT } from "./paperPositionMark";

const SRC = fs.readFileSync(
  path.join(process.cwd(), "src/lib/practiceHonestyLedger.ts"),
  "utf8",
);

/**
 * The source with its COMMENTS REMOVED.
 *
 * The LABEL guards below ban words like "score" and "grade" — and this module's
 * own doc comment uses those exact words to explain why it refuses to compute
 * them. The first run of this suite went red on that sentence. A Sentinel that
 * fails on its own honest prose is testing the wrong surface: the ban is on
 * what the module DOES, so it belongs on the code. The prose stays free to
 * name the thing it is refusing to build.
 */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** A New York date two calendar days before `now`, so rest is unambiguous. */
const TWO_DAYS = 2 * 86_400_000;
const NOW = Date.UTC(2026, 8, 15, 20, 0, 0);

describe("practiceHonestyLedger — the REVIEW layer of the decision room", () => {
  it("ANTI-WALLPAPER: an absent book says nothing", () => {
    expect(selectPracticeHonestyLedger(null, NOW).easements).toEqual([]);
    expect(selectPracticeHonestyLedger(undefined, NOW).caption).toBeNull();
    expect(selectPracticeHonestyLedger({}, NOW).caption).toBeNull();
  });

  it("ANTI-WALLPAPER: an EMPTY book says nothing — no fills to disclose", () => {
    const r = selectPracticeHonestyLedger({ orders: [], positions: [] }, NOW);
    expect(r.easements).toEqual([]);
    expect(r.caption).toBeNull();
  });

  it("ANTI-WALLPAPER: a book with only same-session PENDING orders says nothing", () => {
    // Nothing filled, nothing cancelled, nothing short, nothing rested past a
    // boundary. Every owner is correctly silent, so the room is silent.
    const r = selectPracticeHonestyLedger(
      { orders: [{ status: "pending", type: "limit", qty: 1, ts: NOW }] },
      NOW,
    );
    expect(r.easements).toEqual([]);
    expect(r.caption).toBeNull();
  });

  it("a single fill produces exactly one easement and a singular caption", () => {
    const r = selectPracticeHonestyLedger(
      { orders: [{ status: "filled", type: "market", side: "buy", qty: 10, fillPx: 100 }] },
      NOW,
    );
    expect(r.easements.map((e) => e.id)).toEqual(["fill"]);
    expect(r.caption).toBe("1 way this practice book was easier than a real venue");
    expect(r.easements[0].heading).toBe("1 fill was easier than a real one would have been");
    expect(r.easements[0].sentences.length).toBeGreaterThan(0);
  });

  it("ROOM ORDER: easements appear in the order the trade was LIVED", () => {
    const r = selectPracticeHonestyLedger(
      {
        positions: [{ symbol: "AAPL", qty: -5, marketPx: 200 }],
        orders: [
          { status: "filled", type: "market", side: "buy", qty: 10, fillPx: 100 },
          { status: "pending", type: "limit", qty: 1, ts: NOW - TWO_DAYS },
          { status: "cancelled", type: "market", qty: 3 },
          { status: "filled", type: "stop", side: "sell", qty: 5, stopPx: 100, fillPx: 99.25 },
        ],
      },
      NOW,
    );
    // Entry → fill → rest → cancel → stop. Not the order the modules were
    // written in, and not the order of the input array.
    expect(r.easements.map((e) => e.id)).toEqual([
      "short-located",
      "fill",
      "rest",
      "cancel",
      "stop",
    ]);
    expect(r.caption).toBe("5 ways this practice book was easier than a real venue");
  });

  it("COUNT IS OF KINDS, not of orders — ten cancels are still one easement", () => {
    const orders = Array.from({ length: 10 }, () => ({
      status: "cancelled",
      type: "market" as const,
      qty: 1,
    }));
    const r = selectPracticeHonestyLedger({ orders }, NOW);
    expect(r.easements).toHaveLength(1);
    expect(r.caption).toBe("1 way this practice book was easier than a real venue");
  });

  it("DE-DUPLICATES rest sentences: five identical rests say it once", () => {
    const orders = Array.from({ length: 5 }, () => ({
      status: "pending",
      type: "limit" as const,
      qty: 1,
      ts: NOW - TWO_DAYS,
    }));
    const r = selectPracticeHonestyLedger({ orders }, NOW);
    const rest = r.easements.find((e) => e.id === "rest");
    expect(rest).toBeDefined();
    expect(new Set(rest!.sentences).size).toBe(rest!.sentences.length);
  });

  it("DELEGATES, never rewrites: every sentence is its owner's verbatim string", async () => {
    const { selectShortRealism } = await import("./paperShortRealism");
    const { selectStopRealism } = await import("./paperStopRealism");
    const { selectCancelCertainty } = await import("./paperCancelCertainty");

    const positions = [{ symbol: "AAPL", qty: -5, marketPx: 200 }];
    const orders = [
      { status: "cancelled", type: "market", qty: 3 },
      { status: "filled", type: "stop", side: "sell", qty: 5, stopPx: 100, fillPx: 99.25 },
    ];
    const r = selectPracticeHonestyLedger({ positions, orders }, NOW);

    const byId = (id: string) => r.easements.find((e) => e.id === id)!;
    // Compared against the owner fed the SAME input the ledger feeds it — the
    // persisted mark stripped. Comparing against the raw stored row would be
    // asserting the bug.
    const asFed = [{ symbol: "AAPL", qty: -5 }];
    expect(byId("short-located").sentences).toEqual(selectShortRealism(asFed).sentences);
    expect(byId("short-located").heading).toBe(selectShortRealism(asFed).heading);
    expect(byId("cancel").sentences).toEqual(selectCancelCertainty(orders).sentences);
    expect(byId("cancel").heading).toBe(selectCancelCertainty(orders).heading);
    expect(byId("stop").sentences).toEqual(selectStopRealism(orders).sentences);
    expect(byId("stop").heading).toBe(selectStopRealism(orders).heading);
  });

  it("H1: an unreadable position does not invent a short", () => {
    const r = selectPracticeHonestyLedger(
      { positions: [{ qty: 0 }, { qty: 10, marketPx: 5 }] },
      NOW,
    );
    expect(r.easements.map((e) => e.id)).not.toContain("short-located");
  });

  it("PURE CLOCK: nowMs is a parameter — the same book grades differently at two times", () => {
    const book = { orders: [{ status: "pending", type: "limit", qty: 1, ts: NOW }] };
    expect(selectPracticeHonestyLedger(book, NOW).easements).toHaveLength(0);
    expect(
      selectPracticeHonestyLedger(book, NOW + TWO_DAYS).easements.map((e) => e.id),
    ).toContain("rest");
  });

  // ---- THE PERSISTED MARK IS A FILL PRICE -------------------------------
  //
  // Found by USE, not by reading: production rendered this same short as
  // $3,586 on /paper and $3,950 in the deck drawer. /paper re-marks against a
  // live quote in its own view-model; the deck reads the SAVED book, whose
  // `marketPx` is whatever `applyFill` last wrote — the fill price. For a newly
  // opened position that IS the entry price, which is the `?? pos.avgPx`
  // overclaim `paperPositionMark` exists to kill, one surface over.

  it("NO ENTRY PRICE DRESSED AS A MARK: the stored marketPx never reaches an owner", () => {
    const r = selectPracticeHonestyLedger(
      { positions: [{ symbol: "TSLA", qty: -10, avgPx: 400, marketPx: 395 }] },
      NOW,
    );
    const short = r.easements.find((e) => e.id === "short-located")!;
    // The short is still COUNTED — H1: absence of a mark is not absence of risk.
    expect(short.heading.toUpperCase()).toContain("1 SHORT POSITION");
    // But no figure is printed. 3950 is 10 x the stored fill price; if it ever
    // appears here again, this position is being valued at what it cost.
    for (const s of short.sentences) {
      expect(s).not.toMatch(/\$/);
      expect(s).not.toContain("3,950");
      expect(s).not.toContain("3950");
    }
  });

  it("THE ABSENCE IS EXPLAINED: a withheld figure gets a reason, not silence", () => {
    const r = selectPracticeHonestyLedger(
      { positions: [{ symbol: "TSLA", qty: -10, avgPx: 400, marketPx: 395 }] },
      NOW,
    );
    expect(r.markCaveat).toBe(PERSISTED_MARK_CAVEAT);
    expect(r.markCaveat).toContain("filled at");
  });

  it("ANTI-WALLPAPER: an orders-only book withholds no figure, so it gets no caveat", () => {
    const r = selectPracticeHonestyLedger(
      { orders: [{ status: "filled", type: "market", side: "buy", qty: 10, fillPx: 100 }] },
      NOW,
    );
    expect(r.easements.map((e) => e.id)).toEqual(["fill"]);
    expect(r.markCaveat).toBeNull();
  });

  it("withoutPersistedMarks drops only the mark, and mutates nothing", () => {
    const stored = [{ symbol: "TSLA", qty: -10, avgPx: 400, marketPx: 395 }];
    const out = withoutPersistedMarks(stored);
    expect(out).toEqual([{ symbol: "TSLA", qty: -10, avgPx: 400 }]);
    expect("marketPx" in out[0]).toBe(false);
    // The caller's own book is untouched — this is a read-side view, and a
    // reader that quietly edits the trader's saved state would be a far worse
    // defect than the one being fixed.
    expect(stored[0].marketPx).toBe(395);
  });

  it("THE DEFECT: applyFill still writes the FILL PRICE into marketPx", () => {
    // This is the justification for every assertion above. If a real re-mark
    // writer ever lands in paperTrade, the stored value stops being a fill
    // price, withholding the figure stops being right, and this is where that
    // gets caught. A claim and its justification must fail together.
    const trade = fs.readFileSync(
      path.join(process.cwd(), "src/lib/paperTrade.ts"),
      "utf8",
    );
    expect(trade).toMatch(/marketPx:\s*fillPx/);
    // `marketPx: number` is the interface FIELD DECLARATION, not a writer, so it
    // is excluded by name. Everything else that assigns the field must assign
    // `fillPx` and nothing else.
    const writers = (trade.match(/marketPx:\s*[A-Za-z_$][\w$]*/g) ?? []).filter(
      (a) => a !== "marketPx: number",
    );
    expect(writers.length).toBeGreaterThan(0);
    for (const w of writers) expect(w).toBe("marketPx: fillPx");
  });

  it("THE ROOM EXPLAINS IT: the layer renders the caveat, not just the compiler", () => {
    const layer = fs.readFileSync(
      path.join(process.cwd(), "src/components/experience/PracticeHonestyLayer.tsx"),
      "utf8",
    );
    expect(layer).toContain("{ledger.markCaveat}");
    expect(layer).toContain('data-testid="practice-honesty-mark-caveat"');
  });

  // ---- LABEL-NOT-MODEL guards -------------------------------------------

  it("MINTS NO NUMBER: the only number in the source is the length of the list", () => {
    // A score, a percentage or a grade would be a model of realism that nothing
    // measured. `easements.length` is a fact about the list printed beneath it.
    expect(CODE).not.toMatch(/\bscore\b/i);
    expect(CODE).not.toMatch(/\bpercent|\bpct\b|\/\s*100\b/i);
    expect(CODE).not.toMatch(/\bgrade\b/i);
    expect(CODE).not.toMatch(/Math\.random/);
  });

  it("REFUSES NOTHING: no rejection, no verdict, no throw", () => {
    expect(CODE).not.toMatch(/\brejectReason\b/);
    expect(CODE).not.toMatch(/\bthrow\b/);
  });

  it("COMPILER, NOT MEASURER: it does no arithmetic on the book itself", () => {
    // The body must contain no price/quantity arithmetic. If a future edit
    // starts deriving its own figure here, the claim stops having an owner
    // that can be fixed, and this guard is where that gets caught.
    expect(CODE).not.toMatch(/fillPx\s*[-+*/]/);
    expect(CODE).not.toMatch(/\bqty\s*[-+*/]/);
    expect(CODE).not.toMatch(/marketPx\s*[-+*/]/);
  });

  // ---- The room actually RENDERS it ------------------------------------
  //
  // The REVIVE-FOUND lesson, now five times over in this codebase: CONSULTING
  // a selector is not RENDERING its answer. A guard that only checks the
  // import passes GREEN on a page that imports the component and never puts it
  // in the tree. So these assert the ELEMENT string.

  it("THE ROOM RENDERS IT: /command-deck mounts PracticeHonestyLayer", () => {
    const deck = fs.readFileSync(
      path.join(process.cwd(), "src/app/command-deck/page.tsx"),
      "utf8",
    );
    expect(deck).toContain("<PracticeHonestyLayer />");
    // Gated to the backward-looking modes — §9 INTERRUPTION LAW.
    expect(deck).toMatch(
      /experienceContext\.mode === "REVIEW" \|\| experienceContext\.mode === "LEARN"\) && \(\s*<PracticeHonestyLayer \/>/,
    );
  });

  it("THE LAYER CONSUMES THIS COMPILER, not the owners directly", () => {
    const layer = fs.readFileSync(
      path.join(process.cwd(), "src/components/experience/PracticeHonestyLayer.tsx"),
      "utf8",
    );
    expect(layer).toContain("selectPracticeHonestyLedger");
    // If the layer ever reaches past the compiler to an owner, the room gains
    // a second writer for the same claim and the ordering rule above stops
    // being the single answer. Caught here.
    for (const owner of [
      "paperExecutionRealism",
      "paperCancelCertainty",
      "paperStopRealism",
      "paperShortRealism",
      "paperOrderTimeInForce",
    ]) {
      expect(layer).not.toContain(owner);
    }
    // No clock in a render body — the #418 mechanism traced five times here.
    expect(layer).toMatch(/Date\.now\(\),\s*\n?\s*\)/);
    expect(layer).toContain("React.useEffect");
  });

  it("SINGLE-WRITER: every claim it emits names an existing owner module", () => {
    for (const owner of [
      "./paperExecutionRealism",
      "./paperCancelCertainty",
      "./paperStopRealism",
      "./paperShortRealism",
      "./paperOrderTimeInForce",
    ]) {
      expect(SRC).toContain(owner);
    }
  });
});
