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
    // Asserted on the SPECIFIER, not the whole import line: the shell now also
    // pulls `useCapitalReach` from the same module, and a test pinned to the
    // exact text of an import statement fails on every legitimate addition.
    expect(shell).toMatch(/import \{[^}]*\buseCapitalObservation\b[^}]*\} from "@\/lib\/experience\/useActiveScene"/);
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
    expect(paper).toMatch(/usePublishScene\("\/paper", sceneCompilation, paperReach\)/);
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

/**
 * ── CROSS-DEVICE REACH ───────────────────────────────────────────────────────
 *
 * The reduction this file was written to enforce created a NEW divergence the
 * moment it shipped: the rail reduces on the desktop that holds the book and
 * does not reduce on any other device the trader picks up, because the book is
 * in one browser's localStorage. Nothing on either screen said so.
 *
 * Known Holes Owned H16 and BUILD ORDER §22A both own the underlying gap and
 * both use the same words — "CROSS-DEVICE BLOCKED, not simulated parity" — and
 * the Master Index parity law is explicit that a limitation must be "explicit,
 * intentional and canonically owned, not accidental drift". The gap stays open
 * until a server-side position authority exists. What these tests protect is
 * that it can never be SILENT again.
 */
describe("cross-device reach — the limitation must be structural, not remembered", () => {
  it("the bus REQUIRES a reach on every publication", () => {
    // The teeth. If `reach` ever becomes optional, a future capital-owning
    // route can publish without answering the question and the divergence goes
    // quiet again — exactly how this one appeared.
    const bus = read("lib/experience/activeSceneBus.ts");
    expect(bus).toMatch(/readonly reach: CapitalReachVerdict;/);
    expect(bus).not.toMatch(/readonly reach\?:/);
    expect(bus).toMatch(/reach: CapitalReachVerdict,\s*\)/);
    expect(bus).not.toMatch(/reach\?: CapitalReachVerdict/);
  });

  it("the publish hook requires it too, positionally before the injectable bus", () => {
    const hook = read("lib/experience/useActiveScene.ts");
    expect(hook).toMatch(/reach: CapitalReachVerdict,\s*\n\s*bus: ActiveSceneBus = activeSceneBus/);
  });

  it("the paper store declares its OWN facts, next to its own writes", () => {
    /**
     * The facts live in paperTrade.ts, the module that calls localStorage, so
     * that a migration to a server store edits the persistence and the claim
     * about the persistence in one place. A facts table maintained in the UI
     * would survive the migration unchanged and start lying that day.
     */
    const store = read("lib/paperTrade.ts");
    expect(store).toMatch(/PAPER_STORE_FACTS/);
    expect(store).toMatch(/satisfies CapitalStoreFacts/);
    expect(store).toMatch(/medium: "BROWSER_LOCAL"/);
    // The one that must stay false until a real table exists. H16.
    expect(store).toMatch(/serverAuthority: null/);
  });

  it("no surface hand-writes a reach verdict instead of deriving one", () => {
    /**
     * The lie this design exists to prevent. `selectCapitalReach` cannot return
     * ALL_DEVICES without a named authority — but that guarantee is worth
     * nothing if a component can construct the verdict object literally. The
     * only file allowed to name the reach strings is the module that owns them,
     * plus tests.
     */
    const OWNER = resolve(SRC, "lib/experience/capitalReach.ts");
    for (const file of walk(SRC)) {
      if (file === OWNER) continue;
      if (/\.test\.tsx?$/.test(file)) continue;
      const src = readFileSync(file, "utf8");
      expect(
        src.includes('reach: "ALL_DEVICES"'),
        `${file} constructs an ALL_DEVICES verdict by hand instead of deriving it`,
      ).toBe(false);
      expect(
        src.includes('crossDeviceBlocked: false'),
        `${file} asserts cross-device parity by hand`,
      ).toBe(false);
    }
  });

  it("/paper derives its reach from the store rather than asserting one", () => {
    const paper = read(PAPER);
    expect(paper).toMatch(/import \{ selectCapitalReach \} from "@\/lib\/experience\/capitalReach"/);
    expect(paper).toMatch(/selectCapitalReach\(PAPER_STORE_FACTS\)/);
  });

  it("/paper SHOWS the note — deriving it and hiding it would be the same silence", () => {
    // The defect class this shift has now found six times: computed, announced,
    // obeyed by none. A reach on the bus that no surface prints is that shape
    // again with an extra module.
    const paper = read(PAPER);
    expect(paper).toMatch(/\{paperReach\.deviceNote\}/);
  });

  it("the /paper note is unconditional, not gated on an open position", () => {
    /**
     * A note that appeared only while a position was open would teach the
     * opposite of the truth: that a quiet screen means the devices agree. The
     * store's reach does not vary with the book, so neither may the sentence.
     * Asserted by absence: the note must not sit inside a SceneAdmits wrapper.
     */
    const paper = read(PAPER);
    const at = paper.indexOf("{paperReach.deviceNote}");
    expect(at).toBeGreaterThan(-1);
    const before = paper.slice(Math.max(0, at - 400), at);
    expect(before).not.toMatch(/<SceneAdmits/);
    expect(before).not.toMatch(/capitalAtRisk\s*&&/);
  });

  it("the shell says it too, in the same breath as the reduction", () => {
    /**
     * The reduction is what creates the divergence, so the reduction note is
     * where the disclosure belongs. Putting it anywhere else would let a
     * trader see the rail change without ever meeting the explanation.
     */
    const shell = read(SHELL);
    expect(shell).toMatch(/useCapitalReach/);
    const at = shell.indexOf("navEmphasis.reductionNote !== null");
    const block = shell.slice(at, at + 2000);
    expect(block).toMatch(/reach\.shellClause/);
  });

  it("the shell clause stays out of selectNavEmphasis", () => {
    /**
     * ADMISSION vs EMPHASIS. `selectNavEmphasis` answers "what does this MODE
     * emphasise" — a preference the human can click. Reach is capital
     * provenance, which no preference may touch. Routing it through that
     * selector would put a fact and a preference through one function, and its
     * own tests assert those never cross.
     */
    // Matched at IDENTIFIER level, not on the word: the module's prose
    // legitimately says "unreachable" about the drawer, and a test that a
    // comment may not use an English word is a test nobody can keep.
    const selector = read("lib/experience/selectNavEmphasis.ts");
    expect(selector).not.toMatch(/CapitalReach|selectCapitalReach|capitalReach/);
    expect(selector).not.toMatch(/\breach\s*[:.]/);
  });

  it("the reach note is not styled as an alarm", () => {
    // §9 again: nothing has failed. This is a designed boundary behaving as
    // built, and a permanent alarm is read as noise by the second day.
    const shell = read(SHELL);
    const at = shell.indexOf("reach.shellClause");
    const block = shell.slice(Math.max(0, at - 300), at + 300);
    expect(block).not.toMatch(/animate-pulse|#F0B429|amber|wm-red/i);
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
