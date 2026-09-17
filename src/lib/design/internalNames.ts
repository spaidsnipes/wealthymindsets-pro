/**
 * THE NAMES THE TRADER MUST NEVER READ.
 *
 * Two defects in one day produced this list, both found the same way — by
 * LOOKING at prod, with the whole suite green over them:
 *
 *   ATHOS  — the agent system's name. The session-watch rail label had been
 *            deliberately written as "What WM is watching" to keep the name off
 *            a Founder surface, and then the BODY COPY of the same equipment
 *            said "ATHOS has watched this session".
 *   DLAR   — our acronym for Direction / Location / Aggression / Response.
 *            `DLARStrip` has always put the four EXPANDED words on its chips
 *            and has never once shown the trader the initialism, so there is
 *            nowhere the trader could have learned it. It shipped anyway, as
 *            the literal label "DLAR narrative:" in `StructureContextNote`.
 *
 * ── THE RULE FOR ADDING A NAME HERE ───────────────────────────────────
 * Show that the trader is NEVER TAUGHT it and NEVER NAVIGATES TO it.
 * "Looking internal" is not evidence. The first draft of this list had four
 * entries and two of them were guesses:
 *
 *     [/\bATHOS\b/, /\bDLAR\b/, /\bCLC\b/, /\bNECTAR\b/i]
 *
 *   CLC    — TRADER VOCABULARY. /education lesson 5 is "CLC Rule — Context +
 *            Location + Confirmation", and /journal offers "CLC Long" / "CLC
 *            Short" as setup names the trader picks by hand. WM teaches this
 *            word on purpose. Banning it would have forced a future author to
 *            rename a concept the product spends four hours teaching — a rule
 *            whose cheapest cure is the disease.
 *   NECTAR — A SHIPPED SURFACE. /nectar and /nectar/[symbol] are real routes
 *            and `DataHealth.tsx` renders the word to the trader. A name the
 *            product navigates to cannot be a name the product hides.
 *
 * ── WHY A STANDALONE-TOKEN TEST AND NOT A SUBSTRING ───────────────────
 * Every legitimate CODE occurrence is a longer identifier — `ATHOSInterven-
 * tionPanel`, `athos.interventions`, `chainVm.dlar`, `DLARStrip` — and `\b`
 * refuses all of them. A bare `ATHOS` or `DLAR` sitting in a sentence is
 * prose, and prose on a Founder surface is copy. The component may go on
 * being called whatever it is called; an import is not something a trader
 * can see. What ships in quotes is what ships on screen.
 *
 * Consumed by:
 *   - `roomAdoptsEquipment.sentinel.test.ts`  — the rail + descriptor seam
 *   - `theMirrorIsNotAMarketPanel.enforcement.test.ts` — RENDERED markup
 *   - `theTraderNeverReadsOurNames.test.ts`   — every JSX text node in src
 */
export const INTERNAL_NAMES: readonly RegExp[] = [/\bATHOS\b/, /\bDLAR\b/];

/** The bare words, for assembling human-readable failure messages. */
export const INTERNAL_NAME_WORDS: readonly string[] = ["ATHOS", "DLAR"];

/**
 * THE VENDORS THE TRADER MUST NEVER READ.
 *
 * A different category from the list above and it earns its own export. These
 * are not OUR names — they are the names of companies we buy bars from. The
 * trader's question is never "who filled this candle", it is "is this candle
 * real", and the Visual Systems Canon answers the second question with a fixed
 * vocabulary (`canonicalFidelityLabels.ts`) precisely so no surface has to
 * answer the first. The interaction directive states the same ban in its own
 * words: do not expose provider internals in Founder-facing UI.
 *
 * Found by pointing the JSX-text extractor at vendor names across all 202
 * components. Exactly one line in the product named one, and that line carried
 * a second defect riding along with it:
 *
 *   `backtesting/page.tsx`  — "Live data — real Yahoo OHLCV bars", on a
 *                             BACKTESTER whose `fetchBars` requests 3000
 *                             HISTORICAL candles. The vendor name and the
 *                             liveness overclaim died to one canon label.
 *
 * The pre-existing guard could not have caught it: `QUARANTINED_FIDELITY_-
 * PHRASES` is a four-entry list of exact strings, and this sentence is not one
 * of the four. Enumeration again.
 *
 * ── NAMES DELIBERATELY REFUSED ────────────────────────────────────────
 *   Polygon    — A CRYPTO ASSET THE TRADER NAVIGATES TO. `ChartToolbar`
 *                line 218: `{ sym:"MATIC", name:"Polygon", cat:"Crypto" }`.
 *                It is also a drawing-tool shape. Banning it would forbid the
 *                product from naming an asset it lists — the CLC error exactly,
 *                one list later. This is why "looks like a vendor" is not
 *                evidence either.
 *   CoinGecko   — zero occurrences anywhere in `src/`. Not a vendor this
 *   Twelve Data   codebase reads. A ban over a name the product never had is a
 *                rule that can only ever fire on a future author's innocent
 *                sentence.
 *
 * ── BROKERS ARE NOT VENDORS AND MUST NEVER BE ADDED ───────────────────
 * `Alpaca`, `Webull`, `Tastytrade`, `moomoo`. The trader CONNECTS these by
 * name, chooses between them by name, and reads their status by name on
 * `/readiness`. Whose account holds the money is the trader's business in a way
 * that whose server holds the bars never is.
 *
 * ── AND `/readiness` IS ALLOWED TO SAY THEM ───────────────────────────
 * It renders `row.label` ("Finnhub market data") from `providerReadiness.ts` —
 * an EXPRESSION, not a `JsxText` node, so this rule does not reach it. That is
 * correct rather than lucky: `/readiness` is the one surface whose entire job
 * is disclosing which integrations this host actually carries, and honest
 * disclosure is the opposite of a leak. The parser draws the line for free.
 */
export const PROVIDER_NAMES: readonly RegExp[] = [/\bFinnhub\b/i, /\bYahoo\b/i];

/** The bare words, for assembling human-readable failure messages. */
export const PROVIDER_NAME_WORDS: readonly string[] = ["Finnhub", "Yahoo"];
