import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/journal/page.tsx"),
  "utf8",
);

/**
 * Journal select-truth Sentinel — LIVING-PIXEL LAW.
 *
 * Real from-USE defect (2026-09-03): `emptyForm()` initialises `setup: ""`,
 * but the Setup <select> carried no `<option value="">`. A browser renders
 * the FIRST option for an unmatched value, so the control displayed
 * "CLC Long" while form state was still "". A trader who never touched the
 * dropdown believed they had logged a CLC Long trade; the saved journal
 * record carried an empty setup.
 *
 * Rule: any <select> bound to a field that starts empty MUST offer an
 * explicit empty option so the unset state is visible and selectable.
 */
describe("journal select truth", () => {
  it("the Setup dropdown exposes an explicit unset option", () => {
    // The empty option must exist so value="" renders honestly.
    expect(page).toContain('<option value="">— select setup —</option>');
  });

  it("Setup options carry explicit values rather than relying on child text", () => {
    // `<option key={s}>{s}</option>` has no value attribute; that is what let
    // the control silently disagree with state.
    expect(page).not.toContain("{SETUPS.map(s => <option key={s}>{s}</option>)}");
    expect(page).toContain("SETUPS.map(s => <option key={s} value={s}>{s}</option>)");
  });

  it("emptyForm still starts setup unset — the fix must not silently pick one", () => {
    // Canon §3/§4: the trader must consciously choose. Defaulting to
    // SETUPS[0] would make the pixel honest by making the DATA wrong.
    expect(page).toMatch(/setup:\s*""/);
    expect(page).not.toMatch(/setup:\s*SETUPS\[0\]/);
  });
});

/**
 * Label-overreach Sentinel — canon §AI AUTHORITY CREEP.
 *
 * The "coach" tab was labelled "AI Strategy Coach" while the panel it opens
 * (StrategyCoach) is pure deterministic aggregation — win/loss counts, avg R:R,
 * profit factor, per-setup breakdown. No AI service is called. The panel's own
 * internal headers already read "Strategy Evidence Coach" / "Journal Evidence
 * Coach", proving the honest name existed; only the tab bar overclaimed.
 */
describe("journal label truth", () => {
  it("no journal tab promises an AI engine that does not run", () => {
    expect(page).not.toContain('label:"AI Strategy Coach"');
    expect(page).not.toMatch(/label:\s*"AI /);
  });

  it("the coach tab label matches the panel's own honest name", () => {
    expect(page).toContain('label:"Strategy Evidence Coach"');
  });

  it("the songs tab does not promise AI over a hardcoded template", () => {
    // generateSong() fills SONG_TEMPLATES; no model is invoked.
    expect(page).not.toContain('label:"AI Songs"');
    expect(page).toContain('label:"Lyric Templates"');
  });

  it("the coach panel still calls no AI service", () => {
    // If a real model call is ever added, this Sentinel should be revisited
    // deliberately — not silently satisfied by renaming the tab back.
    const coachRegion = page.slice(page.indexOf("function StrategyCoach"));
    expect(coachRegion.slice(0, 4000)).not.toMatch(/fetch\(|anthropic|openai|\/api\/ai/i);
  });
});
