/**
 * WHAT "PREVIEW AT WEBULL" MAY BE ASKED TO PRICE — one answer, read by the
 * button AND by the route.
 *
 * ── FOUND ON /charts, 2026-09-26 (audit at 3ff5cd7) ──────────────────────────
 *
 * The Risk Receipt bar rendered an ENABLED "Preview buy 1 ES1! @ …" under a
 * drawn plan on ES1!, GC1!, BTCUSD and SPX, and the preview route stamped
 * `assetClass: "equity"` on every intent it built. So the order module's own
 * refusal — "Only US equities are wired for Webull orders; … is refused rather
 * than approximated" (`mapToWebullStockOrder`) — could never fire: the route
 * had already told it every symbol was a stock. A futures contract would have
 * gone to Webull as `instrument_type: "EQUITY"` with a share count.
 *
 * Garden 16 §19: UNSUPPORTED MAY NEVER LOOK HEALTHY. An enabled button is the
 * healthiest thing a control can look like.
 *
 * ── WHY THIS IS NOT A SECOND CLASSIFIER ─────────────────────────────────────
 *
 * The class comes from `classifySymbol` (symbolAssetClass.ts), the one owner
 * of "what kind of instrument is this". This module owns only what THIS
 * venue's preview does with that answer — the same division that file draws
 * ("this module owns what the symbol IS, not who will trade it"). It lives
 * apart from `webullOrders.ts` because that module imports node `crypto` and
 * the button is client code.
 */
import type { UniversalOrderIntent } from "@/lib/broker/BrokerAdapter";
import { classifySymbol, type AssetClass } from "@/lib/marketData/symbolAssetClass";

export type WebullPreviewScope =
  | {
      readonly eligible: true;
      readonly assetClass: "EQUITY";
      /** The order-intent word the route stamps — DERIVED here, never typed there. */
      readonly orderAssetClass: Extract<UniversalOrderIntent["assetClass"], "equity">;
    }
  | {
      readonly eligible: false;
      readonly assetClass: Exclude<AssetClass, "EQUITY">;
      /** The named, non-healthy refusal the glass and the route both print. */
      readonly refusal: string;
    };

const CLASS_NOUN: Readonly<Record<Exclude<AssetClass, "EQUITY">, string>> = {
  FUTURES: "futures",
  CRYPTO: "crypto",
  INDEX: "an index",
  FOREX: "forex",
  // UNKNOWN is refused too: "unrecognised" and "a stock" are different facts
  // (symbolAssetClass.ts), and an order path may not round one into the other.
  UNKNOWN: "a symbol it cannot classify",
};

export function webullPreviewScope(symbol: string): WebullPreviewScope {
  const assetClass = classifySymbol(symbol);
  if (assetClass === "EQUITY") return { eligible: true, assetClass, orderAssetClass: "equity" };
  const shown = (symbol ?? "").trim().toUpperCase() || "this symbol";
  return {
    eligible: false,
    assetClass,
    refusal: `Equities only — this preview cannot price ${CLASS_NOUN[assetClass]} (${shown}). Nothing is sent to Webull.`,
  };
}
