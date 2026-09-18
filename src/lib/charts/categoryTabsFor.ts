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
 */
export const ALL_CATEGORY_TABS = [
  "Chart",
  "Absorption",
  "Options",
  "ETFs",
  "Financials",
  "Valuation",
  "Corporate Actions",
  "Shareholders",
  "Profile",
] as const;

export type CategoryTab = (typeof ALL_CATEGORY_TABS)[number];

export function categoryTabsFor(cls: CanonicalAssetClass): readonly CategoryTab[] {
  switch (cls) {
    case "equity":
      return ALL_CATEGORY_TABS;
    case "etf":
      // ETFs have Financials + Valuation + Profile + Shareholders
      // (holdings). No Corporate Actions, no separate ETFs tab
      // (redundant when the symbol IS an ETF).
      return ["Chart", "Absorption", "Options", "Financials", "Valuation", "Shareholders", "Profile"] as const;
    case "options":
      // Viewing an options contract already IS the options view;
      // Financials/Valuation belong to the underlying, not the
      // derivative. Keep Chart + Profile only.
      return ["Chart", "Absorption", "Profile"] as const;
    case "crypto":
    case "futures":
    case "forex":
      // No corporate structure, no shareholders, no ETF wrapper.
      // Chart is the whole thing; Profile carries what little
      // reference data exists (name / venue / contract spec).
      return ["Chart", "Absorption", "Profile"] as const;
    default: {
      // Exhaustiveness guard — if CanonicalAssetClass grows, this
      // narrows to `never` and TS errors at build time.
      const _never: never = cls;
      void _never;
      return ["Chart", "Absorption", "Profile"] as const;
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
