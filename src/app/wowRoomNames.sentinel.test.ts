import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Plate 36 (Garden 19, Founder Drive): "There is no Wealthy Mindsets Radio, TV, Music or Lounge. These are WOW OS
// places that open inside WM Pro and bring you back to your chart." Oct 16 addendum: WM Pro owns its trading OS only.
const read = (p: string) => readFileSync(p, "utf8");
describe("WM Pro opens WOW places under their WOW names", () => {
  it("each room's tab is a WOW name", () => {
    expect(read("src/app/lounge/layout.tsx")).toMatch(/title: "WOW Lounge"/);
    expect(read("src/app/radio/layout.tsx")).toMatch(/title: "WOW Radio"/);
    expect(read("src/app/tv/layout.tsx")).toMatch(/title: "WOW TV"/);
    expect(read("src/app/shop/layout.tsx")).toMatch(/title: "WOW Shop"/);
  });
  it("the shop header is WOW Shop, not a WM shop", () => {
    const shop = read("src/app/shop/page.tsx");
    expect(shop).toMatch(/>\s*WOW Shop\s*<\/h1>/);
    expect(shop).not.toMatch(/>\s*WM\s*<\/span>/);
  });
  it("no WM-branded room name appears in a room", () => {
    for (const r of ["lounge", "radio", "tv", "shop"])
      expect(read(`src/app/${r}/page.tsx`)).not.toMatch(/Wealthy ?Mindsets (Radio|TV|Lounge|Music|Shop)|WM (Radio|Lounge|TV|Music|Shop)\b/);
  });
});
