/**
 * categoryTabsFor — asset-class-aware category tab list.
 *
 * Founder 2026-09-02 breakthrough: the /charts top-level category
 * strip previously always rendered the same 8 tabs (Chart / Options
 * / ETFs / Financials / Valuation / Corporate Actions / Shareholders
 * / Profile) regardless of what the current symbol actually is. For
 * BTC, TSLA options contracts, futures, and FX pairs half those
 * tabs are irrelevant — clicking "Financials" for BTC leads to an
 * empty state that reads as broken, not intentional.
 *
 * This pure helper filters the tab list down to what actually
 * applies to the current asset class. Consumers should call it
 * synchronously in render — no state, no effect, no hidden cost.
 *
 * Extending: if a new asset class appears (canonical enum grows),
 * add an explicit case. The default arm returns Chart + Profile so
 * a novel class never accidentally paints an irrelevant tab.
 */

import type { CanonicalAssetClass } from "@/lib/marketData/canonicalIdentity";

/**
 * ABSORPTION belongs to EVERY class, deliberately.
 *
 * It is a microstructure view, and the Founder's Asset 06 is a full surface,
 * not a drawer tile. On a symbol whose feed carries no aggressor side it
 * renders honestly empty rather than being hidden — hiding it would make the
 * missing input invisible, which is the opposite of what the drawer's own
 * missing-aggressor banner exists to do. So it is never filtered out by class,
 * only by whether the tape actually supports a reading, and the view says which.
 *
 * AGGRESSION (the Founder's Asset 03) joins on exactly the same footing: it is
 * the same measurement plotted as a scatter, fed by the same selector, so the
 * two views can never disagree about which bars absorbed. Its y-axis discloses
 * whether it is showing net aggression or effort, which is precisely the kind
 * of missing input that must stay visible rather than be hidden by class.
 *
 * BIG TRADES (the Founder's Asset 05) is the third sibling and belongs to every
 * class for a sharper version of the same reason. It reads the per-trade tape,
 * which most venues this product can reach do not carry — and "this feed has no
 * tape" is a fact a trader needs stated, not a reason to remove the door. The
 * view names that incapacity itself. Hiding the tab by class would make the
 * absent tape invisible, which is exactly the silence it exists to break.
 *
 * VALUE PROFILE (the Founder's Asset 06, the Living Profile) is the fourth and
 * belongs everywhere too, but for the opposite reason to the three above: it is
 * the ONE microstructure surface that can answer on every feed this product can
 * reach. Volume at price can be estimated from candles when no tape exists, so
 * the panel always has something honest to draw — and it labels which of the
 * two it built, because an estimated profile may state its levels but may NOT
 * state its nodes. Naming it "Value Profile" rather than "Profile" is
 * deliberate: "Profile" already means the company reference sheet on this
 * strip, and two tabs meaning two different things under one word is the kind
 * of quiet collision a trader pays for.
 */
export const ALL_CATEGORY_TABS = [
  "Chart",
  "Absorption",
  "Aggression",
  "Big Trades",
  "Value Profile",
  "Options",
  "ETFs",
  "Financials",
  "Valuation",
  "Corporate Actions",
  "Shareholders",
  "Profile",
] as const;

export type CategoryTab = (typeof ALL_CATEGORY_TABS)[number];

/**
 * THE FOUR MICROSTRUCTURE VIEWS — and why they need to be nameable as a set.
 *
 * Each of these reads the same tape the candles are drawn from, and each
 * answers a question ABOUT price rather than instead of it. "Was that bar
 * absorbed", "was the side pressing paid for its effort", "was that one print
 * large", "where did this auction actually trade" — every one of those
 * questions ends with the trader looking back at the chart to see WHERE.
 *
 * They shipped as plain siblings of `Chart`, which meant selecting one HID the
 * candles. The Founder's own acceptance question names the defect exactly:
 * *"Is it now useful while candles remain visible?"* A reading that makes you
 * leave the price to look at it is a reading you have to memorise and carry
 * back, and a number carried in the head is a number that drifts.
 *
 * So these four are a SET, not four coincidences, and the set is named HERE
 * rather than spelled out at the wiring site. A fifth microstructure view added
 * to the strip without being added here would silently ship as a full-screen
 * takeover again — the regression would be an omission, which is the one shape
 * of bug that renders something rather than nothing.
 *
 * This deliberately does NOT replace the explicit `!==` chain that excludes
 * these tabs from the fundamentals arm. That chain is pinned by sentinels which
 * read the source literally, and collapsing it behind a helper would hide the
 * exclusion from exactly the check that exists to prove it is still there.
 */
export const MICROSTRUCTURE_TABS = [
  "Absorption",
  "Aggression",
  "Big Trades",
  "Value Profile",
] as const satisfies readonly CategoryTab[];

export type MicrostructureTab = (typeof MICROSTRUCTURE_TABS)[number];

/** True when the tab reads the tape the candles are drawn from, and therefore
 *  must be shown WITH the candles rather than in place of them. */
export function isMicrostructureTab(tab: string): tab is MicrostructureTab {
  return (MICROSTRUCTURE_TABS as readonly string[]).includes(tab);
}

export function categoryTabsFor(cls: CanonicalAssetClass): readonly CategoryTab[] {
  switch (cls) {
    case "equity":
      return ALL_CATEGORY_TABS;
    case "etf":
      // ETFs have Financials + Valuation + Profile + Shareholders
      // (holdings). No Corporate Actions, no separate ETFs tab
      // (redundant when the symbol IS an ETF).
      return ["Chart", "Absorption", "Aggression", "Big Trades", "Value Profile", "Options", "Financials", "Valuation", "Shareholders", "Profile"] as const;
    case "options":
      // Viewing an options contract already IS the options view;
      // Financials/Valuation belong to the underlying, not the
      // derivative. Keep Chart + Profile only.
      return ["Chart", "Absorption", "Aggression", "Big Trades", "Value Profile", "Profile"] as const;
    case "crypto":
    case "futures":
    case "forex":
      // No corporate structure, no shareholders, no ETF wrapper.
      // Chart is the whole thing; Profile carries what little
      // reference data exists (name / venue / contract spec).
      return ["Chart", "Absorption", "Aggression", "Big Trades", "Value Profile", "Profile"] as const;
    default: {
      // Exhaustiveness guard — if CanonicalAssetClass grows, this
      // narrows to `never` and TS errors at build time.
      const _never: never = cls;
      void _never;
      return ["Chart", "Absorption", "Aggression", "Big Trades", "Value Profile", "Profile"] as const;
    }
  }
}

/** Resolve category ownership synchronously during render. A prior selection
 * can never keep a surface mounted after the new asset class removes it. */
export function effectiveCategoryTab(
  cls: CanonicalAssetClass,
  requested: string,
): CategoryTab {
  const allowed = categoryTabsFor(cls);
  return allowed.includes(requested as CategoryTab)
    ? requested as CategoryTab
    : "Chart";
}
