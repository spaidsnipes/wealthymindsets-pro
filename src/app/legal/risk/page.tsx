"use client";

import Link from "next/link";
import { LegalPage, legalH2 } from "@/components/legal/LegalPage";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";

/** Written from what the product actually does (ATHOS order P0.4, 2026-10-05). */
export default function RiskDisclosure() {
  // Inside the OS shell for members: this page reads no market feed.
  usePublishOsStanding({ surface: "Risk disclosure", feed: FEEDLESS_SURFACE });
  return (
    <LegalPage title="Risk disclosure" version="2026-10-05">
      <p>Trading stocks, options, futures, futures options and crypto can lose money quickly, including more than you put in on leveraged products such as futures and short options. Only trade with money you can afford to lose.</p>

      <h2 style={legalH2}>What WM Pro is — and is not</h2>
      <p>WM Pro is chart, analysis, journaling and education software. Its readings, scores, WAIT / READY states, walls, envelopes, SpaidBot answers and community posts are information, <strong>not investment advice</strong> and not a recommendation to buy or sell anything. You decide every trade.</p>
      <p>Many readings are labelled by how they were made — <em>observed</em>, <em>derived</em>, <em>estimated</em>, <em>inferred</em> or <em>simulated</em>. Options exposure and dealer-hedging readings are <strong>models built on stated assumptions</strong>; they are not knowledge of anyone's actual positions, and they do not predict direction.</p>

      <h2 style={legalH2}>Orders</h2>
      <ul>
        <li>WM Pro never places an order on its own. An order reaches your broker only after you arm live trading, set your per-order ceilings in Settings › Execution, and confirm the order yourself.</li>
        <li>Live trading starts <strong>disarmed</strong>. An order whose ceiling is not set is refused.</li>
        <li>Your broker — not WM Pro — executes, holds and reports your positions. Fills, fees and protection are what your broker states.</li>
        <li>An order WM Pro cannot confirm is shown as unknown and reconciled with your broker; it is never re-sent blindly.</li>
      </ul>

      <h2 style={legalH2}>Paper trading and backtests</h2>
      <p>Paper trading and backtests are simulations. They state their assumptions (for example: entry at the next bar's open, no commissions or slippage modelled). Real results will differ and are usually worse.</p>

      <h2 style={legalH2}>Data can be late or wrong</h2>
      <p>Prices and market data come from third parties and can be delayed, incomplete or wrong. A stale price is labelled as stale and can never authorise an order. See the <Link href="/legal/market-data" style={{ color: "#c9a55c" }}>market-data disclosure</Link>.</p>
    </LegalPage>
  );
}
