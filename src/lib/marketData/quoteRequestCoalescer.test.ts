import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  coalesceQuoteRequest,
  normalizeQuoteKey,
  quoteRequestCoalescer,
} from "./quoteRequestCoalescer";
import { InFlightRounds } from "./inFlightRounds";

/**
 * Guards the rule established by the /charts measurement recorded in
 * quoteRequestCoalescer.ts: NQ1! left useWebSocket at t=279 and t=283 ms —
 * two subscriptions 4ms apart, each running its own REST round — while the
 * single-surface control RTY1! showed exactly the 2 requests a 10s poll owes
 * over 13 seconds.
 */

/** A promise with externally-controlled settlement, so timing is exact. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("quote request coalescer — the rule", () => {
  it("joins a second caller to the round already in flight", async () => {
    const c = new InFlightRounds();
    const d = deferred<string>();
    let starts = 0;
    const start = () => { starts += 1; return d.promise; };

    const a = c.run("NQ1!", start);
    const b = c.run("NQ1!", start);

    expect(starts).toBe(1); // THE defect: this used to be 2, 4ms apart.
    d.resolve("29,682");
    await expect(a).resolves.toBe("29,682");
    await expect(b).resolves.toBe("29,682"); // the joiner gets the real answer
  });

  it("does not cache — once settled, the next caller starts a fresh round", async () => {
    const c = new InFlightRounds();
    let starts = 0;
    const start = () => { starts += 1; return Promise.resolve(starts); };

    await c.run("NQ1!", start);
    expect(c.isInFlight("NQ1!")).toBe(false); // entry released on settle
    await c.run("NQ1!", start);

    // A poll 10 seconds later must reach the provider. Joining is only ever
    // offered while a request is genuinely open; a settled answer is history.
    expect(starts).toBe(2);
  });

  it("never merges two different questions", async () => {
    const c = new InFlightRounds();
    const nq = deferred<string>();
    const es = deferred<string>();

    const a = c.run("NQ1!", () => nq.promise);
    const b = c.run("ES1!", () => es.promise);
    expect(c.inFlightCount()).toBe(2);

    nq.resolve("nq"); es.resolve("es");
    await expect(a).resolves.toBe("nq");
    await expect(b).resolves.toBe("es");
  });

  it("treats casing and surrounding whitespace as the same question", async () => {
    const c = new InFlightRounds();
    const d = deferred<string>();
    let starts = 0;
    const start = () => { starts += 1; return d.promise; };

    c.run("nq1!", start);
    c.run(" NQ1! ", start);
    expect(starts).toBe(1);
    d.resolve("x");
  });

  it("does NOT join callers that could not say what they were asking about", async () => {
    // An empty key is not an identity. Collapsing every anonymous request into
    // one shared answer would be a correctness bug wearing a perf fix's clothes.
    const c = new InFlightRounds();
    let starts = 0;
    const start = () => { starts += 1; return Promise.resolve(starts); };

    const a = c.run("", start);
    const b = c.run("   ", start);
    await Promise.all([a, b]);
    expect(starts).toBe(2);
    expect(c.inFlightCount()).toBe(0); // and nothing was registered
  });

  it("gives a joiner the same rejection the originator saw", async () => {
    const c = new InFlightRounds();
    const d = deferred<string>();
    const boom = new Error("provider refused");

    const a = c.run("NQ1!", () => d.promise);
    const b = c.run("NQ1!", () => d.promise);
    d.reject(boom);

    await expect(a).rejects.toBe(boom);
    await expect(b).rejects.toBe(boom); // not swallowed, not converted
    // and the failure must not wedge the key shut
    expect(c.isInFlight("NQ1!")).toBe(false);
  });

  it("a SYNCHRONOUS throw registers nothing, so the symbol is not wedged shut", async () => {
    // If `start()` throws before returning a promise, nothing was ever in
    // flight. Registering it would leave a key no `finally` can ever clear,
    // and that symbol would be permanently unfetchable.
    const c = new InFlightRounds();
    const boom = new Error("sync");
    await expect(c.run("NQ1!", () => { throw boom; })).rejects.toBe(boom);
    expect(c.inFlightCount()).toBe(0);

    let starts = 0;
    await c.run("NQ1!", () => { starts += 1; return Promise.resolve(1); });
    expect(starts).toBe(1); // still reachable
  });

  it("consecutive rounds for one symbol hand off cleanly", async () => {
    /**
     * HONEST SCOPE OF THIS TEST — it is NOT a mutation-killing guard.
     *
     * `run()` deletes its map entry only if the entry is still its own
     * (`=== tracked`). Mutation M43 replaced that with an unconditional
     * `delete(id)` and ALL 16 tests still passed. That survival is correct and
     * is recorded rather than papered over: with no overwrite path in `run()`
     * — a later caller always JOINS an existing entry instead of replacing it
     * — a straggler can never find a newer entry to evict. The guard is
     * defence-in-depth against a future overwrite, not a currently reachable
     * invariant, and no test can honestly claim to prove it.
     *
     * What IS worth pinning is the observable behaviour: round N releases its
     * key so round N+1 can own it, and round N+1 is joinable while open.
     */
    const c = new InFlightRounds();
    const slow = deferred<string>();
    const next = deferred<string>();

    const first = c.run("NQ1!", () => slow.promise);
    slow.resolve("old");
    await first;
    expect(c.isInFlight("NQ1!")).toBe(false); // round 1 released its key

    const second = c.run("NQ1!", () => next.promise);
    expect(c.isInFlight("NQ1!")).toBe(true);

    let starts = 0;
    c.run("NQ1!", () => { starts += 1; return Promise.resolve("x"); });
    expect(starts).toBe(0); // a third caller joins round 2 rather than fetching

    next.resolve("new");
    await expect(second).resolves.toBe("new");
    expect(c.isInFlight("NQ1!")).toBe(false);
  });

  it("reproduces the measured burst: 6 near-simultaneous asks become 1 round", async () => {
    const c = new InFlightRounds();
    const d = deferred<number>();
    let starts = 0;
    const start = () => { starts += 1; return d.promise; };

    // NQ1! at t = 279, 283, 384, 388 — plus the two later rounds.
    const all = Promise.all([1, 2, 3, 4, 5, 6].map(() => c.run("NQ1!", start)));
    expect(starts).toBe(1);
    d.resolve(29682);
    expect(await all).toEqual([29682, 29682, 29682, 29682, 29682, 29682]);
  });

  it("normalizeQuoteKey refuses non-strings rather than inventing an identity", () => {
    expect(normalizeQuoteKey("nq1!")).toBe("NQ1!");
    expect(normalizeQuoteKey(undefined as unknown as string)).toBe("");
    expect(normalizeQuoteKey(null as unknown as string)).toBe("");
    expect(normalizeQuoteKey(42 as unknown as string)).toBe("");
  });

  it("the shared instance is a real coalescer, not a pass-through", async () => {
    const d = deferred<string>();
    let starts = 0;
    const start = () => { starts += 1; return d.promise; };
    const key = "__COALESCER_SELFTEST__";
    coalesceQuoteRequest(key, start);
    coalesceQuoteRequest(key, start);
    expect(starts).toBe(1);
    expect(quoteRequestCoalescer.isInFlight(key)).toBe(true);
    d.resolve("x");
    await Promise.resolve(); await Promise.resolve();
    expect(quoteRequestCoalescer.isInFlight(key)).toBe(false);
  });
});

/**
 * Source Sentinels. The rule above is only worth anything if the surface that
 * MEASURABLY produced the duplicate rounds actually routes through it.
 */
const WS = fs.readFileSync(
  path.join(process.cwd(), "src/hooks/useWebSocket.ts"),
  "utf8",
);
const WS_CODE = WS
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("the REST quote fallback routes through the coalescer", () => {
  it("imports the owner", () => {
    expect(WS_CODE).toContain('from "@/lib/marketData/quoteRequestCoalescer"');
  });

  it("fetchRealQuote is the coalesced entry point, not the raw one", () => {
    expect(WS_CODE).toMatch(
      /async function fetchRealQuote\(sym: string\)[^{]*\{\s*return coalesceQuoteRequest\(sym, \(\) => fetchRealQuoteUncoalesced\(sym\)\);\s*\}/,
    );
  });

  it("no caller reaches the uncoalesced function directly", () => {
    // Exactly two mentions: the definition, and the one call inside the
    // coalesced wrapper. A third would be a bypass of the whole fix.
    const hits = WS_CODE.match(/fetchRealQuoteUncoalesced/g) ?? [];
    expect(hits.length).toBe(2);
  });

  it("the per-instance in-flight guard is RETAINED, not replaced", () => {
    // The coalescer solves cross-instance duplication. It does not make an
    // instance's own overlap guard redundant, and 6e2c817's visibility verdict
    // still needs `restFetchInFlight` to answer IN_FLIGHT correctly.
    expect(WS_CODE).toContain("restFetchInFlight");
    expect(WS_CODE).toContain("selectVisibilityRefetch");
  });
});

describe("the coalescer does not duplicate the candle path's owner", () => {
  it("YahooCandleConsumer still owns candle request identity", () => {
    // Canon: never build a rival to existing infrastructure. The quote
    // coalescer exists because the CANDLE path already had this discipline and
    // the quote path did not. If this ever fails, the two have been merged or
    // one has grown into the other's territory, and this file needs rethinking.
    const candles = fs.readFileSync(
      path.join(process.cwd(), "src/lib/yahooCandleConsumer.ts"),
      "utf8",
    );
    expect(candles).toContain("private readonly inFlight = new Map<string, Promise<YahooCandleOutcome>>()");
    expect(candles).not.toContain("quoteRequestCoalescer");
  });
});
