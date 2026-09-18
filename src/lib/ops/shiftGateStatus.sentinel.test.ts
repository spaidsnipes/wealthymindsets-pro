/**
 * SENTINEL — a shift gate may not point at nothing, and may not be undated.
 *
 * WHY THIS FILE EXISTS
 *
 * The standing ATHOS WM Pro shift prompt carries a list of "remaining gates".
 * That list is retyped from shift to shift, by hand, from memory, and nothing
 * checks it against the repo. On 2026-09-18 two of its entries were measured
 * and found ALREADY CLOSED — Delta Bubbles level ownership (an extraction plus
 * an adoption sentinel, 18 tests green) and the Live VP render geometry proof
 * (a browser-canvas pixel reader that is green AND falsifiable five ways).
 *
 * Nothing was wrong with the code. THE LIST HAD DRIFTED FROM IT.
 *
 * This is the same disease `viewBuildOrder.sentinel.test.ts` was written for,
 * one level up: there it was WHICH VIEW to build next, here it is WHICH GATE is
 * still open. Both are work-lists, and a work-list nobody can check is a
 * CONVENTION. The wrong answer it produces is not a broken pixel — it is a whole
 * shift spent re-proving something already true, and it leaves no trace, because
 * re-opened work is indistinguishable from progress until the shift is over.
 *
 * WHAT THIS SENTINEL CAN AND CANNOT SEE
 *
 * It is a SOURCE-TEXT assertion over a table in a document. It CANNOT witness:
 *
 *   · whether a CLOSED gate's instrument actually still passes — only running
 *     it proves that, which is why every CLOSED row must name the command
 *   · whether a MEASURED date is honest — nothing here can check that
 *   · whether an OPEN gate is genuinely open, or closed and not yet noticed.
 *     THAT IS THE EXACT DRIFT THAT PROMPTED THIS FILE AND IT IS NOT STATICALLY
 *     DECIDABLE. What this file can do is force each row to be DATEABLE and to
 *     name a real owner, so the next reader has something to re-measure instead
 *     of a sentence to believe.
 *
 * It closes three things that ARE checkable, and each is a failure this repo has
 * actually shipped:
 *
 *   1. A gate naming an owner path that does not exist — a gate pointing at a
 *      renamed or deleted file can never be closed or re-opened; it just sits
 *      there looking like work.
 *   2. An undated status. A status with no date cannot go stale, it can only be
 *      quietly wrong, because "true today" and "true in September and never
 *      revisited" read identically.
 *   3. A BLOCKED row that does not name its blocker, or a CLOSED row that does
 *      not name something runnable. Either is an assertion dressed as a finding.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DOC_REL = "docs/operations/CANON-SHIFT-GATE-STATUS.md";

function docSource(): string {
  return readFileSync(path.join(ROOT, DOC_REL), "utf8");
}

interface GateRow {
  gate: string;
  state: string;
  owner: string;
  measured: string;
  evidence: string;
}

/** Parse the fenced GATE-STATUS table. Returns [] when the block is absent, so
 *  the ripeness test below reports that rather than a parse throw. */
function gateRows(src: string): GateRow[] {
  const block = src.match(
    /<!--\s*GATE-STATUS:BEGIN\s*-->([\s\S]*?)<!--\s*GATE-STATUS:END\s*-->/,
  );
  if (!block) return [];
  const rows: GateRow[] = [];
  for (const line of block[1].split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    // A markdown row is ["", gate, state, owner, measured, evidence, ""].
    if (cells.length < 7) continue;
    const [, gate, state, owner, measured, evidence] = cells;
    if (!gate || gate === "GATE" || /^-+$/.test(gate)) continue;
    rows.push({ gate, state, owner, measured, evidence });
  }
  return rows;
}

/** Backtick-quoted repo paths. Deliberately requires a slash and an extension,
 *  so prose like `sealDecision` is not mistaken for a file. */
function ownerPaths(owner: string): string[] {
  return [...owner.matchAll(/`([^`]+\/[^`]+\.[a-z]+)`/g)].map((m) => m[1]);
}

const STATES = ["CLOSED", "OPEN", "BLOCKED"];

describe("shift gate status (Sentinel)", () => {
  it("the document it polices exists, is non-trivial, and still claims gate authority", () => {
    // FALSE_RIPENESS guard. A deleted, emptied or renamed document would make
    // every assertion below pass over an empty array — the vacuous green this
    // codebase has shipped for real. It must also still SAY it is the authority,
    // because that claim is the only reason the gate is worth its weight.
    const src = docSource();
    expect(src.length, DOC_REL).toBeGreaterThan(1500);
    expect(src, `${DOC_REL} no longer claims gate-list authority`).toMatch(
      /reads the gate list HERE, not from the shift prompt/i,
    );
    expect(gateRows(src).length, "GATE-STATUS table rows").toBeGreaterThanOrEqual(5);
  });

  it("every row uses a state the document defines", () => {
    const bad = gateRows(docSource())
      .filter((r) => !STATES.includes(r.state))
      .map((r) => `${r.gate} → "${r.state}"`);
    expect(
      bad,
      `these rows use a state outside ${STATES.join(" / ")}. An undefined ` +
        `state means the reader invents what it implies:\n  ${bad.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every gate names at least one owner path, and every named path exists", () => {
    // THE ASSERTION THAT PAYS FOR THIS FILE. A gate whose owner was renamed or
    // deleted can never be closed OR re-opened — nobody can find the thing it
    // is about, so it survives every shift untouched while looking like work.
    const offences: string[] = [];
    for (const row of gateRows(docSource())) {
      const paths = ownerPaths(row.owner);
      if (paths.length === 0) {
        offences.push(`${row.gate} — names no owner path at all`);
        continue;
      }
      for (const p of paths) {
        if (!existsSync(path.join(ROOT, p))) {
          offences.push(`${row.gate} — owner \`${p}\` does not exist`);
        }
      }
    }
    expect(
      offences,
      `${DOC_REL} names owners that cannot be found. A gate pointing at ` +
        `nothing is unfalsifiable and unclosable:\n  ${offences.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every gate carries a measured date", () => {
    // A STATUS WITH NO DATE CANNOT GO STALE; IT CAN ONLY BE WRONG QUIETLY.
    // This does not check the date is honest — nothing here can. It checks the
    // claim is DATEABLE, which is what lets a later reader distrust it.
    const undated = gateRows(docSource())
      .filter((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.measured))
      .map((r) => `${r.gate} → "${r.measured}"`);
    expect(
      undated,
      `these gates state a status with no measured date, so a reader cannot ` +
        `tell current from inherited:\n  ${undated.join("\n  ")}`,
    ).toEqual([]);
  });

  it("a CLOSED gate names something runnable", () => {
    // CLOSED is the only state that credits work as done. It is therefore the
    // only one that can waste a shift by being wrong in the comfortable
    // direction, so it carries the heavier burden: name the command, so the
    // next reader re-measures in one line instead of taking the row on trust.
    const bare = gateRows(docSource())
      .filter((r) => r.state === "CLOSED")
      .filter((r) => !/\b(npm run|vitest|node|npx)\b/.test(r.evidence))
      .map((r) => r.gate);
    expect(
      bare,
      `these gates are credited CLOSED but name nothing to run. A closure ` +
        `nobody can reproduce is an assertion:\n  ${bare.join("\n  ")}`,
    ).toEqual([]);
  });

  it("a BLOCKED gate names its blocker", () => {
    // "Blocked" with no named blocker is the most durable status in software:
    // it cannot be disproved, so it is never revisited. Naming the blocker is
    // what makes it possible to notice the day it stops being true.
    const vague = gateRows(docSource())
      .filter((r) => r.state === "BLOCKED")
      .filter((r) => !/BLOCKED BY:/.test(r.evidence))
      .map((r) => r.gate);
    expect(
      vague,
      `these gates claim BLOCKED without naming the blocker, so nobody can ` +
        `tell when it lifts:\n  ${vague.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every row's evidence is substantive, not a restatement of the state", () => {
    const thin = gateRows(docSource())
      .filter((r) => r.evidence.length < 40)
      .map((r) => `${r.gate} (${r.evidence.length} chars)`);
    expect(
      thin,
      `these rows state a gate status with nothing to check it against:\n  ` +
        thin.join("\n  "),
    ).toEqual([]);
  });
});
