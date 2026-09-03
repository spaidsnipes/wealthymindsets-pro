import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/morning-prep/page.tsx"),
  "utf8",
);

/**
 * /morning-prep truth Sentinel — §Silence Is A Feature + LIVING-PIXEL LAW.
 *
 * 1. Growth Rings chip: when the feature could not be reached, the chip
 *    rendered `${entries.length} local record(s)` — a DIFFERENT metric — into
 *    the same slot, under the same Target icon that means Growth Rings. An
 *    unreachable feature therefore read as a genuine tally (usually "0 local
 *    records"), which is worse than rendering nothing: it dressed a failure as
 *    functional chrome.
 *
 * 2. Opening Bell data health: selectOpeningBell only evaluates the required
 *    "Market data health verified" item when dataQuality is supplied.
 *    /morning-prep supplied nothing, so it sat permanently NOT DONE.
 */
describe("morning-prep truth", () => {
  it("a failed Growth Rings fetch names the failure, not a substituted metric", () => {
    expect(page).toContain('"Growth Rings unavailable"');
    // The local-entry tally must not be rendered in the Growth Rings slot.
    expect(page).not.toContain("${entries.length} local record");
  });

  it("the unavailable chip explains it is not a tally of zero", () => {
    expect(page).toContain("it is not a tally of zero");
  });

  it("Opening Bell receives a real dataQuality owner", () => {
    expect(page).toContain("dataQuality: coverageQuality");
    expect(page).toContain("selectChannelCoverageHealth");
  });

  it("an unobserved session maps to UNAVAILABLE, never a silent pass", () => {
    const i = page.indexOf("function coverageHealthToQuality");
    expect(i).toBeGreaterThan(-1);
    const fn = page.slice(i, i + 700);
    expect(fn).toContain('case "OBSERVING": return "LIVE"');
    expect(fn).toContain('"UNAVAILABLE"');
    // NONE (no channels at all) must not fall through to a healthy state.
    expect(fn).not.toMatch(/case "NONE":\s*return "LIVE"/);
  });
});

const fabio = fs.readFileSync(
  path.join(process.cwd(), "src/components/fabio/FabioInsights.tsx"),
  "utf8",
);

/**
 * FABIO label-overreach Sentinel.
 *
 * While FABIO_CONTENT_IS_PLACEHOLDER is true the note library is a static
 * curated set. Two labels claimed more than that:
 *   - "WM Playbook — Today's Focus" implied per-day personalization, but with
 *     surface="morning" and no symbol/regime/indicators the selection is
 *     deterministic and identical every day.
 *   - a "context-aware" chip sat directly above a banner that (honestly)
 *     described the content as general playbook notes.
 */
describe("fabio label truth", () => {
  it("morning-prep does not promise a daily focus it cannot deliver", () => {
    // Assert on the JSX prop, not prose — the explanatory comment above the
    // call site legitimately quotes the old label.
    expect(page).not.toMatch(/title="WM Playbook — Today's Focus"/);
    expect(page).toContain('title="WM Playbook"');
  });

  it("the context chip reflects placeholder status", () => {
    expect(fabio).toContain('FABIO_CONTENT_IS_PLACEHOLDER ? "curated notes" : "context-aware"');
  });

  it("the honest placeholder banner is still shown", () => {
    expect(fabio).toContain("Educational context, not financial advice");
  });
});
