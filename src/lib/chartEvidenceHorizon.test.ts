import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const chart = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/MainChart.tsx"),
  "utf8",
);
const vault = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/NectarVaultChip.tsx"),
  "utf8",
);

describe("desktop chart evidence horizon", () => {
  it("keeps live and retained evidence on one desktop horizon", () => {
    expect(chart).toContain('className="wm-live-session-chip"');
    expect(chart).toContain('top: 42, left: "50%"');
    expect(vault).toContain('className="wm-nectar-vault-chip"');
    expect(css).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*?\.wm-nectar-vault-chip\s*\{[\s\S]*?top: 42px !important;/,
    );
    expect(css).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*?\.wm-nectar-vault-chip\s*\{[\s\S]*?right: auto !important;[\s\S]*?left: calc\(50% \+ 156px\) !important;/,
    );
  });

  it("retires both persistent desktop card shells without removing either owner", () => {
    expect(vault).toContain('className="wm-nectar-vault-chip__summary"');
    const desktop = css.match(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(desktop).toMatch(/\.wm-live-session-chip\s*\{[\s\S]*?border: 0 !important;/);
    expect(desktop).toMatch(/\.wm-live-session-chip\s*\{[\s\S]*?box-shadow: none !important;/);
    expect(desktop).toMatch(/\.wm-nectar-vault-chip__summary\s*\{[\s\S]*?border: 0 !important;/);
    expect(desktop).toMatch(/\.wm-nectar-vault-chip__summary\s*\{[\s\S]*?box-shadow: none !important;/);
    expect(desktop).toContain("border-bottom: 1px solid");
  });

  it("does not move the retained-evidence disclosure into the phone override", () => {
    const phone = css.match(/@media \(max-width: 480px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(phone).not.toContain("wm-nectar-vault-chip");
  });

  it("preserves both canonical evidence owners", () => {
    expect(chart).toContain("getSessionNectarSnapshot()");
    expect(vault).toContain("getKnownSessionSymbols()");
    expect(vault).toContain("subscribeSessionSymbolStore");
  });
});
