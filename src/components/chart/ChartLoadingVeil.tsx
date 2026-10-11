"use client";

/**
 * THE CHART'S FIRST SECONDS (Founder 2026-10-11: "show this cinematic OS on social media and YouTube,
 * then people come to the app and have issues" — the burger that does not look like the commercial).
 * Measured on a phone: a futures chart sat 17–28 s as an empty black pane before its first bar.
 *
 * While the camera holds NO bars, the pane shows faint gold placeholder candles breathing and says
 * what is happening in plain words. It claims nothing about the market: no price, no shape — the
 * placeholder is a fixed silhouette, not data. After STILL_WAITING_MS it says the source has not
 * answered yet instead of pretending to load forever. It leaves the moment the first bar arrives.
 */
import React from "react";

export const STILL_WAITING_MS = 20_000;
const SILHOUETTE = [38, 52, 44, 61, 57, 70, 64, 78, 72, 66, 74, 83, 79, 88, 84] as const;

export function ChartLoadingVeil({ symbol, timeframe }: { symbol: string; timeframe: string }): React.ReactElement {
  const [still, setStill] = React.useState(false);
  React.useEffect(() => {
    setStill(false);
    const t = window.setTimeout(() => setStill(true), STILL_WAITING_MS);
    return () => window.clearTimeout(t);
  }, [symbol, timeframe]);
  return (
    <div className="wm-chart-loading-veil" role="status" aria-live="polite" data-testid="chart-loading-veil" data-still-waiting={still ? "1" : "0"}>
      <div className="wm-chart-loading-silhouette" aria-hidden="true">
        {SILHOUETTE.map((h, i) => (
          <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="wm-chart-loading-words">
        {still
          ? <>Still waiting for {symbol} · {timeframe} bars — the source has not answered yet</>
          : <>Loading {symbol} · {timeframe} bars…</>}
      </div>
    </div>
  );
}

export default ChartLoadingVeil;
