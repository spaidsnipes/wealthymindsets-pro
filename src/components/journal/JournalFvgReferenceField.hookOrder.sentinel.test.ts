/**
 * GHM pass 2026-11-14: JournalFvgReferenceField called useRef/useEffect AFTER its
 * `if (value) return …` branch. Attaching a reference flips `value` from undefined to set,
 * the next render runs fewer hooks, and React throws "Rendered fewer hooks than expected":
 * the journal form crashed at the moment the FVG read succeeded. eslint rules-of-hooks
 * named it; the 19k tests did not. This sentinel keeps every hook above the early return.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(join(__dirname, "JournalFvgReferenceField.tsx"), "utf8");

describe("JournalFvgReferenceField hook order", () => {
  it("calls no hook after the attached-reference early return", () => {
    const early = SRC.indexOf("  if (value) {");
    expect(early).toBeGreaterThan(0);
    const after = SRC.slice(early);
    expect(after).not.toMatch(/\buse(State|Ref|Effect|Memo|Callback|LayoutEffect)\(/);
  });
});
