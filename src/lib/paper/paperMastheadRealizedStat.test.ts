import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { paperMastheadRealizedStat } from "./paperAccountStats";

/**
 * H1 IN THE MASTHEAD — the law was learned on /paper and never carried here.
 *
 * `HeaderPnL` draws realized paper P&L above EVERY room. It decided for itself
 * what that figure was allowed to claim:
 *
 *     const val = pnl ?? 0;
 *     const up = val >= 0;
 *     <span className={up ? "text-wm-green" : "text-wm-red"}>
 *
 * Three defects, all of them already named elsewhere in this repo:
 *
 *   1. AN UNTRADED BOOK CLAIMED A RESULT. `trades: []` sums to zero, `0 >= 0`
 *      is true, so a book never put to work rendered a GREEN +$0.00 with a
 *      green border. Identical to the /paper strip defect, on a surface with
 *      far more reach than the page it was fixed on.
 *   2. THE FILE'S PROSE CONTRADICTED ITS CODE. Its own header promised "it
 *      renders NOTHING rather than zero" on a parse failure; `?? 0` printed a
 *      confident zero built from bytes it could not read.
 *   3. UNREADABLE AND ABSENT WERE ONE STATE. Both collapsed to `null` and both
 *      printed $0.00, though they are different facts with different remedies.
 *
 * These tests drive the OWNER, not the markup — behaviour cannot be satisfied
 * by punctuation, which is the mistake the /paper Sentinel had to be rescued
 * from. The final test is a repo-wide sweep, because the whole reason this
 * defect existed is that the previous guard named ONE FILE.
 */

describe("H1 in the masthead: the same law, one owner", () => {
  it("THE DEFECT: an untraded book prints its zero and takes no win tint", () => {
    const s = paperMastheadRealizedStat({ unreadable: false, tradeCount: 0, realizedPnl: 0 })!;
    expect(s.tone).not.toBe("WIN");
    expect(s.tone).toBe("NEUTRAL");
    // THE OVER-CORRECTION, pre-empted: the figure is a measured fact and stays.
    expect(s.kind).toBe("MEASURED");
    expect(s.value).toBe("+$0.00");
    expect(s.value).not.toBe("—");
    expect(s.reason).toMatch(/no win tint/i);
  });

  it("a real result earns its tint in BOTH directions", () => {
    const win = paperMastheadRealizedStat({ unreadable: false, tradeCount: 3, realizedPnl: 250 })!;
    const loss = paperMastheadRealizedStat({ unreadable: false, tradeCount: 3, realizedPnl: -250 })!;
    expect(win.tone).toBe("WIN");
    expect(win.value).toBe("+$250.00");
    expect(loss.tone).toBe("LOSS");
    expect(loss.value).toBe("-$250.00");
  });

  it("a book that TRADED and finished flat is a true result, not a silence", () => {
    // The question is never "is the number zero" — it is "was anything traded".
    const flat = paperMastheadRealizedStat({ unreadable: false, tradeCount: 4, realizedPnl: 0 })!;
    expect(flat.value).toBe("+$0.00");
    expect(flat.kind).toBe("MEASURED");
    expect(flat.reason).not.toMatch(/No paper trades have been closed/);
  });

  it("unreadable bytes say UNKNOWN — never a confident zero", () => {
    const s = paperMastheadRealizedStat({ unreadable: true, tradeCount: 0, realizedPnl: 0 })!;
    expect(s.value).toBe("UNKNOWN");
    expect(s.kind).toBe("UNKNOWN");
    expect(s.tone).toBe("ALERT");
    expect(s.value).not.toContain("0.00");
  });

  it("no stored book at all renders NOTHING — absence is not a zero", () => {
    expect(paperMastheadRealizedStat(null)).toBeNull();
  });

  it("every state carries a reason a human can read", () => {
    for (const book of [
      { unreadable: false, tradeCount: 0, realizedPnl: 0 },
      { unreadable: false, tradeCount: 2, realizedPnl: 99 },
      { unreadable: true, tradeCount: 0, realizedPnl: 0 },
    ]) {
      const s = paperMastheadRealizedStat(book)!;
      expect(s.reason.length).toBeGreaterThan(40);
    }
  });
});

/**
 * THE SWEEP — because the guard that missed this one named a file.
 *
 * `anUntradedBookHasNoPnl.enforcement.test.ts` reads `src/app/paper/page.tsx`
 * and nothing else, so it was green and blind for as long as a second surface
 * existed. This sweep asks the question of the whole tree instead: does any
 * component decide a PAPER P&L tint from the sign of the number?
 */
const SRC = resolve(__dirname, "..", "..");
const SELF = resolve(__dirname, "paperMastheadRealizedStat.test.ts");
const OWNER = resolve(__dirname, "paperAccountStats.ts");

function sweptFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { sweptFiles(full, acc); continue; }
    if (!/\.tsx?$/.test(full)) continue;
    if (full === SELF || full === OWNER) continue;
    acc.push(full);
  }
  return acc;
}

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
function codeOf(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const FILES = sweptFiles(SRC);

describe("the masthead law is swept, not located", () => {
  it("the sweep is not vacuous", () => {
    // A sweep that silently covered zero files reports a clean bill of health
    // forever. This is the same census the geometry harnesses now carry.
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES).toContain(resolve(SRC, "components", "layout", "HeaderPnL.tsx"));
  });

  it("any surface tinting a paper P&L must first ask whether anything was traded", () => {
    /*
     * The law is stated POSITIVELY, which matters. "No file may tint on a sign"
     * would be false — /paper/page.tsx legitimately reads `dayPnl>=0` AFTER
     * `bookNeverTraded` has already claimed the untraded case, and that is the
     * reference-correct shape. The invariant is not the absence of a sign test;
     * it is the PRESENCE of the traded-or-not question in front of it.
     *
     * Stated this way the guard also survives a rewrite: any new surface may
     * reach for the sign, as long as it has asked the prior question first.
     */
    const SIGN_TINT = /\b\w*(?:[Pp]nl|[Rr]ealized)\w*\s*>=\s*0\s*\?\s*"text-wm-green"/;
    const ASKED = /[Nn]everTraded|paperMastheadRealizedStat|paperAccountStats/;
    const offenders: string[] = [];
    for (const file of FILES) {
      const code = codeOf(file);
      if (!code.includes("wm_paper_state")) continue;
      if (SIGN_TINT.test(code) && !ASKED.test(code)) offenders.push(file.slice(SRC.length + 1));
    }
    expect(
      offenders,
      "a paper P&L tinted from the sign of the number alone paints an UNTRADED book green — " +
        "`0 >= 0` is true, so the tint is arithmetically earned and factually a lie. Ask " +
        "whether anything was ever traded first, or delegate to paperAccountStats.",
    ).toEqual([]);
  });

  it("REVIVE CONTROL: the sweep's own predicates each fire on a synthetic offender", () => {
    // A sweep whose regex has drifted matches nothing and reports clean forever.
    const SIGN_TINT = /\b\w*(?:[Pp]nl|[Rr]ealized)\w*\s*>=\s*0\s*\?\s*"text-wm-green"/;
    const ASKED = /[Nn]everTraded|paperMastheadRealizedStat|paperAccountStats/;
    const shipped = `const c = realizedPnl >= 0 ? "text-wm-green" : "text-wm-red";`;
    expect(SIGN_TINT.test(shipped)).toBe(true);
    expect(ASKED.test(shipped)).toBe(false);
    // and the reference-correct shape is NOT an offender
    expect(ASKED.test(`bookNeverTraded ? "muted" : ${shipped}`)).toBe(true);
  });

  it("HeaderPnL delegates and keeps no `?? 0` fallback", () => {
    const code = codeOf(resolve(SRC, "components", "layout", "HeaderPnL.tsx"));
    expect(code).toContain("paperMastheadRealizedStat(");
    // `pnl ?? 0` was the line that contradicted this file's own header prose.
    // `const val = pnl ?? 0` was the line that contradicted this file's own
    // header prose. The per-trade `t.pnl ?? 0` inside the sum is a different
    // thing and is left alone here.
    expect(code).not.toMatch(/=\s*pnl\s*\?\?\s*0/);
    expect(code).not.toMatch(/val\s*>=\s*0/);
  });

  it("every colour in the masthead chip is chosen by TONE, not by a sign", () => {
    /*
     * Found by revive-attempt. Reinstating the shipped defect fired only the
     * `?? 0` check above — the GREEN itself, which was the actual lie, walked
     * straight back in under a locally-named `up`. A guard that catches the
     * arithmetic and not the claim is guarding the wrong half again, which is
     * exactly the mistake the /paper Sentinel had to be rescued from.
     *
     * So the assertion is about WHO DECIDES: the win colours may appear only in
     * an expression that reads `stat.tone`. Any other predicate — `up`, a sign
     * test, a truthiness check — cannot satisfy this.
     */
    const code = codeOf(resolve(SRC, "components", "layout", "HeaderPnL.tsx"));
    const GREENS = [...code.matchAll(/text-wm-green|rgba\(0,212,170/g)];
    expect(GREENS.length).toBeGreaterThan(0);
    for (const g of GREENS) {
      const before = code.slice(Math.max(0, g.index! - 80), g.index!);
      expect(
        before,
        `a win colour at offset ${g.index} is not governed by stat.tone — ` +
          "an untraded book goes green again the moment a sign test decides this",
      ).toMatch(/stat\.tone\s*===\s*"WIN"\s*\?\s*"?$/);
    }
  });
});
