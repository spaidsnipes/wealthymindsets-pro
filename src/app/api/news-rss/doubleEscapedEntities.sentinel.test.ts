import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/app/api/news-rss/route.ts", "utf8");

describe("double-escaped feed entities decode once more (serving /news, 2026-10-02)", () => {
  it("a bounded second pass runs only when an entity survives", () => {
    expect(SRC).toContain("function decode(s: string, pass = 0): string {");
    expect(SRC).toContain("if (pass === 0 && /&(nbsp|quot|apos|lt|gt|#\\d+|#x[0-9a-fA-F]+);/.test(t)) return decode(t, 1);");
  });
});
