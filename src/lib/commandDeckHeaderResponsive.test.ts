import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(__dirname, "../app/command-deck/page.tsx"), "utf8");
const dlar = readFileSync(resolve(__dirname, "../components/command-deck/DLARStrip.tsx"), "utf8");
const realms = readFileSync(resolve(__dirname, "../components/brand/RealmGateway.tsx"), "utf8");

describe("Command Deck header responsive contract", () => {
  it("uses one calm page identity beneath the global shell brand", () => {
    expect(page).not.toContain('import WmWordmark from "@/components/brand/WmWordmark"');
    expect(page).not.toContain('subtitle="COMMAND CENTER"');
    expect(page).toContain('<h1\n          className="wm-cd-header-identity"');
    expect(page.match(/>\s*Command Deck\s*<\/h1>/g)).toHaveLength(1);
  });

  it("keeps all three primary actions reachable on phone widths", () => {
    expect(page).toContain('className="wm-cd-header"');
    expect(page).toContain('className="wm-cd-header-actions"');
    expect(page.match(/className="wm-cd-header-action"/g)).toHaveLength(3);
    expect(page).toContain("@media (max-width: 640px)");
    expect(page).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(page).toContain("flex: 0 0 100%");
  });

  it("provides touch-size and visible-keyboard-focus guarantees", () => {
    expect(page).toContain(".wm-cd-header-action { min-height: 44px !important; }");
    expect(page).toContain(".wm-cd-header-action:focus-visible");
    expect(page).toContain(".wm-cd-header-back:focus-visible");
    expect(page).toContain("outline: 2px solid #d4af37");
  });

  it("preserves a named navigation target for every action", () => {
    expect(page).toContain('onClick={() => (showEvidence ? setShowEvidence(false) : openWhy({ kind: "hero" }))}');
    expect(page).toContain('aria-label={showEvidence ? "Hide evidence inspector" : "Show evidence inspector"}');
    expect(page).toContain('aria-label="Open Growth on your Profile"');
    expect(page).toContain('aria-label="Open Journal"');
  });

  it("lets dense evidence and realm grids reflow without phone overflow", () => {
    expect(dlar).toContain('gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))"');
    expect(realms).toContain('gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))"');
    expect(dlar).toContain("minWidth: 0");
    expect(realms).toContain("minWidth: 0");
  });
});
