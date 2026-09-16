import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * A PHONE MASTHEAD OWNS ONE ROW PER JOB.
 *
 * Stated positively, because a Sentinel that names the defect's spelling
 * defends the defect's location and loses the law: on a viewport too narrow
 * for the room rail, the masthead's CENTRE slot — the seven-mode job bar —
 * must own a row of its own, and the masthead must be allowed to wrap so it
 * can have one.
 *
 * WHY THIS IS A LAW AND NOT A PREFERENCE. MEASURED 2026-09-16 with Playwright
 * against /founder-room-sample.html:
 *
 *   before   phone 390x844   header.h=349  modeBarSpan=320  execCoveredBy=svg
 *   after    phone 390x844   header.h=178  modeBarSpan=90   execCoveredBy=null
 *
 * 349px of an 844px viewport is 41% of the phone spent before any market
 * content, and `document.elementFromPoint` on the centre of EXECUTE returned
 * an <svg> — the action-icon cluster was painted over the mode bar, so the
 * label a thumb aimed at was not the element a thumb would hit.
 *
 * Both halves were needed to produce it. The masthead was a single flex row
 * that never wrapped and whose every cell but the centre was `flex: 0 0 auto`,
 * so the centre was squeezed to a sliver; the mode bar then wrapped its seven
 * buttons into a 320px column at the 44px tap-target floor that
 * ExperienceModeBar.tsx exists to guarantee; and the non-wrapping header kept
 * the icons on the original row, on top of that column.
 *
 * The 44px floor is CORRECT and must not be the thing that gets rolled back to
 * buy height. What was wrong is the WIDTH the bar had to wrap inside. So the
 * law constrains the container, not the tap target.
 */

const OS = readFileSync(
  path.resolve(__dirname, "..", "..", "components", "os", "WMOperatingSystem.tsx"),
  "utf8",
);

const SAMPLE = readFileSync(
  path.resolve(__dirname, "..", "..", "..", "public", "founder-room-sample.html"),
  "utf8",
);

describe("a phone masthead owns one row per job", () => {
  it("gives the masthead centre slot a name the stylesheet can address", () => {
    // Without a class the rule below has nothing to bind to, and the fix would
    // have to be re-derived from geometry the next time someone touched it.
    expect(OS).toContain('className="wm-os-masthead-center"');
    expect(SAMPLE).toContain("wm-os-masthead-center");
  });

  it("lets the masthead wrap below the rail breakpoint", () => {
    const narrow = OS.slice(OS.indexOf("@media (max-width: ${OS_RAIL_BREAKPOINT_PX}px)"));
    expect(narrow).toMatch(/\.wm-os-masthead \{[^}]*flex-wrap: wrap/);
  });

  it("gives the centre slot a whole row of its own below the rail breakpoint", () => {
    const narrow = OS.slice(OS.indexOf("@media (max-width: ${OS_RAIL_BREAKPOINT_PX}px)"));
    expect(narrow).toMatch(/\.wm-os-masthead-center \{[^}]*flex-basis: 100%/);
  });

  it("keeps the 44px tap-target floor that made the bar tall in the first place", () => {
    // The cheap way to shrink a masthead is to shrink the thing a thumb aims
    // at. That is the one move this fix may not make.
    const bar = readFileSync(
      path.resolve(__dirname, "..", "..", "components", "experience", "ExperienceModeBar.tsx"),
      "utf8",
    );
    expect(bar).toMatch(/minHeight: 44/);
  });

  it("keeps all seven modes visible rather than hiding them behind a scroll", () => {
    // A horizontal scroller would have fixed the height in one line. It would
    // also have made four of the seven human operating states invisible on the
    // device where this bar IS the navigation.
    for (const mode of ["PREP", "OBSERVE", "WAIT", "EXECUTE", "MANAGE", "REVIEW", "LEARN"]) {
      expect(SAMPLE).toContain(`>${mode}<`);
    }
  });
});
