/**
 * aggressorTapeReason — why does THIS symbol have no signed tape right now?
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE MEASURED FAILURE (2026-09-11)
 *
 * `SmartMoneyPanel` renders, in place of the delta tug-of-war, a hand-typed
 * paragraph that recites every asset class at once:
 *
 *   "No per-trade buy/sell side on this feed yet… Crypto (BTC/ETH/SOL…)
 *    carries them 24/7; stocks carry them while the market is open. Futures
 *    have no aggressor tape wired up here yet. We won't fake a winner."
 *
 * The refusal to fake a winner is right and is kept. Three things about the
 * paragraph are not.
 *
 * ONE — it does not say which case the trader is IN. The distinction this
 * codebase spent a shift establishing, "not right now" versus "not carried at
 * all", is handed to the trader as a menu to choose from. A trader on NQ1! and
 * a trader on AAPL at 03:00 read the identical sentence and have to work out
 * which clause is theirs.
 *
 * TWO — "stocks carry them while the market is open" is not true as written.
 * Signed equity prints come from the moomoo / webull / longbridge lanes, and
 * an unconfigured provider produces none at 14:30 either. The sentence tells a
 * trader to wait for a bell that will not fix it.
 *
 * THREE — "Futures have no aggressor tape wired up here yet" is a claim about
 * `capabilityRegistry`, typed into JSX. The registry is the owner of which
 * asset classes have a signed source. On the day a futures tape lands, that
 * paragraph keeps saying it has not — the same restated-fact defect as the four
 * routes that each hand-typed "is this futures".
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHAT THIS OWNS
 *
 * One sentence, derived from two existing owners and no third opinion:
 *   · `symbolAssetClass.classifySymbol` — what KIND of instrument this is
 *   · `capabilityRegistry` — which classes have a REVIEWED signed-tape source
 *
 * Nothing about asset-class coverage is typed here. `CLASSES_WITH_SIGNED_TAPE`
 * is computed from the registry's own rows, so a new signed source changes this
 * sentence on the day its entry lands, with no edit to this file and none to
 * the panel.
 */

import { classifySymbol, type AssetClass } from "./symbolAssetClass";
import {
  MARKET_DATA_CAPABILITIES,
  type MarketAssetClass,
} from "./capabilityRegistry";

/**
 * The class vocabularies are different because the questions are different:
 * `AssetClass` answers "what is this symbol", `MarketAssetClass` answers "what
 * does this capability row cover". This is the seam between them, and it is a
 * total Record so adding an `AssetClass` member fails the typecheck here
 * instead of quietly resolving to "no coverage" on screen.
 */
const REGISTRY_CLASS: Record<AssetClass, readonly MarketAssetClass[]> = {
  EQUITY: ["equity", "etf"],
  CRYPTO: ["crypto"],
  FUTURES: ["futures"],
  FOREX: ["forex"],
  INDEX: [],
  UNKNOWN: [],
};

/**
 * Asset classes for which a REVIEWED capability row claims a signed aggressor
 * trade source. Derived, never listed: `aggressorMethod: "NONE"` means the row
 * carries prints without a side, which is not a tape a delta can be built from.
 */
const CLASSES_WITH_SIGNED_TAPE: ReadonlySet<MarketAssetClass> = new Set(
  MARKET_DATA_CAPABILITIES
    .filter(
      (entry) =>
        entry.eventType === "trade" &&
        entry.aggressorMethod !== "NONE" &&
        entry.availability !== "UNAVAILABLE",
    )
    .map((entry) => entry.assetClass),
);

export interface AggressorTapeReason {
  /** The class this symbol was read as — so the caller can attribute the claim. */
  readonly assetClass: AssetClass;
  /**
   * NOT_CARRIED — no reviewed source signs a side for this class at all.
   * NOT_FLOWING — a source exists for this class but has produced no print.
   * UNRECOGNISED — the symbol itself was not understood.
   *
   * The three are deliberately separate. Collapsing NOT_CARRIED into
   * NOT_FLOWING is the "try again later" lie; collapsing the other way tells a
   * trader to give up on a feed that is merely asleep.
   */
  readonly kind: "NOT_CARRIED" | "NOT_FLOWING" | "UNRECOGNISED";
  readonly sentence: string;
}

/**
 * Explain the absence of a signed tape for one symbol.
 *
 * Returns null when a tape IS flowing — this module speaks only about absence,
 * and a function that also narrated success would end up being the surface's
 * second opinion about whether there is data.
 */
export function aggressorTapeReason(
  symbol: string,
  hasSignedTape: boolean,
): AggressorTapeReason | null {
  if (hasSignedTape) return null;

  const assetClass = classifySymbol(symbol);
  const shown = symbol?.trim().toUpperCase() || "this symbol";

  if (assetClass === "UNKNOWN") {
    return {
      assetClass,
      kind: "UNRECOGNISED",
      sentence: `${shown} was not recognised as an instrument WM knows, so no tape was requested for it. Unrecognised is not the same as empty.`,
    };
  }

  const covered = REGISTRY_CLASS[assetClass].some((klass) => CLASSES_WITH_SIGNED_TAPE.has(klass));
  if (!covered) {
    return {
      assetClass,
      kind: "NOT_CARRIED",
      sentence: `No source WM reads signs a buy/sell side for ${assetClass.toLowerCase()}, so there is no tug-of-war to measure on ${shown}. This is not absent right now — it is not carried here at all, and waiting will not change it.`,
    };
  }

  return {
    assetClass,
    kind: "NOT_FLOWING",
    sentence: `A signed ${assetClass.toLowerCase()} tape is carried, but no provider has delivered a sided print for ${shown} yet. Check the provider wire before reading anything into the silence — an unconfigured or blocked feed looks exactly like a quiet one.`,
  };
}
