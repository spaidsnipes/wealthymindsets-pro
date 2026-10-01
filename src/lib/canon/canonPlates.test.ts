import { describe, expect, it } from "vitest";
import { CANON_PLATES, canonPlate, glassHref, plateImageUrl } from "./canonPlates";

describe("canon plates for the Canon|Glass station", () => {
  it("keys are unique and every plate has a Drive id and a glass", () => {
    expect(new Set(CANON_PLATES.map(p => p.key)).size).toBe(CANON_PLATES.length);
    for (const p of CANON_PLATES) {
      expect(p.driveId).toMatch(/^[A-Za-z0-9_-]{20,}$/);
      expect(glassHref(p.glass).startsWith("/charts?")).toBe(true);
    }
  });
  it("unknown key falls back to Clarity (72)", () => {
    expect(canonPlate("nope").key).toBe("72");
  });
  it("the glass pane never leaves this origin", () => {
    expect(glassHref("https://evil.example/x")).toBe("/charts?https://evil.example/x");
    expect(plateImageUrl(canonPlate("72"))).toContain("drive.google.com/thumbnail?id=");
  });
});
