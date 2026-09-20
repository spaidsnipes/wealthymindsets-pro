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
