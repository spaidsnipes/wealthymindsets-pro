import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/paper/page.tsx"),
  "utf8",
);

/**
 * /paper bot label Sentinel — AI AUTHORITY CREEP.
 *
 * The panel was titled "AI Trading Bot". Its entire decision is:
 *
 *   const sma = hist.slice(-20).reduce((s,v)=>s+v,0)/20;
 *   const dev = (px - sma) / sma;
 *   if (dev > 0.0012) side = "buy";
 *
 * A 20-period SMA deviation threshold. No model is called, nothing is inferred,
 * nothing is learned. Calling that AI invites the trader to trust it as
 * something cleverer than arithmetic — and this bot auto-submits orders.
 *
 * Same overreach already corrected in /journal, where "AI Strategy Coach"
 * became "Strategy Evidence Coach".
 */
describe("paper bot label truth", () => {
  it("no RENDERED label promises an AI engine that does not run", () => {
    // Scoped to JSX text, not the whole file: the fix comment quotes the old
    // label on purpose, and a Sentinel that forbids naming the defect would
    // punish documenting it.
    const rendered = page.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(rendered).not.toContain("AI Trading Bot");
    expect(rendered).not.toMatch(/>\s*AI [A-Z]/);
  });

  it("uses the honest name", () => {
    expect(page).toContain("Signal Bot");
    expect(page).toContain("function SignalBot({");
  });

  it("names the rule it actually applies", () => {
    expect(page).toContain("Deviation from a 20-period SMA");
    expect(page).toContain("no model runs");
  });

  it("the bot still calls no model service", () => {
    // If a real model is ever wired in, this Sentinel should be revisited
    // deliberately — not satisfied by renaming the panel back.
    const i = page.indexOf("function SignalBot(");
    expect(i).toBeGreaterThan(-1);
    expect(page.slice(i, i + 3000)).not.toMatch(/anthropic|openai|\/api\/ai\b/i);
  });
});
