/**
 * THE SELLING STORY on a public page — product line, the life of a price
 * territory, the operating loop, and what is live today. Words come from
 * src/lib/marketing/sellingStory.ts; colours are WM tokens (graphite + warm
 * gold). Phone-first: one column under 720px, no fixed widths, 44px targets.
 *
 *   variant="full"    /welcome — every section
 *   variant="compact" /pricing and /login's marketing side — line, promise,
 *                     loop as a single quiet sentence, what is live
 *   withProductLine   false where the page's own h1 already names the product (/login)
 */
import React from "react";
import { WM } from "@/lib/design/wmTokens";
import {
  HEADLINE, OPERATING_LOOP, PRODUCT_KIND, PRODUCT_NAME, PROMISE, TERRITORY_LIFE, WHAT_IS_LIVE,
} from "@/lib/marketing/sellingStory";

const SERIF = "Georgia, 'Times New Roman', serif";

function Kicker({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: SERIF, fontSize: 11, letterSpacing: "0.24em", color: WM.gold.mark, textTransform: "uppercase" }}>{children}</div>;
}

/** The territory's life as a quiet schematic: one band, six marks. A drawing, not data. */
function TerritoryStrip() {
  return (
    <svg viewBox="0 0 600 70" role="img" aria-label="Schematic: a price territory forming, being revisited, responding, and fading into memory. A drawing, not market data."
      style={{ width: "100%", maxWidth: 720, height: "auto", display: "block" }}>
      <defs>
        <pattern id="wm-sell-hatch" patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={6} stroke={WM.gold.mark} strokeWidth={1} opacity={0.4} />
        </pattern>
      </defs>
      <rect x={40} y={24} width={520} height={22} fill="url(#wm-sell-hatch)" stroke={WM.gold.line} strokeDasharray="4 3" />
      <rect x={440} y={24} width={120} height={22} fill={WM.surface.deepest} opacity={0.55} />
      {[40, 140, 240, 340, 440, 540].map((x, i) => (
        <g key={x}>
          <circle cx={x + 10} cy={35} r={4} fill={i < 3 ? WM.gold.hero : "none"} stroke={WM.gold.hero} strokeWidth={1.4} />
          <text x={x + 10} y={64} textAnchor="middle" fontSize={11} fill={WM.text.body}>{TERRITORY_LIFE[i].stage}</text>
        </g>
      ))}
    </svg>
  );
}

export function SellingStory({ variant = "full", withProductLine = true }: { variant?: "full" | "compact"; withProductLine?: boolean }) {
  const full = variant === "full";
  return (
    <section data-testid="selling-story" data-variant={variant} aria-labelledby="selling-story-line" style={{ color: WM.text.hero, minWidth: 0 }}>
      {withProductLine ? <Kicker>{PRODUCT_KIND}</Kicker> : null}
      <h2 id="selling-story-line" style={{ fontFamily: SERIF, fontWeight: 400, fontSize: full ? 28 : 22, lineHeight: 1.2, margin: "8px 0 6px" }}>
        {withProductLine ? <span style={{ display: "block", fontSize: full ? 13 : 12, letterSpacing: "0.28em", color: WM.gold.hero }}>{PRODUCT_NAME}</span> : null}
        {HEADLINE}
      </h2>
      <p style={{ color: WM.text.body, fontSize: 14, lineHeight: 1.65, margin: 0, maxWidth: 720 }}>{PROMISE}</p>

      {full ? (
        <div style={{ marginTop: 20 }}>
          <TerritoryStrip />
          <ol style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
            {TERRITORY_LIFE.map(t => (
              <li key={t.stage} style={{ border: `1px solid ${WM.border.line}`, borderRadius: 10, padding: "10px 12px", background: WM.surface.deep }}>
                <div style={{ fontFamily: SERIF, fontSize: 15, color: WM.gold.hero }}>{t.stage}</div>
                <div style={{ fontSize: 13, color: WM.text.body, lineHeight: 1.55, marginTop: 4 }}>{t.line}</div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div style={{ marginTop: full ? 26 : 16 }}>
        <Kicker>The operating loop</Kicker>
        {full ? (
          <ol data-testid="selling-loop" style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            {OPERATING_LOOP.map((s, i) => (
              <li key={s.step} style={{ borderLeft: `2px solid ${i === OPERATING_LOOP.length - 1 ? WM.gold.hero : WM.gold.line}`, padding: "4px 10px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: WM.text.hero }}>
                  <span aria-hidden="true" style={{ color: WM.gold.mark, marginRight: 6 }}>{String(i + 1).padStart(2, "0")}</span>{s.step}
                </div>
                <div style={{ fontSize: 12, color: WM.text.body, lineHeight: 1.5, marginTop: 2 }}>{s.line}</div>
              </li>
            ))}
          </ol>
        ) : (
          <p data-testid="selling-loop" style={{ fontSize: 12, letterSpacing: "0.06em", color: WM.text.body, lineHeight: 1.8, margin: "6px 0 0" }}>
            {OPERATING_LOOP.map((s, i) => (
              <React.Fragment key={s.step}>
                <span style={{ color: i === OPERATING_LOOP.length - 1 ? WM.gold.hero : WM.text.hero, textTransform: "uppercase", whiteSpace: "nowrap" }}>{s.step}</span>
                {i < OPERATING_LOOP.length - 1 ? <span aria-hidden="true" style={{ color: WM.gold.line }}> → </span> : null}
              </React.Fragment>
            ))}
          </p>
        )}
      </div>

      <div data-testid="selling-what-is-live" style={{ marginTop: full ? 26 : 16, border: `1px solid ${WM.border.line}`, borderRadius: 10, padding: "12px 14px", background: WM.surface.deep }}>
        <Kicker>What is live today</Kicker>
        <dl style={{ margin: "8px 0 0", display: "grid", gap: 6 }}>
          {WHAT_IS_LIVE.map(w => (
            <div key={w.label} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 12, lineHeight: 1.55 }}>
              <dt style={{ color: WM.text.hero, fontWeight: 700, minWidth: 120 }}>{w.label}</dt>
              <dd style={{ margin: 0, color: WM.text.body, flex: "1 1 220px", minWidth: 0 }}>{w.line}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
