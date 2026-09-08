/**
 * A REFUSAL MUST NOT DISAPPEAR — enforced across every surface, not intended.
 *
 * `yahooQuoteObserved` is the SF-D01 gate. It is correct and it stays. But it
 * returns a boolean, so on its own it destroys the reason the endpoint had
 * already computed — and each surface then invented its own way to say
 * nothing:
 *
 *   TickerTape  refused row rendered "quote pending"  -> a delay that never ends
 *   scanner     refused row dropped from the results  -> a count with no denominator
 *
 * Both measured on 2026-09-07 against the SAME provider answer:
 *   /api/yahoo?sym=NQ1!&type=quote -> price 29565.25, resolution UNKNOWN,
 *   "a day/meta close must not be presented as a live observation."
 *
 * The rule: a surface that consults the gate must also consult
 * `yahooQuoteRefusal`, the one owner of WHY, and must put the answer where
 * the trader can reach it. Otherwise WM makes a decision on his behalf and
 * hides it.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

/** Every non-test source file, walked rather than remembered. */
function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(tsx|ts)$/.test(entry.name)) continue;
      if (entry.name.includes(".test.")) continue;
      found.push(path.relative(SRC, full));
    }
  };
  walk(SRC);
  return found.sort();
}

/**
 * Files that consult the SF-D01 gate — by EITHER function. `yahooQuoteRefusal`
 * is the strictly-more-informative sibling: non-null exactly when the boolean
 * would say no AND a provider actually answered, an equivalence pinned by the
 * PARTITION test in yahooQuoteObserved.test.ts. A file that reads only the
 * reason has consulted the gate and kept more of it, not less.
 */
function gateConsumers(): string[] {
  return sourceFiles().filter((rel) => {
    // The owner defines the gate; it does not consume it.
    if (rel === path.join("lib", "marketData", "yahooQuoteObserved.ts")) return false;
    return /yahooQuote(Observed|Refusal)\(/.test(read(rel));
  });
}

/**
 * Files that ASK `/api/yahoo` for a quote. This is the set that matters, and
 * it is not the same set as the one above — that was the hole this file
 * originally had. The first version of this Sentinel enumerated gate CALLERS
 * and required each to carry the reason, which is a real rule but an
 * unfalsifiable one: a surface that reads the endpoint and never asks the gate
 * at all was not enumerated, so it passed by saying nothing.
 *
 * `useWebSocket.ts` was exactly that file. It fetched
 * /api/yahoo?type=quote, read `observation` ONLY to decide whether to stamp a
 * timestamp, and returned the price regardless — so `29565.25` reached
 * `state.ticker.price` and rendered in the chart header while the strip beside
 * it read DATA UNAVAILABLE. It passed every test in this file.
 */
function yahooQuoteReaders(): string[] {
  return sourceFiles().filter((rel) => {
    if (rel.startsWith(path.join("app", "api") + path.sep)) return false; // the endpoints themselves
    if (rel === path.join("lib", "marketData", "yahooQuoteObserved.ts")) return false;
    // The TRANSPORT owner issues the request and interprets nothing. Requiring
    // it to consult SF-D01 would move interpretation into the transport, which
    // is precisely what it exists not to do: its three consumers want three
    // different readings of one body. It is excluded for the same reason the
    // endpoints above are — neither renders a price to anybody.
    if (rel === path.join("lib", "marketData", "yahooQuoteRounds.ts")) return false;
    const src = read(rel);
    // RE-ANCHORED 2026-09-08. This used to detect a reader by the /api/yahoo
    // URL it built. Once the duplicate-request fix gave the round a single
    // owner, exactly ONE file still contained that URL and the entire rule
    // silently emptied out — the seven real readers were no longer "readers"
    // by this definition, and the debt ledger below went vacuously green.
    // Asking the endpoint is now a CALL, not a string, so both forms count.
    return /\/api\/yahoo\?[^`'"]*type=quote/.test(src) || /fetchYahooQuoteBody\(/.test(src);
  });
}

/**
 * Readers that do NOT yet consult the gate. This list may only SHRINK.
 *
 * It is written down rather than skipped because an unlisted gap is an
 * invisible one: each of these renders an /api/yahoo price with no SF-D01
 * check, which is the same "fake-fresh" defect MainChart had, on a surface
 * that has not been fixed yet. Naming them converts an unknown into a queue.
 */
const UNGATED_DEBT: string[] = [].sort();

/**
 * Owners that validate the SF-D01 envelope THEMSELVES, so a reader routing its
 * response through one is gated even though the string `yahooQuoteRefusal(`
 * never appears in it.
 *
 * WHY THIS EXISTS: the debt list above carried `app/paper/page.tsx` on the
 * strength of a text match, and the comment above it asserted that every entry
 * "renders an /api/yahoo price with no SF-D01 check". That was FALSE for
 * /paper, which routes every quote through `selectPaperQuoteReadiness` — a
 * STRICTER gate than the one being looked for. It refuses any resolution that
 * is not RESOLVED, and additionally re-derives the observation's own clock
 * before it will call a price actionable.
 *
 * A queue that lists work already done is a queue people stop reading. But the
 * fix cannot be "match more strings", because then any function with a
 * reassuring name would launder an ungated read. So delegation is an
 * ENUMERATED act, and the test below re-proves each delegate actually refuses.
 */
const SF_D01_DELEGATES: Record<string, string> = {
  selectPaperQuoteReadiness: "lib/marketData/viewModels/selectPaperQuoteReadiness.ts",
};

/** Does this file consult SF-D01 at all — directly, or through a delegate? */
function consultsTheGate(src: string): boolean {
  if (/yahooQuote(Observed|Refusal)\(/.test(src)) return true;
  return Object.keys(SF_D01_DELEGATES).some(fn => new RegExp(`\\b${fn}\\(`).test(src));
}

describe("SF-D01 refusal — every gate consumer also carries the reason", () => {
  it("finds the consumers it is meant to protect", () => {
    // A guard on the guard: if the search silently matched nothing, every
    // assertion below would pass vacuously.
    const consumers = gateConsumers();
    expect(consumers.length).toBeGreaterThan(0);
    expect(consumers).toContain("components/layout/TickerTape.tsx");
    expect(consumers).toContain("app/scanner/page.tsx");
    expect(consumers).toContain("hooks/useWebSocket.ts");
  });

  it.each(gateConsumers())("%s reads WHY, not only WHETHER", (rel) => {
    const src = read(rel);
    expect(src, `${rel} must import the one owner of the reason`).toContain("yahooQuoteRefusal");
    expect(src, `${rel} must actually call it`).toMatch(/yahooQuoteRefusal\(/);
  });
});

describe("SF-D01 — asking Yahoo for a quote obliges you to consult the gate", () => {
  it("finds the readers it is meant to police", () => {
    const readers = yahooQuoteReaders();
    expect(readers.length).toBeGreaterThan(0);
    expect(readers).toContain("hooks/useWebSocket.ts");
  });

  it.each(Object.entries(SF_D01_DELEGATES))(
    "%s may only stand in for the gate while it still refuses",
    (fn, rel) => {
      // The allowlist is the dangerous part of the rule above: name a function
      // here and every caller is declared safe. So the delegate has to keep
      // earning it. If someone relaxes this selector, the surfaces hiding
      // behind it must fall back into the debt list rather than stay silent.
      const src = read(rel);
      expect(src, `${fn} must be declared in ${rel}`).toMatch(
        new RegExp(`export function ${fn}\\(`),
      );
      expect(src, `${fn} must read the SF-D01 resolution`).toMatch(/observation\.resolution/);
      expect(src, `${fn} must REFUSE anything that is not RESOLVED`).toMatch(
        /observation\.resolution !== "RESOLVED"/,
      );
    },
  );

  it("the un-gated debt is exactly what is written down — and may only shrink", () => {
    const ungated = yahooQuoteReaders().filter((rel) => !consultsTheGate(read(rel)));
    // A NEW un-gated reader fails here rather than shipping silently. A FIXED
    // one fails too, with the instruction to delete its line — so the debt
    // list can never quietly grow back after being paid down.
    expect(ungated.sort()).toEqual(UNGATED_DEBT);
  });
});

describe("chart quote — a refused price is retracted, not relabelled", () => {
  const HOOK = read("hooks/useWebSocket.ts");
  const CHART = read("components/chart/MainChart.tsx");

  it("consults the gate BEFORE reading the price, not after", () => {
    // Measured: /api/yahoo?sym=NQ1!&type=quote returns price 29565.25 ===
    // prevClose 29565.25 with resolution UNKNOWN. The old code read
    // `observation` only to decide `observedAt` and returned the price anyway.
    const mkAt = HOOK.indexOf("const mk = ");
    // The body contains `};` on inner returns, so close on the declaration's
    // own indentation instead.
    const mk = HOOK.slice(mkAt, HOOK.indexOf("\n  };", mkAt));
    const gateAt = mk.indexOf("yahooQuoteRefusal(");
    const priceAt = mk.indexOf("j?.price ?? j?.c");
    expect(gateAt, "mk() must consult the gate").toBeGreaterThan(-1);
    expect(priceAt).toBeGreaterThan(-1);
    expect(gateAt, "the price must not be read before the gate answers").toBeLessThan(priceAt);
  });

  it("zeroes ticker.price on refusal so existing `price > 0` consumers degrade", () => {
    // Fifteen surfaces already spell "no price" as `price > 0` being false.
    // Routing a refusal into that path is what makes the fix reach all of them
    // without each having to learn a new flag.
    expect(HOOK).toMatch(/ticker:\s*\{\s*price:\s*0,\s*change:\s*0,\s*changePct:\s*0/);
  });

  it("a refused quote may not VETO candles it never certified", () => {
    // `spotFetch` is not a display value — it holds a veto. Fifty lines later,
    // `stalePct > 0.05` throws away the entire candle set. On refusal
    // `j.price` falls back to prevClose, so an uncertified number could reject
    // real Alpaca/Finnhub/Polygon candles and blank the chart — worst across a
    // weekend or a gap, precisely where prevClose is furthest from the truth.
    // Anchored on the binding, not on `fetch(`: the request is now issued by
    // the shared round owner, but the veto and its gate still live here.
    const at = CHART.indexOf("const spotFetch = ");
    expect(at, "spotFetch must still exist").toBeGreaterThan(-1);
    const spot = CHART.slice(at, CHART.indexOf(".catch(() => 0);", at));
    const gateAt = spot.indexOf("yahooQuoteRefusal(");
    // `?.price`, not `j?.price`: the shared round hands back an `unknown` body,
    // so the read is now cast at the point of use. WHERE the price is read is
    // the invariant; the spelling of the binding it is read from is not.
    const priceAt = spot.indexOf("?.price");
    expect(gateAt, "spotFetch must consult the gate").toBeGreaterThan(-1);
    expect(gateAt, "the veto must not be armed before the gate answers").toBeLessThan(priceAt);

    // And the refusal must RETRACT to 0, because `spotPrice > 0` is the
    // existing guard that disarms the veto. Any other value re-arms it.
    expect(spot).toMatch(/yahooQuoteRefusal\(j\)\s*\?\s*0\s*:/);
    expect(CHART, "the veto must stay gated on a positive spot")
      .toMatch(/candleData\.length > 0 && spotPrice > 0/);
  });

  it("a live aggressor tape outranks a REST refusal", () => {
    // The tape observes real trades. The quote endpoint declining to certify
    // its own snapshot says nothing about those prints, so it must not wipe
    // a price the tape is actively producing.
    expect(HOOK).toMatch(/if \(tapeSourceRef\.current == null\) \{/);
  });

  it("a certified answer clears the previous round's refusal", () => {
    // Otherwise a resolved condition becomes a permanent accusation.
    expect(HOOK).toMatch(/quoteRefusal:\s*null,\n\s*ticker:\s*\{\s*price:\s*realPrice/);
  });

  it("the chart never falls back to the hardcoded seed price", () => {
    // `lastPrice` initialises to getBase(symbol) — a constant (NQ1! → 30476).
    // Once the refused quote is retracted, a bare `: lastPrice` fallback would
    // print a number no market ever produced. candles.length is the proof that
    // lastPrice came from a real bar.
    expect(CHART).toMatch(/ticker\.price\s*:\s*\(candles\.length\s*>\s*0\s*\?\s*lastPrice\s*:\s*0\)/);
    expect(CHART, "an unproven price must render as a dash, not a number").toMatch(
      /if \(!\(shown > 0\)\) \{/,
    );
  });

  it("§8 — a refusal does not wear the vocabulary of an empty feed", () => {
    // "DATA UNAVAILABLE" says nothing arrived. Something did arrive, on time.
    expect(CHART).toMatch(/quoteRefusal \? "QUOTE NOT CERTIFIED" : "DATA UNAVAILABLE"/);
    expect(CHART, "the reason must be reachable from the strip").toContain(
      "QUOTE NOT CERTIFIED — ${quoteRefusal}",
    );
  });
});

describe("watchlist — a circular zero is not a quiet market", () => {
  const WL = read("components/chart/WatchlistPanel.tsx");

  it("refuses on every Yahoo branch, not just the one that was easy", () => {
    // Three separate call sites read /api/yahoo here (crypto fallback,
    // futures-only, stock-first). A gate on two of three is a gate on none:
    // the ungated branch is where the next refused price gets in.
    //
    // This assertion used to COUNT — `gateCalls.length >= yahooCalls.length`.
    // A mutation proved that false green: deleting the futures branch's gate
    // outright still left 3 gates against 3 calls, so 3 >= 3 passed while
    // NQ1! walked back through the hole. Counting cannot see WHICH branch a
    // gate belongs to. So bind each gate to its branch by POSITION: for every
    // call site, a gate must appear after the fetch and before that response's
    // price is spent.
    // Re-anchored to the CALL rather than the URL: the three branches now ask
    // the shared round owner instead of building three identical URLs. The
    // rule — a gate per branch, bound by position — is untouched.
    const ASK = "fetchYahooQuoteBody(";
    const callSites: number[] = [];
    for (let i = WL.indexOf(ASK); i !== -1; i = WL.indexOf(ASK, i + 1)) {
      callSites.push(i);
    }
    expect(callSites.length, "expected three /api/yahoo quote branches").toBeGreaterThanOrEqual(3);

    for (const [n, at] of callSites.entries()) {
      // A branch ends where the next one begins; the last runs to end of file.
      const branch = WL.slice(at, callSites[n + 1] ?? WL.length);
      const gateAt = branch.indexOf("yahooQuoteRefusal(");
      const spendAt = branch.indexOf("result[up] = { price:");

      expect(gateAt, `the /api/yahoo branch at index ${n} reads a quote with no refusal gate at all`)
        .toBeGreaterThanOrEqual(0);

      if (spendAt !== -1) {
        expect(gateAt, `branch ${n} spends the price before asking whether WM accepted it`)
          .toBeLessThan(spendAt);
      }
    }
  });

  it("a refused row renders no price and no percentage", () => {
    // MEASURED before the fix: `NQ1! ACTIVE DEGRADED 29565.25 +0.00%` on four
    // rows. The +0.00% was circular — /api/yahoo returned price === prevClose,
    // so selectQuoteChange computed prevClose − prevClose = 0 and reported it
    // as OBSERVED, with two decimals of false precision.
    expect(WL).toMatch(/\{item\.refusal \? "—" : item\.price\.toFixed\(dp\)\}/);
    expect(WL).toMatch(/\{item\.refusal \? "not certified" : "chg —"\}/);
  });

  it("the refusal copy is REACHABLE, not merely present in the file", () => {
    // The bug this catches was mine, and only the running app found it. Both
    // assertions above passed while the strings were DEAD: a refusal retracts
    // the price to 0, and the block containing them was gated on
    // `item.price > 0`, so every refused row fell through to the
    // "quote pending" placeholder instead. MEASURED with /api/yahoo forced to
    // resolution UNKNOWN: four futures rows read "quote pending" — a delay's
    // words on a decision, the §8 violation the atom exists to remove.
    //
    // Asserting a string EXISTS proves nothing about whether a user can ever
    // see it. The gate that admits the row is the real invariant.
    const gate = WL.match(/\{item\.price > 0 \|\| item\.refusal \? \(/);
    expect(gate, "the price/change block must admit refused rows, which have no price")
      .not.toBeNull();

    // ...and the placeholder must remain the honest answer for its own case:
    // a row that genuinely has not been asked about yet.
    const gateAt = WL.indexOf("{item.price > 0 || item.refusal ? (");
    const pendingAt = WL.indexOf("quote pending", gateAt);
    expect(pendingAt, "the pending placeholder should still exist for un-asked rows")
      .toBeGreaterThan(gateAt);
  });

  it("a refused price never reaches the seed table or the cache", () => {
    // Either one would let WM re-serve, on the next mount, exactly the number
    // it just declined — laundered of the refusal that produced it.
    // `__wmWatchlist` also appears earlier (the cache is cleared on init), so
    // the window has to close on the ASSIGNMENT, not the first mention.
    const updater = WL.slice(WL.indexOf("const q = liveMap["), WL.indexOf("__wmWatchlist = cache"));
    const refusalBranch = updater.slice(updater.indexOf("if (refusal) {"), updater.indexOf("SEED_PRICES["));
    expect(refusalBranch, "no refusal branch found").not.toHaveLength(0);
    expect(refusalBranch, "the refusal branch must return before SEED_PRICES is written").toContain("return {");
    expect(WL, "a refused row must be skipped when caching").toMatch(/if \(it\.refusal\) continue;/);
  });

  it("holds a refusal while an untried provider remains", () => {
    // Yahoo declining an EQUITY quote is not a refusal of the symbol while
    // Alpaca and Finnhub are still unasked. Futures are the opposite case —
    // Yahoo is the only free source, so its refusal there is final.
    expect(WL).toMatch(/heldRefusal \?\?= yahooQuoteRefusal\(yhJ\)/);
    expect(WL).toMatch(/if \(heldRefusal\) result\[up\] = refusedQuote\(heldRefusal/);
  });
});

describe("scanner — a count without a denominator is not a scan result", () => {
  const SCANNER = read("app/scanner/page.tsx");

  it("the round carries what it ASKED, not only what it found", () => {
    // Measured: header read "28 delayed-quote signals" over a 30-symbol
    // universe, and nothing on screen accounted for the missing 2.
    expect(SCANNER).toMatch(/attempted:\s*scannerSymbols\.length/);
    expect(SCANNER).toMatch(/refusals\.set\(sym,\s*refusal\)/);
  });

  it("puts the denominator where the phone can still reach it", () => {
    // Measured at 375: in the header strip the chip rendered at right:393 —
    // past the viewport edge — and pushed `.wm-scanner-actions` to w:0,
    // collapsing the pre-existing Filters button. The status bar is the row
    // that already speaks about the data (results count, QUOTE STATE) and has
    // no controls to displace, so it absorbs the fact by wrapping instead.
    const statusBarAt = SCANNER.indexOf("{filtered.length}/{results.length} results");
    expect(statusBarAt, "status bar not found").toBeGreaterThan(-1);
    expect(
      SCANNER.indexOf("wm-scanner-uncertified"),
      "the chip must live in the status bar, not the width-starved header",
    ).toBeGreaterThan(statusBarAt);
    // Without wrapping, the status bar would clip the fact off the right edge
    // on a phone exactly as the header did.
    const openAt = SCANNER.lastIndexOf("<div className=", statusBarAt);
    const bar = SCANNER.slice(openAt, SCANNER.indexOf(">", openAt));
    expect(bar, "the status bar must wrap under pressure").toContain("flex-wrap");
  });

  it("renders the denominator and names every refused symbol", () => {
    const chip = SCANNER.slice(
      SCANNER.indexOf("wm-scanner-uncertified"),
      SCANNER.indexOf("</span>", SCANNER.indexOf("wm-scanner-uncertified")),
    );
    expect(chip, "no uncertified chip found").not.toHaveLength(0);
    expect(chip, "must show refused count over attempted count").toMatch(
      /\{round\.refusals\.size\}\s*of\s*\{round\.attempted\}/,
    );
    expect(chip, "the reason must be reachable, per symbol").toMatch(
      /\[\.\.\.round\.refusals\]\.map\(\(\[sym, reason\]\)/,
    );
  });

  it("is silent on a clean round rather than printing a zero", () => {
    // "0 not certified" on every clean scan is noise, and noise is what stops
    // the chip from being read on the round that matters.
    expect(SCANNER).toMatch(/round\.refusals\.size\s*>\s*0\s*&&/);
  });

  it("a refused symbol is never counted as a result", () => {
    // The gate's positive branch is the ONLY path that writes a quote; the
    // refusal path is its else. If a future edit made refusal additive, a
    // symbol WM declined would appear as a scan hit.
    const guard = SCANNER.indexOf("if (price > 0 && yahooQuoteObserved(quoteJson))");
    expect(guard).toBeGreaterThan(-1);
    const branch = SCANNER.slice(guard, SCANNER.indexOf("} catch {}", guard));
    expect(branch).toMatch(/}\s*else\s*{[\s\S]*yahooQuoteRefusal\(quoteJson\)/);
    expect(
      branch.slice(branch.indexOf("else")),
      "the refusal branch must not write a quote",
    ).not.toContain("results.set(");
  });
});

describe("stock info panel — zero is not a price, and it has no colour", () => {
  const SIP = read("components/chart/StockInfoPanel.tsx");

  it("the headline price is guarded before it is formatted", () => {
    // This defect was introduced BY the refusal work, not found by it. Once
    // useWebSocket began retracting a refused price to 0, this panel's
    // unconditional `ticker.price.toFixed(3)` started rendering `0.000` —
    // three decimals of false precision — painted green or red by `up`,
    // asserting a direction the number does not have. A retraction is only
    // honest if every consumer of the retracted field degrades with it.
    expect(SIP, "the headline price must not be formatted without a guard")
      .toMatch(/\{ticker\.price > 0 \? \(/);

    const priceBlock = SIP.slice(SIP.indexOf("{/* Price */}"), SIP.indexOf("{chg.displayable ? ("));
    expect(priceBlock, "no price block found").not.toHaveLength(0);
    expect(priceBlock, "the retracted case needs a neutral placeholder").toContain('>—</span>');
    expect(priceBlock, "the placeholder must carry the reason WM declined")
      .toContain("quoteRefusal");
    // The direction arrow is an assertion about a price; with no price there
    // is nothing to point at.
    expect(priceBlock, "the arrow must not survive a retracted price")
      .toMatch(/\{ticker\.price > 0 && chg\.displayable &&/);
  });

  it("a refused quote cannot authorise the session facts", () => {
    // SF-D01: on refusal `j.price` silently falls back to prevClose, so the
    // old `j.price > 0` admission test was a refused number granting itself
    // permission. The gate owner must be asked first.
    const effect = SIP.slice(SIP.indexOf("fetchYahooQuoteBody("), SIP.indexOf("}, [symbol]);"));
    const gateAt = effect.indexOf("yahooQuoteRefusal(j)");
    const setAt = effect.indexOf("setRealOHLC({");
    expect(gateAt, "the OHLC read must consult the refusal gate").toBeGreaterThanOrEqual(0);
    expect(gateAt, "the gate must run before the session facts are accepted").toBeLessThan(setAt);
  });
});
