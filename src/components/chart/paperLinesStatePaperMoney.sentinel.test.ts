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
    expect(b).toContain("const { up, text } = paperPositionLineTitle(pos, lastPrice);");
    expect(b).toMatch(/title: text,/);
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
    expect(code(paperBlock())).toContain('setPaperBookRecovery(plan.status === "RECOVERY_REQUIRED");');
    const chip = /\{paperTradesVisible && paperBookRecovery && !replayCameraOn && \([\s\S]{0,700}?\{PAPER_BOOK_RECOVERY_WORDS\}[\s\S]{0,40}?<\/div>/.exec(SRC);
    expect(chip, "recovery words not rendered").not.toBeNull();
    expect(chip![0]).toContain('role="status"');
    expect(chip![0]).toContain('data-testid="paper-book-recovery"');
  });
});
