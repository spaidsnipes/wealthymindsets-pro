import { redirect } from "next/navigation";

/**
 * /backtest IS A TYPO-SHAPED ADDRESS, NOT A ROOM. The Backtest room is
 * /backtesting. The edge answers this path with a real 308
 * (`@/lib/legacyRouteAliases`, consumed by `src/middleware.ts`); this stub is
 * the fallback if the middleware matcher is ever narrowed.
 */
export default function BacktestAlias() {
  redirect("/backtesting");
}
