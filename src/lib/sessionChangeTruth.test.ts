import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const tape = read("src/components/layout/TickerTape.tsx");
/**
 * THE WATCHLIST IS TWO FILES, NOT ONE. `WatchlistPanel` owns the fetch and the
 * arithmetic; `WatchlistRow` owns the markup (split 2026-09-12 so the canon
 * fidelity sentence could stop evicting the instrument name). A Sentinel that
 * names one file asserts a fact about a location, not about the surface — and
 * would have gone green the moment the render moved. It reads BOTH.
 */
const watch = [
  read("src/components/chart/WatchlistPanel.tsx"),
  read("src/components/chart/WatchlistRow.tsx"),
].join("\n");
/**
 * THE DEFECT CROSSED A PROCESS BOUNDARY AND THIS FILE DID NOT FOLLOW.
 *
 * "the tape never defaults prevClose to the last price" passed continuously
 * while the tape rendered `+0.00 (+0.00%)` with `chgObserved: true`. It was not
 * a wrong assertion — it was a TRUE assertion about the wrong address. The
 * string `prevClose ?? price` had moved to the server:
 *
 *   src/app/api/yahoo/route.ts  ~173
 *     if (!prevClose || prevClose <= 0) prevClose = price;
 *     change: +(price - prevClose).toFixed(4)      // 0, by construction
 *
 * A regex cannot see across a fetch. The client was clean, the payload was
 * fabricated, and the Sentinel reported green on both counts honestly.
 *
 * So the scope is widened to the two files the fabrication actually travels
 * through: the route that MANUFACTURES it, and /scanner, which is worse than a
 * display — `classifyScan` GRADES the zero into a named setup with a letter
 * grade. Widening scope is the whole fix here; new assertions on the old two
 * files would have found nothing, because there was nothing there to find.
 */
/**
 * Strip comments before scanning for a banned pattern.
 *
 * Caught by this Sentinel on its first run, against the very fix it was written
 * to protect: `scanner/page.tsx:257` carries the line
 *
 *   // This line used to read `const prev = quoteJson?.prevClose ?? price`,
 *
 * and the regex matched it. The defect was GONE; its obituary was not. A
 * Sentinel that cannot tell code from prose punishes the one thing we most want
 * a fix to leave behind — a note saying what used to be here and why it isn't.
 * Left unstripped, the cheapest way to green is to delete the explanation.
 */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const scanner = read("src/app/scanner/page.tsx");
const route = read("src/app/api/yahoo/route.ts");

/**
 * Session-change truth Sentinel — LIVING-PIXEL LAW.
 *
 * Both the global ticker tape and the watchlist coerced a missing session
 * change to zero:
 *
 *   { price: j.price, chg: j.change ?? 0, pct: j.changePct ?? 0 }
 *   const prev = j?.prevClose ?? price;   // makes price-minus-prev exactly 0
 *
 * A provider that returned a price but no change produced a row rendered as
 * LIVE and green, with an up-arrow reading "+0.00 (+0.00%)" — an assertion
 * that the symbol is flat on the session, manufactured from missing data.
 * The tape is on every page.
 */
describe("session change truth", () => {
  it("the tape never coerces a provider change to zero", () => {
    expect(tape).not.toMatch(/chg:\s*j\.change\s*\?\?\s*0/);
    expect(tape).not.toMatch(/pct:\s*j\.changePct\s*\?\?\s*0/);
  });

  it("the tape never defaults prevClose to the last price", () => {
    // `prev = prevClose ?? price` guarantees a zero change. Comments stripped:
    // the tape now carries a note naming /api/alpaca's still-open version of
    // this fallback, and a guard that forbids DESCRIBING the defect would have
    // forced that disclosure to be deleted to go green.
    expect(code(tape)).not.toMatch(/prevClose\s*\?\?\s*price/);
  });

  it("the watchlist never coerces a provider change to zero", () => {
    expect(watch).not.toMatch(/change:\s*\w+\.change\s*\?\?\s*0/);
    expect(watch).not.toMatch(/changePct:\s*\w+\.changePct\s*\?\?\s*0/);
  });

  it("both surfaces resolve change through the shared selector", () => {
    expect(tape).toContain("selectQuoteChange(");
    expect(watch).toContain("selectQuoteChange(");
  });

  it("both render a dash instead of a fabricated flat session", () => {
    expect(tape).toContain("chgObserved ? (");
    expect(tape).toContain("chg —");
    // The row receives the flag as a prop now, so the anchor is the branch
    // itself rather than the object it used to hang off.
    expect(watch).toContain("changeObserved ? (");
    expect(watch).toContain("chg —");
  });
});

/**
 * Extract the argument text of every `selectQuoteChange(...)` call by balanced
 * parens. Deliberately NOT a regex over the call: the arguments span lines and
 * contain nested calls and object literals, and the last Sentinel failed
 * precisely because a regex described a string rather than a behaviour.
 */
function selectorCalls(src: string): string[] {
  const out: string[] = [];
  const needle = "selectQuoteChange(";
  for (let i = src.indexOf(needle); i !== -1; i = src.indexOf(needle, i + 1)) {
    let depth = 0;
    let j = i + needle.length - 1;
    for (; j < src.length; j++) {
      if (src[j] === "(") depth++;
      else if (src[j] === ")" && --depth === 0) break;
    }
    out.push(src.slice(i, j + 1));
  }
  return out;
}

describe("the fabricated flat session cannot re-enter from the server", () => {
  it("the yahoo route still DISCLOSES when it substitutes prevClose", () => {
    // The route is not required to stop substituting — that fallback keeps a
    // price renderable when only the price was observed. It IS required to keep
    // saying so. This is the single fact every downstream guard now depends on;
    // if `ohlcObservation.prevClose` ever becomes a literal `true`, or stops
    // being published, every gate below silently reverts to permissive.
    expect(route).toContain("ohlcObservation");
    expect(route).toMatch(/prevClose:\s*Boolean\(/);
    expect(route).not.toMatch(/ohlcObservation[\s\S]{0,120}prevClose:\s*true\b/);
  });

  it("the scanner no longer defaults prevClose to the last price", () => {
    // This is where `prevClose ?? price` actually lived on the client. On the
    // tape it was only ever a memory; here it was the live producer.
    expect(code(scanner)).not.toMatch(/prevClose\s*\?\?\s*price/);
  });

  it("the scanner resolves change through the shared selector", () => {
    expect(scanner).toContain("selectQuoteChange(");
  });

  it("the scanner can REPRESENT an unobserved change", () => {
    // Three correct null-guards downstream (buildResults, ChangeMeter, the
    // render) were all vacuous while the producer's type said `change: number`.
    // A guard against null cannot fire in a world where null is unspellable.
    expect(scanner).toMatch(/change:\s*number\s*\|\s*null/);
    expect(scanner).toMatch(/changePct:\s*number\s*\|\s*null/);
  });

  it("every prevClose-derived change carries the provider's disavowal", () => {
    // The rule, not the spelling: if a call site hands the selector a
    // `prevClose`, it must also hand over the flag that says whether that
    // prevClose is real. A site that passes one without the other is asking the
    // selector to trust a number the provider already disowned.
    for (const [name, src] of [
      ["TickerTape", tape], ["scanner", scanner], ["watchlist", watch],
    ] as const) {
      for (const call of selectorCalls(code(src))) {
        if (!call.includes("prevClose")) continue;
        expect(call, `${name}: selectQuoteChange call passing prevClose without prevCloseObserved`)
          .toContain("prevCloseObserved");
      }
    }
  });

  it("the watchlist forwards the flag alongside the provider's own change", () => {
    // The watchlist reaches the selector through `change`/`changePct`, not
    // prevClose — a different door to the same room. /api/yahoo DERIVES that
    // change from the substituted prevClose, so the disavowal has to travel
    // with it or this panel renders the zero the other two now refuse.
    expect(watch).toContain("ohlcObservation");
  });
});

/**
 * Fixing the fabrication must not introduce a new one: `up` also colours the
 * PRICE. Leaving `up === false` for an unobserved change would paint the row
 * red, asserting a decline that was never measured.
 */
describe("session change direction is not asserted without evidence", () => {
  it("the watchlist uses a neutral colour when change is unobserved", () => {
    expect(watch).toContain("const dirColor = !item.changeObserved");
    expect(watch).not.toMatch(/fontSize: 11, color: up \? "#00C076"/);
  });

  it("watchlist gainers/losers filters exclude unobserved rows", () => {
    // A row with no observed change is not a 0% mover; it is unknown.
    expect(watch).toContain("i.changeObserved && i.changePct > 0");
    expect(watch).toContain("i.changeObserved && i.changePct < 0");
  });

  it("change sorting ranks unobserved rows last, not at zero", () => {
    expect(watch).toContain("Number(b.changeObserved) - Number(a.changeObserved)");
  });

  it("the observation flag survives the window cache round trip", () => {
    // Rename-resilient. Two things must hold and neither is a spelling:
    //   WRITE — the flag is carried INTO the window cache, not dropped, so a
    //           reload cannot silently downgrade "observed" to "assumed".
    //   READ  — it comes back through a STRICT `=== true`, never a truthy
    //           coercion, so an absent or junk flag reads as UNobserved.
    // The local names here have changed (`t`/`p` → `q`) without either
    // property changing; a Sentinel pinned to the identifier guards nothing.
    // The WRITE must be checked ON THE CACHE STATEMENT ITSELF. A loose
    // repo-wide match for `chgObserved: <x>.chgObserved` is satisfied by the
    // row-mapping helper and stays green while the cache write drops the flag
    // entirely — verified by deleting it, 2026-09-07. Slice the statement.
    const cacheWrite = tape.slice(
      tape.indexOf("priceCache[sym] ="),
      tape.indexOf(";", tape.indexOf("priceCache[sym] =")),
    );
    expect(cacheWrite, "the window-cache write statement").toContain("chgObserved");
    expect(tape).toMatch(/chgObserved:\s*\w+\.chgObserved === true/);
    expect(watch).toContain("changeObserved: it.changeObserved");
    expect(watch).toContain("changeObserved: c.changeObserved === true");
  });
});
