/**
 * A DESK THE CHART CANNOT FULLY SET MUST SAY SO WHERE IT IS NAMED.
 *
 * ── THE FAILURE THIS EXISTS TO PREVENT ────────────────────────────────────
 *
 * `selectChartArrangement` compiles three named desks out of FL-08 and counts,
 * per desk, how many of its own readings can draw on the tape in front of the
 * trader. ORDER FLOW is built from five readings, four of which need a tape
 * that states an aggressor side. On every futures chart outside a live tape
 * session — the ORDINARY case, not an edge case — pressing ORDER FLOW arms
 * five switches and paints one thing.
 *
 * The compiler knows this. The whole point of the atom is that it knows this
 * BEFORE the press. But a compiler that computes a true fact into a field
 * nobody renders is the exact failure already recorded in
 * `sentinelsProveTheyScanned.test.ts` item 2: the name appeared, the component
 * was not rendered, the gate passed. `silenceOfALitReadingIsDisclosed` was
 * written because the profiles chip published its refusal into a `data-`
 * attribute and nowhere else. This is the same obligation, one layer up.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 *
 *   IF A NAMED DESK CANNOT BE FULLY DRAWN ON THE TAPE IN FRONT OF THE TRADER,
 *   THE SHORTFALL MUST APPEAR IN THE DECLARATION ITSELF, THE CHIP MUST PRINT
 *   THAT DECLARATION RATHER THAN A NAME, AND THE PER-DESK REASON MUST REACH
 *   THE GLASS — NOT ONLY `title`, WHICH A TOUCH USER NEVER RECEIVES.
 *
 * ── WHY THE ADOPTION CHECK IS HERE AND NOT IMPLIED ────────────────────────
 *
 * The last assertion reads `ChartsDashboard.tsx` and requires the component to
 * be RENDERED, not merely imported. An import satisfies a grep; only a JSX tag
 * puts the sentence in front of the Founder. This product has shipped an
 * orphaned honest component before, and the compiler being correct is exactly
 * what makes an orphan hard to notice.
 *
 * NOT A SCANNER. It reads two named files at two fixed paths and asserts
 * positive facts about each. There is no file set to enumerate and no
 * `toEqual([])` to go vacuously green.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { selectProfileMenu } from "./selectProfileMenu";
import { selectChartArrangement, ARRANGEMENT_SPECS, arrangementSwitches } from "./selectChartArrangement";

const ROOT = process.cwd();

const BAR_COMPONENT = readFileSync(
  join(ROOT, "src/components/chart/ChartArrangementBar.tsx"),
  "utf8",
);
const DASHBOARD = readFileSync(
  join(ROOT, "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);
/*
  THE SECOND DOOR.

  MEASURED 2026-09-22 on prod /charts?symbol=TSLA at 1440x900: the Workspace
  hand listed the three desks as

      Order Flow   The chart is arranged this way now
      Regime       Both volume profiles — where price has been accepted
      Review       Session profile and effort-against-result, after the fact

  — three flat promises, no readiness, no `data-readiness`, no declaration.
  The compiler's disclosure reached the TOOLS drawer and stopped there. The
  Workspace door was added later, wired the presses, and skipped the telling.

  The assertions below are ADDITIVE. The Tools-door rule above is unchanged;
  this extends the same rule to the door that now also names these desks,
  because "the shortfall must appear where the desk is named" was never a
  statement about one file.
*/
const RAIL = readFileSync(
  join(ROOT, "src/components/os/WMOperatingSystem.tsx"),
  "utf8",
);

/** Bars loaded, tape states no aggressor side — the ordinary futures chart. */
const muteMenu = (active = {}) =>
  selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: false, active });

const shortfallDesks = selectChartArrangement({ menu: muteMenu() }).entries.filter(
  e => e.readiness !== "FULL",
);

describe("the ordinary chart really does under-deliver a named desk", () => {
  it("at least one desk cannot be fully drawn on a tape with no side", () => {
    // Vacuity guard. Every assertion below is about a shortfall; if no desk
    // has one on the product's ORDINARY feed, they would all pass for the
    // boring reason and this file would police nothing.
    expect(
      shortfallDesks.length,
      "no named desk reports a shortfall on a tape that states no aggressor " +
        "side. Either the readings stopped being tape-gated — in which case " +
        "re-derive this rule rather than deleting it — or the readiness " +
        "computation has been stubbed.",
    ).toBeGreaterThan(0);
    expect(ARRANGEMENT_SPECS.length).toBeGreaterThan(0);
  });
});

describe("the shortfall travels inside the declaration", () => {
  it("a desk that cannot be fully drawn never declares its bare name", () => {
    for (const desk of shortfallDesks) {
      const atThatDesk = selectChartArrangement({
        menu: muteMenu(arrangementSwitches(desk.id, muteMenu())),
      });
      expect(atThatDesk.activeId).toBe(desk.id);
      expect(
        atThatDesk.declaration,
        `the chart declares "${atThatDesk.declaration}" while only ` +
          `${desk.deliverableCount} of ${desk.armedCount} of ${desk.id}'s ` +
          `readings can draw. A declaration that carries the name without the ` +
          `count is the beautiful lie this compiler exists to prevent — the ` +
          `trader reads the desk they asked for and concludes the market is ` +
          `quiet rather than that the feed is mute.`,
      ).toMatch(/\d+ OF \d+ DRAWING/);
    }
  });

  it("a fully deliverable desk stays clean — the count is a warning, not decoration", () => {
    // Without this, "always append the count" would pass the test above while
    // making the marker meaningless.
    const menu = selectProfileMenu({
      barsPresent: true,
      printsPresent: true,
      observedAggressorFlow: true,
      active: {},
    });
    const full = selectChartArrangement({ menu }).entries.filter(e => e.readiness === "FULL");
    expect(full.length, "no desk is fully deliverable even on a sided tape").toBeGreaterThan(0);
    for (const desk of full) {
      const menuAt = selectProfileMenu({
        barsPresent: true,
        printsPresent: true,
        observedAggressorFlow: true,
        active: arrangementSwitches(desk.id, menu),
      });
      expect(
        selectChartArrangement({ menu: menuAt }).declaration,
        `${desk.id} can draw everything it arms, yet its declaration still ` +
          `carries a shortfall count. A warning that is always present is a ` +
          `warning the trader learns to stop reading.`,
      ).not.toMatch(/DRAWING/);
    }
  });
});

describe("the declaration reaches the glass", () => {
  it("the chip prints the compiler's declaration, not a name it invented", () => {
    /*
      The lookbehind is load-bearing, and it was added after this assertion
      failed a revive-attempt. `{vm.declaration}` without it also matches
      `${vm.declaration}` inside the aria-label's template literal — so the
      original form stayed green while the visible chip was changed to print a
      bare desk id. It was asserting that the accessible name was intact and
      calling that proof about the glass.
    */
    expect(
      BAR_COMPONENT,
      "ChartArrangementBar no longer renders `vm.declaration` as JSX content. " +
        "The declaration is the only place the shortfall count appears without " +
        "opening the popover; rendering the desk label instead would restore " +
        "the exact overclaim the compiler was built to end.",
    ).toMatch(/(?<!\$)\{\s*vm\.declaration\s*\}/);
  });

  it("the accessible name carries the declaration and the reason", () => {
    const ariaBlock = BAR_COMPONENT.match(/aria-label=\{[\s\S]*?\n\s*\}/);
    expect(ariaBlock, "no computed aria-label found on the arrangement chip").not.toBeNull();
    expect(
      ariaBlock![0],
      "the arrangement chip's accessible name dropped `vm.declaration`. A " +
        "screen-reader user would be told which desk the chart is at with no " +
        "way to learn that most of it is drawing nothing.",
    ).toContain("vm.declaration");
    expect(
      ariaBlock![0],
      "the accessible name names the desk but never reaches the compiler's " +
        "`note`, so the reader is told THAT something is missing and never " +
        "WHICH, nor whether waiting would help.",
    ).toMatch(/\.note\b/);
  });

  it("the per-desk refusal is rendered, not filed in a tooltip", () => {
    // `title` is hover-only. A touch user never receives it, which is the
    // drawer-filed-receipt failure the profiles chip was repaired for. The
    // reason must appear as element content inside the menu item.
    expect(
      BAR_COMPONENT,
      "the popover no longer renders `entry.note` as visible content. If the " +
        "reason survives only in `title`, every touch user presses a desk " +
        "named after a reading it cannot deliver and is told nothing.",
    ).toMatch(/>\s*\{\s*entry\.note\s*\}\s*</);
  });

  it("readiness is published for an outside probe", () => {
    expect(
      BAR_COMPONENT,
      "`data-arrangement-readiness` was removed. It is how a live audit " +
        "compares each desk's declared readiness against the switches without " +
        "parsing a human sentence.",
    ).toContain("data-arrangement-readiness");
    expect(BAR_COMPONENT).toContain("data-arrangement-active");
  });
});

describe("the honest component is actually on the chart", () => {
  it("ChartsDashboard RENDERS ChartArrangementBar, not merely imports it", () => {
    expect(
      DASHBOARD,
      "ChartsDashboard imports ChartArrangementBar but never renders it. An " +
        "import satisfies a grep; only a JSX tag puts the declaration in front " +
        "of a trader. A correct compiler feeding an orphaned component is the " +
        "hardest version of this defect to notice.",
    ).toMatch(/<ChartArrangementBar[\s>]/);
  });

  it("it is fed the same tape facts as the profiles chip, so the two cannot disagree", () => {
    // Two chips in one toolbar computing readiness from different inputs is a
    // contradiction the trader has to adjudicate. They must share the source.
    const tag = DASHBOARD.match(/<ChartArrangementBar[\s\S]*?\/>/);
    expect(tag, "no <ChartArrangementBar /> element found").not.toBeNull();
    expect(
      tag![0],
      "ChartArrangementBar is not passed `observedAggressorFlow`. It would " +
        "then measure readiness against something other than the tape the " +
        "profiles chip measures, and the two chips could contradict each other " +
        "side by side in the same toolbar.",
    ).toContain("observedAggressorFlow");
    expect(tag![0]).toContain("barsPresent");
  });
});

describe("the other door that names these desks tells the same truth", () => {
  it("the room publishes per-desk readiness, not only which desk is active", () => {
    expect(
      DASHBOARD,
      "ChartsDashboard announces the active arrangement to the rail but never " +
        "announces what each desk can DRAW. The Workspace hand would then list " +
        "three desks as flat promises while the compiler, in the same render, " +
        "knows four of ORDER FLOW's five readings cannot paint.",
    ).toContain("announceEquipmentShortfalls");
  });

  /**
   * ADDED 2026-09-22 with the fourth desk. CLEAN's press must clear the
   * toggled readings THROUGH the compiler's switch set — the same
   * `arrangementDeskRef` door the other three desks walk. Without this call,
   * Clean closes the panels but leaves every armed reading painted over the
   * candles: "just the market" with the overlays still on it, and the tile
   * never lights because all-off is never reached.
   */
  it("the Clean press drives the chart into the CLEAN desk, same door as the other three", () => {
    expect(DASHBOARD).toMatch(/arrangementDeskRef\.current\("CLEAN"\)/);
  });

  it("both halves of the answer come from ONE compiler call", () => {
    // Two `selectChartArrangement` calls in one component is how `activeId`
    // and `readiness` start describing different moments of the same chart.
    const calls = DASHBOARD.match(/selectChartArrangement\s*\(/g) ?? [];
    expect(
      calls.length,
      `ChartsDashboard invokes selectChartArrangement ${calls.length} times. ` +
        `The active desk and the per-desk readiness must be read off the SAME ` +
        `view model, or the rail can show a shortfall for an arrangement that ` +
        `is no longer the one in force.`,
    ).toBe(1);
  });

  it("the desk's own sentence is forwarded, never re-phrased at the rail", () => {
    const memo = DASHBOARD.match(/arrangementShortfalls\s*=[\s\S]*?\n\s*\);/);
    expect(memo, "no arrangementShortfalls mapping found").not.toBeNull();
    expect(
      memo![0],
      "the shortfall payload no longer carries `entry.note`. Composing a " +
        "second phrasing at the rail is how two doors begin describing one " +
        "desk differently — the exact single-owner failure this product has " +
        "shipped before.",
    ).toMatch(/note:\s*entry\.note/);
    expect(memo![0]).toMatch(/readiness:\s*entry\.readiness/);
  });

  it("the rail listens rather than inventing a memory of its own", () => {
    expect(
      RAIL,
      "WMOperatingSystem no longer subscribes to the shortfall channel. A rail " +
        "that derives readiness itself is a second compiler, and a second " +
        "compiler is a second answer.",
    ).toContain("subscribeEquipmentShortfalls");
    expect(RAIL).toContain("announcedEquipmentShortfalls");
  });

  it("the confession reaches the glass, not only `title`", () => {
    // Same obligation as the Tools popover above: `title` is hover-only, and a
    // touch trader pressing ORDER FLOW is exactly the person being misled.
    expect(
      RAIL,
      "the Workspace tile no longer renders `confess.note` as element content. " +
        "If the shortfall survives only in `title`, every touch and mobile " +
        "trader presses a desk named after five readings and is told nothing " +
        "about the four that will not paint.",
    ).toMatch(/\{\s*confess\.note\s*\}/);
    expect(
      RAIL,
      "`data-equipment-shortfall` was removed — the attribute a live audit " +
        "uses to read the rail's declared readiness without parsing prose.",
    ).toContain("data-equipment-shortfall");
  });

  it("a desk that delivers everything confesses NOTHING", () => {
    /*
      The mutation this closes: publishing every desk's readiness and rendering
      it unconditionally. That would pass every assertion above while putting a
      permanent badge on all three tiles — and a warning present on the calm
      case is a warning the trader stops seeing. This is the same
      escalation-not-badge rule `selectFoldEscalation` was built on: the calm
      case must emit nothing at all.
    */
    expect(
      RAIL,
      "the rail renders a shortfall without excluding FULL. A desk that can " +
        "draw everything it arms has nothing to disclose, and a disclosure " +
        "that is always on screen is decoration.",
    ).toMatch(/readiness\s*!==\s*"FULL"/);
  });
});
