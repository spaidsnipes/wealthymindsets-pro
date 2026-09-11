/**
 * repoFrontDoorAuthority — the repository's own front door must not command.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * `README.md` said "ATH employees start here" and pointed at
 * `docs/operations/ATH_COMMAND_CENTER.md`, which said it was "the single entry
 * point for every ATH employee", was stamped `2026-07-28`, drove toward a
 * release objective of `2026-07-31`, and named the deployment target as
 * `wealthymindsets-pro.vercel.app`. The same README offered
 * `http://localhost:3000` under the heading "Access the App (RIGHT NOW)".
 *
 * Every one of those sentences was true when written. Together, on 2026-09-11,
 * they formed a second current front door pointing at a retired host and a
 * finished milestone — while the real current authority lived in Drive
 * (`ATH — CURRENT COMMAND CENTER — 2026-09-11`, `ATH — FULL GARDEN PASS —
 * 2026-09-11`) and current production lived on Cloudflare Workers at
 * `https://wealthymindsetspro.com`.
 *
 * That is the named defect class DUPLICATE TRUTH: one subsystem owns a fact,
 * another recreates it, and both remain individually valid while disagreeing.
 * Here it also carries GHOST_HOST — a retired host driving current diagnosis —
 * and RETIREMENT_DEBT — a superseded doc never demoted.
 *
 * ── Why nothing could see it ─────────────────────────────────────────────────
 *
 * Markdown is not typechecked and is not imported. `tsc` and the whole suite
 * were green across every commit that let this drift widen. The repo reports
 * ZERO GitHub rulesets, so branch/doc discipline was documented PROCESS with no
 * MACHINE behind it. A fresh worker starting at README was coached into July.
 *
 * ── What this file is ────────────────────────────────────────────────────────
 *
 * The repair, made executable. Not a list of the docs I happened to demote —
 * a DERIVATION over the real tree:
 *
 *   · README itself must route to current authority and must not present a
 *     development URL or a retired host as production.
 *   · Any operations doc README mentions must already be marked historical.
 *   · Any operations doc that still SPEAKS with current command authority —
 *     found by scanning its own prose, not by consulting a list here — must
 *     be marked historical.
 *
 * A new stale door therefore fails HERE, at the moment someone writes it,
 * rather than at the moment a worker wastes a shift on it.
 *
 * MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const README = join(REPO_ROOT, "README.md");
const OPS_DIR = join(REPO_ROOT, "docs/operations");

/** The machine-readable demotion stamp prepended by the P0-A repair. */
const MARKER_OPEN = "<!-- BEGIN:ath-historical-lineage -->";
const MARKER_CLOSE = "<!-- END:ath-historical-lineage -->";

/**
 * A demotion notice only works if the reader meets it BEFORE the document's
 * own title and instructions. Buried at the bottom it is decoration.
 */
const MARKER_MUST_APPEAR_WITHIN_LINES = 3;

function readReadme(): string {
  return readFileSync(README, "utf8");
}

function opsDocs(): string[] {
  return readdirSync(OPS_DIR).filter(f => f.endsWith(".md"));
}

function readOpsDoc(file: string): string {
  return readFileSync(join(OPS_DIR, file), "utf8");
}

function isMarkedHistorical(body: string): boolean {
  const idx = body.indexOf(MARKER_OPEN);
  if (idx === -1) return false;
  const linesBefore = body.slice(0, idx).split("\n").length - 1;
  return linesBefore <= MARKER_MUST_APPEAR_WITHIN_LINES;
}

/**
 * Judge what the document ORIGINALLY claimed, not the demotion header we
 * prepended. The header necessarily contains words like "current authority"
 * and "current front door"; counting those would make every demoted file look
 * like a fresh offender and make the whole scan self-satisfying.
 */
function stripLineageBlock(body: string): string {
  const start = body.indexOf(MARKER_OPEN);
  if (start === -1) return body;
  const end = body.indexOf(MARKER_CLOSE, start);
  if (end === -1) return body;
  return body.slice(0, start) + body.slice(end + MARKER_CLOSE.length);
}

/**
 * Phrases by which a document claims the right to COMMAND a reader right now.
 *
 * Every entry was read off a real file in this tree, never invented. This list
 * grows when a new phrasing is found in the wild — the growth is the point. A
 * doc matching any of these is asserting present authority, and the repository
 * is not allowed to hold present authority: Drive is.
 */
const COMMANDING_PHRASES: readonly { readonly id: string; readonly re: RegExp }[] = [
  { id: "single-entry-point", re: /\bsingle entry point\b/i },
  { id: "entry-point-for-every-employee", re: /\bentry point for every ATH employee\b/i },
  { id: "read-before-doing-anything", re: /\bread it before doing anything\b/i },
  { id: "this-doc-wins-conflicts", re: /\bthis brief wins\b/i },
  { id: "claim-a-ticket-now", re: /^#+\s*Claim protocol\s*$/im },
];

describe("the repository front door may teach, but may not command", () => {
  it("ANTI-VACUITY: the scan sees a real README and a real operations tree", () => {
    // If a move or rename made these reads return nothing, every assertion
    // below would pass while checking zero bytes. That is precisely the
    // failure this file exists to prevent, so it must not be its own.
    const readme = readReadme();
    expect(readme.length, "README.md is empty or missing").toBeGreaterThan(2000);

    const docs = opsDocs();
    expect(docs.length, "docs/operations scan found nothing — did the directory move?")
      .toBeGreaterThanOrEqual(50);

    const marked = docs.filter(f => isMarkedHistorical(readOpsDoc(f)));
    expect(marked.length, "no doc carries the lineage marker — the stamp itself has drifted")
      .toBeGreaterThanOrEqual(8);
  });

  it("README routes to the CURRENT authority chain, in Drive", () => {
    const readme = readReadme();
    // The Drive front door, by name. A worker who reads only this file must
    // arrive at present authority without being coached.
    expect(readme).toMatch(/Above the Hill Canon — Master Index & Source of Truth/);
    expect(readme).toMatch(/ATH — CURRENT COMMAND CENTER — 2026-09-11/);
    expect(readme).toMatch(/ATH — FULL GARDEN PASS — 2026-09-11/);
    expect(readme).toMatch(/MEMORY MAY TEACH\. ONLY CURRENT AUTHORITY MAY COMMAND\./);
    // And the demotion of this repository's own operations folder, stated
    // where the worker actually starts rather than only inside the demoted
    // files themselves.
    expect(readme, "README must say docs/operations is lineage, not command")
      .toMatch(/docs\/operations\/[^\n]*HISTORICAL LINEAGE/);
  });

  it("README does not present a development URL as production", () => {
    const readme = readReadme();
    // localhost may appear — the dev instructions are legitimate and useful.
    // What may NOT happen is localhost standing where production proof stands.
    expect(readme).toMatch(/localhost:3000/); // the dev section still exists
    expect(readme, "localhost must be explicitly labelled development-only")
      .toMatch(/[Dd]evelopment only[^\n]*never production proof/);
    expect(readme, 'no "RIGHT NOW"-style heading may sit above a dev URL')
      .not.toMatch(/Access the App \(RIGHT NOW\)/i);
    // Production proof is a chain, and README must say so rather than naming
    // a single green URL as if it settled the question.
    expect(readme).toMatch(/[Rr]untime proof is a chain, not a noun/);
  });

  it("README does not present the RETIRED host as current production", () => {
    const readme = readReadme();
    expect(readme, "current production origin must be named").toMatch(/https:\/\/wealthymindsetspro\.com/);
    // Vercel may be NAMED — the retirement has to be explainable — but only as
    // the WILDCARD class `*.vercel.app`. A concrete hostname reads as somewhere
    // a worker can go, and that is exactly the GHOST_HOST mistake. Markdown
    // decoration (backticks, parens, punctuation) is stripped so the rule
    // judges the hostname rather than its formatting.
    for (const m of readme.matchAll(/[\w.*-]*vercel\.app/g)) {
      expect(m[0], `README still offers the concrete host "${m[0]}" as if reachable`)
        .toBe("*.vercel.app");
    }
    expect(readme, "the retirement must be stated, not merely implied")
      .toMatch(/Vercel is a RETIRED host/i);
  });

  it("every operations doc README mentions is already marked historical", () => {
    // Derived from README's real text. Add a link to a live-looking July doc
    // and this fails without anyone remembering to update a list.
    const readme = readReadme();
    const mentioned = new Set<string>();
    for (const m of readme.matchAll(/([A-Z0-9][A-Z0-9_\-.]*\.md)/g)) mentioned.add(m[1]);

    const present = opsDocs();
    const linked = [...mentioned].filter(f => present.includes(f));
    expect(linked.length, "README mentions no operations doc — has the demotion text been deleted?")
      .toBeGreaterThanOrEqual(4);

    for (const file of linked) {
      expect(
        isMarkedHistorical(readOpsDoc(file)),
        `README names docs/operations/${file}, but that file does not open with the ` +
          `historical-lineage marker — a worker following the link lands in undemoted July`,
      ).toBe(true);
    }
  });

  it("no operations doc still SPEAKS with current command authority", () => {
    // The real derivation: scan the prose, not a list. This is what catches a
    // door nobody thought to demote, including one written tomorrow.
    const offenders: string[] = [];
    for (const file of opsDocs()) {
      const body = readOpsDoc(file);
      if (isMarkedHistorical(body)) continue;
      const original = stripLineageBlock(body);
      for (const { id, re } of COMMANDING_PHRASES) {
        if (re.test(original)) offenders.push(`${file} (${id})`);
      }
    }
    expect(
      offenders,
      "these operations docs assert present command authority but carry no historical-lineage " +
        "marker; the repository may not hold current authority — Drive does",
    ).toEqual([]);
  });

  it("ANTI-VACUITY: the commanding-phrase scan is looking for something real", () => {
    // If the phrase list stopped matching anything anywhere, the test above
    // would be permanently green while enforcing nothing. Prove the patterns
    // still find the documents they were read off of — now demoted, so they
    // are skipped by the guard, but their text must still trip the patterns.
    let matched = 0;
    for (const file of opsDocs()) {
      const original = stripLineageBlock(readOpsDoc(file));
      if (COMMANDING_PHRASES.some(({ re }) => re.test(original))) matched++;
    }
    expect(matched, "no doc matches any commanding phrase — the patterns have gone stale")
      .toBeGreaterThanOrEqual(2);
  });
});
