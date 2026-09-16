import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { WM } from "./wmTokens";

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
 *     wm.text-dim   #5A6575 → WM.text.dim        #55503f
 *     wm.gold    #F0B429  →  WM.gold.hero        #d4af37
 *
 * The semantic hues (green/red direction, blue/purple categorical) are a
 * SEPARATE decision with separate evidence and are not part of that map.
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
  "text-dim": "#5a6575",
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
