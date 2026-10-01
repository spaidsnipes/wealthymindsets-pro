/**
 * THE INSTRUMENT CONTEXT STRIP — Garden 18 §VIII.
 *
 * "Restore a secondary strip attached to the current instrument … This is
 * INSTRUMENT CONTEXT. Not primary navigation." The views existed (category
 * tabs) but on desktop the room header that held them was retired
 * (V01 ONE CANVAS) and they were rehomed behind Tools › Chart tools › Views,
 * one sheet deep — the Founder: "the useful instrument-specific context
 * disappeared".
 *
 * One owner decides the strip per asset class. Every entry is either a real
 * view this room already renders (a category tab), a real House room scoped
 * to the instrument (News), or DISABLED with the true reason — never a dead
 * button and never a capability the connected providers do not have.
 *
 * PURE.
 */

import type { CategoryTab } from "@/lib/charts/categoryTabsFor";
import type { CanonicalAssetClass } from "@/lib/marketData/canonicalIdentity";

export type ContextEntry =
  | { readonly id: string; readonly label: string; readonly kind: "TAB"; readonly tab: CategoryTab }
  | { readonly id: string; readonly label: string; readonly kind: "ROOM"; readonly href: string }
  | { readonly id: string; readonly label: string; readonly kind: "DISABLED"; readonly reason: string }
  /** A sidecar over the live chart that tells its own connection truth. */
  | { readonly id: string; readonly label: string; readonly kind: "PANEL"; readonly panel: "FUTURES_OPTIONS" };

export const NO_FUTURES_OPTIONS_CHAIN =
  "No futures-options chain is connected: Webull's futures data needs its CME/CBOT/COMEX/NYMEX OpenAPI package and tastytrade is not connected.";
export const NO_CRYPTO_DERIVATIVES_CHAIN =
  "No tradeable crypto-derivatives chain is connected. Deribit's public options feed is read for Market Sense (Derivatives Pressure) only.";

const news = (symbol: string): ContextEntry => ({
  id: "news",
  label: "News / Research",
  kind: "ROOM",
  href: `/news?q=${encodeURIComponent(symbol)}`,
});

export function instrumentContextStrip(cls: CanonicalAssetClass, symbol: string): readonly ContextEntry[] {
  const overview: ContextEntry = { id: "overview", label: "Overview", kind: "TAB", tab: "Chart" };
  switch (cls) {
    case "equity":
    case "etf":
      return [
        overview,
        { id: "options", label: "Options", kind: "TAB", tab: "Options" },
        { id: "financials", label: "Financials", kind: "TAB", tab: "Financials" },
        news(symbol),
      ];
    case "futures":
      return [
        overview,
        // tastytrade's futures-option chain (Garden 18 §LXXXI): the panel itself
        // says when the connection is not there — never a dead button.
        { id: "futures-options", label: "Futures Options", kind: "PANEL", panel: "FUTURES_OPTIONS" },
        { id: "contract", label: "Contract", kind: "TAB", tab: "Profile" },
        news(symbol),
      ];
    case "crypto":
      return [
        overview,
        { id: "derivatives", label: "Derivatives", kind: "DISABLED", reason: NO_CRYPTO_DERIVATIVES_CHAIN },
        { id: "market-info", label: "Market Info", kind: "TAB", tab: "Profile" },
        news(symbol),
      ];
    case "forex":
      return [overview, { id: "market-info", label: "Market Info", kind: "TAB", tab: "Profile" }, news(symbol)];
    case "options":
      return [overview, { id: "contract", label: "Contract", kind: "TAB", tab: "Profile" }, news(symbol)];
    default: {
      const never: never = cls;
      void never;
      return [overview, news(symbol)];
    }
  }
}
