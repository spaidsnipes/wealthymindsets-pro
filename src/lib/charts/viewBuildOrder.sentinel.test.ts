/**
 * SENTINEL — the build order must not drift from the code it orders.
 *
 * WHY THIS FILE EXISTS
 *
 * `docs/operations/CANON-VIEW-BUILD-ORDER-2026-09-17.md` opens by telling every
 * agent who picks up this shift to read it FIRST. That makes it load-bearing:
 * it is not a note, it is the instruction that decides what gets worked on.
 *
 * On 2026-09-18 an operator did exactly that, believed it, and spent three
 * atoms re-opening work that had already shipped. Delta Bubbles ownership and
 * VP geometry both already had adoption Sentinels. Asset 05 — listed in that
 * file as the next thing to build — was already a live tab on production,
 * rendering `LARGE PRINTS · 6 cleared the cut` on BTC with its own cut
 * methodology printed on the surface.
 *
 * NOTHING WAS WRONG WITH THE CODE. The list had drifted from it.
 *
 * That is the same failure this repo closed twice on the same day in
 * `measuredNumber.ts`: a question re-decided at every site, by hand, from
 * memory. A work-list retyped at the start of each shift is a CONVENTION, and
 * the wrong decision it produces is not a broken pixel — it is a whole shift
 * spent re-proving something that was already true. That is more expensive than
 * a formatting bug and it leaves no trace, because re-opened work looks exactly
 * like work.
 *
 * WHAT THIS SENTINEL CAN AND CANNOT SEE
 *
 * This is a SOURCE-TEXT assertion over a machine-readable table in a document.
 * It is strictly weaker than observing a rendered view on live tape. It CANNOT
 * witness:
 *
 *   · whether a SHIPPED view actually renders anything honest — the view's own
 *     tests and a live observation are the authority for that
 *   · whether the EVIDENCE column's commit SHAs are real
 *   · prose elsewhere in the document contradicting the table
 *
 * It closes ONE thing, which is the thing that actually cost a shift: the
 * document cannot claim a view is still TO-BUILD once that view is in the
 * dropdown, and a view cannot be added to the dropdown without being recorded
 * here. Either drift fails BY NAME.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { ALL_CATEGORY_TABS, MICROSTRUCTURE_TABS } from "./categoryTabsFor";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DOC_REL = "docs/operations/CANON-VIEW-BUILD-ORDER-2026-09-17.md";

function docSource(): string {
  return readFileSync(path.join(ROOT, DOC_REL), "utf8");
}

interface StatusRow {
  tab: string;
  state: string;
  evidence: string;
}

/** Parse the fenced VIEW-STATUS table. Returns [] when the block is absent, so
 *  the ripeness test below is what reports that rather than a parse throw. */
function statusRows(src: string): StatusRow[] {
  const block = src.match(
    /<!--\s*VIEW-STATUS:BEGIN\s*-->([\s\S]*?)<!--\s*VIEW-STATUS:END\s*-->/,
  );
  if (!block) return [];
  const rows: StatusRow[] = [];
  for (const line of block[1].split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    // A markdown row is ["", tab, state, evidence, ""].
    if (cells.length < 5) continue;
    const [, tab, state, evidence] = cells;
    if (!tab || tab === "VIEW TAB" || /^-+$/.test(tab)) continue;
    rows.push({ tab, state, evidence });
  }
  return rows;
}

describe("view build order (Sentinel)", () => {
  it("the document it polices exists, is non-trivial, and still claims first-read authority", () => {
    // FALSE_RIPENESS guard. A deleted, emptied or renamed document would make
    // every assertion below pass over an empty array — the classic vacuous
    // green. It must also still SAY it is read first, because that claim is the
    // only reason this gate is worth its weight.
    const src = docSource();
    expect(src.length, DOC_REL).toBeGreaterThan(2000);
    expect(src, `${DOC_REL} no longer claims first-read authority`).toMatch(
      /reads THIS FILE FIRST/i,
    );
    expect(statusRows(src).length, "VIEW-STATUS table rows").toBeGreaterThanOrEqual(4);
  });

  it("every view the document calls SHIPPED is really in the dropdown", () => {
    const shipped = statusRows(docSource()).filter((r) => r.state === "SHIPPED");
    const phantom = shipped
      .map((r) => r.tab)
      .filter((t) => !(ALL_CATEGORY_TABS as readonly string[]).includes(t));
    expect(
      phantom,
      `${DOC_REL} claims these views are SHIPPED but they are not in ` +
        `ALL_CATEGORY_TABS. A document that credits work nobody can reach is ` +
        `worse than one that omits it:\n  ${phantom.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the document cannot list a view as still-to-build once it is in the dropdown", () => {
    // THE ASSERTION THAT PAYS FOR THIS FILE. This is the exact drift that sent
    // an operator to rebuild Asset 05 while it was already serving live tape.
    const unbuilt = statusRows(docSource()).filter((r) => r.state !== "SHIPPED");
    const alreadyThere = unbuilt
      .filter((r) => (ALL_CATEGORY_TABS as readonly string[]).includes(r.tab))
      .map((r) => `${r.tab} (documented ${r.state})`);
    expect(
      alreadyThere,
      `${DOC_REL} still lists these as work to be done, but they are already ` +
        `in ALL_CATEGORY_TABS. An agent reading this file first will re-open ` +
        `shipped work, and re-opened work is indistinguishable from progress ` +
        `until the shift is over:\n  ${alreadyThere.join("\n  ")}`,
    ).toEqual([]);
  });

  it("a new microstructure view cannot ship without being recorded here", () => {
    // The omission direction. Adding a fifth view to the strip and forgetting
    // the document is the silent half of the same drift, and it is how the
    // document became wrong in the first place.
    const recorded = new Set(statusRows(docSource()).map((r) => r.tab));
    const unrecorded = (MICROSTRUCTURE_TABS as readonly string[]).filter(
      (t) => !recorded.has(t),
    );
    expect(
      unrecorded,
      `these microstructure views exist in code but appear nowhere in the ` +
        `VIEW-STATUS table of ${DOC_REL}. The next agent will read that file, ` +
        `not this one, and will not know they are built:\n  ${unrecorded.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every recorded row names evidence, not just a state", () => {
    // A state with no evidence is an assertion; the whole point of the table is
    // that a reader can check it without re-deriving it.
    const bare = statusRows(docSource())
      .filter((r) => r.evidence.length < 8)
      .map((r) => r.tab);
    expect(
      bare,
      `these rows state a build status with no evidence to check it ` +
        `against:\n  ${bare.join("\n  ")}`,
    ).toEqual([]);
  });
});
