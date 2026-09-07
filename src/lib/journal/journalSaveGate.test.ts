import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * CALL-SITE SENTINEL — /journal must ASK before it writes.
 *
 * WHY THIS FILE EXISTS (§22 — a Sentinel that never fires is worthless):
 *
 * computePnl.test.ts proves `selectJournalPricing` CAN tell the truth. It
 * cannot prove the Save button asks it. That gap is precisely how the original
 * defect survived: the modal's live Realized-R tile was ALREADY honest —
 *
 *     if (!(entryV > 0 && exitV > 0 && sizeV > 0))
 *       return <span>Awaiting entry/exit/size</span>
 *
 * — while `saveEntry`, rendered a few hundred lines below it, took the same
 * form and wrote pnl 0 -> result "be" -> realizedR 0.00R into the journal.
 * A screen that is honest on display and fabricating on write is worse than
 * one that is uniformly wrong, because the trader has already been shown the
 * correct answer and reasonably assumes it was the one saved.
 *
 * So the law is not "the page contains a check". It is "the WRITE consults the
 * one owner, and the refusal is legible without a pointing device".
 */

const JOURNAL = resolve(__dirname, "..", "..", "app", "journal", "page.tsx");

/** Blank out comments so prose about the defect cannot satisfy the check. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("/journal — a trade that cannot be priced is never written down", () => {
  const code = stripComments(readFileSync(JOURNAL, "utf8"));

  it("consults the canonical pricing owner rather than re-deriving the rule", () => {
    expect(code).toMatch(
      /import \{[^}]*\bselectJournalPricing\b[^}]*\} from "@\/lib\/journal\/computePnl"/,
    );
    expect(code).toMatch(/selectJournalPricing\(\{/);
  });

  it("passes the day model, so an M0 no-trade record is still savable", () => {
    // Canon §3 M0 hides entry/exit/size on purpose. If the page forgot to pass
    // this, the gate would silently block a legitimate reflective record — a
    // fix that creates a new dead end is not a fix.
    expect(code).toMatch(/isNoTradeDay:\s*form\.dayModel === "M0"/);
  });

  it("THE DEFECT: the WRITE refuses, not merely the button", () => {
    // A disabled attribute is a courtesy. saveEntry is reachable by other
    // paths, and the guard has to live where the fabrication happened.
    const start = code.indexOf("const saveEntry = () => {");
    expect(start).toBeGreaterThan(-1);
    const head = code.slice(start, start + 400);
    expect(head).toMatch(/if \(formPricing\.status === "UNPRICEABLE"\) return;/);
    // And it must be the FIRST thing the handler does — after `const e = {...}`
    // the entry object already exists and a later `return` invites a partial
    // write to creep in above it.
    expect(head.indexOf("UNPRICEABLE")).toBeLessThan(head.indexOf("const e = {"));
  });

  it("the control is disabled too, so the refusal is not a silent no-op", () => {
    // Handler-only refusal would mean a trader presses a live-looking button
    // and nothing happens at all — which reads as a broken product and teaches
    // them to press it harder.
    expect(code).toMatch(/disabled=\{formPricing\.status === "UNPRICEABLE"\}/);
  });

  it("the reason is readable TEXT, never only a title tooltip", () => {
    // H18's lesson applied to a second surface: a tooltip is not a label, and
    // on the founder-path phone it does not exist at all.
    expect(code).toMatch(/\{formPricing\.note\}/);
    expect(code).not.toMatch(/title=\{formPricing\.note\}/);
    // The note must render as element content, not as an attribute value.
    const noteAt = code.indexOf("{formPricing.note}");
    const before = code.slice(Math.max(0, noteAt - 400), noteAt);
    expect(before).toMatch(/role="alert"/);
  });

  it("the page does not keep a second, hand-rolled copy of the rule", () => {
    // §24 / H21 — one owner. The live R tile's own `entryV > 0 && exitV > 0`
    // check is allowed to stay (it answers a different question: can R be
    // SHOWN), but a second verdict about whether the trade is SAVABLE is how
    // the first one stops being true.
    expect(code).not.toMatch(/const\s+\w*[Uu]npriceable\w*\s*=\s*!?\(/);
    expect(code).not.toMatch(/canSave\s*=\s*(true|false)\b/);
  });

  it("never dresses an unfinished form as a failure (§8)", () => {
    const noteAt = code.indexOf("{formPricing.note}");
    const region = code.slice(Math.max(0, noteAt - 600), noteAt + 200);
    expect(region).not.toMatch(/\bERROR\b|\bINVALID\b|\bFAILED\b/);
    // §9: a held control is quiet. It is not an alarm and not the identity
    // metal — nothing is wrong, the form is simply not finished.
    expect(region).not.toMatch(/text-wm-red|#d4af37|text-wm-gold/);
  });
});
