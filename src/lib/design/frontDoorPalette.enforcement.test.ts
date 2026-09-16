import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { WM } from "./wmTokens";

/**
 * FRONT DOOR PALETTE — F9 sentinel.
 *
 * `/login` is the first screen a trader ever sees and the only one they see
 * before they are a customer. It was never migrated onto the design system: it
 * carried a private slate-blue/teal palette (#070A0F, #0A0F17, #8B95A5,
 * #C5CDD8, #5A6575, #3A4250) and used #00D4AA — `wm-green`, a MARKET SEMANTIC
 * token — as its identity accent, including a green shield on the security
 * chip.
 *
 * Two canon rules were being broken at once:
 *
 *   §9  "GOLD is identity metal only. NO GREEN SHIELD." Green on the door makes
 *       a pre-attentive safety claim before any truth has been evaluated.
 *   The token law in `wmTokens.ts` — a surface that mints its own palette is a
 *       second visual brain, and it drifts from the first one silently.
 *
 * This file is the F9 half of the cutover: it proves the superseded experience
 * CANNOT QUIETLY GROW BACK. Migrating the route is reversible by one careless
 * paste; this test is not.
 *
 * It deliberately does NOT assert on the canonical hex values that appear in
 * Tailwind arbitrary-value classes (`text-[#ede6d3]`, `placeholder-[#55503f]`).
 * Those are WM token VALUES — Tailwind class strings cannot interpolate the
 * token object — so they are checked for membership in `WM`, not banned.
 */

const LOGIN = resolve(__dirname, "../../app/login/page.tsx");

/** The private palette this route used to mint for itself. */
const FOREIGN_PALETTE = [
  "#070A0F",
  "#0A0F17",
  "#8B95A5",
  "#C5CDD8",
  "#5A6575",
  "#3A4250",
  "#0F1620",
  "#1A2330",
] as const;

/** Market-semantic greens. None of them may be identity metal on the door. */
const GREEN = /(?:wm-green|emerald|#00D4AA|#00A888|#00C853|#00E060|#00A844|#22c55e|#16a34a|#0e9f6e|#21F3A3|#5cb85c)/i;

function code(): string {
  // Prose may DISCUSS the old palette — the docstring names every colour it
  // removed, and that record is the evidence, not the defect. Only values count.
  return readFileSync(LOGIN, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every hex literal WM legitimately owns, lowercased. */
function wmValues(): ReadonlySet<string> {
  const out = new Set<string>();
  const walk = (node: unknown) => {
    if (typeof node === "string") {
      const m = node.match(/#[0-9a-f]{3,8}/gi);
      if (m) for (const hex of m) out.add(hex.toLowerCase());
      return;
    }
    if (node && typeof node === "object") Object.values(node).forEach(walk);
  };
  walk(WM);
  return out;
}

describe("front door palette — the superseded door cannot grow back", () => {
  it("mints no private palette of its own", () => {
    const src = code();
    for (const hex of FOREIGN_PALETTE) {
      expect(src.toLowerCase(), `/login re-introduced the private palette colour ${hex}`)
        .not.toContain(hex.toLowerCase());
    }
  });

  it("carries no market-semantic green as identity metal", () => {
    // §9: no green shield. The door has evaluated nothing yet, so it may not
    // make a safety claim in the one colour that reads as "safe" pre-attentively.
    expect(code()).not.toMatch(GREEN);
  });

  it("uses only colour values the design system owns", () => {
    const owned = wmValues();
    const used = code().match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    const foreign = [...new Set(used.map(h => h.toLowerCase()))].filter(h => !owned.has(h));

    expect(
      foreign,
      `/login paints ${foreign.join(", ")}, which is not in WM. Add it to wmTokens.ts ` +
        `if it is genuinely canonical, or use an existing token — do not fork the palette.`,
    ).toEqual([]);
  });

  it("actually imports the token owner, rather than copying values out of it", () => {
    const src = readFileSync(LOGIN, "utf8");

    expect(src).toMatch(/import\s*\{\s*WM\s*\}\s*from\s*["']@\/lib\/design\/wmTokens["']/);
    // A handful of Tailwind arbitrary values is unavoidable; a file that has
    // drifted back to hardcoding would show far fewer token references.
    expect((src.match(/\bWM\.[a-z]+\.[a-zA-Z]+/g) ?? []).length).toBeGreaterThan(30);
  });
});
