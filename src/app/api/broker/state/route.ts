import { NextResponse } from "next/server";
import { getBrokerState, type CanonicalBrokerState } from "../../../../lib/broker/brokerState";

/**
 * /api/broker/state
 *
 * The ONE Canonical Broker State surface (Founder P0 "Prove one Canonical
 * Broker State"). Aggregates every registered broker adapter's health +
 * authenticated accounts into one normalized shape. Consumers (portfolio,
 * order-ticket account picker, Decision Receipt) read this — never a raw
 * per-broker response.
 *
 * Honest today: shipped adapters stub listAccounts to [], so this returns a
 * zero-account state (never a fabricated portfolio) until the adapters are
 * wired to real authenticated reads. Never returns tokens/secrets.
 */
export async function GET(): Promise<NextResponse<CanonicalBrokerState>> {
  const state = await getBrokerState();
  return NextResponse.json(state, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
