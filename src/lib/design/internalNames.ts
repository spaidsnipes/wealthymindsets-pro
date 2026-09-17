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
