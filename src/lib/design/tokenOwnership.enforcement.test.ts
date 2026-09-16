import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { WM, wmContrast } from "./wmTokens";

/**
 * TOKEN OWNERSHIP — the duplicate-visual-brain sentinel.
 *
 * ── The finding ──────────────────────────────────────────────────────────────
 *
 * WM Pro has TWO colour owners, and they disagree.
 *
 *   `src/lib/design/wmTokens.ts`   — the canonical one. Near-black surfaces,
 *                                    IVORY information, restrained BRASS
 *                                    structure. This is the sanctuary.
 *
 *   `tailwind.config.ts`           — the `wm.*` scale. Near-black surfaces,
 *                                    SLATE-BLUE information (#E8EDF3 /
 *                                    #8B95A5 / #5A6575), neutral-grey
 *                                    structure (#222222 / #2D3748).
 *
 * The second one is not a leftover. Measured at the commit that added this
 * file, it paints roughly 3,300 class instances: 1,599 `text-wm-text`,
 * 554 `border-wm-border`, 328 `bg-wm-surface`, plus the semantic scales. The
 * IVORY system is the minority. `body` inherits `#E8EDF3`, so the product's
 * default text colour is slate-white on every route, including the ones whose
 * page files have since been migrated.
 *
 * That is why migrating individual routes (/login, /heatmaps) removed the
 * slate palette from those FILES without removing it from those SCREENS. The
 * page-level work was real, and it was treating a symptom.
 *
 * ── Why this file fences rather than fixes ───────────────────────────────────
 *
 * Reconciling the two owners repaints the entire product in one commit. The
 * room interiors are behind client-side auth, so that change cannot be visually
 * verified here — and a whole-product repaint that nobody has SEEN is precisely
 * the kind of thing "repo green is not enough" exists to stop. The
 * reconciliation is therefore left as an explicit, evidenced decision.
 *
 * What this file does is make the wound impossible to hide and impossible to
 * widen: the divergence is named, the current shape is pinned, and any NEW
 * foreign colour added to the Tailwind scale fails CI. Healing is not hiding
 * the wound.
 *
 * ── The reconciliation map, for whoever closes this ──────────────────────────
 *
 * Structural neutrals are near-identical in luminance and are the safe half:
 *
 *     wm.black   #000000  →  WM.surface.deepest  #050506
 *     wm.dark    #0A0A0A  →  WM.surface.deep     #0b0b0d
 *     wm.surface #111111  →  WM.surface.mid      #131317
 *     wm.card    #161616  →  WM.surface.raised   #1c1c22
 *     wm.muted   #2D3748  →  WM.surface.raised   #1c1c22   (drops the blue)
 *     wm.border  #222222  →  WM.border.line
 *     wm.text    #E8EDF3  →  WM.text.hero        #ede6d3
 *     wm.text-muted #8B95A5 → WM.text.muted      #8a8271
 *     wm.text-dim   #5A6575 → WM.text.muted      #8a8271   ← DONE, see below
 *     wm.gold    #F0B429  →  WM.gold.hero        #d4af37
 *
 * The semantic hues (green/red direction, blue/purple categorical) are a
 * SEPARATE decision with separate evidence and are not part of that map.
 *
 * ── One entry has since been closed, and why it jumped the queue ──────────────
 *
 * `wm.text-dim` is no longer slate. It was the only entry in that map whose
 * CURRENT value is an accessibility defect rather than a style disagreement:
 * #5A6575 measured 3.55 / 3.35 / 3.19 / 3.06 / 2.69 / 2.03 against this scale's
 * own six surfaces — below AA everywhere, and below even the 3:1 non-text floor
 * on two. 622 class instances carried text in it. Leaving it pinned as "known
 * debt" would have made this sentinel the thing keeping an unreadable colour
 * alive, which is the opposite of its job.
 *
 * Note the row above is NOT the mapping originally written here. The original
 * said `wm.text-dim → WM.text.dim`, matching the two bottom rungs by NAME. That
 * was wrong, and it was wrong for a reason worth keeping: `WM.text.dim` is
 * itself non-text (see TEXT_ON_SURFACE in wmTokens.ts). Mapping a bottom rung to
 * a bottom rung would have carried the defect across the reconciliation intact.
 * Rungs must be matched by MEASURED LEGIBILITY, not by position in the ramp.
 */

const TAILWIND = resolve(__dirname, "../../../tailwind.config.ts");

/** Parse the `wm: { … }` block out of the Tailwind config. */
function tailwindWmScale(): Record<string, string> {
  const src = readFileSync(TAILWIND, "utf8");
  const block = src.match(/\bwm:\s*\{([\s\S]*?)\n\s*\},/);
  if (!block) throw new Error("wm scale not found in tailwind.config.ts");
  const out: Record<string, string> = {};
  for (const [, key, hex] of block[1].matchAll(/["']?([a-z-]+)["']?:\s*["'](#[0-9a-fA-F]{3,8})["']/g)) {
    out[key] = hex.toLowerCase();
  }
  return out;
}

/** Every hex the canonical owner actually owns. */
function canonHexes(): ReadonlySet<string> {
  const out = new Set<string>();
  const walk = (node: unknown) => {
    if (typeof node === "string") {
      for (const hex of node.match(/#[0-9a-f]{3,8}/gi) ?? []) out.add(hex.toLowerCase());
      return;
    }
    if (node && typeof node === "object") Object.values(node).forEach(walk);
  };
  walk(WM);
  return out;
}

/**
 * The divergence as it stands. Every entry here is a known debt, not an
 * approval. Shrinking this list is progress; growing it fails the suite below.
 */
const KNOWN_DIVERGENCE: Readonly<Record<string, string>> = {
  black: "#000000",
  dark: "#0a0a0a",
  surface: "#111111",
  card: "#161616",
  border: "#222222",
  muted: "#2d3748",
  gold: "#f0b429",
  "gold-dim": "#b8860b",
  green: "#00d4aa",
  "green-dim": "#00a888",
  red: "#ff4d6a",
  "red-dim": "#cc2040",
  blue: "#4fa3e0",
  purple: "#8b5cf6",
  text: "#e8edf3",
  "text-muted": "#8b95a5",
  // "text-dim" was here. It is now WM.text.muted, so it is no longer foreign
  // and no longer belongs in this list. Do not re-add it.
};

describe("token ownership — two colour owners, one of them undeclared", () => {
  it("still has exactly the divergence that was measured and recorded", () => {
    const scale = tailwindWmScale();
    const canon = canonHexes();
    const foreign = Object.fromEntries(
      Object.entries(scale).filter(([, hex]) => !canon.has(hex)),
    );

    // Not `toEqual(KNOWN_DIVERGENCE)` in the loose sense — the point is that a
    // NEW foreign colour cannot be slipped into the scale without a human
    // deciding to record it here, and that entries which get reconciled are
    // noticed rather than silently re-added later.
    expect(
      foreign,
      "The Tailwind `wm` scale diverged from wmTokens.ts in a way this sentinel " +
        "has not recorded. If you reconciled a colour, delete its line from " +
        "KNOWN_DIVERGENCE. If you ADDED one, stop: that is a third palette.",
    ).toEqual(KNOWN_DIVERGENCE);
  });

  it("names the canonical owner so there is no ambiguity about which wins", () => {
    // If Tailwind ever starts importing the token file, the divergence becomes
    // structurally impossible and this whole sentinel can be deleted. Until
    // then, the config must not pretend to be the source of truth.
    const src = readFileSync(TAILWIND, "utf8");
    expect(src).toMatch(/wmTokens|NOT the canonical|canonical colour owner/i);
  });

  it("keeps the canonical owner free of the slate family", () => {
    // The repair direction is one-way. Slate must never be promoted INTO the
    // sanctuary to make the two owners agree cheaply.
    const canon = canonHexes();
    for (const slate of ["#e8edf3", "#8b95a5", "#5a6575", "#2d3748", "#070a0f"]) {
      expect(canon.has(slate), `${slate} was promoted into wmTokens.ts — wrong direction`).toBe(false);
    }
  });
});

/**
 * The second owner is not canonical, but it is the one actually painting most
 * of the product. Until it is reconciled it must still be MEASURED, or "not
 * canonical" quietly becomes "not accountable".
 */
describe("the second owner's text ramp must still be legible", () => {
  /** The four backgrounds that actually carry page and card content. */
  const CONTENT_SURFACES = ["black", "dark", "surface", "card"] as const;
  /**
   * `border` (#222222, 15 bg uses) and `muted` (#2D3748, 8 bg uses) are bars
   * and chips. They are named, not excused — a text rung that fails on them is
   * recorded here rather than rounded off.
   */
  const CHIP_SURFACES = ["border", "muted"] as const;
  const TEXT_KEYS = ["text", "text-muted", "text-dim"] as const;

  it("clears AA for every text rung on every content surface", () => {
    const scale = tailwindWmScale();
    for (const t of TEXT_KEYS) {
      for (const s of CONTENT_SURFACES) {
        const r = wmContrast(scale[t], scale[s]);
        expect(
          r,
          `text-wm-${t} on bg-wm-${s} is ${r.toFixed(2)}:1. This scale paints most of ` +
            `the product; a rung that fails here fails on real screens. Raise the ` +
            `rung toward the canonical ramp — do not darken the surface to hide it.`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps that ramp monotonic, so the names still describe the colours", () => {
    // text > text-muted > text-dim. `text-dim` now borrows the canonical
    // `muted` value, which is BRIGHTER than the slate it replaced — so this
    // asserts the fix did not push the bottom rung past the one above it.
    const scale = tailwindWmScale();
    const ordered = TEXT_KEYS.map(t => wmContrast(scale[t], scale.black));
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i], `wm.${TEXT_KEYS[i]} must be dimmer than wm.${TEXT_KEYS[i - 1]}`)
        .toBeLessThan(ordered[i - 1]);
    }
  });

  it("records exactly which rung/chip pairs still miss AA", () => {
    // Deliberately an equality, not a "should be empty". These two are open
    // debt carried on purpose; the assertion exists so the list cannot GROW
    // and cannot shrink by accident without someone noticing.
    const scale = tailwindWmScale();
    const misses: string[] = [];
    for (const t of TEXT_KEYS) {
      for (const s of CHIP_SURFACES) {
        if (wmContrast(scale[t], scale[s]) < 4.5) misses.push(`${t} on ${s}`);
      }
    }
    expect(misses).toEqual([
      "text-muted on muted",
      "text-dim on border",
      "text-dim on muted",
    ]);
  });

  it("has no call site hand-rolling the retired slate bottom rung", () => {
    // #5A6575 also appeared as a raw literal outside the Tailwind scale — in
    // ATHOS's "Quiet" verdict, in SmartMoney's `neutral` signal, and on a
    // radio-mode tab. The first two are ABSENCE statements ("we observed and
    // found nothing"), which is exactly the case that must stay readable.
    const offenders: string[] = [];
    const root = resolve(__dirname, "../..");
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) {
          if (entry !== "node_modules") walk(p);
          continue;
        }
        if (!/\.tsx?$/.test(entry)) continue;
        if (p.startsWith(resolve(__dirname))) continue; // the design system may discuss itself
        // Comments are blanked rather than dropped, so line numbers in the
        // failure message still point at the real file. Prose recording WHY
        // the colour was retired is not a use of it.
        readFileSync(p, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "))
          .replace(/(^|[^:])\/\/.*$/gm, (_m, lead) => lead)
          .split("\n")
          .forEach((line, i) => {
            if (/#5A6575/i.test(line)) offenders.push(`${p.slice(root.length + 1)}:${i + 1}`);
          });
      }
    };
    walk(root);

    expect(
      offenders,
      "#5A6575 measures 2.03–3.55:1 against this product's surfaces — below AA " +
        "everywhere and below the 3:1 non-text floor on two. Use WM.text.muted.",
    ).toEqual([]);
  });
});
