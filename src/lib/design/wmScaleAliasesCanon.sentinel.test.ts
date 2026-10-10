/**
 * The Tailwind `wm` scale's canonical aliases stay equal to their owner
 * (house pass 2026-10-10).
 *
 * `ivory`, `ivory-body`, `brass`, `brass-mark`, `ok`, `watch` and `warn` were
 * added so class-written rooms (first: /readiness, which painted itself in
 * Tailwind's neutral / emerald / amber / rose) can speak the sanctuary palette.
 * They are copies by value of `wmTokens.ts`; this sentinel is what keeps them
 * copies rather than a third palette. It also pins /readiness off the raw
 * Tailwind palettes it was repaired from.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WM } from "./wmTokens";

const ROOT = resolve(__dirname, "../../..");

function wmScale(): Record<string, string> {
  const src = readFileSync(resolve(ROOT, "tailwind.config.ts"), "utf8");
  expect(src.length).toBeGreaterThan(500);
  const block = src.match(/\bwm:\s*\{([\s\S]*?)\n\s*\},/);
  expect(block, "wm scale not found in tailwind.config.ts").not.toBeNull();
  const out: Record<string, string> = {};
  for (const [, key, hex] of block![1].matchAll(/["']?([a-z-]+)["']?:\s*["'](#[0-9a-fA-F]{3,8})["']/g)) {
    out[key] = hex.toLowerCase();
  }
  return out;
}

const ALIASES: Readonly<Record<string, string>> = {
  ivory: WM.text.hero,
  "ivory-body": WM.text.body,
  brass: WM.gold.line,
  "brass-mark": WM.gold.mark,
  ok: WM.state.ok,
  watch: WM.state.watch,
  warn: WM.state.warn,
};

describe("wm scale aliases are the canonical owner's values", () => {
  it("each alias equals its wmTokens.ts value", () => {
    const scale = wmScale();
    for (const [key, canon] of Object.entries(ALIASES)) {
      expect(scale[key], `wm.${key}`).toBe(canon.toLowerCase());
    }
  });

  it("/readiness speaks the sanctuary palette, not Tailwind's raw ones", () => {
    const src = readFileSync(resolve(ROOT, "src/app/readiness/page.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(5000);
    expect(src).not.toMatch(/\b(?:text|bg|border|ring|from|to|outline)-(?:neutral|emerald|amber|rose|slate|gray|zinc)-\d{2,3}\b/);
    expect(src).toMatch(/text-wm-ivory\b/);
    expect(src).toMatch(/wm-ok\b/);
  });
});
