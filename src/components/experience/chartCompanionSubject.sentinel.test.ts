/**
 * SENTINEL — ChartCompanion's SUBJECT contract (§8 Companion Camera Law).
 *
 * The companion may follow the room-shared camera (SymbolContext) or be
 * pointed at an explicitly named subject — but the two call sites must not
 * drift into each other's mode, because each mode is a law:
 *
 *   /news    mounts `<ChartCompanion />` with NO symbol prop. News holds
 *            the SAME camera as /charts; naming a subject there would fork
 *            the room identity into a second opinion.
 *
 *   /scanner mounts `<ChartCompanion symbol={selected.symbol} />`. The
 *            scanner's selected ROW is an inspected object, not the room
 *            camera — if selecting a row wrote SymbolContext, browsing the
 *            results table would silently re-aim every other room. The
 *            explicit prop is what keeps row selection a READ.
 *
 * These are source-shape assertions on purpose: a render test would need
 * the full provider stack and would still pass if someone re-pointed the
 * scanner mount at activeSymbol — the exact regression this file exists
 * to stop. If one of these greps fails, the contract moved: update BOTH
 * the call site reasoning above and this sentinel together, not just one.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string): string =>
  readFileSync(join(process.cwd(), rel), "utf8");

describe("ChartCompanion subject contract", () => {
  it("ChartCompanion accepts an OPTIONAL explicit symbol and falls back to the room camera", () => {
    const src = read("src/components/experience/ChartCompanion.tsx");
    // The prop exists and is optional…
    expect(src).toMatch(/symbol:\s*explicitSymbol\s*\}\s*:\s*\{\s*symbol\?\:\s*string\s*\}/);
    // …and the fallback order is explicit-first, room-camera second. A
    // reversed order would make the prop decorative and the sentinel moot.
    expect(src).toMatch(/explicitSymbol\s*\?\?\s*activeSymbol/);
  });

  it("/news follows the room-shared camera — no explicit subject", () => {
    const src = read("src/app/news/page.tsx");
    expect(src).toMatch(/<ChartCompanion\s*\/>/);
    expect(src).not.toMatch(/<ChartCompanion\s+symbol=/);
  });

  it("/scanner names the selected row as the subject — never the room camera", () => {
    const src = read("src/app/scanner/page.tsx");
    expect(src).toMatch(/<ChartCompanion\s+symbol=\{selected\.symbol\}\s*\/>/);
    // A bare mount here would silently switch the panel to activeSymbol,
    // showing whatever the last /charts visit looked at beside an
    // unrelated selected row — a mislabeled reading, not a bug cosmetic.
    expect(src).not.toMatch(/<ChartCompanion\s*\/>/);
  });

  it("selecting a scanner row does not WRITE the room camera", () => {
    const src = read("src/app/scanner/page.tsx");
    // setActiveSymbol is reserved for the explicit door ("Open Chart"),
    // where leaving for /charts SHOULD carry the camera. Row selection
    // (setSelected) must never appear in the same handler as a camera
    // write — that pairing is the regression this guard names.
    expect(src).not.toMatch(/setSelected\([^)]*\)[^}]*setActiveSymbol/);
    expect(src).not.toMatch(/setActiveSymbol[^}]*setSelected\(/);
  });
});
