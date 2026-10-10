"use client";

import { MARKET_DATA_DISCLOSURE_VERSION } from "@/lib/legal/legalVersion";
import { LegalPage, legalH2 } from "@/components/legal/LegalPage";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";

/** Sources and freshness as the product actually reads them (ATHOS order P0.4 / P0.6, 2026-10-05). */
export default function MarketDataDisclosure() {
  // Inside the OS shell for members: this page reads no market feed.
  usePublishOsStanding({ surface: "Market-data disclosure", feed: FEEDLESS_SURFACE });
  return (
    <LegalPage title="Market-data disclosure" version={MARKET_DATA_DISCLOSURE_VERSION}>
      <p>Every price on WM Pro carries the name of where it came from and how fresh it is. If WM Pro cannot say, it says that instead of guessing.</p>

      <h2 style={legalH2}>Freshness words</h2>
      <ul>
        <li><strong>LIVE / certified realtime</strong> — streamed from a connected source within its freshness limit.</li>
        <li><strong>DELAYED</strong> — published with a delay by the source (for example Cboe delayed options, about 15 minutes; open interest from the prior session).</li>
        <li><strong>STALE</strong> — older than its freshness limit. Shown for reference; it can never authorise an order.</li>
        <li><strong>UNAVAILABLE / UNKNOWN</strong> — no answer from the source. A blank is never shown as zero, and a missing feed is never shown as a calm market.</li>
      </ul>

      <h2 style={legalH2}>Where data comes from</h2>
      <ul>
        <li><strong>Your broker</strong> (for example tastytrade, Webull) — quotes, candles, trades, option chains and your account data, under your broker's own terms and your market-data subscriptions.</li>
        <li><strong>Public and delayed sources</strong> — for example Cboe delayed option quotes, public crypto exchange data, and SEC EDGAR filings for company fundamentals where they apply.</li>
        <li>Some company data (for example shareholders and ETF holdings) needs a separate provider and is shown as unavailable when that provider is not connected.</li>
      </ul>

      <h2 style={legalH2}>Signed tape is limited</h2>
      <p>Order-flow readings (footprints, trade bubbles, flow) need trade-by-trade data. WM Pro loads a recent window — about the last 1,000 trades — so older bars on the chart carry no trade data. The chart marks where that window begins: older bars mean <em>no data</em>, not <em>no activity</em>.</p>

      <h2 style={legalH2}>Your use of the data</h2>
      <p>Market data is licensed to you for your own use through your broker and the sources above. Do not copy, resell or redistribute it.</p>
    </LegalPage>
  );
}
