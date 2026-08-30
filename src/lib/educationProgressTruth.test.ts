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
});
