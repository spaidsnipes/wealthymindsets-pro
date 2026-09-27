/**
 * GARDEN 16 §46 · EVERY SETTINGS SWITCH HAS A READER — 2026-09-27.
 *
 * Founder Tour on serving (46f5a11b): header › Settings offered ten switches
 * that wrote `wm_settings` and that no code read — Auto-save Journal, Paper
 * Trade Warnings, Confirm Order Submissions, Price Level Alerts, News &
 * Events, Win Rate Warning, Overtrading Alert, FOMO Entry Detection, In-App
 * Notifications and Two-Factor Auth (a security switch that secured nothing).
 * They were withdrawn. A switch comes back when something reads it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "src");
const PANEL = "src/components/layout/shellPanels.tsx";
const panel = readFileSync(path.join(process.cwd(), PANEL), "utf8");

const walk = (d: string): string[] => readdirSync(d).flatMap(n => {
  const p = path.join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
});
const readers = walk(ROOT).filter(p => !p.endsWith("shellPanels.tsx")).map(p => readFileSync(p, "utf8")).join("\n");

const switches = [...panel.matchAll(/<Toggle label="[^"]+" on=\{(\w+)\}/g)].map(m => m[1]);

describe("Settings switches", () => {
  it("the panel still offers switches (positive control)", () => {
    expect(switches).toEqual(expect.arrayContaining(["darkMode", "showPnl", "soundOn"]));
  });

  it("every offered switch's wm_settings key is read outside the panel", () => {
    for (const k of switches) expect(readers, `Settings offers ${k} but nothing reads it`).toMatch(new RegExp(`\\.${k}\\b`));
  });

  it("the withdrawn switches stay withdrawn", () => {
    for (const k of ["autoSave", "paperWarn", "confirmOrders", "priceAlert", "newsAlert", "wrAlert", "overtrading", "fomoDetect", "inAppNotifs", "twoFactor"]) {
      expect(switches).not.toContain(k);
    }
  });

  it("the subscription row does not claim a status nothing measured", () => {
    expect(panel).not.toContain("PRO — Active");
  });
});
