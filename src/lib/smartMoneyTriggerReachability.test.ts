/**
 * smartMoneyTriggerReachability — the branded Smart Money control must be
 * REACHABLE ON SIGHT on /charts, not buried behind a menu that never says its
 * name.
 *
 * What happened, plainly:
 *
 *   e3ce41f "refactor(charts): disclose advanced study controls on demand"
 *   moved the ENTIRE second toolbar row behind `studyToolsOpen`, which
 *   defaults to false. The branded Smart Money trigger lived inside that row.
 *   From the trader's seat this is indistinguishable from deletion: the
 *   control vanished from the chart, and its only surviving path was
 *   ChartToolbar → Advanced → "Flow & studies" — a label that never utters
 *   the words "Smart Money".
 *
 *   Verified against production before the fix: the live /charts DOM returned
 *   zero nodes matching /smart money/i across 101 buttons.
 *
 * Why this class of defect needs a Sentinel and not just a fix:
 *
 *   Progressive disclosure is the right instinct for a dense study strip, and
 *   it will be reached for again. But an identity-bearing, branded control is
 *   not a study tool — hiding it does not quiet the room, it removes the
 *   product's signature from its primary surface. Nothing in the type system
 *   distinguishes "one more control tucked into the row" from "the brand mark
 *   tucked into the row", so the next disclosure refactor can silently redo
 *   this. These assertions fail the moment it does.
 *
 * This deliberately does NOT assert the study row is visible. The row stays
 * gated; that part of e3ce41f was correct and is pinned by
 * chartProgressiveDisclosure.test.ts. The only claim here is that the Smart
 * Money trigger stays one-tap in the pinned toolbar cluster, outside it and
 * without consuming a second permanent row.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..", "..");

const dashboard = readFileSync(
  resolve(REPO_ROOT, "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);
const toolbar = readFileSync(
  resolve(REPO_ROOT, "src/components/chart/ChartToolbar.tsx"),
  "utf8",
);
/** The room's equipment DECLARATION — read since 2026-09-21, when the trigger's
 *  reachability stopped being a CSS fact and became a door the room declares. */
const roomEquipmentSrc = readFileSync(
  resolve(REPO_ROOT, "src/lib/workspace/roomEquipment.ts"),
  "utf8",
);

/** The `studyToolsOpen`-gated dense strip, matched from its opening brace. */
const STUDY_ROW_GATE =
  '{(activeTab === "Chart" || activeTab === "Options") && studyToolsOpen && <div className="wm-chart-tools';

/** The branded trigger itself — the logo is the Founder-named requirement. */
const TRIGGER_LOGO = "<WMLogo size={18} showGlow={smartMoneyActive} />";

/**
 * Find the `}` closing the JSX expression container that starts at `open`.
 *
 * Skips string and template literals and both comment forms, so a brace inside
 * `"{"` or `/* { *\/` cannot desynchronise the depth count. Returns -1 if the
 * braces never balance, which the positive control below turns into a red test
 * rather than a silently-empty range.
 */
function matchBrace(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (c === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      i = end < 0 ? code.length : end + 1;
      continue;
    }
    if (c === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      i = end < 0 ? code.length : end;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** [start, end] source offsets of the JSX block opened by `gate`. */
function blockRange(code: string, gate: string): [number, number] {
  const open = code.indexOf(gate);
  if (open < 0) return [-1, -1];
  return [open, matchBrace(code, open)];
}

describe("smart money trigger reachability", () => {
  it("the containment detector is not vacuous", () => {
    // Axis 1: we are reading the real dashboard, not an empty/renamed file.
    expect(dashboard.length).toBeGreaterThan(50_000);

    // Axis 2: both gates exist in source. If a refactor renames either class,
    // every containment assertion below would compare against [-1, -1] and pass
    // for the wrong reason. Fail loudly here instead.
    const [studyStart, studyEnd] = blockRange(dashboard, STUDY_ROW_GATE);
    expect(studyStart).toBeGreaterThan(-1);

    // Axis 3 — POSITIVE CONTROL. The brace matcher must actually close the
    // block. FootprintControls and DrawingToolsPanel are known-good residents
    // of the dense study row: if matchBrace() returns a truncated or degenerate
    // range, they fall outside it and this control goes red BEFORE the
    // "Smart Money is not in the row" assertion can pass vacuously. A detector
    // that contains nothing reports "nothing is buried" forever, and that reads
    // exactly like a clean bill of health.
    expect(studyEnd).toBeGreaterThan(studyStart);
    const studyRow = dashboard.slice(studyStart, studyEnd);
    expect(studyRow).toContain("<FootprintControls");
    expect(studyRow).toContain("<DrawingToolsPanel");

    // Axis 4: the branded trigger belongs to the toolbar, while the dense
    // study row remains in the dashboard. Separate files make accidental
    // containment impossible and remove the extra full-width identity row.
    //
    // RE-AIMED 2026-09-21. This read `toContain('className="wm-chart-toolbar-pinned')`
    // — it asserted the trigger lived in a CSS class. D-701 demolished that
    // cluster (it covered two of its own neighbours at 1440; see
    // chartPhoneControlReachability), and the trigger moved behind the
    // `chart-tools` equipment door. Anchoring on the DRAWER instead is stronger
    // than anchoring on the class was: a class name is decoration that a
    // refactor can keep while moving the button out, whereas this pins the
    // actual container the trigger is rendered into.
    expect(toolbar).toContain('id="chart-equipment-sheet"');
  });

  it("renders exactly one Smart Money trigger — no duplicate, single writer", () => {
    /**
     * REMAPPED 2026-09-19 — this counted the literal
     * `aria-label="Open Smart Money panel"`, which stopped being a literal when
     * the name was made to follow the panel's state (see the disclosure describe
     * below). The LAW is unchanged and is what is counted here: exactly one
     * trigger exists across both files.
     *
     * Counted by `onClick={onSmartMoney}` — the single prop through which the
     * dashboard hands this control its behaviour — rather than by any label
     * spelling, so the count survives the next honest rename. The logo count is
     * the independent second axis it always was.
     */
    const triggers = `${dashboard}\n${toolbar}`.match(/onClick=\{onSmartMoney\}/g) ?? [];
    expect(triggers).toHaveLength(1);

    const logos = toolbar.split(TRIGGER_LOGO).length - 1;
    expect(logos).toBe(1);
  });

  it("FOUNDER GATE: the trigger carries the WM logo, not a generic icon", () => {
    // "it should be on the charts section still with the new logo"
    //   — Founder, 2026-09-04
    expect(toolbar).toContain(TRIGGER_LOGO);
    expect(toolbar).toContain('import { WMLogo } from "@/components/ui/WMLogo"');
  });

  it("FOUNDER GATE: the trigger is NOT inside the studyToolsOpen-gated row", () => {
    const [studyStart, studyEnd] = blockRange(dashboard, STUDY_ROW_GATE);
    const studyRow = dashboard.slice(studyStart, studyEnd);

    // This is the exact regression e3ce41f introduced. If a future disclosure
    // refactor sweeps the trigger back into the dense row, this goes red.
    expect(studyRow).not.toContain("Smart Money");
    expect(studyRow).not.toContain("setSmartMoneyOpen");
  });

  it("FOUNDER GATE: the trigger has a door of its own and consumes no permanent row", () => {
    expect(toolbar).toContain(TRIGGER_LOGO);
    expect(toolbar).toContain("onClick={onSmartMoney}");
    expect(dashboard).toContain("onSmartMoney={() => setSmartMoneyOpen(o => !o)}");
    expect(dashboard).not.toContain("wm-chart-identity-strip");

    // ── RE-AIMED 2026-09-21, AND STRICTLY STRONGER ────────────────────────
    //
    // This case used to be satisfied by one fact: the trigger sits inside a div
    // whose className begins `wm-chart-toolbar-pinned`. That fact was true on
    // the day the cluster laid out 822px wide inside a 354px phone — the
    // trigger was "pinned" and also entirely off the glass. "Pinned" was never
    // the requirement; ONE-PRESS REACHABILITY was.
    //
    // So the requirement is now asserted as reachability, and it takes THREE
    // facts where the old one took one. The trigger is inside the drawer; the
    // room DECLARES a door that opens that drawer; and the room LISTENS for
    // that door. Any one of those missing ships a control the trader cannot
    // get to — which is exactly the defect this whole file was born from, and
    // the class-name assertion could not have caught any of the three.
    expect(toolbar).toContain('id="chart-equipment-sheet"');
    expect(dashboard).toContain("equipmentOpen={chartEquipmentOpen}");
    expect(
      roomEquipmentSrc,
      "/charts no longer declares the `chart-tools` door, so the drawer holding the Smart " +
        "Money trigger has nothing that opens it",
    ).toContain('id: "chart-tools"');
    expect(
      dashboard,
      "ChartsDashboard declares the door but never hears it pressed — a painted control that " +
        "does nothing, which is worse than an absent one",
    ).toMatch(/req\.equipmentId === "chart-tools"/);
  });

  it("records WHY the menu path alone was not enough", () => {
    // The Advanced menu still offers the study row, and should. But its label
    // never says "Smart Money" — which is precisely why the control read as
    // deleted. Pinned so nobody "fixes" this by arguing the menu was
    // sufficient discovery.
    expect(toolbar).toContain("Flow &amp; studies");
    const menuItem = toolbar.slice(
      toolbar.indexOf("Flow &amp; studies") - 200,
      toolbar.indexOf("Flow &amp; studies") + 100,
    );
    expect(menuItem).not.toContain("Smart Money");
  });
});

/**
 * THE TRIGGER IS A DISCLOSURE, AND IT HAS TO SAY SO.
 *
 * MEASURED 2026-09-19 on live https://wealthymindsetspro.com/charts at 1920, by
 * driving the real control through open → Escape → re-open:
 *
 *   closed → aria-pressed="false", 39 buttons on the page
 *   opened → aria-pressed="true",  52 buttons — thirteen new controls now hang
 *            over the live candles
 *   aria-expanded / aria-controls → null / null in BOTH states
 *   accessible name while OPEN    → still "Open Smart Money panel"
 *
 * Unlike the seven-mode bar and the nine-button timeframe strip repaired the
 * same day, `aria-pressed` was not an unkeepable promise here — Escape really
 * did close the panel and the attribute really did return to "false". The
 * control is reversible. The defect is that the wrong FACT was announced:
 * "pressed" reports that a state was entered and says nothing about thirteen
 * controls appearing over the price, nor offers any way to reach them.
 *
 * COMMENT-STRIPPED, and here that is not a formality. The repair's own comment
 * in `ChartToolbar` quotes `aria-pressed` several times while explaining why it
 * was replaced, so a raw-source `not.toContain` would fail against the FIXED
 * file and pass only if the explanation were deleted — a test that punishes the
 * reasoning and rewards its removal.
 */
describe("smart money trigger — the disclosure contract", () => {
  const strip = (code: string) =>
    code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  /** Comment-free, whitespace-collapsed, anchored at the trigger's own prop. */
  const triggerRegion = (() => {
    const compact = strip(toolbar).replace(/\s+/g, " ");
    const at = compact.indexOf("onClick={onSmartMoney}");
    return at < 0 ? "" : compact.slice(at, at + 420);
  })();

  const panel = strip(
    readFileSync(resolve(REPO_ROOT, "src/components/smart-money/SmartMoneyPanel.tsx"), "utf8"),
  );

  it("the region detector is not vacuous", () => {
    // Every assertion below slices from `onClick={onSmartMoney}`. If that prop
    // is ever renamed the slice is "" and the negative assertions would pass
    // against nothing at all.
    expect(triggerRegion.length, "the Smart Money trigger lost its onSmartMoney prop").toBeGreaterThan(100);
  });

  it("announces that it EXPANDS something, not that it is pressed", () => {
    expect(
      triggerRegion,
      "the Smart Money trigger still claims aria-pressed. It hangs a thirteen-button panel " +
        "over the live market, which is a disclosure, not a toggle state — and `Tools`, " +
        "seventeen lines below in the same file, already gets this right",
    ).not.toContain("aria-pressed");
    expect(
      triggerRegion,
      "the trigger opens a panel over the candles and never says so. Removing aria-pressed " +
        "without adding aria-expanded would leave the disclosure entirely unannounced, which " +
        "is quieter than the defect it replaced",
    ).toContain("aria-expanded={smartMoneyActive}");
  });

  it("POINTS at the panel — but only while the panel is in the document", () => {
    // The atom-6 law: a dangling `aria-controls` is FOLLOWED, and lands nowhere.
    // `ChartsDashboard` mounts the panel behind the same boolean, so the guard
    // and the mount are the same condition.
    expect(
      triggerRegion,
      "the trigger does not point at what it opened, so a screen-reader user is told a panel " +
        "exists with no way to reach it",
    ).toContain("aria-controls={smartMoneyActive ? SMART_MONEY_PANEL_ID : undefined}");
    // MATCH THE CONDITION, NOT THE WHITESPACE. What must hold is that the mount
    // is gated on `smartMoneyOpen` — the same boolean the trigger's
    // aria-controls is gated on. Whether the JSX fits on one line is not a
    // reachability fact, and a literal-string assertion here fails the moment
    // the panel takes one more prop, which teaches the next engineer to edit
    // the guard rather than to honour it.
    expect(
      dashboard,
      "the panel is no longer mounted behind `smartMoneyOpen`, so the trigger's aria-controls " +
        "guard no longer matches the condition that puts the target in the document",
    ).toMatch(/\{smartMoneyOpen && \(?\s*<SmartMoneyPanel[\s/>]/);
  });

  it("the id it points at is OWNED by the panel, not retyped at both ends", () => {
    expect(
      panel,
      "SmartMoneyPanel stopped exporting its DOM id, so the trigger's aria-controls now names " +
        "a string nothing is obliged to keep",
    ).toContain('export const SMART_MONEY_PANEL_ID = "wm-smart-money-panel"');
    expect(
      panel,
      "SmartMoneyPanel exports an id it does not put on any element — aria-controls would " +
        "resolve to nothing while both halves still read like care",
    ).toContain("id={SMART_MONEY_PANEL_ID}");
  });

  it("stops telling the trader to OPEN a panel they are already looking at", () => {
    expect(
      triggerRegion,
      "the accessible name is frozen at 'Open Smart Money panel' in both states, so the only " +
        "signal that the panel is up is one a screen reader cannot receive",
    ).toContain('aria-label={smartMoneyActive ? "Close Smart Money panel" : "Open Smart Money panel"}');
  });
});
