import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const panelSource = readFileSync(
  new URL("./SmartMoneyPanel.tsx", import.meta.url),
  "utf8",
);

describe("SmartMoneyPanel Wyckoff truthfulness", () => {
  it("renders an explicit unavailable state instead of a fabricated current phase", () => {
    expect(panelSource).toContain(
      "Unavailable — phase model not implemented. No phase is inferred for the current symbol.",
    );
    expect(panelSource).not.toContain("Spring / Shakeout");
    expect(panelSource).not.toContain(">CURRENT</span>");
    expect(panelSource).not.toContain('{ phase: "PS"');
  });
});
