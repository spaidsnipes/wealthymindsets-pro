import { redirect } from "next/navigation";

/**
 * /heatmaps IS NOT A ROOM. IT IS AN OLD ADDRESS.
 *
 * Current authority retired the live Heatmaps Room ("multi-symbol
 * opportunity/discovery heat belongs to scanning/research job, not a live
 * Heatmaps Room" — Complete Invention Registry, F14). The cross-market map now
 * lives in the Scanner Deck as its Opportunity Map.
 *
 * The edge answers this path with a real 308 (`@/lib/legacyRouteAliases`,
 * consumed by `src/middleware.ts`). This stub is the fallback that keeps a
 * saved link working if the middleware matcher is ever narrowed — it renders
 * nothing of its own and must never grow a map back.
 */
export default function RetiredHeatmapsRoom() {
  redirect("/scanner/map");
}
