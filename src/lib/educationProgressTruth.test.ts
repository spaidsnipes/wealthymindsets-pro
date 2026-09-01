import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const educationPage = readFileSync(resolve(__dirname, "../app/education/page.tsx"), "utf8");
const moduleSeed = educationPage.slice(
  educationPage.indexOf("const MODULES"),
  educationPage.indexOf("const LEVEL_COLOR"),
);

describe("Academy progress truth", () => {
  it("starts a new browser with zero fabricated lesson or module completions", () => {
    expect(moduleSeed).not.toContain("completed:true");
    expect(moduleSeed).not.toContain("completed: true");
  });

  it("labels the challenge as a preview without implying enrollment", () => {
    expect(educationPage).toContain("$100 Academy Challenge Preview");
    expect(educationPage).toContain("No enrollment · browser-local progress");
  });

  it("does not rewrite browser progress merely because the page mounted", () => {
    expect(educationPage).not.toContain("localStorage.setItem(EDU_KEY");
    expect(educationPage).toContain("persistAcademyProgress(localStorage, EDU_KEY");
  });

  it("does not imply a connected entitlement system for preview-locked modules", () => {
    expect(educationPage).toContain("preview locked; unlock rules not connected");
    expect(educationPage).toContain("Preview locked · unlock not connected");
    expect(educationPage).toContain("disabled={mod.locked}");
  });

  it("does not restore the Founder-retired lifestyle slogan", () => {
    expect(educationPage).not.toMatch(/change the way you think.*change the way you live/i);
  });
});
