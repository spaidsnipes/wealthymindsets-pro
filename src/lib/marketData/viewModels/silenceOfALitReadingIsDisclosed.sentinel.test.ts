/**
 * A READING THE TRADER SWITCHED ON, THAT CANNOT DRAW, MUST SAY SO WHERE THE
 * SWITCH IS.
 *
 * ── WHY THIS IS A SEPARATE RULE FROM THE DEFAULTS SENTINEL ────────────────
 *
 * `readingDefaultsFaceTheWayTheyCanDraw.sentinel.test.ts` fixed the INVERSION:
 * the bar-derived reading no longer ships shyer than the tape-gated ones. That
 * rule is satisfied today, and it is deliberately weak — it permits the four
 * tape-gated readings to keep defaulting ON, because a product may legitimately
 * decide to arm a layer that is usually ready and occasionally not.
 *
 * Permitting it leaves a second, smaller dishonesty standing, and this file is
 * about that one. Three default-on order-flow readings are gated together
 * behind a single `hasVerifiedAggressorTape` call. Liquidity Weather is the
 * raw-print exception. On any feed
 * that never states an aggressor side — every futures chart outside a live tape
 * session — the ORDINARY state of this product is three lit gold switches over a
 * chart that is drawing nothing.
 *
 * Each withheld reading publishes its refusal. Into a `data-` attribute. And
 * nowhere else. Absorption is the only one of the six that puts its refusal on
 * the glass ("EFFORT UNMEASURED"). A refusal legible only to someone opening
 * devtools is not a refusal the trader was given — it is a receipt filed in a
 * drawer they do not know exists.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 *
 *   IF ANY TAPE-GATED READING DEFAULTS ON, THE PROFILES CHIP MUST DISCLOSE THE
 *   SILENCE — IN THE VISIBLE LABEL, AND IN THE ACCESSIBLE NAME, AND IT MUST
 *   PRINT THE COMPILER'S SENTENCE RATHER THAN INVENTING ITS OWN.
 *
 * The rule is conditional on purpose. Turn all side-gated defaults OFF and this file
 * goes quiet, because then nobody was told a lit switch was drawing — the
 * trader armed it themselves and owns the consequence. The obligation is
 * created by the DEFAULT, not by the silence.
 *
 * ── WHY IT IS ASSERTED IN TWO PLACES AND NOT ONE ─────────────────────────
 *
 * The compiler half (`silentCount` / `silentNote`) is asserted by running
 * `selectProfileMenu` against the ACTUAL shipped defaults, read out of
 * `ChartsDashboard`. A unit test that hardcodes `{ VALUE_CANDLE: true }` proves
 * the function works; it cannot notice that the product stopped shipping that
 * state. Reading the defaults is what makes this a sentinel.
 *
 * The render half is asserted against `ProfilesMenu.tsx` source, because a
 * compiler that computes a true fact into a field nobody renders is precisely
 * the failure mode already recorded in `sentinelsProveTheyScanned.test.ts`
 * item 2: the name appeared, the component was not rendered, the gate passed.
 * So this file requires `silentNote` to reach BOTH the accessible name and the
 * hoverable title, and requires `summary` — which carries the count — to be
 * rendered as chip text.
 *
 * NOT A SCANNER. It reads two named files at two fixed paths and asserts
 * positive facts about each. There is no file set to enumerate and no
 * `toEqual([])` to go vacuously green.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { selectProfileMenu, type ProfileId } from "./selectProfileMenu";

const ROOT = process.cwd();

const DASHBOARD = readFileSync(
  join(ROOT, "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);
const MENU_COMPONENT = readFileSync(
  join(ROOT, "src/components/chart/ProfilesMenu.tsx"),
  "utf8",
);

/**
 * Same hand-maintained mapping as the defaults sentinel, and for the same
 * reason: a renamed key must fail loudly rather than be silently skipped.
 */
const SWITCH_KEY: Readonly<Partial<Record<ProfileId, string>>> = {
  ABSORPTION: "wm_absorptionAnatomy",
  IMBALANCE_STACK: "wm_ofImbalanceStack",
  VALUE_CANDLE: "wm_ofValueCandle",
  DELTA_DIVERGENCE: "wm_ofDeltaDivergence",
  LIQUIDITY_WEATHER: "wm_ofLiquidityWeather",
};

function defaultFor(key: string): boolean {
  const m = DASHBOARD.match(
    new RegExp(`lsGet\\(\\s*["']${key}["']\\s*,\\s*(true|false)\\s*\\)`),
  );
  if (!m) {
    throw new Error(
      `No \`lsGet("${key}", …)\` call found in ChartsDashboard.tsx. The switch ` +
        `was renamed or its default stopped being a literal. Teach this ` +
        `sentinel to read the new form — do not delete it, because the state ` +
        `it polices is the product's ORDINARY state, not an edge case.`,
    );
  }
  return m[1] === "true";
}

/** The chart exactly as a first-time trader receives it, on a tape with no side. */
const SHIPPED_DEFAULTS = Object.fromEntries(
  (Object.entries(SWITCH_KEY) as [ProfileId, string][]).map(([id, key]) => [
    id,
    defaultFor(key),
  ]),
) as Partial<Record<ProfileId, boolean>>;

const ON_A_TAPE_WITH_NO_SIDE = selectProfileMenu({
  barsPresent: true,
  printsPresent: true,
  observedAggressorFlow: false,
  active: SHIPPED_DEFAULTS,
});

const anyTapeGatedDefaultsOn = ON_A_TAPE_WITH_NO_SIDE.entries.some(
  e => e.active && e.availability === "NEEDS_SIDED_TAPE",
);

describe("the shipped chart is measured, not assumed", () => {
  it("reads real switches out of ChartsDashboard, not a hardcoded guess", () => {
    // Vacuity guard. If the mapping stopped resolving, every test below would
    // be reasoning about an empty chart and would pass for the boring reason.
    expect(
      Object.keys(SHIPPED_DEFAULTS).length,
      "no profile defaults were resolved from ChartsDashboard.tsx",
    ).toBe(Object.keys(SWITCH_KEY).length);
    expect(
      ON_A_TAPE_WITH_NO_SIDE.entries.length,
      "selectProfileMenu compiled no entries",
    ).toBeGreaterThan(0);
  });

  it("some reading is armed by default — otherwise the product opens blank", () => {
    expect(
      ON_A_TAPE_WITH_NO_SIDE.activeCount,
      "every profile now defaults OFF. That may be intentional, but it means a " +
        "trader's first chart carries no reading at all, and it makes the rest " +
        "of this file untestable. Re-derive the rule before changing it.",
    ).toBeGreaterThan(0);
  });
});

describe("if a tape-gated reading is armed by default, its silence is disclosed", () => {
  it("the compiler counts the lit-but-silent readings", () => {
    if (!anyTapeGatedDefaultsOn) return; // no default arms a gated reading — rule dormant

    expect(
      ON_A_TAPE_WITH_NO_SIDE.silentCount,
      "a tape-gated reading ships switched ON, so on a tape that states no " +
        "aggressor side it is lit and painting nothing — yet the menu compiler " +
        "reports zero silent readings. `silentCount` is the intersection of " +
        "`active` and not-READY; if it reads zero here it has been removed, " +
        "stubbed, or measured over the wrong set.",
    ).toBeGreaterThan(0);
  });

  it("the compiler NAMES them, so the count is an answer and not a riddle", () => {
    if (!anyTapeGatedDefaultsOn) return;

    expect(ON_A_TAPE_WITH_NO_SIDE.silentNote).not.toBe("");

    for (const e of ON_A_TAPE_WITH_NO_SIDE.entries) {
      if (e.active && e.availability !== "READY") {
        expect(
          ON_A_TAPE_WITH_NO_SIDE.silentNote,
          `${e.id} is lit and cannot draw, but "${e.label}" does not appear in ` +
            `the note. A trader told "4 silent" without being told WHICH four ` +
            `has been handed a second puzzle instead of an answer.`,
        ).toContain(e.label);
      }
    }
  });

  it("the note gives the reason, so the trader knows whether to wait", () => {
    if (!anyTapeGatedDefaultsOn) return;

    // WAITING_FOR_BARS says wait; NEEDS_SIDED_TAPE says do not. A note that
    // names the silent readings without separating those two has told the
    // trader to stare at a chart that is never going to fill in.
    expect(
      ON_A_TAPE_WITH_NO_SIDE.silentNote,
      "the note names the silent readings but never explains the aggressor-side " +
        "requirement, so a trader cannot tell 'wait' from 'do not wait'.",
    ).toMatch(/aggressor side/i);
  });
});

describe("the disclosure reaches the glass, not just the view model", () => {
  it("the chip renders `summary`, which is where the count lives", () => {
    expect(
      MENU_COMPONENT,
      "ProfilesMenu no longer renders `vm.summary`. The count of switched-on " +
        "readings — and the SILENT suffix when some of them draw nothing — is " +
        "the only profile truth visible without opening the menu.",
    ).toMatch(/\{\s*vm\.summary\s*\}/);
  });

  it("the accessible name prints the compiler's sentence verbatim", () => {
    // The name used to read "6 of 8 drawing" straight off `activeCount`, which
    // announced a chart that did not exist to the one reader who cannot look
    // up and check. `silentNote` is interpolated rather than re-worded because
    // the module that MEASURED the gap is the module entitled to describe it.
    const ariaBlock = MENU_COMPONENT.match(/aria-label=\{[\s\S]*?\n\s*\}/);
    expect(ariaBlock, "no computed aria-label found on the profiles chip").not.toBeNull();
    expect(
      ariaBlock![0],
      "the profiles chip's accessible name does not carry `silentNote`. A " +
        "screen-reader user is then told how many readings are ON with no way " +
        "to learn that several of them are drawing nothing — the exact " +
        "overclaim this disclosure was built to end.",
    ).toContain("silentNote");
  });

  it("the sighted trader gets it on hover too, without opening the menu", () => {
    const titleBlock = MENU_COMPONENT.match(/title=\{[\s\S]*?\n\s*\}/);
    expect(titleBlock, "no computed title found on the profiles chip").not.toBeNull();
    expect(
      titleBlock![0],
      "the chip's tooltip dropped `silentNote`. Hover is where a trader asks " +
        "the chip what it means; answering with generic marketing copy while " +
        "four armed readings sit silent is the drawer-filed receipt again.",
    ).toContain("silentNote");
  });

  it("the withheld count is published for outside probes", () => {
    expect(
      MENU_COMPONENT,
      "`data-profiles-silent` was removed. It is how a live audit compares the " +
        "chrome against the glass without parsing a human sentence.",
    ).toContain("data-profiles-silent");
  });
});
