import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/hooks/useWebSocket.ts"),
  "utf8",
);

describe("REST quote symbol fence", () => {
  it("updates active identity during render and rejects late answers first", () => {
    expect(source).toContain("activeSymbolRef.current = symbol");
    expect(source).toMatch(/fetchRealQuote\(symbol\)\.then\(answer => \{\s*if \(!quoteRoundIsCurrent\(symbol, activeSymbolRef\.current, disposed\)\) return;\s*if \(!answer\) return;/);
  });
});
