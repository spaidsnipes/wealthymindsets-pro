/**
 * SENTINEL — the Steward reads the trader's rules, not the tape.
 *
 * H1, shape 2 (structural): an unobserved MARKET silencing an observable fact
 * about the PERSON. Third occurrence in this block, third room on the same
 * page. The Opening Bell (42b4106) and the Mirror (9bc3844) were the first two.
 *
 * The Steward block on /command-deck dereferences `permission` and `phase` and
 * nothing else. `permission` is compiled by composeMarketCanvasVM through an
 * explicit `chain: null` path, so it is ALWAYS defined. The `chainVm &&` gate
 * in front of it could never have been protecting a dereference — it was
 * deleting an honest verdict because a different domain was unreadable.
 *
 * And the verdict in that condition is the one worth reading:
 * DATA_QUALITY_FLOOR is a HARD rule, quality resolves to UNAVAILABLE with no
 * market state, the rule engages by name, and the Steward reads RESTRICTED.
 *
 * The outer "Deep read" drawer carried the same defect one level up: a
 * CONTAINER gated on one child's input erases every sibling with it.
 *
 * Over-corrections guarded below, because a wrong fix in either direction
 * would pass the defect assertions alone.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/**
 * A Sentinel that fails on its own honest prose is testing the wrong surface.
 * Strip block comments, JSX comments and line comments before asserting.
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("the Steward is not a market panel", () => {
  it("THE DEFECT: the Steward rules verdict is not gated behind market-state resolution", () => {
    const deck = codeOnly(read("src/app/command-deck/page.tsx"));
    // Anchored on the ORDINAL, not the heading text. The headings now live in
    // deckSectionIndex (one owner); a Sentinel that anchors on a label it does
    // not own is pinned to a spelling, not to a meaning.
    expect(deck).toMatch(/<SectionBanner number=\{4\}/);
    expect(deck).not.toMatch(/\{chainVm && \(\s*<div>\s*<SectionBanner number=\{4\}/);
  });

  it("THE DEFECT: the Deep read drawer is not gated behind market-state resolution", () => {
    const deck = codeOnly(read("src/app/command-deck/page.tsx"));
    expect(deck).toContain("Deep read · story · auction lens · decision chain · steward · fidelity");
    expect(deck).not.toMatch(/\{chainVm && \(\s*<details open=\{deckEmphasis\.deepSectionsOpen\}/);
  });

  it("the Steward block reads the trader's own rules — permission and phase, nothing else", () => {
    const deck = read("src/app/command-deck/page.tsx");
    // Slice anchor: the ordinal, which the page owns. The heading text moved
    // to deckSectionIndex.
    const start = deck.indexOf("<SectionBanner number={4}");
    const end = deck.indexOf("NECTAR / DATA FIDELITY", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = codeOnly(deck.slice(start, end));
    expect(block).toContain("permission.verdict");
    expect(block).toContain("permission.headline");
    expect(block).toContain("permission.reason");
    expect(block).not.toContain("chainVm");
  });

  it("the claim that permission survives a null chain is checked, not asserted", () => {
    // composeMarketCanvasVM must keep an explicit null-chain path, so that
    // `permission` is defined whether or not the market resolved. If this
    // stops being true, ungating the Steward stops being obviously correct.
    //
    // RE-ARGUED once, and this test is the reason it had to be.
    //
    // This assertion used to demand the exact spelling
    // `const permission: PermissionVM = selectPermission(`. The single-writer
    // fix changed it to `chain?.permission ?? selectPermission(` — the compiler
    // now defers to a chain that already compiled one rather than deriving a
    // rival answer. This test failed, correctly, and forced the re-argument:
    //
    //   `??` falls through on null/undefined, so the right-hand call still runs
    //   whenever the chain carries no permission — including when there is no
    //   chain at all. `permission` is still annotated `PermissionVM`, NOT
    //   `PermissionVM | null`, and tsc accepts it. There is no branch in which
    //   it is undefined. The Steward is still safe to render ungated.
    //
    // So the assertion now checks the INVARIANT — non-nullable type, plus a
    // reachable selectPermission fallback outside any `if (chain)` — rather
    // than one spelling of it. Narrowing it back to a literal would make this
    // Sentinel fail on correct refactors, which is how Sentinels get deleted.
    const compiler = codeOnly(read("src/lib/marketData/viewModels/composeMarketCanvasVM.ts"));
    expect(compiler).toMatch(/const chain: DecisionChainVM \| null/);
    // The non-nullable annotation is what the whole ungating rests on.
    expect(compiler).toMatch(/const permission: PermissionVM\s*=/);
    expect(compiler).not.toMatch(/const permission: PermissionVM \| null/);
    // selectPermission stays reachable as the fallback, whatever precedes it.
    expect(compiler).toMatch(/const permission: PermissionVM\s*=[\s\S]{0,120}selectPermission\(/);
    // permission is compiled unconditionally — not inside an `if (chain)`.
    const permIdx = compiler.indexOf("const permission: PermissionVM");
    const before = compiler.slice(0, permIdx);
    expect(before).not.toMatch(/if \(!?chain\)[^\n]*\{[^}]*$/);
  });

  it("the selector degrades honestly with no market rather than fabricating a verdict", () => {
    const sel = codeOnly(read("src/lib/traderMemory/viewModels/selectPermission.ts"));
    // Data quality names the absence rather than defaulting to "acceptable".
    expect(sel).toMatch(/input\.marketState\?\.qualityState \?\? "UNAVAILABLE"/);
    // R and CLC say they cannot evaluate rather than engaging on nothing.
    expect(sel).toContain("Cannot evaluate — conservative R unresolved");
    expect(sel).toContain("No CLC evaluation available.");
  });

  /**
   * RE-PINNED FROM A MEMBERSHIP LIST TO THE CRITERION ITSELF.
   *
   * This rule used to name three gates as examples of gates worth keeping:
   *
   *     expect(deck).toMatch(/\{chainVm && \(/);
   *     expect(deck).toMatch(/dlar=\{chainVm\.dlar\}/);
   *     expect(deck).toMatch(/\{chainVm && <StructureContextNote vm=\{chainVm\} \/>\}/);
   *     expect(deck).toMatch(/\{chainVm && \(\s*<ATHOSInterventionPanel/);
   *
   * The first three satisfy the rule's own stated criterion — they GENUINELY
   * DEREFERENCE `chainVm`, so removing the gate would crash them or would render
   * a market claim built from an unresolved market. The fourth never did.
   * `<ATHOSInterventionPanel>` is handed `athos.interventions` and touches
   * `chainVm` nowhere; the gate in front of it was deleting five statements
   * about the TRADER — including max-losses-reached — on exactly the sessions
   * where the tape could not be read. Same inversion as the Steward above.
   *
   * A rule that ENUMERATES its members cannot notice when a member stops
   * belonging. Worse, it actively obstructs: the honest fix could not be made
   * without this suite going red, and the cheapest way to quiet it was to put
   * the defect back. A rule whose cheapest cure is the disease is worse than
   * no rule.
   *
   * So the guardrail is kept and re-pinned to what the old form was reaching
   * for: EVERY surviving `chainVm &&` gate on the page must guard an expression
   * that actually dereferences `chainVm`. That is strictly stronger — it now
   * catches both directions. Strip a real gate and it goes red; add a decorative
   * one in front of a panel that never touches the chain and it goes red too.
   */
  it("OVER-CORRECTION: every surviving chainVm gate guards a real dereference", () => {
    const deck = codeOnly(read("src/app/command-deck/page.tsx"));

    // The two genuine dereferences that motivated the old rule. Kept as
    // explicit pins because they are the ones a careless "remove every gate"
    // sweep would crash.
    expect(deck).toMatch(/dlar=\{chainVm\.dlar\}/);
    expect(deck).toMatch(/\{chainVm && <StructureContextNote vm=\{chainVm\} \/>\}/);

    // …and now the criterion, checked rather than illustrated.
    const gates = [...deck.matchAll(/\{chainVm && [(<]/g)];
    expect(
      gates.length,
      "no `{chainVm && …}` gate remains on the deck — either the page was " +
        "rewritten or this rule has gone vacuous. Re-pin it, do not delete it.",
    ).toBeGreaterThan(0);

    for (const g of gates) {
      // The window starts AFTER the gate's own `chainVm`, so the gate cannot
      // satisfy itself. It is cut at the first memo dependency array, because
      // `}, [chainVm, …]` is a declaration of what a hook READS and would let
      // an unrelated gate borrow a neighbour's honesty.
      const after = deck.slice(g.index! + "{chainVm &&".length, g.index! + 400);
      const depsAt = after.indexOf("}, [");
      const guarded = depsAt === -1 ? after : after.slice(0, depsAt);
      expect(
        guarded,
        "a `{chainVm && …}` gate guards an expression that never consumes " +
          "`chainVm`. That gate is not protecting a market claim — it is " +
          "silencing something on a domain it does not depend on:\n\n" +
          guarded.slice(0, 200),
      ).toContain("chainVm");
    }
  });

  it("OVER-CORRECTION: the sections inside the drawer that ARE about the market stay withheld", () => {
    const deck = codeOnly(read("src/app/command-deck/page.tsx"));
    // Opening the container must not open its market-dependent children.
    expect(deck).toMatch(/element="THESIS_GEOMETRY"/);
    expect(deck).toMatch(/<SectionBanner number=\{2\}/);
    expect(deck).toMatch(/<SectionBanner number=\{3\}/);
    // Data Fidelity describes what WM witnessed — it stays gated on `state`.
    expect(deck).toMatch(/\{state && \(/);
  });

  it("OVER-CORRECTION: a refusal inside the drawer still carries its note", () => {
    const deck = read("src/app/command-deck/page.tsx");
    // The whole reason the container must not be gated is that a silent
    // refusal is indistinguishable from a bug. The note has to survive.
    expect(deck).toContain("withheldNote");
    expect(deck).toContain("are withheld until this session has produced something to read.");
  });
});
