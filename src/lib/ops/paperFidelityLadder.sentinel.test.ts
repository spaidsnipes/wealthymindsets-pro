/**
 * SENTINEL — a fill may not get more realistic than the data it was fed.
 *
 * `docs/operations/PAPER-EXECUTION-REALISM-STANDARD.md` defines a four-rung
 * fidelity ladder, and each rung is legal ONLY when the named observed input
 * actually exists on the lane feeding /paper. Rung 1 (fill against the observed
 * spread side) needs a real bid/ask. Rung 2 needs real tape at the level. Rung 3
 * needs L2 depth. The standard names, for each rung, the fabrication that is
 * forbidden until its input lands: fixed-bps spreads, probabilistic touch fills,
 * random partial ratios — plus latency simulation and price jitter, which are on
 * no rung at all because they inject noise a trader cannot audit.
 *
 * Until this file, ALL OF THAT WAS PROSE. The standard was written 2026-09-19
 * and changed zero fills, which was correct — but a rule with no machine is a
 * rule that survives exactly as long as the next person who reads it. The same
 * defect this suite found in `docs/operations` nine times over.
 *
 * ── WHAT WAS MEASURED BEFORE THIS WAS WRITTEN ──────────────────────────────
 *
 * MEASURED 2026-09-19 across the six modules that produce or describe a paper
 * fill: `jitter` 0, `latenc` 0, `bps`/`basisPoint` 0, `Math.random` 3.
 *
 * All three `Math.random` hits were false positives for a naive grep, and the
 * shape of the false positives is the reason this file strips comments before
 * it scans. TWO of them are docblock sentences boasting that "`Math.random`
 * appears nowhere" — a gate that fired on those would be punishing the files
 * for documenting their own discipline. The THIRD is real code and is
 * legitimate: `uid()` at `paperTrade.ts`, generating an order id. A random id
 * is not a fabricated market; it never reaches a price, a quantity or a fill
 * decision.
 *
 * So the gate below carries exactly ONE declared exception, matched on the
 * whole `uid` line rather than on the file. A second `Math.random` anywhere in
 * the fill path fails, including a second one inside `paperTrade.ts`.
 *
 * ── THIS IS A RATCHET, AND THAT IS DELIBERATE ──────────────────────────────
 *
 * Zero violations today. Elsewhere in this suite a rule with zero offenders is
 * called vacuous and refused — but that test is about DISCOVERY rules, which
 * are supposed to find existing debt and are worthless when they find none.
 * This is a PRESERVATION rule: the property already holds, it holds because
 * people were careful, and carefulness is exactly the thing that does not
 * survive a change of author. The honest bar for a ratchet is not "does it find
 * something today" but "does it fail when the property breaks" — which is why
 * the acceptance evidence for this file is its mutation proof, not its count.
 *
 * ── THE LADDER LOCK IS THE PART THAT CAN SURPRISE YOU ──────────────────────
 *
 * The third test does not check the code at all. It measures whether the lane
 * can FUND rung 1 — whether the quote route that feeds /paper carries any
 * top-of-book field — and requires that measurement to agree with what the
 * standard claims. MEASURED 2026-09-19: `/api/yahoo` builds its quote payload
 * from the v8 chart endpoint's `meta` plus intraday candles, and the string
 * `bid` does not occur in the route at all. Rung 1 is unfunded, the standard
 * says so, they agree, green.
 *
 * It fires in BOTH directions, which is the point:
 *   - if someone writes spread-side fills while the lane still has no bid/ask,
 *     that is the fabrication the standard forbids, and the code test catches it;
 *   - if someone lands a real top-of-book feed, THIS test goes red to say rung 1
 *     just became legal and the standard's "FORBIDDEN until then" is now stale.
 *
 * A gate that only ever complains about regressions would let the standard rot
 * quietly on the day the blocker is removed — and the person who lands the feed
 * is precisely the person who will not think to re-read a realism doc.
 *
 * ── WHAT THIS CANNOT SEE ───────────────────────────────────────────────────
 *
 * It cannot tell whether a fill is CORRECT — `paperTrade.test.ts` and the
 * state-machine suites own that. It cannot catch a fabrication that avoids
 * every token it knows: someone who hard-codes `px * 1.0002` writes a minted
 * spread that reads as arithmetic, and no string test will see it. That is a
 * review responsibility and the standard's checklist is where it lives. This
 * closes one thing: the named fabrications cannot arrive dressed as realism,
 * and the ladder cannot silently disagree with the lane underneath it.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..", "..", "..");

/** Every module that produces, adjusts or describes a paper fill. */
const FILL_PATH = [
  "src/lib/paperTrade.ts",
  "src/lib/paperTradeOutcome.ts",
  "src/lib/paperFillQueueBasis.ts",
  "src/lib/paperStopRealism.ts",
  "src/lib/paperShortRealism.ts",
  "src/lib/paperPositionMark.ts",
  "src/lib/paperExecutionRealism.ts",
] as const;

const QUOTE_ROUTE = "src/app/api/yahoo/route.ts";
const STANDARD = "docs/operations/PAPER-EXECUTION-REALISM-STANDARD.md";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/**
 * Strips block comments, line comments and string literals.
 *
 * Comments must go because two of these files DOCUMENT their refusal to use
 * `Math.random`, and a scanner that cannot tell a boast from a call would fail
 * the files that are most careful. Strings must go because a disclosure
 * sentence rendered to the trader may legitimately contain the word "latency".
 */
function executableCode(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
}

/**
 * The one legitimate randomness in the fill path: an order id.
 *
 * Declared as the whole line, not as a filename, so that a SECOND
 * `Math.random` inside `paperTrade.ts` is still caught.
 */
const UID_EXCEPTION = "function uid() { return Math.random().toString(36).slice(2, 9); }";

/** Each pattern is a fabrication the standard names, with the reason it is banned. */
const FORBIDDEN: readonly { readonly re: RegExp; readonly why: string }[] = [
  {
    re: /Math\s*\.\s*random/g,
    why:
      "randomness in a fill decision — the standard forbids random partial-fill " +
      "ratios (rung 3) and rejection randomness at every rung. A trader cannot " +
      "audit a number the machine rolled",
  },
  {
    re: /\bjitter\b/gi,
    why:
      "price jitter is on NO rung of the ladder. It makes a chart look alive and " +
      "makes every number on it unownable",
  },
  {
    re: /\blatenc(y|ies)\b/gi,
    why:
      "latency simulation is on NO rung of the ladder. A delay we invent is not a " +
      "delay we observed",
  },
  {
    re: /\b(bps|basisPoints?)\b/g,
    why:
      "a fixed-bps spread is the exact fabrication rung 1 forbids until a real " +
      "bid/ask lands. It is a minted number wearing a realism costume",
  },
];

/** Any token that would mean the lane carries top-of-book. */
const TOP_OF_BOOK = /\b(bid|ask|bidSize|askSize)\b/;

describe("a paper fill may not outrun the data it was fed", () => {
  it("ANTI-VACUITY: the scan really reads the fill path, the lane and the standard", () => {
    // Every assertion below is a string scan over files named by path. A rename,
    // a move or a split turns all of them green over zero bytes.
    for (const rel of FILL_PATH) {
      const code = executableCode(read(rel));
      expect(
        code.length,
        `${rel} read as almost no executable code — did it move or get emptied?`,
      ).toBeGreaterThan(200);
    }

    const trade = read("src/lib/paperTrade.ts");
    expect(
      trade.includes("export function selectOrderFill"),
      "selectOrderFill is gone from paperTrade.ts — the fill path this file " +
        "claims to guard is no longer where it is looking",
    ).toBe(true);

    expect(
      read(QUOTE_ROUTE).includes("type=quote") || read(QUOTE_ROUTE).includes('"quote"'),
      `${QUOTE_ROUTE} no longer looks like the quote lane feeding /paper`,
    ).toBe(true);

    expect(
      read(STANDARD).includes("fidelity ladder"),
      `${STANDARD} no longer contains the ladder this file enforces`,
    ).toBe(true);
  });

  it("THE GATE: no named fabrication may enter the fill path", () => {
    const offences: string[] = [];

    for (const rel of FILL_PATH) {
      const raw = read(rel);
      const code = executableCode(raw);
      for (const { re, why } of FORBIDDEN) {
        for (const m of code.matchAll(re)) {
          // Locate the offending line in the ORIGINAL source so the message
          // points somewhere a person can open.
          const line =
            raw.split("\n").find((l) => new RegExp(re.source, re.flags.replace("g", "")).test(l)) ??
            "";
          if (line.trim() === UID_EXCEPTION) continue;
          offences.push(`${rel}: ${m[0]} — ${why}\n      at: ${line.trim().slice(0, 100)}`);
        }
      }
    }

    expect(
      offences,
      `PAPER FILL FABRICATION: the fidelity ladder in ${STANDARD} permits a rung ` +
        `ONLY when the observed input it names exists on the lane feeding /paper. ` +
        `These are the fabrications it forbids, and one just entered the fill ` +
        `path. If you are climbing a rung, the review checklist asks first: what ` +
        `NEW observed input justifies it? If the answer is "none", this is a ` +
        `minted number, not realism:\n  ${offences.join("\n  ")}`,
    ).toEqual([]);
  });

  it("THE LADDER LOCK: the standard's rung-1 claim must match what the lane can actually feed", () => {
    // This is a measurement, not a preference. Either the quote route carries a
    // top-of-book field or it does not, and the standard says one of two things.
    const laneFundsRung1 = TOP_OF_BOOK.test(executableCode(read(QUOTE_ROUTE)));
    const standardSaysForbidden = /Rung 1[\s\S]{0,400}?FORBIDDEN until then/.test(read(STANDARD));

    const fillPathReadsTopOfBook = FILL_PATH.some((rel) =>
      TOP_OF_BOOK.test(executableCode(read(rel))),
    );

    if (!laneFundsRung1) {
      expect(
        standardSaysForbidden,
        `The lane feeding /paper carries no bid/ask — ${QUOTE_ROUTE} builds its ` +
          `quote payload from chart meta and intraday candles only — so rung 1 is ` +
          `unfunded and ${STANDARD} must still say FORBIDDEN. It no longer does. ` +
          `Either the standard was softened without the data landing, or the ` +
          `ladder was rewritten; both need the other half.`,
      ).toBe(true);

      expect(
        fillPathReadsTopOfBook,
        `A fill-path module now reads a bid/ask/depth field, but ${QUOTE_ROUTE} ` +
          `does not carry one. Whatever that field holds at fill time was not ` +
          `observed — it was assumed, defaulted or minted. That is rung 1 climbed ` +
          `without its input, which the standard names as "fabrication wearing a ` +
          `realism costume".`,
      ).toBe(false);
      return;
    }

    // The blocker has been removed. That is good news and it makes the standard
    // wrong, so this fails loudly rather than letting a stale FORBIDDEN sit
    // there telling the next reader that real fills are off the table.
    expect(
      standardSaysForbidden,
      `RUNG 1 IS NOW FUNDED. ${QUOTE_ROUTE} carries a top-of-book field, so a buy ` +
        `may legally fill at the observed ASK and a sell at the observed BID — ` +
        `still observed numbers, just the correct side. ${STANDARD} still says ` +
        `rung 1 is FORBIDDEN, which is now false and will talk the next reader out ` +
        `of work that has become legal. Update the ladder, then move the fills. ` +
        `(This gate is not asking you to hurry — it is refusing to let the ` +
        `standard go stale on the day its blocker was lifted.)`,
    ).toBe(false);
  });
});
