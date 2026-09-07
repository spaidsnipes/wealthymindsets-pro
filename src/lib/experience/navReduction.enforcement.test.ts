/**
 * "THE MOMENT CAPITAL IS LIVE, WM SHOULD REDUCE NAVIGATION."
 *
 * ── The defect class this file closes ────────────────────────────────────────
 *
 * Five times this shift, the same shape turned up: a verdict COMPUTED by one
 * module, ANNOUNCED by a second, and OBEYED by none.
 *
 *   1. ONE_STORY admitted by compileScene, ignored by the deck.
 *   2. SceneAdmissionPanel over-counting its own refusals.
 *   3. admitsAmbient computed on /command-deck, obeyed by nothing.
 *   4. admitsAmbient obeyed on /paper only after the Academy block was gated.
 *   5. THIS ONE, and the worst of the five:
 *        · `capitalAtRisk` — produced by compileScene, read by exactly ONE
 *          surface (SceneAdmissionPanel.tsx:261), which only PRINTS A SENTENCE
 *          ABOUT IT. No behaviour anywhere changed when money was exposed.
 *        · `selectNavEmphasis` — a whole module written to express this exact
 *          law, with a version stamp, a written doctrine and eight passing
 *          tests, imported by ZERO product files. The tests passed. The
 *          product did not do it.
 *
 * That second half is why the unit tests next door are not sufficient on their
 * own. `selectNavEmphasis.test.ts` was fully green for the entire period in
 * which the selector governed nothing. A test that a pure function returns the
 * right answer says nothing about whether anyone asked it the question. So
 * this file scans SOURCE for the wiring, which is the part that was missing.
 *
 * ── What is asserted, and why each one ───────────────────────────────────────
 *
 * It is a source scan and says so. It cannot prove pixels moved. What it CAN
 * prove is that every link in the chain exists and that no link can be quietly
 * cut later:
 *
 *   route publishes → bus carries → shell subscribes → rail filters → drawer
 *   receives → a sentence explains it
 *
 * The drawer link is the one worth stating plainly. Filtering the rail without
 * it would make Academy and Journal UNREACHABLE while a position is open —
 * trapping a trader inside a screen in order to "protect" them, which is a
 * worse failure than the noise it set out to fix. The founder UI Priority Lock
 * says no surface becomes unreachable; the test named `.withheld surfaces are
 * MOVED, never removed` is that lock, mechanised.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(__dirname, "..", "..");
const read = (p: string): string => readFileSync(resolve(SRC, p), "utf8");

const SHELL = "components/layout/MainLayout.tsx";
const PAPER = "app/paper/page.tsx";

describe("navigation reduction — the chain from a real book to a real rail", () => {
  it("the app shell IMPORTS the selector that was dead code", () => {
    // The single fact that was false before this atom. Everything else in the
    // chain was already written and already tested.
    const shell = read(SHELL);
    expect(shell).toMatch(/import \{ selectNavEmphasis \} from "@\/lib\/experience\/selectNavEmphasis"/);
    expect(shell).toMatch(/import \{ useCapitalObservation \} from "@\/lib\/experience\/useActiveScene"/);
  });

  it("the shell asks the selector using CAPITAL, not just a mode", () => {
    // v1's signature took a mode alone. A shell that called `selectNavEmphasis(mode)`
    // would type-check, pass every unit test, and reduce nothing forever.
    expect(read(SHELL)).toMatch(/selectNavEmphasis\(\s*experienceContext\.mode,\s*capital,\s*NAV_CORE\s*\)/);
  });

  it("the primary rail renders the FILTERED list, not the raw one", () => {
    /**
     * The exact line that makes this atom real. `NAV_CORE.map` inside the
     * <nav aria-label="Primary"> block is the pre-atom code; if a future edit
     * reverts it, the selector goes back to being decoration and every other
     * test in this repo still passes.
     */
    const shell = read(SHELL);
    const nav = shell.slice(shell.indexOf('<nav aria-label="Primary"'));
    const railBlock = nav.slice(0, nav.indexOf("</nav>"));
    expect(railBlock).toMatch(/railItems\.map\(/);
    expect(railBlock).not.toMatch(/NAV_CORE\.map\(/);
  });

  it("withheld surfaces are MOVED, never removed — the drawer receives them", () => {
    /**
     * Without this, the rail filter would strand Academy and Journal with no
     * route to them at all while a position is open. Reachability is not a
     * nicety here: the trader who most needs to check their journal rules is
     * the one currently holding risk.
     */
    const shell = read(SHELL);
    expect(shell).toMatch(/railWithheld\.length > 0[\s\S]{0,400}?NAV_CORE\.filter\(item => railWithheld\.includes\(item\.href\)\)/);
  });

  it("the reduction is announced in words, with a live region", () => {
    // §9: "…and a word." A rail that silently loses two items reads as a bug.
    const shell = read(SHELL);
    expect(shell).toMatch(/navEmphasis\.reductionNote !== null/);
    expect(shell).toMatch(/aria-live="polite"/);
  });

  it("the reduction note does not pulse and is not amber", () => {
    /**
     * §9 MOTION: "WAIT and CLOSED do not pulse." Nothing has failed when
     * navigation reduces — the product is working exactly as designed — so the
     * note must not borrow the vocabulary of an alarm. Amber is reserved for
     * PENDING or ESTIMATED; this is neither.
     */
    const shell = read(SHELL);
    const at = shell.indexOf("navEmphasis.reductionNote !== null");
    const block = shell.slice(at, at + 900);
    expect(block).not.toMatch(/animate-pulse/);
    expect(block).not.toMatch(/#F0B429|amber/i);
  });

  it("/paper publishes the scene it compiles", () => {
    const paper = read(PAPER);
    expect(paper).toMatch(/import \{ usePublishScene \} from "@\/lib\/experience\/useActiveScene"/);
    expect(paper).toMatch(/usePublishScene\("\/paper", sceneCompilation\)/);
  });

  it("/command-deck stays SILENT — it may not assert a safety it cannot see", () => {
    /**
     * The deck has no broker panel, so its capital column is permanently
     * UNOBSERVED. Publishing `capitalAtRisk: false` from it would produce
     * IDENTICAL behaviour today — and would be a false claim. A lie that costs
     * nothing now is the one that gets copied into the surface where it costs
     * something. §14.1: FLAT is a finding, never a default.
     */
    expect(read("app/command-deck/page.tsx")).not.toMatch(/usePublishScene/);
  });

  it("nothing outside the experience layer writes to the bus", () => {
    /**
     * §24: no seventh owner. The capital column belongs to compileScene; this
     * bus is a transport. If a component starts publishing a compilation it
     * assembled itself, capital truth has quietly acquired a second author.
     */
    const allowed = new Set([
      "src/lib/experience/useActiveScene.ts",
      "src/lib/experience/activeSceneBus.ts",
      "src/lib/experience/activeSceneBus.test.ts",
      "src/app/paper/page.tsx",
      "src/lib/experience/navReduction.enforcement.test.ts",
    ]);
    // Match WIRING, not prose. `selectNavEmphasis.ts` names the bus in its
    // doc comment to explain where its capital input comes from, and that is
    // documentation doing its job — not a second author of capital truth.
    const WIRED = /from\s+["'][^"']*activeSceneBus["']|usePublishScene\s*\(|\bnew ActiveSceneBus\s*\(/;
    const publishers = walk(SRC).filter(f => WIRED.test(readFileSync(f, "utf8")));
    const unexpected = publishers
      .map(f => f.slice(f.indexOf("src/")))
      .filter(f => !allowed.has(f));
    expect(unexpected).toEqual([]);
  });

  it("the two CapitalObservation vocabularies cannot drift apart", () => {
    /**
     * `selectNavEmphasis` deliberately re-declares the three states rather than
     * importing them, so the pure selector stays free of the React layer. That
     * is a real duplication and this is the seam that keeps it honest: adding a
     * fourth state on one side without the other fails here rather than
     * silently falling into a default branch.
     */
    const states = (src: string, name: string): readonly string[] => {
      const m = src.match(new RegExp(`type ${name}\\s*=\\s*([^;]+);`));
      return (m?.[1] ?? "").split("|").map(s => s.trim().replace(/"/g, "")).filter(Boolean).sort();
    };
    const hook = states(read("lib/experience/useActiveScene.ts"), "CapitalObservation");
    const pure = states(read("lib/experience/selectNavEmphasis.ts"), "NavCapitalObservation");
    expect(hook.length).toBe(3);
    expect(pure).toEqual(hook);
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}
