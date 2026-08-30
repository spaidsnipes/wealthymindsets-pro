import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const education = readFileSync(resolve(__dirname, "../app/education/page.tsx"), "utf8");

describe("Academy lesson quiz accessibility contract", () => {
  it("names the modal and uses the canonical keyboard containment and focus restoration owner", () => {
    expect(education).toContain('role="dialog" aria-modal="true" aria-labelledby="lesson-quiz-title"');
    expect(education).toContain('id="lesson-quiz-title"');
    expect(education).toContain("useShellModalFocus");
    expect(education).toContain("panelRef,");
    expect(education).toContain("initialFocusRef: closeRef");
    expect(education).toContain("fallbackTriggerRef: closeRef");
    expect(education).toContain("onKeyDown={onKeyDown}");
    expect(education).toContain("ref={closeRef}");
  });

  it("keeps a 44px close target and separates backdrop dismissal from panel interaction", () => {
    expect(education).toContain("style={{ minWidth: 44, minHeight: 44 }}");
    expect(education).toContain("if (event.target === event.currentTarget) onClose()");
    expect(education).toContain("event.stopPropagation()");
  });
});
