import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * H4 call-site Sentinel for /paper Open Contracts.
 *
 * WHY THIS FILE EXISTS (§22 — a Sentinel that never fires is worthless):
 *
 * The defect it guards was not a wrong number. The panel had exactly ONE
 * session concept and it belonged to the stock, so the Close control read
 *
 *     disabled={!quoteReadiness[op.underlying]?.actionable}
 *
 * — the UNDERLYING being asked whether the CONTRACT could be closed. It
 * type-checked, it passed every unit test, and it was additionally DEAD
 * (`actionablePaperQuotePrice` returns non-null only when `actionable` is
 * true, so the branch already proved the flag). That combination is the
 * dangerous one: a guard that looks like the rule is handled, states the
 * wrong law, and cannot fail loudly enough to be noticed.
 *
 * Alongside it the sell-now mark — a Black-Scholes output — was rendered in
 * `font-mono font-bold text-wm-text`, the same weight and colour as a real
 * price, with the word "modelled" reachable only through a `title` tooltip.
 * H18: a modeled number may never masquerade as BID/ASK/LAST. A tooltip is
 * not a label, and on touch it does not exist at all.
 *
 * Unit tests prove selectOptionTradability CAN tell the truth. This proves
 * the screen actually ASKS it.
 */

const PAPER = resolve(__dirname, "..", "app", "paper", "page.tsx");

/** Blank out comments so prose about the defect cannot satisfy the check. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("H4 on /paper — the contract's clock is not the stock's", () => {
  const raw = readFileSync(PAPER, "utf8");
  const code = stripComments(raw);

  it("the Close control is never gated on the UNDERLYING's readiness", () => {
    // The exact regression, in the exact shape it shipped in.
    expect(code).not.toMatch(/disabled=\{!\s*quoteReadiness\[op\.underlying\]/);
    // And the general shape: no `disabled` on a control whose handler closes
    // an option position by id.
    expect(code).not.toMatch(/onClose\(op\.id[^)]*\)\}\s*disabled=/);
  });

  it("/paper consults the canonical contract-clock owner", () => {
    expect(code).toMatch(
      /import \{[^}]*\bselectOptionTradability\b[^}]*\} from "@\/lib\/marketData\/optionTradability"/,
    );
    expect(code).toMatch(/selectOptionTradability\(/);
  });

  it("does not re-derive tradability locally instead of asking the owner", () => {
    // §24 / H21 — one owner. A second hand-rolled verdict is how the first
    // one stops being true.
    expect(code).not.toMatch(/optionTradableNow\s*[:=]\s*["'`]/);
    expect(code).not.toMatch(/const\s+\w*[Tt]radable\w*\s*=\s*(true|false)\b/);
  });

  it("renders the contract-session verdict rather than swallowing it", () => {
    expect(code).toMatch(/contractTradability\.note/);
  });

  it("MODELED is a visible label ON THE MARK, not a tooltip (H18)", () => {
    // Written first as "the file contains MODELED outside a title", which was
    // worthless: the panel-level note "Marks below are MODELED" satisfied it
    // even with the per-row tag deleted. The number that masquerades is the
    // per-row one, so the assertion has to bind to THAT render.
    const withoutTitles = code.replace(/title=\{`[^`]*`\}/g, "").replace(/title="[^"]*"/g, "");
    const mark = withoutTitles.indexOf("fmt2(markBid)");
    expect(mark).toBeGreaterThan(-1);
    expect(withoutTitles.slice(mark, mark + 260)).toMatch(/MODELED/);
  });

  it("the panel also states the provenance once, in words", () => {
    // Belt and braces are not duplication here: the tag stops a single row
    // being misread in isolation, the sentence explains why every row carries
    // it. Neither one alone survives being scrolled or scanned.
    expect(code).toMatch(/Marks below are MODELED/);
  });

  it("the modeled mark is not styled as loud as a real price", () => {
    // §9 COLOR — the label must not be dressed in the identity metal or an
    // alarm colour. It is a provenance tag, not a warning and not a brand mark.
    const tag = code.match(/>\s*MODELED\s*</);
    expect(tag).not.toBeNull();
    const idx = code.indexOf("MODELED");
    const context = code.slice(Math.max(0, idx - 220), idx);
    expect(context).not.toMatch(/#d4af37|text-wm-gold|text-wm-red|text-wm-green/i);
  });

  it("never claims a paper close is a broker outcome", () => {
    expect(code).not.toMatch(/BROKER-WORKING|BROKER WORKING/i);
    // §8 forbidden vocabulary on founder UI.
    expect(code).not.toMatch(/\bCOMING SOON\b|\bNEEDS WIRING\b/i);
  });
});
