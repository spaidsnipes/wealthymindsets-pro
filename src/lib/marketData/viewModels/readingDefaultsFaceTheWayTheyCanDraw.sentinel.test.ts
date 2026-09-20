/**
 * A READING'S DEFAULT MUST FACE THE WAY IT CAN ACTUALLY DRAW.
 *
 * THIS SENTINEL EXISTS BECAUSE THE DEFAULTS HAD INVERTED, AND NOBODY NOTICED
 * FOR TWO DAYS, BECAUSE EACH ONE WAS DEFENSIBLE ON ITS OWN.
 *
 * `selectProfileMenu` already publishes the fact that matters: five of this
 * product's eight profile inventions cannot say anything at all unless the tape
 * states an aggressor side. `useOrderFlowReadings` gates all five behind one
 * call to `hasVerifiedAggressorTape`, so they do not merely tend to be silent
 * together — they are silent together by construction.
 *
 * Absorption anatomy is the exception, and it is the important exception. Its
 * effort basis is TIERED: it prefers signed delta, accepts inferred delta, and
 * falls back to plain traded volume, which is real, observed, unsigned, and a
 * legitimate basis for effort-vs-result in its own right. It therefore draws on
 * any chart that has bars — which is every chart — and on the days when the
 * other five have nothing to say, it is the only one of the six that does.
 *
 * On 2026-09-18 the four order-flow readings shipped defaulting ON. Absorption
 * had been defaulting OFF since it was built, for a reason written down at the
 * time and perfectly sound in isolation: it is contextual, a reading you switch
 * on. Neither decision was wrong when it was made. TOGETHER they produced this:
 *
 *     ON   stacked imbalance    ┐ needs a provider-asserted aggressor side
 *     ON   value candle         │ — draws NOTHING without sided tape
 *     ON   delta divergence     │
 *     ON   liquidity weather    ┘
 *     OFF  absorption anatomy     ← draws from bars alone, always could
 *
 * Exactly backwards. On a futures chart reading "NO LIVE PRINT" the trader got
 * four lit switches painting nothing and the one layer with something to say
 * turned off. Not a bug in any module — an inversion that only exists in the
 * relationship BETWEEN modules, which is the kind a unit test cannot see and a
 * reviewer reading one diff cannot see either.
 *
 * So this file asserts the relationship, not the values. It reads the tape
 * requirement from `selectProfileMenu` (the module that owns that judgement)
 * and the defaults from `ChartsDashboard` (the module that owns those), and
 * requires them to agree on one rule:
 *
 *   A READING THAT CAN ALWAYS DRAW MAY NOT DEFAULT MORE SHY THAN A READING
 *   THAT USUALLY CANNOT.
 *
 * The rule is deliberately weak. It does not demand any particular reading be
 * on. Turn all five off and it stays quiet — a chart with no overlays is a
 * legitimate product decision. It objects to one specific shape: the
 * tape-dependent layers being louder by default than the bar-derived one. That
 * shape is never what anybody meant, and it is what the product shipped.
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

/**
 * The localStorage key each reading's switch persists under. This is the only
 * hand-maintained mapping here; everything else is read out of the two owning
 * modules. A reading whose key is renamed will fail loudly below rather than
 * being silently skipped.
 */
const SWITCH_KEY: Readonly<Partial<Record<ProfileId, string>>> = {
  ABSORPTION: "wm_absorptionAnatomy",
  IMBALANCE_STACK: "wm_ofImbalanceStack",
  VALUE_CANDLE: "wm_ofValueCandle",
  DELTA_DIVERGENCE: "wm_ofDeltaDivergence",
  LIQUIDITY_WEATHER: "wm_ofLiquidityWeather",
};

/**
 * Read the default out of `lsGet("<key>", <default>)`. Not a parse of the whole
 * file — just the one call that establishes what a trader sees before they have
 * ever touched the switch.
 */
function defaultFor(key: string): boolean {
  const m = DASHBOARD.match(
    new RegExp(`lsGet\\(\\s*["']${key}["']\\s*,\\s*(true|false)\\s*\\)`),
  );
  if (!m) {
    throw new Error(
      `No \`lsGet("${key}", …)\` call found in ChartsDashboard.tsx. ` +
        `Either the switch was renamed or its default is no longer a literal. ` +
        `If the default became a computed expression, this sentinel must be ` +
        `taught to read it — it may not be deleted, because the inversion it ` +
        `catches is invisible to every other test in this repo.`,
    );
  }
  return m[1] === "true";
}

/**
 * Ask the menu compiler — not this file — which readings need sided tape. The
 * question is posed on a chart that HAS bars and has seen NO aggressor print,
 * which is the ordinary state of a futures chart outside a live tape session,
 * and the exact state in which the inversion did its damage.
 */
const MENU_NO_TAPE = selectProfileMenu({
  barsPresent: true,
  observedAggressorFlow: false,
  active: {},
});

const needsSidedTape = (id: ProfileId) =>
  MENU_NO_TAPE.entries.find(e => e.id === id)?.availability === "NEEDS_SIDED_TAPE";

describe("the profile menu and the chart defaults agree about what can draw", () => {
  it("absorption is the reading that stays READY when the tape states no side", () => {
    // If this ever fails, the premise of the whole file has moved and the rule
    // below is measuring nothing. It must be re-derived, not deleted.
    expect(
      needsSidedTape("ABSORPTION"),
      "absorption's effort basis is tiered down to plain traded volume, which " +
        "is why it can draw on a chart with no aggressor prints. If it now " +
        "reports NEEDS_SIDED_TAPE, either the tier ladder was removed from " +
        "selectAbsorptionAnatomy or the menu gained a wrong gate.",
    ).toBe(false);
  });

  for (const id of ["IMBALANCE_STACK", "VALUE_CANDLE", "DELTA_DIVERGENCE", "LIQUIDITY_WEATHER"] as const) {
    it(`${id} is correctly reported as needing sided tape`, () => {
      expect(needsSidedTape(id)).toBe(true);
    });
  }
});

describe("a reading that can always draw is never shyer by default than one that usually cannot", () => {
  const absorptionDefault = () => defaultFor(SWITCH_KEY.ABSORPTION!);

  for (const [id, key] of Object.entries(SWITCH_KEY) as [ProfileId, string][]) {
    if (id === "ABSORPTION") continue;

    it(`${id} does not default ON while absorption defaults OFF`, () => {
      if (!needsSidedTape(id)) return; // not a tape-gated reading; rule does not apply

      const tapeGatedIsOn = defaultFor(key);
      if (!tapeGatedIsOn) return; // it is off too — nothing to object to

      expect(
        absorptionDefault(),
        `${id} defaults ON but it draws nothing until the tape states an ` +
          `aggressor side, while ABSORPTION defaults OFF even though it draws ` +
          `from bars alone on every chart. That is the inversion this file ` +
          `exists for: the layers that usually cannot speak are louder than ` +
          `the layer that always can, so a trader on a quiet tape sees lit ` +
          `switches over an empty chart.\n\n` +
          `TWO LAWFUL FIXES, and only two. Turn ABSORPTION on (set the ` +
          `\`lsGet("${SWITCH_KEY.ABSORPTION}", …)\` default to true), or turn ` +
          `${id} off. Do NOT relax this rule — it is the only place in the ` +
          `repo where these two decisions are read in the same breath, which ` +
          `is the only way the inversion is visible at all.`,
      ).toBe(true);
    });
  }
});
