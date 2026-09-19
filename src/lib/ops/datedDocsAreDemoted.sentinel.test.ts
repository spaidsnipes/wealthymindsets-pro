/**
 * SENTINEL — a document that names its own day may not speak in the present tense.
 *
 * GATE M6, "source poison". The order describes it as *"stale comments, tests and
 * route prose that can reteach retired architecture to a fresh worker."* The gate
 * row also names the instrument this repo already owns for one instance of it:
 * `viewBuildOrder.sentinel.test.ts` requires any ungated build-status word in ONE
 * document to name the day or the commit it was last true for. The row asks for
 * the generalisation. This file is it — but not the generalisation that was
 * obvious, because the obvious one was measured and found worthless.
 *
 * ── TWO RULES WERE MEASURED BEFORE THIS ONE WAS WRITTEN ─────────────────────
 *
 * The first candidate was the literal generalisation: apply the per-paragraph
 * "a build-status word must sit beside a date or a SHA" rule to all 64 undemoted
 * operations docs. MEASURED 2026-09-19: **70 offending units across 27 docs.**
 * Most were not stale claims at all — they were table LEGENDS defining what
 * `PARTIAL` means, template column headers, and prose explaining the rule
 * itself. A gate whose remedy is seventy inline edits, most of them to text that
 * was never wrong, does not teach care. It teaches people to delete the word
 * `PARTIAL` from a legend, and the document gets worse.
 *
 * The second candidate moved the unit up: require the DOCUMENT to be dateable —
 * a date in the filename or in the first twelve lines — rather than every
 * paragraph. MEASURED: **1 offender out of 64.** Sixty-three docs pass without
 * anyone doing anything, which is the vacuous-green failure this suite already
 * guards against in three other files. A rule that is satisfied by accident is
 * not a rule.
 *
 * ── WHAT WAS ACTUALLY WRONG ────────────────────────────────────────────────
 *
 * Neither number was the defect. The defect was visible only once the docs were
 * sorted by whether they name a day IN THEIR OWN FILENAME:
 *
 *   89 operations docs · 25 demoted · 64 undemoted
 *   of the 64 undemoted, **47 carried a date in the filename**
 *
 * Forty-seven shift batons, session receipts, audits, checkpoints and evidence
 * records — documents that are point-in-time BY CONSTRUCTION, each one announcing
 * its own expiry in its own name — were still speaking in the present tense with
 * no demotion stamp. `CODEX_CONTINUITY_2026-08-10_0900.md` tells a reader what to
 * do next. It was right on 2026-08-10. A worker who arrives from a search result,
 * a shared link or a directory listing never passes through `README.md`, never
 * meets the demotion notice it carries, and is coached into August.
 *
 * That is the named class RETIREMENT_DEBT — a superseded doc never demoted —
 * recorded in the docblock of `repoFrontDoorAuthority.test.ts` when it was found
 * in the README. Nobody checked whether it was also true of the side doors. It
 * was, forty-seven times.
 *
 * ── WHY THE FILENAME IS THE RIGHT SIGNAL ───────────────────────────────────
 *
 * It cannot be argued with and it cannot drift. A document titled with a day is
 * not making a claim about whether it is current — it has already told you it
 * is not, in the one piece of metadata every reader sees before opening it.
 * Every other signal here (prose, headers, tone) is a judgement call; this one
 * is a fact about the tree. And the remedy is ONE stamp per file, which is a
 * remedy someone will actually apply.
 *
 * ── THE EXEMPTION IS DECLARED, NOT LISTED ──────────────────────────────────
 *
 * `CANON-VIEW-BUILD-ORDER-2026-09-17.md` has a dated filename and is genuinely
 * current authority — another Sentinel requires it to claim first-read authority
 * today. Demoting it would set two gates against each other. So a document may
 * opt out, in its own body, with `<!-- ath-standing-authority: YYYY-MM-DD -->`,
 * naming the day it was last re-measured. A filename allowlist in THIS file
 * would be the retyped truth the whole suite exists to forbid: the exemption
 * would live somewhere the document's own author never looks.
 *
 * ── WHAT THIS CANNOT SEE ───────────────────────────────────────────────────
 *
 * It cannot tell whether a demoted document's CONTENT is true, and it cannot
 * catch a stale document whose filename carries no date — the 17 standing docs
 * are outside its reach entirely and need a different instrument. It closes one
 * thing: a point-in-time record cannot sit in this tree wearing a present tense.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const OPS_DIR = join(resolve(__dirname, "..", "..", ".."), "docs/operations");

/** Shared with `repoFrontDoorAuthority.test.ts`. A notice the reader meets AFTER
 *  the document's own title and instructions is decoration, so it must be at the
 *  top — the line budget is the same three lines that file uses. */
const MARKER_OPEN = "<!-- BEGIN:ath-historical-lineage -->";
const MARKER_MUST_APPEAR_WITHIN_LINES = 3;

/** The declared opt-out. Must name the day the document was last re-measured,
 *  because "still current" with no date is the exact claim this file refuses. */
const STANDING_AUTHORITY = /<!--\s*ath-standing-authority:\s*(20\d\d-\d\d-\d\d)\s*-->/;

/** A date anywhere in the filename. Deliberately not `\b`-anchored: these names
 *  are full of underscores, and `_2026-08-12` has no word boundary before the
 *  digit. A first draft used `\b` and silently exempted every doc whose date was
 *  preceded by an underscore — which is most of them. */
const FILENAME_DAY = /20\d\d-\d\d-\d\d/;

function opsDocs(): string[] {
  return readdirSync(OPS_DIR).filter((f) => f.endsWith(".md"));
}

function read(file: string): string {
  return readFileSync(join(OPS_DIR, file), "utf8");
}

function isMarkedHistorical(body: string): boolean {
  const idx = body.indexOf(MARKER_OPEN);
  if (idx === -1) return false;
  return body.slice(0, idx).split("\n").length - 1 <= MARKER_MUST_APPEAR_WITHIN_LINES;
}

describe("a dated document may not wear the present tense", () => {
  it("ANTI-VACUITY: the scan sees a real operations tree that really uses the stamp", () => {
    // Every assertion below iterates a directory listing. A move, a rename or a
    // changed extension filter turns all of them green over zero bytes, which is
    // the failure mode this whole file is about.
    const docs = opsDocs();
    expect(docs.length, "docs/operations scan found almost nothing — did it move?")
      .toBeGreaterThanOrEqual(50);

    const dated = docs.filter((f) => FILENAME_DAY.test(f));
    expect(dated.length, "no operations doc names a day in its filename — pattern has gone stale")
      .toBeGreaterThanOrEqual(30);

    const marked = docs.filter((f) => isMarkedHistorical(read(f)));
    expect(marked.length, "no doc carries the lineage marker — the stamp itself has drifted")
      .toBeGreaterThanOrEqual(25);
  });

  it("THE GATE: every doc that names a day in its filename is demoted or declares standing authority", () => {
    const offenders: string[] = [];
    for (const file of opsDocs()) {
      if (!FILENAME_DAY.test(file)) continue;
      const body = read(file);
      if (isMarkedHistorical(body)) continue;
      if (STANDING_AUTHORITY.test(body)) continue;
      offenders.push(file);
    }
    expect(
      offenders,
      `RETIREMENT_DEBT: these documents announce their own day in their filename ` +
        `but carry no demotion stamp, so they speak in the present tense about a ` +
        `state that expired. A worker arriving by search or link never passes ` +
        `through README.md and never meets its demotion notice — they are coached ` +
        `into whatever month the filename names. Prepend the lineage block (see ` +
        `docs/operations/BUILD_STATUS.md), or, if the document really is current ` +
        `authority, declare it in the document's own body with ` +
        `<!-- ath-standing-authority: YYYY-MM-DD --> naming the day it was last ` +
        `re-measured:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the standing-authority opt-out cannot be claimed without naming a day", () => {
    // The whole point of the opt-out is that it is DATEABLE. A bare
    // `<!-- ath-standing-authority -->` would be the undated status claim this
    // file's own sibling Sentinel was written to refuse, smuggled in as an
    // exemption from it.
    const bare: string[] = [];
    for (const file of opsDocs()) {
      const body = read(file);
      if (!body.includes("ath-standing-authority")) continue;
      if (!STANDING_AUTHORITY.test(body)) bare.push(file);
    }
    expect(
      bare,
      `these documents claim standing authority without naming the day they were ` +
        `last re-measured. An exemption that cannot go stale is not an exemption, ` +
        `it is a permanent escape:\n  ${bare.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the opt-out is rare — it is an exemption, not the normal way to write a dated doc", () => {
    // If claiming standing authority ever becomes the easy path, this gate
    // inverts: instead of demoting stale docs, authors will stamp them current
    // and the tree fills with fresh-looking August. There is no honest number
    // here, only an order of magnitude — a handful of documents can legitimately
    // be both dated and current at once. If this fires, the question to ask is
    // not "raise the bound" but "why did five more documents need to command".
    const claiming = opsDocs().filter((f) => STANDING_AUTHORITY.test(read(f)));
    expect(
      claiming.length,
      `${claiming.length} documents now claim standing authority: ${claiming.join(", ")}. ` +
        `The repository is not supposed to hold current authority — Drive is — so ` +
        `this list staying short is the point of the rule above.`,
    ).toBeLessThanOrEqual(3);
  });
});
