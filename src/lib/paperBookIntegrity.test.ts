import { describe, it, expect, afterEach } from "vitest";
import {
  parsePaperSnapshot,
  isValidPosition,
  isValidOrder,
  isValidTrade,
  isValidEquityPoint,
  isAddressableOptionRecord,
  describePaperBookIntegrity,
  describePaperRecoveryExit,
  preservedPaperBookFilename,
  readPreservedPaperBook,
  replacePreservedPaperBook,
  savePaperState,
  STARTING_CASH,
  type PaperState,
} from "./paperTrade";

/**
 * §24 D — CAPITAL PROTECTION. The paper book's deserializer validated
 * CONTAINERS, not CONTENTS:
 *
 *     positions: Array.isArray(s.positions) ? s.positions : []
 *
 * so `[{ symbol: null, qty: "abc" }]` arrived downstream typed as Position[],
 * and every money calculation trusted it. The medium makes that reachable
 * rather than theoretical — capitalReach already establishes the book lives in
 * BROWSER_LOCAL storage, writable by the user, an extension, or an older build.
 *
 * The law under test: a record WM cannot read is refused and counted, never
 * repaired and never silently discarded.
 */

const goodPosition = { symbol: "TSLA", qty: 10, avgPx: 380, unrealPnl: 12, marketPx: 381.2 };
const goodOrder = {
  id: "o1", symbol: "TSLA", side: "buy", type: "market",
  qty: 10, status: "filled", ts: 1_788_000_000_000,
};
const goodTrade = { id: "t1", symbol: "TSLA", side: "buy", qty: 10, px: 380, ts: 1_788_000_000_000 };
const goodEquity = { ts: 1_788_000_000_000, equity: 100_000 };
const goodOption = { id: "op1", underlying: "TSLA", type: "call", strike: 380 };

function snap(partial: Record<string, unknown>) {
  const s = parsePaperSnapshot(JSON.stringify({ revision: 3, cash: 99_000, ...partial }));
  expect(s).not.toBeNull();
  return s!;
}

describe("element validators", () => {
  it("a position needs every money field to be a real number", () => {
    expect(isValidPosition(goodPosition)).toBe(true);
    expect(isValidPosition({ ...goodPosition, qty: "abc" })).toBe(false);
    expect(isValidPosition({ ...goodPosition, symbol: null })).toBe(false);
    expect(isValidPosition({ ...goodPosition, avgPx: NaN })).toBe(false);
    expect(isValidPosition({ ...goodPosition, marketPx: Infinity })).toBe(false);
    // A missing field is not a zero.
    const { unrealPnl, ...missing } = goodPosition;
    void unrealPnl;
    expect(isValidPosition(missing)).toBe(false);
  });

  it("rejects non-objects and arrays outright", () => {
    for (const v of [null, undefined, 5, "x", [], [goodPosition]]) {
      expect(isValidPosition(v)).toBe(false);
      expect(isValidOrder(v)).toBe(false);
      expect(isValidTrade(v)).toBe(false);
      expect(isValidEquityPoint(v)).toBe(false);
      expect(isAddressableOptionRecord(v)).toBe(false);
    }
  });

  it("an order's enums must be members, not merely strings", () => {
    expect(isValidOrder(goodOrder)).toBe(true);
    expect(isValidOrder({ ...goodOrder, side: "BUY" })).toBe(false);
    expect(isValidOrder({ ...goodOrder, type: "iceberg" })).toBe(false);
    expect(isValidOrder({ ...goodOrder, status: "working" })).toBe(false);
  });

  it("optional order fields must be absent or valid — never present and junk", () => {
    // The pre-rejectReason schema must still load; that is the whole reason
    // these fields are optional.
    expect(isValidOrder({ ...goodOrder, limitPx: undefined })).toBe(true);
    expect(isValidOrder({ ...goodOrder, status: "rejected", rejectReason: "no buying power" })).toBe(true);
    // But a corrupt optional is corruption.
    expect(isValidOrder({ ...goodOrder, limitPx: "380" })).toBe(false);
    expect(isValidOrder({ ...goodOrder, fillPx: null })).toBe(false);
    expect(isValidOrder({ ...goodOrder, rejectReason: 42 })).toBe(false);
  });

  it("an equity point with a NaN reading is not a reading", () => {
    expect(isValidEquityPoint(goodEquity)).toBe(true);
    expect(isValidEquityPoint({ ts: 1, equity: NaN })).toBe(false);
    expect(isValidEquityPoint({ ts: "1", equity: 5 })).toBe(false);
  });

  it("option records are checked only for addressability, not shape", () => {
    // /paper owns the option shape (§24). Asserting strike/expiry here would
    // create a second owner that can disagree with the first.
    expect(isAddressableOptionRecord(goodOption)).toBe(true);
    expect(isAddressableOptionRecord({ id: "op2" })).toBe(true);
    expect(isAddressableOptionRecord({ underlying: "TSLA" })).toBe(false);
    expect(isAddressableOptionRecord({ id: "" })).toBe(false);
  });
});

describe("parsePaperSnapshot — refuse, count, never repair", () => {
  it("a clean book reports zero rejections", () => {
    const s = snap({
      positions: [goodPosition], orders: [goodOrder],
      trades: [goodTrade], equity: [goodEquity], optionPositions: [goodOption],
    });
    expect(s.integrity.rejected).toBe(0);
    expect(s.state.positions).toHaveLength(1);
    expect(s.state.revision).toBe(3);
    expect(s.state.cash).toBe(99_000);
  });

  it("THE DEFECT: a corrupt position no longer reaches the money math", () => {
    const s = snap({ positions: [goodPosition, { symbol: null, qty: "abc" }] });
    expect(s.state.positions).toEqual([goodPosition]);
    expect(s.integrity.positions).toBe(1);
    expect(s.integrity.rejected).toBe(1);
    // The survivor is untouched — dropping is not editing.
    expect(s.state.positions[0]).toEqual(goodPosition);
  });

  it("counts rejections per book, not just in total", () => {
    const s = snap({
      positions: [goodPosition, {}],
      orders: [{ ...goodOrder, status: "working" }],
      trades: [goodTrade, goodTrade, null],
      equity: [goodEquity],
      optionPositions: [{ noId: true }, { noId: true }],
    });
    expect(s.integrity.positions).toBe(1);
    expect(s.integrity.orders).toBe(1);
    expect(s.integrity.trades).toBe(1);
    expect(s.integrity.equity).toBe(0);
    expect(s.integrity.optionPositions).toBe(2);
    expect(s.integrity.rejected).toBe(5);
  });

  it("the total is always the sum of its books", () => {
    const s = snap({
      positions: [{}, {}], orders: [1], trades: ["x"], equity: [null], optionPositions: [{}],
    });
    const { rejected, ...books } = s.integrity;
    expect(Object.entries(books)
      .filter(([key]) => key !== "unreadable")
      .reduce((sum, [, value]) => sum + (value as number), 0)).toBe(rejected);
  });

  it("never invents a number to replace one it refused", () => {
    const s = snap({ positions: [{ symbol: "TSLA", qty: "abc", avgPx: 1, unrealPnl: 1, marketPx: 1 }] });
    // No zero-filled ghost position.
    expect(s.state.positions).toHaveLength(0);
    expect(JSON.stringify(s.state)).not.toContain("abc");
  });

  it("a non-finite cash figure is disclosed and blocks a false clean book", () => {
    // NaN survives JSON.stringify as null, which is the realistic corruption.
    const s = snap({ cash: null });
    expect(s.state.cash).toBe(STARTING_CASH);
    expect(s.integrity.cash).toBe(1);
    expect(s.integrity.rejected).toBe(1);
  });

  it("a missing array is absence, not corruption", () => {
    const s = snap({});
    expect(s.integrity.rejected).toBe(0);
    expect(s.state.positions).toEqual([]);
    expect(s.state.orders).toEqual([]);
  });

  it("a non-array where an array belongs is counted rather than silently erased", () => {
    const s = snap({ positions: "TSLA", orders: 7 });
    expect(s.state.positions).toEqual([]);
    expect(s.state.orders).toEqual([]);
    expect(s.integrity.positions).toBe(1);
    expect(s.integrity.orders).toBe(1);
    expect(s.integrity.rejected).toBe(2);
  });

  it("an empty equity curve is still seeded so the chart has an origin", () => {
    const s = snap({ equity: [] });
    expect(s.state.equity).toHaveLength(1);
    expect(s.state.equity[0].equity).toBe(STARTING_CASH);
  });

  it("an equity curve of pure garbage is seeded AND counted", () => {
    const s = snap({ equity: [{ ts: 1, equity: "x" }, null] });
    expect(s.state.equity).toHaveLength(1);
    expect(s.state.equity[0].equity).toBe(STARTING_CASH);
    expect(s.integrity.equity).toBe(2);
  });

  it("refuses a snapshot that is not an object at all", () => {
    expect(parsePaperSnapshot("null")).toBeNull();
    expect(parsePaperSnapshot("[]")).toBeNull();
    expect(parsePaperSnapshot("5")).toBeNull();
    expect(parsePaperSnapshot("not json")).toBeNull();
  });

  it("a negative or fractional revision resets rather than corrupting the CAS", () => {
    // revision drives the compare-and-swap in savePaperState; a bad one there
    // would silently defeat conflict detection.
    expect(snap({ revision: -4 }).state.revision).toBe(0);
    expect(snap({ revision: 1.5 }).state.revision).toBe(0);
    expect(snap({ revision: "3" }).state.revision).toBe(0);
  });

  it("survives a book that is entirely unreadable without throwing", () => {
    const s = snap({
      positions: [null, 1, "x", [], {}],
      orders: [null, {}],
      trades: [{}],
      optionPositions: [null],
    });
    expect(s.integrity.rejected).toBe(9);
    expect(s.state.positions).toEqual([]);
  });

  it("is deterministic — the same raw book parses identically twice", () => {
    const raw = JSON.stringify({
      revision: 2, cash: 50_000,
      positions: [goodPosition, {}], orders: [goodOrder], trades: [], equity: [goodEquity],
    });
    const a = parsePaperSnapshot(raw)!;
    const b = parsePaperSnapshot(raw)!;
    expect(a.integrity).toEqual(b.integrity);
    expect(a.state.positions).toEqual(b.state.positions);
  });

  it("keeps every valid record — refusal is targeted, not a purge", () => {
    const many: PaperState["positions"] = Array.from({ length: 25 }, (_, i) => ({
      ...goodPosition, symbol: `S${i}`,
    }));
    const s = snap({ positions: [...many, { broken: true }] });
    expect(s.state.positions).toHaveLength(25);
    expect(s.integrity.positions).toBe(1);
  });
});

/**
 * The sentence the trader actually reads. It lives beside the count so the
 * words and the number can never drift apart, and it is tested because a
 * disclosure nobody can read is not a disclosure.
 */
describe("describePaperBookIntegrity — say what was lost", () => {
  const clean = { positions: 0, orders: 0, trades: 0, equity: 0, optionPositions: 0, cash: 0, rejected: 0, unreadable: false };

  it("a clean book says nothing at all", () => {
    expect(describePaperBookIntegrity(clean)).toBeNull();
  });

  it("never speaks on a negative or nonsense count", () => {
    expect(describePaperBookIntegrity({ ...clean, rejected: -1 })).toBeNull();
  });

  it("states when the whole book is unreadable and automatic saves are blocked", () => {
    const s = describePaperBookIntegrity({ ...clean, unreadable: true })!;
    expect(s).toMatch(/could not be read/i);
    expect(s).toMatch(/blocked automatic saves/i);
    expect(s).not.toMatch(/restored|recovered/i);
  });

  it("singular reads like English, not like a template", () => {
    const s = describePaperBookIntegrity({ ...clean, positions: 1, rejected: 1 })!;
    expect(s).toContain("1 stored record");
    expect(s).toContain("was REJECTED");
    expect(s).toContain("1 position");
    expect(s).not.toContain("1 positions");
    expect(s).not.toContain("were REJECTED");
  });

  it("plural agrees across the count and every book", () => {
    const s = describePaperBookIntegrity({ ...clean, trades: 3, rejected: 3 })!;
    expect(s).toContain("3 stored records");
    expect(s).toContain("were REJECTED");
    expect(s).toContain("3 trades");
  });

  it("lists several books with a readable conjunction", () => {
    const s = describePaperBookIntegrity({
      ...clean, positions: 2, orders: 1, equity: 4, rejected: 7,
    })!;
    expect(s).toContain("2 positions, 1 order and 4 equity points");
    // Books with nothing rejected are not mentioned at all.
    expect(s).not.toContain("trade");
    expect(s).not.toContain("option position");
  });

  it("carries the meaning in a WORD, never in colour alone (§9)", () => {
    const s = describePaperBookIntegrity({ ...clean, orders: 1, rejected: 1 })!;
    expect(s).toContain("REJECTED");
  });

  it("does not offer reassurance it has no grounds for", () => {
    const s = describePaperBookIntegrity({ ...clean, positions: 1, rejected: 1 })!;
    // WM cannot tell whether a refused record was a real fill or noise.
    expect(s).not.toMatch(/don'?t worry|no impact|safely|harmless|nothing was lost/i);
    // Nor may it promise a repair that does not exist.
    expect(s).not.toMatch(/coming soon|will be restored|we will recover|try again/i);
  });

  it("says the records are excluded from totals, because they are", () => {
    const s = describePaperBookIntegrity({ ...clean, positions: 1, rejected: 1 })!;
    expect(s).toMatch(/not counted in any total/i);
  });

  it("the sentence and the count can never disagree", () => {
    // Every book, swept, always naming its own number.
    const books = ["positions", "orders", "trades", "equity", "optionPositions"] as const;
    for (const b of books) {
      for (const n of [1, 2, 9]) {
        const s = describePaperBookIntegrity({ ...clean, [b]: n, rejected: n })!;
        expect(s).toContain(`${n} `);
        expect(s.startsWith(n === 1 ? "1 stored record " : `${n} stored records `)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// THE EXIT FROM THE BARRIER.
//
// The barrier shipped correct and complete except for one thing: it left the
// trader nowhere to go. Saving blocked, every action disabled, every total
// UNKNOWN, Reset disabled — and the screen's own words told them to "recover
// the original book", which nothing in the product could do.
//
// These tests hold two lines at once, and they are in tension on purpose:
//   1. the trader can ALWAYS leave with their own bytes;
//   2. the incidental writer NEVER gets to destroy those bytes.
// A change that satisfies one by breaking the other is the regression.
// ---------------------------------------------------------------------------

class ExitMemStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  get length() { return this.store.size; }
  key(_i: number) { return null; }
}

const exitGlobal = globalThis as unknown as {
  window?: { localStorage: unknown };
  localStorage?: unknown;
};

function mountStorage(): ExitMemStorage {
  const ls = new ExitMemStorage();
  exitGlobal.window = { localStorage: ls };
  exitGlobal.localStorage = ls;
  return ls;
}

function unmountStorage() {
  delete exitGlobal.window;
  delete exitGlobal.localStorage;
}

const CORRUPT = '{"revision":4,"cash":5000,"positions":[{"nope":true}],"orders":[],"trades":[],"equity":[]}';

describe("readPreservedPaperBook — the trader may always leave with their book", () => {
  afterEach(unmountStorage);

  it("THE DEFECT: bytes the barrier refuses to overwrite can still be retrieved", () => {
    const ls = mountStorage();
    ls.setItem("wm_paper_state", CORRUPT);
    // The writer refuses — that is the barrier working.
    expect(savePaperState(freshLike(), 4).status).toBe("RECOVERY REQUIRED");
    // And yet the trader is not trapped: the exact bytes come back.
    expect(readPreservedPaperBook()).toBe(CORRUPT);
  });

  it("returns the bytes VERBATIM — a re-serialised book is a different book", () => {
    const ls = mountStorage();
    // Deliberately ugly: trailing whitespace and key order that JSON.parse +
    // JSON.stringify would silently normalise away. If this ever round-trips
    // through the parser, the trader is handed WM's reading of their book
    // rather than their book, and the one thing the file is for is lost.
    const ugly = '  {"trades":[],"cash":1,"revision":2}  ';
    ls.setItem("wm_paper_state", ugly);
    expect(readPreservedPaperBook()).toBe(ugly);
  });

  it("an absent book is null, not an empty string", () => {
    mountStorage();
    expect(readPreservedPaperBook()).toBeNull();
  });

  it("a read that could not happen is null — never a fabricated empty book", () => {
    // SSR, or an origin that throws on storage access. "" would claim we looked.
    unmountStorage();
    expect(readPreservedPaperBook()).toBeNull();
  });
});

describe("preservedPaperBookFilename — names the rescue, not the product", () => {
  it("carries the moment so two rescues never collide in a downloads folder", () => {
    const a = preservedPaperBookFilename(new Date("2026-09-07T03:22:11.500Z"));
    const b = preservedPaperBookFilename(new Date("2026-09-07T03:22:12.500Z"));
    expect(a).not.toEqual(b);
  });

  it("is a filesystem-safe .json name on every platform", () => {
    const name = preservedPaperBookFilename(new Date("2026-09-07T03:22:11.500Z"));
    expect(name.endsWith(".json")).toBe(true);
    // Colons break Windows and are hostile on macOS Finder; dots before the
    // extension confuse "open with".
    expect(name.slice(0, -".json".length)).not.toMatch(/[:.]/);
    expect(name).not.toMatch(/[/\\<>"|?*]/);
  });

  it("says what the file IS, so it is not mistaken for a healthy export", () => {
    expect(preservedPaperBookFilename(new Date())).toContain("unreadable");
  });
});

describe("describePaperRecoveryExit — the legal move, in the trader's words", () => {
  it("before a copy is taken, names the ONE action available", () => {
    const s = describePaperRecoveryExit(false);
    expect(s).toMatch(/Download the saved book/);
    expect(s).toMatch(/Reset stays unavailable/);
  });

  it("after a copy is taken, reset stops being data loss and says so", () => {
    const s = describePaperRecoveryExit(true);
    expect(s).toMatch(/Reset is now available/);
    expect(s).toMatch(/overwrite/);
  });

  it("never promises the downloaded file can be repaired", () => {
    // WM cannot tell a real fill from noise. That was the entire reason it
    // refused to guess; promising a repair here would reintroduce the lie at
    // the exit instead of the entrance.
    for (const s of [describePaperRecoveryExit(false), describePaperRecoveryExit(true)]) {
      expect(s).not.toMatch(/we will (fix|repair|restore)/i);
      expect(s).not.toMatch(/\b(recovered|repaired|restored) (automatically|for you)\b/i);
      expect(s).not.toMatch(/don't worry|no data (was )?lost|safely/i);
    }
  });

  it("is never a designed boundary dressed as a failure, and never a stub", () => {
    for (const s of [describePaperRecoveryExit(false), describePaperRecoveryExit(true)]) {
      expect(s).not.toMatch(/\b(ERROR|FATAL|CRITICAL)\b/);
      expect(s).not.toMatch(/coming soon|needs wiring|try again later|contact support/i);
      expect(s.trim().length).toBeGreaterThan(40);
    }
  });

  it("the two states are genuinely different advice, not one sentence reused", () => {
    expect(describePaperRecoveryExit(false)).not.toEqual(describePaperRecoveryExit(true));
  });
});

describe("replacePreservedPaperBook — a door with a name, not a relaxed guard", () => {
  afterEach(unmountStorage);

  it("THE TENSION: it overwrites the very bytes savePaperState refuses to touch", () => {
    const ls = mountStorage();
    ls.setItem("wm_paper_state", CORRUPT);
    expect(savePaperState(freshLike(), 4).status).toBe("RECOVERY REQUIRED");
    const result = replacePreservedPaperBook(freshLike());
    expect(result.status).toBe("PERSISTED");
    expect(ls.getItem("wm_paper_state")).not.toBe(CORRUPT);
  });

  it("the general-purpose writer is NOT relaxed by the existence of this door", () => {
    // The regression that would matter: someone "simplifies" by making
    // savePaperState fall through to the replace path. Then every bot tick and
    // chart order silently destroys an unreadable book and the barrier is gone
    // while all its words remain on screen.
    const ls = mountStorage();
    ls.setItem("wm_paper_state", CORRUPT);
    expect(savePaperState(freshLike(), 4).status).toBe("RECOVERY REQUIRED");
    expect(ls.getItem("wm_paper_state")).toBe(CORRUPT);
  });

  it("restarts revision at 1 rather than inheriting a number it called unreadable", () => {
    const ls = mountStorage();
    ls.setItem("wm_paper_state", CORRUPT);
    const result = replacePreservedPaperBook({ ...freshLike(), revision: 99 });
    expect(result.status).toBe("PERSISTED");
    expect(result.state!.revision).toBe(1);
    expect(JSON.parse(ls.getItem("wm_paper_state")!).revision).toBe(1);
  });

  it("the replacement it writes is readable — the exit does not create a new brick", () => {
    const ls = mountStorage();
    ls.setItem("wm_paper_state", CORRUPT);
    replacePreservedPaperBook(freshLike());
    const snapshot = parsePaperSnapshot(ls.getItem("wm_paper_state")!);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.integrity.rejected).toBe(0);
    expect(snapshot!.integrity.unreadable).toBe(false);
  });

  it("fails honestly rather than pretending when there is no storage at all", () => {
    unmountStorage();
    expect(replacePreservedPaperBook(freshLike()).status).toBe("FAILED");
  });
});

function freshLike(): PaperState {
  return {
    revision: 1,
    cash: STARTING_CASH,
    positions: [], orders: [], trades: [], optionPositions: [],
    equity: [{ ts: 1_757_000_000_000, equity: STARTING_CASH }],
  };
}
