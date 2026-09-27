/**
 * The creator "waitlist" writes only to this browser's localStorage
 * (wm_creator_waitlist) — nothing is sent. So the page may not promise a
 * waitlist that notifies anyone (Garden 16 §46 truth pass, 2026-09-27).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const PAGE = readFileSync(path.join(process.cwd(), "src/app/creator/page.tsx"), "utf8");

describe("creator interest is local", () => {
  it("the save is still local-only (positive control)", () => {
    expect(PAGE).toContain('localStorage.setItem("wm_creator_waitlist"');
    expect(PAGE).not.toMatch(/fetch\(/);
  });

  it("no copy promises a notification or a joined waitlist", () => {
    expect(PAGE).not.toMatch(/notify you when/i);
    expect(PAGE).not.toMatch(/Join the creator waitlist|Join \{waitlistTier\} Waitlist/);
  });
});
