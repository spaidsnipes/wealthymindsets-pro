import { NextRequest, NextResponse } from "next/server";
import { ttGet, tastytradeConfigStatus } from "@/lib/tastytrade";
import { requireAuth } from "@/lib/requireAuth";
import {
  TASTYTRADE_INSTRUMENT_TYPES,
  compileByTypeOutcome,
  planMarketDataByTypeQuery,
  type SymbolGroups,
} from "@/lib/marketData/tastytradeByType";

/**
 * GET /api/broker/tastytrade/market-data
 *
 * Server-only proxy for tastytrade's GET /market-data/by-type. Session-gated.
 * Never returns a token or a secret VALUE — symbols and quotes only.
 *
 * Query shape mirrors the provider's own grouping so nothing is translated
 * behind the caller's back. Either form is accepted per group:
 *
 *     ?equity=AAPL,TSLA&index=SPX
 *     ?equity[]=AAPL&equity[]=TSLA&index[]=SPX
 *
 * Every answer — including every failure — comes back 200 with an `outcome` of
 * SERVED / NOT_ASKED / REFUSED / EMPTY. A refusal is a FACT worth rendering,
 * and the one thing this route must never do is collapse it to null one frame
 * below the glass, which is exactly how four surfaces ended up printing
 * UNKNOWN about data the product already had (see compileBarHistoryRefusal.ts).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const params = req.nextUrl.searchParams;
  const groups: SymbolGroups = {};
  for (const type of TASTYTRADE_INSTRUMENT_TYPES) {
    const values = [...params.getAll(type), ...params.getAll(`${type}[]`)]
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length > 0) groups[type] = values;
  }

  const plan = planMarketDataByTypeQuery(groups);

  if (plan.path === null) {
    return json(
      compileByTypeOutcome({
        notAskedReason: `no symbols were supplied. Name at least one of: ${TASTYTRADE_INSTRUMENT_TYPES.join(", ")} (e.g. ?equity=AAPL,TSLA).`,
        droppedOverCap: plan.droppedOverCap,
      }),
      plan,
    );
  }

  const cfg = tastytradeConfigStatus();
  if (!cfg.configured) {
    // OURS, and said as ours. The NAMES measured absent — never a guessed one,
    // and never a value.
    return json(
      compileByTypeOutcome({
        notAskedReason: `tastytrade is not configured on this host runtime — ${cfg.missing.join(" + ")} ${cfg.missing.length === 1 ? "is" : "are"} absent. Set ${cfg.missing.length === 1 ? "it" : "them"} in the host runtime secrets and redeploy.`,
        droppedOverCap: plan.droppedOverCap,
      }),
      plan,
    );
  }

  try {
    const data = await ttGet<{ data?: { items?: unknown[] } }>(plan.path);
    return json(
      compileByTypeOutcome({
        items: data?.data?.items ?? [],
        droppedOverCap: plan.droppedOverCap,
      }),
      plan,
    );
  } catch (e) {
    // ttGet throws STATUS-ONLY messages (never bodies, never tokens), so the
    // provider's own edge token can travel intact to the caller.
    const edge = e instanceof Error ? e.message : "an unclassified error";
    return json(
      compileByTypeOutcome({ refusedEdge: edge, droppedOverCap: plan.droppedOverCap }),
      plan,
    );
  }
}

function json(
  result: ReturnType<typeof compileByTypeOutcome>,
  plan: ReturnType<typeof planMarketDataByTypeQuery>,
) {
  return NextResponse.json(
    {
      ...result,
      observedAt: new Date().toISOString(),
      asked: plan.asked,
      totalAsked: plan.totalAsked,
      droppedOverCap: plan.droppedOverCap,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
