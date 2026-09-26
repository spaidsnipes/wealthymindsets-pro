/**
 * THE /charts PAPER LINE STATES PAPER MONEY — Garden 16 §17, 2026-09-26.
 *
 * Found in source (audit at 3ff5cd7): the paper-position price line printed
 * P&L at 1x ("LONG 1 · +$10" for one ES1! up 10 points — $500), had no word
 * PAPER beside "WEBULL COST", parsed `wm_paper_state` with a raw JSON.parse
 * that ignored /paper's RECOVERY REQUIRED barrier, and matched symbols with a
 * private norm()/USDT strip.
 *
 * The behaviour is pinned in src/lib/chart/paperPositionLines.test.ts. This
 * sentinel reads source (a breadcrumb, not a renderer) and pins that the chart
 * draws ONLY what that owner returns:
 *   - the book is read through `loadPaperSnapshot` (the book's own parser),
 *     never `JSON.parse` of the key;
 *   - lines and titles come from `selectPaperPositionLines` /
 *     `paperPositionLineTitle` — no P&L arithmetic, no private symbol rule;
 *   - the plan's receipt is published on the canvas;
 *   - a book in recovery puts the owner's words on the glass while the layer
 *     is on and the camera is live.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

function paperBlock(): string {
  const a = SRC.indexOf("Paper-trade position lines (native price lines + live P&L)");
  const b = SRC.indexOf("BROKER COST LINE (HOUSE PLAN bolt-on #6)", a);
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  return SRC.slice(a, b);
}

/** Executable code only — the docblock is allowed to quote the old defect. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("/charts paper line — one owner per fact", () => {
  it("marks money only against a price observed for THIS symbol — never the seed, never the last symbol's print", () => {
    const b = code(paperBlock());
    // Verifier RED, reproduced on the glass 2026-09-26: after TSLA -> ES1! with
    // no ES bars the line read "PAPER SHORT 1 · +$275,894.50" (ES marked at
    // TSLA's 372.11); on a fresh mount it was marked at getBase's 7,595 seed.
    expect(b).toContain("const lp = obs && obs.symbol === symbol ? obs.px : 0;");
    expect(b).not.toMatch(/const lp = lastPrice/);
    expect(b).not.toMatch(/barsRef\.current\[barsRef\.current\.length - 1\]\.close/);
    expect(b).toContain("if (!paperLinesRef.current.length || !obs || obs.symbol !== symbol || !(obs.px > 0)) return;");
    // Every setter of the price also stamps the symbol it was observed for.
    const setters = [...code(SRC).matchAll(/setLastPrice\(/g)].length;
    const stamps = [...code(SRC).matchAll(/observedPxRef\.current = \{ symbol, px: /g)].length;
    expect(setters).toBe(3);
    expect(stamps).toBe(setters);
  });

  it("imports the book's parser and the paper-line owner", () => {
    expect(SRC).toContain('import { loadPaperSnapshot, PAPER_KEY } from "@/lib/paperTrade";');
    expect(SRC).toMatch(/import \{ PAPER_BOOK_RECOVERY_WORDS, paperPositionLineTitle, selectPaperPositionLines, type PaperPositionLine \} from "@\/lib\/chart\/paperPositionLines";/);
  });

  it("reads the book through its own parser — no raw JSON.parse of wm_paper_state anywhere in the chart", () => {
    expect(code(paperBlock())).toContain("const plan = selectPaperPositionLines(loadPaperSnapshot(), symbol);");
    expect(code(SRC)).not.toMatch(/localStorage\.getItem\("wm_paper_state"\)/);
    expect(code(paperBlock())).not.toContain("JSON.parse(");
    expect(code(paperBlock())).toContain("if (e.key === PAPER_KEY) bump();");
  });

  it("draws only the owner's lines, with the owner's words", () => {
    const b = code(paperBlock());
    expect(b).toContain('if (plan.status !== "DRAWN") return;');
    expect(b).toContain("plan.lines.forEach(pos => {");
    expect(b).toContain("const { up, text } = paperPositionLineTitle(pos, lp);");
    expect(b).toContain("const { up, text } = paperPositionLineTitle(pos, obs.px);");
    // The words are the overlay's (priceLineWordsOnGlass.sentinel): the native
    // line carries the owner's empty title, the text rides to the overlay.
    expect(b).toContain("title: PRICE_LINE_NATIVE_TITLE,");
    expect(b).toContain('priceLineWordsRef.current.paper.push({ kind: "PAPER", price: pos.avgPx, text, ink: paperColor(up) });');
  });

  it("no P&L arithmetic, point value or symbol rule lives in the chart", () => {
    const b = code(paperBlock());
    expect(b).not.toMatch(/\(lp - avgPx\) \* qty|\(lp - \w+\.avgPx\)/);
    expect(b).not.toMatch(/contractMultiplier|CONTRACT_MULTIPLIERS/);
    expect(b).not.toMatch(/const norm\s*=|const bse\s*=|USDT\|USDC\|USD\|PERP/);
  });

  it("the replay guard is unchanged and the receipt is published before it", () => {
    const b = code(paperBlock());
    const receipt = b.indexOf('cv.dataset.paperLines = !paperTradesVisible ? "OFF" : replayCameraOn ? "REPLAY_WITHHELD"');
    const guard = b.indexOf("if (!series || !paperTradesVisible || replayCameraOn) return;");
    expect(receipt).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(receipt);
    expect(b).toContain("if (cv) cv.dataset.paperLines = plan.receipt;");
  });

  it("a book in recovery says so on the glass, in the owner's words", () => {
    const b = code(paperBlock());
    const flag = b.indexOf('setPaperBookRecovery(plan.status === "RECOVERY_REQUIRED");');
    const drawnOnly = b.indexOf('if (plan.status !== "DRAWN") return;');
    expect(flag).toBeGreaterThan(-1);
    // Before the DRAWN-only return (verifier YELLOW, 2026-09-26): below it, a
    // book in recovery would never raise the notice and the empty chart would
    // read as "no open paper positions".
    expect(drawnOnly, "the recovery flag must be set before the DRAWN-only return").toBeGreaterThan(flag);
    const chip = /\{paperTradesVisible && paperBookRecovery && !replayCameraOn && \([\s\S]{0,700}?\{PAPER_BOOK_RECOVERY_WORDS\}[\s\S]{0,40}?<\/div>/.exec(SRC);
    expect(chip, "recovery words not rendered").not.toBeNull();
    expect(chip![0]).toContain('role="status"');
    expect(chip![0]).toContain('data-testid="paper-book-recovery"');
  });
});
