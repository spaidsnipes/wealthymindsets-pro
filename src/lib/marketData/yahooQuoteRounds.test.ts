import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { InFlightRounds } from "./inFlightRounds";

/**
 * MEASURED /charts 2026-09-08, client-side route re-mount, stack-attributed
 * fetch wrapper — the attribution, not the guess, is what this file guards:
 *
 *   NQ1!   TickerTape.fetchQuote          918 ms
 *          useWebSocket.fetchRealQuote... 954 ms    36 ms apart
 *   YM1!   917 / 952 ms                             35 ms apart
 *   ES1!  1011 / 1047 ms                            36 ms apart
 *   AMZN   MainChart.useEffect             52, 284 ms
 *   RTY1!  TickerTape.fetchQuote ONLY — the clean control, clean only because
 *          it lives on one surface.
 */

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Every client-side surface that asks Yahoo for a quote. Adding a consumer
 * without adding it here is exactly how the tape and useWebSocket drifted
 * apart in the first place.
 */
const CONSUMERS = [
  "src/components/layout/TickerTape.tsx",
  "src/components/chart/MainChart.tsx",
  "src/components/chart/WatchlistPanel.tsx",
  "src/components/chart/StockInfoPanel.tsx",
  "src/hooks/useWebSocket.ts",
  "src/app/scanner/page.tsx",
  "src/app/paper/page.tsx",
] as const;

/** The single owner of the round, and the specimen the guards below read. */
const OWNER = "src/lib/marketData/yahooQuoteRounds.ts";

/**
 * The bypass shape. Named ONCE so the vacuity guard and the load-bearing rule
 * below can never come to disagree about what a bypass looks like.
 */
const RAW_BYPASS_PATTERN =
  /fetch\(\s*[`"'][^`"']*\/api\/yahoo[^`"']*type=quote/;

/** Every non-test source file, walked ONCE. */
function walkSrc(dir: string, acc: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkSrc(p, acc);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

const ALL_SOURCE = walkSrc(path.join(process.cwd(), "src"));

describe("the Yahoo quote round has exactly one owner", () => {
  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * The load-bearing rule below asserts a collection is EMPTY. Unlike most
   * scanners in this repo it does not walk a tree — it reads a DECLARED LIST,
   * `CONSUMERS`. That changes which emptiness modes are live, and it is worth
   * being precise about which ones this file already survives:
   *
   *   - A renamed consumer does NOT go silent. `read()` is a bare
   *     `readFileSync` with no try/catch, so a path that stops existing throws
   *     and the suite goes red. Credit where due — that is the right shape, and
   *     it is why no "every declared path still exists" guard is added here.
   *
   * Two modes remain, and neither can be seen by counting anything:
   *
   *   1. THE LIST GOES INCOMPLETE. This is the one the file's own header warns
   *      about — "adding a consumer without adding it here is exactly how the
   *      tape and useWebSocket drifted apart in the first place" — and it was
   *      the one thing nothing enforced. A new client surface that fetches
   *      Yahoo quotes is simply never examined. The rule stays green because it
   *      never looked, which is the precise defect this Sentinel exists to
   *      prevent, one level up.
   *
   *   2. THE PATTERN GOES STALE. `RAW_BYPASS_PATTERN` hunts a literal URL
   *      containing `/api/yahoo` AND `type=quote` inside a `fetch(`. Rename the
   *      query parameter, move the route to `/api/quote`, or build the URL from
   *      a shared constant and the regex matches nothing anywhere — silently,
   *      permanently. Every surface would then be free to re-fork the round.
   *
   * The control for (2) is deliberately NOT a hand-written decoy. A decoy is
   * written to match and therefore proves only that the regex compiles. Instead
   * the URL template is EXTRACTED FROM THE OWNER and wrapped in a `fetch(` —
   * the owner's literal is the exact text a bypasser would copy, so if the real
   * URL shape drifts out from under the pattern, this fails.
   */
  it("ANTI-VACUITY: the consumer list is complete and the bypass pattern still matches the owner's real URL", () => {
    // (1) COMPLETENESS. Any non-test source file that calls the owner is a
    // consumer of the round, and must be declared — otherwise it is never
    // examined by the rule below.
    const declared = new Set<string>(CONSUMERS);
    const undeclared = ALL_SOURCE
      .filter((p) => fs.readFileSync(p, "utf8").includes("fetchYahooQuoteBody("))
      .map((p) => path.relative(process.cwd(), p))
      .filter((rel) => rel !== OWNER && !declared.has(rel))
      .sort();
    expect(
      undeclared,
      `These files consume the shared Yahoo quote round but are NOT listed in ` +
        `CONSUMERS, so the bypass rule below never examines them — it reports ` +
        `clean having never looked at them at all:\n  ${undeclared.join("\n  ")}\n\n` +
        `Add each to CONSUMERS. This is the exact drift the file header warns ` +
        `about: TickerTape and useWebSocket duplicated the same request for 35ms ` +
        `because nobody was checking the second surface`,
    ).toEqual([]);

    expect(
      CONSUMERS.length,
      "CONSUMERS is empty — the rule below iterates nothing and passes",
    ).toBeGreaterThan(5);

    // (2) THE PATTERN IS STILL LIVE. Extract the owner's own URL literal and
    // prove that a fetch() built around it would be caught.
    //
    // NOTE the strip(). MEASURED 2026-09-19 while mutation-proving this guard:
    // reading the owner RAW matched the URL inside its own JSDoc — line 53 says
    // "Join the open `/api/yahoo?type=quote` round" — so renaming the real
    // query parameter on line 64 left this control passing happily against a
    // COMMENT. A positive control that can be satisfied by prose is not a
    // control. Code only.
    const ownerSrc = strip(read(OWNER));
    const urlLiteral = ownerSrc.match(/`\/api\/yahoo[^`]*`/)?.[0];
    expect(
      urlLiteral,
      `${OWNER} no longer contains a \`/api/yahoo...\` template literal. The ` +
        "quote URL moved (a shared constant, a different route, a builder " +
        "function), so RAW_BYPASS_PATTERN is now hunting a URL shape that no " +
        "longer exists and the rule below can never fire. Re-derive the pattern " +
        "from how the quote URL is actually built today",
    ).toBeTruthy();

    expect(
      RAW_BYPASS_PATTERN.test(`fetch(${urlLiteral})`),
      `RAW_BYPASS_PATTERN does not match a fetch() wrapped around ${OWNER}'s ` +
        `OWN url literal (${urlLiteral}). That literal is exactly the text a ` +
        "bypassing surface would copy, so if the pattern cannot catch it, the " +
        "pattern catches nothing and the rule below is permanently green over a " +
        "shape it can no longer recognise",
    ).toBe(true);
  });

  it("no client surface issues a raw /api/yahoo type=quote fetch", () => {
    /**
     * THE load-bearing assertion. A single bypass reintroduces the defect for
     * whichever symbol that surface shares with another, and nothing else in
     * the suite would notice — the duplicate requests are silent and correct.
     */
    const offenders: string[] = [];
    for (const file of CONSUMERS) {
      const code = strip(read(file));
      if (RAW_BYPASS_PATTERN.test(code)) offenders.push(file);
    }
    expect(
      offenders,
      `These surfaces bypass the shared round with a raw fetch: ` +
        `${offenders.join(", ")}. Call fetchYahooQuoteBody() instead`,
    ).toEqual([]);
  });

  it("every consumer routes through the owner", () => {
    for (const file of CONSUMERS) {
      expect(strip(read(file))).toContain("fetchYahooQuoteBody(");
    }
  });

  it("the owner is the only place the URL is built", () => {
    const owner = strip(read("src/lib/marketData/yahooQuoteRounds.ts"));
    expect(owner).toContain("`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`");
    expect(owner).toContain("readClassifiedJsonReceipt<unknown>(fetch,");
    expect(owner).toContain("yahooQuoteRounds.run(`yahoo:quote:${up}`");
  });

  it("quote rounds cannot collide with tick or domain-quote rounds", () => {
    // Three identity spaces exist now: `yahoo:quote:`, `ticks:`, and the bare
    // symbol used by quoteRequestCoalescer. A shared prefix would let one
    // round answer another's question — silent, and awful.
    const owner = read("src/lib/marketData/yahooQuoteRounds.ts");
    expect(owner).toContain("new InFlightRounds()");
    expect(owner).toContain("yahoo:quote:");
  });

  it("NO consumer's AbortSignal enters the shared round", () => {
    /**
     * MainChart passed `myAbortSignal` to its own fetch. Handed to a shared
     * round, this chart unmounting mid-flight would cancel a request the tape
     * and useWebSocket are waiting on, and they would read the abort as the
     * provider's answer — an absence manufactured by an unrelated component's
     * unmount. Same rule as the provider-tick rounds in 2efcb31: cancellation
     * belongs to a CONSUMER, applied to the RESULT.
     */
    const owner = strip(read("src/lib/marketData/yahooQuoteRounds.ts"));
    expect(owner).toContain("fetchYahooQuoteBody(symbol: string)");
    expect(owner).toContain("new AbortController().signal");

    const chart = strip(read("src/components/chart/MainChart.tsx"));
    expect(chart).toContain("myAbortSignal.aborted || yahooQuoteRefusal(j)");
  });

  it("the owner does not cache — a later poll still reaches the provider", async () => {
    // Joining is only ever offered while a request is genuinely open. A tape
    // that showed a settled answer forever would be a staleness bug wearing a
    // perf fix's clothes.
    const rounds = new InFlightRounds();
    let starts = 0;
    const start = () => { starts += 1; return Promise.resolve(starts); };
    await rounds.run("yahoo:quote:NQ1!", start);
    expect(rounds.isInFlight("yahoo:quote:NQ1!")).toBe(false);
    await rounds.run("yahoo:quote:NQ1!", start);
    expect(starts).toBe(2);
  });

  it("the measured 35ms pair becomes one round", async () => {
    const rounds = new InFlightRounds();
    let starts = 0;
    let resolve!: (v: unknown) => void;
    const body = new Promise(r => { resolve = r; });
    const start = () => { starts += 1; return body; };

    const tape = rounds.run("yahoo:quote:NQ1!", start);      // t = 918
    const socket = rounds.run("yahoo:quote:NQ1!", start);    // t = 954
    expect(starts).toBe(1);

    resolve({ price: 29682 });
    // Both consumers get the SAME body and read it their own way.
    expect(await tape).toEqual({ price: 29682 });
    expect(await socket).toEqual({ price: 29682 });
  });
});
