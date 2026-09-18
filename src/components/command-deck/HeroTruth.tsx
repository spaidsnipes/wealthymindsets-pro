"use client";
import * as React from "react";
import type { CanonicalMarketState } from "@/lib/marketData/canonicalMarketState";
import {
  MARKET_STATE_DIMENSION_KEYS,
  dimensionName,
  partitionDimensionStandings,
} from "@/lib/marketData/canonicalMarketState";
import { selectHeroPriceChronology } from "@/lib/marketData/heroTruthChronology";
import { selectPriceEvidence } from "@/lib/marketData/formatSpinePrice";

/**
 * HeroTruth — the ONE dominant first-second message on /command-deck.
 *
 * Founder Aug-14 correction: "Right now determine what the Command Deck's
 * dominant first-second message should be from actual available canonical
 * data."
 *
 * Renders SYMBOL / TIMEFRAME / PRICE with a large truthful qualityState
 * verdict as the hero. Zero fabrication — when state is null the panel
 * says exactly that.
 *
 * 1/3/1 rule: this panel commits to the 1-second layer. STORY / DLAR /
 * DATA / WHY handle the 3s + drill-through layers.
 */

const QUALITY_STYLES: Record<
  "LIVE" | "DELAYED" | "STALE" | "PARTIAL" | "PROXY" | "REPLAY" | "UNAVAILABLE" | "UNKNOWN",
  { color: string; glyph: string; label: string; halo: string }
> = {
  LIVE:        { color: "#5cb85c", glyph: "●", label: "Live",         halo: "rgba(92,184,92,0.15)" },
  DELAYED:     { color: "#c9a55c", glyph: "◐", label: "Delayed",      halo: "rgba(201,165,92,0.15)" },
  STALE:       { color: "#c05a4a", glyph: "!", label: "Stale",        halo: "rgba(192,90,74,0.15)" },
  PARTIAL:     { color: "#c9a55c", glyph: "◐", label: "Partial",      halo: "rgba(201,165,92,0.10)" },
  PROXY:       { color: "#8a8271", glyph: "≈", label: "Proxy",        halo: "rgba(139,106,41,0.15)" },
  REPLAY:      { color: "#8a8271", glyph: "⟲", label: "Replay",       halo: "rgba(139,106,41,0.15)" },
  UNAVAILABLE: { color: "#55503f", glyph: "—", label: "Unavailable",  halo: "rgba(85,80,63,0.15)" },
  UNKNOWN:     { color: "#55503f", glyph: "?", label: "Not yet observed", halo: "rgba(85,80,63,0.15)" },
};

export interface HeroTruthProps {
  symbol: string;
  timeframe: string;
  state: CanonicalMarketState | null;
  /** Optional dominant one-second market verdict (e.g. 'BALANCE',
   *  'EXPANSION', 'UNKNOWN'). When absent, only the quality state
   *  badge is shown. Never fabricated — pass 'UNKNOWN' honestly
   *  when the underlying engine cannot resolve a chapter. */
  marketState?: string | null;
  marketStateResolution?: "RESOLVED" | "PARTIAL" | "UNKNOWN";
  /**
   * The PRESENTED session, from the one session owner
   * (`selectCanonicalSessionToken` / `selectCanonicalSessionPresentation`).
   *
   * This prop exists because the truth strip used to render
   * `state?.session`, and `CanonicalMarketState.session` is NOT a session
   * observation — it is the STORE KEY. `canonicalMarketStateStore` builds its
   * key out of that field, so `canonicalSession()` deliberately answers "RTH"
   * for every non-crypto instrument on every day of the week; if it varied by
   * day the store would fragment at midnight. The producers are correct. The
   * RENDER was the defect: a keyspace label printed to a human under the bare
   * word "session".
   *
   * On Saturday 2026-09-05 production showed `session RTH` in this strip while
   * the scene panel directly below it read "SESSION CLOSED — LAST VERIFIED."
   * One page, one instant, one instrument, two contradicting claims.
   *
   * When the caller cannot supply this, the strip says "unknown". It must
   * never fall back to `state.session` — that fallback IS the bug.
   */
  sessionPresented?: { readonly value: string; readonly detail?: string } | null;
  /**
   * `room` keeps the same truth hierarchy while returning enough vertical
   * space for MARKET / RISK / NEXT to enter the Founder desktop viewport.
   * The default remains the larger standalone hero treatment.
   */
  density?: "hero" | "room";
  className?: string;
}

function formatPrice(p: number): string {
  if (p >= 10_000) return p.toFixed(0);
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(5);
}

/**
 * The vendor half of a provider path.
 *
 * Coverage channels stamp `providerPath` as vendor-first slugs — `finnhub-rest`,
 * `webull-openapi-ticks`, `coinbase-client-ws`. The Founder's 2026-09-12
 * truth-surface law asks for SOURCE to be directly inspectable, with
 * FEED/ENTITLEMENT one interaction deeper. Vendor is the source; the rest of
 * the path is the feed. Taking the segment before the first hyphen makes that
 * split without a second registry.
 *
 * An empty or hyphen-first path collapses to null, which the strip renders as
 * "unknown" — the honest state when nothing has stamped a vendor onto the
 * observation. Never invented, never defaulted to a placeholder brand.
 */
export function heroSourceVendor(providerPath: string): string | null {
  const trimmed = providerPath.trim().toLowerCase();
  if (!trimmed) return null;
  const vendor = trimmed.split("-")[0];
  return vendor.length > 0 ? vendor : null;
}

/**
 * The SOURCE line for the hero truth strip.
 *
 * Distinct vendors, in first-seen order, so one vendor answering on many
 * channels does not shout louder than another vendor answering on one. The
 * `label` is the compact form the strip prints; `detail` lists every raw
 * providerPath and is surfaced via `title` for the one-interaction-deeper
 * disclosure the law permits.
 *
 * No coverage at all → "unknown". A LIVE role beside an unknown source is a
 * legitimate CONFLICTED read the Founder wants the eye to catch — the strip
 * must not paper over it with a default brand.
 */
export function selectHeroSourceDisclosure(
  coverage: readonly { providerPath: string }[] | undefined,
): { label: string; detail: string } {
  const vendors: string[] = [];
  const paths: string[] = [];
  for (const c of coverage ?? []) {
    const v = heroSourceVendor(c.providerPath);
    if (!v) continue;
    paths.push(c.providerPath);
    if (!vendors.includes(v)) vendors.push(v);
  }
  if (vendors.length === 0) return { label: "unknown", detail: "no source has stamped an observation yet" };
  const label = vendors.length === 1 ? vendors[0] : `${vendors[0]} +${vendors.length - 1}`;
  return { label, detail: paths.join(", ") };
}

export function shouldShowMarketStateResolutionQualifier(
  marketState: string | null | undefined,
  resolution: HeroTruthProps["marketStateResolution"],
): boolean {
  if (!marketState || !resolution || resolution === "RESOLVED") return false;
  return marketState.trim().toUpperCase() !== resolution;
}

export function HeroTruth({
  symbol,
  timeframe,
  state,
  marketState,
  marketStateResolution,
  sessionPresented,
  density = "hero",
  className,
}: HeroTruthProps) {
  const isRoomDensity = density === "room";
  const qualityKey: keyof typeof QUALITY_STYLES = state?.qualityState ?? "UNKNOWN";
  const style = QUALITY_STYLES[qualityKey];
  // ONE owner decides WHICH price fact wins; this component decides only how
  // to draw it. Reading `state.price.last` directly here — as this line used
  // to — made the hero blind to a bar close the spine below was already
  // printing, so the deck showed `?` above `356.58 LAST 15m BAR CLOSE`.
  // See selectPriceEvidence for the measurement.
  const priceEvidence = selectPriceEvidence(
    state?.price.last,
    state?.lastBar?.close,
    state?.lastBar?.timeframe,
  );
  const price = priceEvidence.value;
  // canon §fail-closed hero chronology (heroTruthChronology adapter):
  // a transport/server receipt timestamp is not proof of market
  // observation time. Only a LIVE packet with a valid observed →
  // available → captured chronology may display an exact age. Every
  // other packet (DELAYED / PROXY / REPLAY / STALE) surfaces
  // UNVERIFIED — never turning a receipt-time delta into market truth.
  const priceChronology = selectHeroPriceChronology(state ?? null);
  const showResolutionQualifier = shouldShowMarketStateResolutionQualifier(marketState, marketStateResolution);
  // Founder truth-surface law (2026-09-12): "Minimum directly inspectable: role
  // + asOf + source." Role is the qualityState glyph above; asOf is the price
  // chronology label. Source came from nowhere — the strip printed a channel
  // COUNT ("coverage 1 channel") without ever saying WHICH vendor. A trader
  // could read LIVE / DELAYED / STALE and not know whether that verdict came
  // from Finnhub, Webull, or an unreviewed feed. This closes that hole in the
  // same strip, one interaction deeper for the raw providerPath list.
  const sourceDisclosure = selectHeroSourceDisclosure(state?.coverage);

  return (
    <section
      role="banner"
      aria-label={`${symbol} ${timeframe} — market state ${style.label}`}
      className={["wm-hero-truth", className ?? ""].join(" ")}
      style={{
        // SCENE_FRAGMENTATION cure (Founder audit 2026-09-13): a full
        // state-colored border + halo gradient + glow made the hero
        // read as "the app" — a boxed dashboard card announcing itself.
        // The founder brief specifically bans the glowing-orb treatment
        // ("brass radial wash, not a glowing orb") and asks for
        // "localized state tint only where semantically owned."
        //
        // The state tint now lives on ONE left-edge accent (the same
        // grammar AvailableRChip uses). Padding, spacing, and typography
        // remain the hero-scale treatment they were — this stops the
        // component from walling itself off, without dropping the
        // hierarchy that says "this is the dominant 1-second read."
        borderLeft: `3px solid ${style.color}`,
        padding: isRoomDensity ? "10px 14px 10px 18px" : "18px 22px 18px 24px",
        background: "transparent",
      }}
    >
      {/* Founder brief 2026-09-13 §7 "NOW MUST BELONG TO MARKET" — the
          "COMMAND DECK · HERO TRUTH" chip labelled the section as a
          separate app inside the room. The sanctuary shell already tells
          the trader they're on the deck; the chip did nothing but shorten
          the vertical budget for what MARKET actually needs to see. In
          room density the section rides its state-tint left accent and
          the symbol below — no separate "this-is-hero-truth" chip. Hero
          density retains its label because non-room usages (splash-style
          screens, storybook, tests) still find it descriptive. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isRoomDensity ? 6 : 10, flexWrap: "wrap" }}>
        {!isRoomDensity && (
          <>
            <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>
              Command Deck
            </span>
            <span style={{ fontSize: 10, color: "#55503f" }}>·</span>
            <span style={{ fontSize: 10, letterSpacing: 0.3, textTransform: "uppercase", color: "#8a8271" }}>
              hero truth
            </span>
          </>
        )}
        {isRoomDensity && marketStateResolution === "UNKNOWN" && marketState && (
          <span
            aria-label={`Market state ${marketState}`}
            style={{
              marginLeft: "auto",
              fontSize: 10,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "#8a8271",
            }}
          >
            Market state {marketState}
          </span>
        )}
      </div>

      {/* MARKET STATE hero — the founder-defined one-second verdict.
          Renders when the Story engine has produced a chapter (RESOLVED
          or PARTIAL). When UNKNOWN, we still render honestly so the
          trader sees the system's genuine state — not a fabricated
          BALANCE. When the caller passes no marketState at all we skip
          this block entirely and let SYMBOL take the dominant role
          (the pre-Aug-16 behavior). */}
      {marketState && !(isRoomDensity && marketStateResolution === "UNKNOWN") && (
        <div style={{ marginBottom: isRoomDensity ? 3 : 6, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              // Fluid across device classes: ~28px on a 390px phone, scaling to
              // 44px on desktop. Chapter names like TREND_EXPANSION /
              // OPENING_AUCTION overflowed a phone at a fixed 44px.
              fontSize: isRoomDensity ? "clamp(24px, 4vw, 34px)" : "clamp(26px, 7.5vw, 44px)",
              lineHeight: 1.05,
              letterSpacing: 0.6,
              color:
                marketStateResolution === "UNKNOWN" ? "#55503f" :
                marketStateResolution === "PARTIAL" ? "#c9a55c" :
                                                       "#ede6d3",
              textTransform: "uppercase",
              fontWeight: 400,
              display: "inline-block",
              maxWidth: "100%",
              overflowWrap: "anywhere",
            }}
            aria-label={`Market state ${marketState}${showResolutionQualifier ? ` (${marketStateResolution!.toLowerCase()})` : ""}`}
          >
            {marketState}
          </span>
          {showResolutionQualifier && (
            <span style={{ marginLeft: 10, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#8a8271" }}>
              {marketStateResolution!.toLowerCase()}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap", minWidth: 0 }}>
        <span
          style={{
            fontSize: "clamp(24px, 6vw, 32px)",
            fontWeight: 800,
            letterSpacing: 0.4,
            color: "#ede6d3",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {symbol}
        </span>
        <span
          style={{
            fontSize: 12,
            letterSpacing: 0.28,
            textTransform: "uppercase",
            color: "#8a8271",
            fontWeight: 700,
          }}
        >
          {timeframe}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span
            aria-hidden="true"
            style={{ color: style.color, fontSize: 18, fontWeight: 700 }}
          >
            {style.glyph}
          </span>
          <span
            style={{
              fontSize: 11,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: style.color,
              fontWeight: 800,
            }}
          >
            {style.label}
          </span>
        </span>
      </div>

      <div style={{ marginTop: isRoomDensity ? 8 : 14, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        {price != null ? (
          <span
            style={{
              fontSize: isRoomDensity ? "clamp(36px, 7vw, 48px)" : "clamp(40px, 12vw, 60px)",
              fontWeight: 400,
              color: "#ede6d3",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.02,
              letterSpacing: -0.5,
              fontFamily: "Georgia, 'Times New Roman', serif",
              textShadow: `0 2px 40px ${style.color}30`,
            }}
            aria-label={
              priceEvidence.qualifier
                ? `Price ${price}, ${priceEvidence.qualifier.toLowerCase()}`
                : `Price ${price}`
            }
          >
            {formatPrice(price)}
          </span>
        ) : (
          <span
            style={{
              // Founder brief 2026-09-13 five-second test — MARKET must
              // be dominant. Absence of price is NOT the room's headline;
              // the chart below is. Room density compresses the "?"
              // placeholder aggressively so it reads as a chip beside
              // SPY, not a hero glyph competing with the chart.
              fontSize: isRoomDensity ? "clamp(18px, 3vw, 24px)" : "clamp(40px, 12vw, 60px)",
              fontWeight: 400,
              color: "#55503f",
              lineHeight: 1.02,
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
            aria-label="Price not yet observed"
          >
            ?
          </span>
        )}
        {/*
          A BAR CLOSE DRAWN AT HERO SIZE WITHOUT THIS CHIP IS A PRINT CLAIM.
          The glyph is identical either way — only this word separates "the
          tape just traded here" from "this is where the last candle ended".
          It is rendered from the same selector that produced the number, so
          the number and its provenance cannot be separated by a later edit
          that touches only one of them.
        */}
        {priceEvidence.qualifier != null && (
          <span
            data-testid="hero-price-provenance"
            data-provenance={priceEvidence.provenance}
            style={{
              fontSize: isRoomDensity ? 10 : 11,
              letterSpacing: 1.1,
              textTransform: "uppercase",
              color: "#8a8271",
              fontFamily: "system-ui, -apple-system, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            {priceEvidence.qualifier}
          </span>
        )}
        {priceChronology.label != null && (
          <span
            data-testid="hero-price-chronology"
            data-chronology-state={priceChronology.state}
            title={priceChronology.detail}
            style={{
              fontSize: 10,
              // OBSERVED_AGE renders in the usual muted gold; UNVERIFIED
              // renders dimmer so a trader can visually tell "we don't
              // know the true age" from "here it is".
              color: priceChronology.state === "OBSERVED_AGE" ? "#8a8271" : "#55503f",
              letterSpacing: 0.3,
              textTransform: "uppercase",
              fontStyle: priceChronology.state === "OBSERVED_AGE" ? "normal" : "italic",
            }}
          >
            {priceChronology.state === "OBSERVED_AGE"
              ? `price ${priceChronology.label}`
              : priceChronology.label}
          </span>
        )}
      </div>

      {/* Truth strip — what canonical evidence exists RIGHT NOW */}
      <div style={{ marginTop: isRoomDensity ? 10 : 16, paddingTop: isRoomDensity ? 8 : 12, borderTop: "1px solid rgba(139,106,41,0.2)", display: "flex", gap: isRoomDensity ? 14 : 20, flexWrap: "wrap", fontSize: 10, color: "#8a8271", letterSpacing: 0.24 }}>
        {/* The session owner answers here, NOT the snapshot's store key. See
            the `sessionPresented` prop doc: `state.session` is the keyspace
            ("RTH" on a Saturday, by design), and printing it produced a strip
            that contradicted the scene panel below it. There is deliberately
            no `?? state?.session` fallback — that fallback is the defect. */}
        <span>
          <span style={{ color: "#55503f" }}>session</span>{" "}
          <span style={{ color: "#ede6d3" }} title={sessionPresented?.detail}>
            {sessionPresented?.value ?? "unknown"}
          </span>
        </span>
        {/* No sealed state means we know NOTHING — not zero. Rendering
            "coverage 0 channels · unknowns 0" for a null state inverted the
            truth: "unknowns 0" is the most reassuring number on the strip and
            it appeared precisely when nothing had been resolved. The `session`
            field above already degrades honestly with "unknown"; these now
            match it. */}
        {/* Source is the vendor that stamped the observation, degraded to
            "unknown" when nothing has. See selectHeroSourceDisclosure — the
            trio the Founder's truth-surface law requires (role + asOf +
            source) is now complete on this strip, with the raw provider path
            list one hover deeper. */}
        <span>
          <span style={{ color: "#55503f" }}>source</span>{" "}
          <span
            data-testid="hero-source-vendor"
            style={{ color: sourceDisclosure.label === "unknown" ? "#c9a55c" : "#ede6d3" }}
            title={sourceDisclosure.detail}
          >
            {sourceDisclosure.label}
          </span>
        </span>
        <span>
          <span style={{ color: "#55503f" }}>coverage</span>{" "}
          <span style={{ color: "#ede6d3" }}>
            {state ? `${state.coverage.length} channel${state.coverage.length === 1 ? "" : "s"}` : "unknown"}
          </span>
        </span>
        {/* THE NOUN IS THE REPAIR, AND THIS COUNT WAS MISSED BY IT.
            ────────────────────────────────────────────────────────────────
            FOUND FROM USE, production /command-deck BTC, 2026-09-18. In one
            frame the deck printed three counts of "what is missing":

              RESOLVED       4 of 8 dimensions          ← noun
              …  coverage 1 channel · unknowns 4        ← BARE
              EVIDENCE DEBT  0 of 6 paid
                             6 evidence nodes unpaid    ← noun

            `4` and `6` are both correct and neither is a bug: `state.unknowns`
            is built one-per-unresolved-DIMENSION (chartMarketStatePublisher —
            "ONE UNKNOWN PER UNRESOLVED DIMENSION"), while the ledger counts
            decision-chain NODES, which include non-dimension nodes such as
            permission. Two counts of different sets, side by side, with
            nothing on screen saying so: canon Weakness #1.

            selectPassportStamp already diagnosed exactly this and shipped the
            fix — "The repair is a NOUN, never a number." It was applied to the
            RESOLVED band and not to this strip, so a repair with a correct
            general statement of itself survived incompletely. Re-deriving
            either count to make 4 equal 6 would mint a second answer to a
            question that already has two correct owners (§24).

            Note the grammar was already here to copy: `coverage` one span up
            prints "1 channel", not "1". This span was the only member of the
            strip carrying a bare integer.

            ── 2026-09-18 ADDENDUM: "4 AND 6 ARE BOTH CORRECT" WAS TRUE OF THE
            PAIR ABOVE, AND THE READING BELOW IT WAS STILL A COINCIDENCE.
            The band said RESOLVED 4 of 8 and this span said unknowns 4, and the
            comment reasoned the pair was fine. It sums only because that BTC
            frame carried ZERO partials. On live /charts TSLA the same shapes
            printed RESOLVED 1 and unresolved 7 for EIGHT dimensions, because
            two surfaces took complements of DIFFERENT halves of a three-valued
            type. `dimensionStanding` now owns the split, and `state.unknowns`
            narrowed to the MISSING bucket alone — so this span became HONEST
            but INCOMPLETE: a reader who computes 8 − resolved still lands on
            the wrong number, because subtraction cannot see MEASURED.

            So the middle bucket is printed beside it. No count on this strip is
            reachable by subtracting another. */}
        {(() => {
          const standings = state ? partitionDimensionStandings(state) : null;
          return (
            <>
              {standings && standings.MEASURED.length > 0 && (
                <span>
                  <span style={{ color: "#55503f" }}>measured</span>{" "}
                  <span
                    data-testid="hero-measured-dimensions"
                    style={{ color: "#c9a55c" }}
                    title={`Measured but not decision-grade: ${standings.MEASURED.map(dimensionName).join(", ")}. The engine published a reading; it is not strong enough to act on. These are neither resolved nor unknown.`}
                  >
                    {`${standings.MEASURED.length} dimension${standings.MEASURED.length === 1 ? "" : "s"}`}
                  </span>
                </span>
              )}
              <span>
                <span style={{ color: "#55503f" }}>unknowns</span>{" "}
                <span
                  data-testid="hero-unknown-dimensions"
                  style={{ color: "#c9a55c" }}
                  title={
                    standings
                      ? `Dimensions with no verified evidence at all: ${
                          standings.MISSING.map(dimensionName).join(", ") || "none"
                        }. Resolved ${standings.RESOLVED.length} · measured ${standings.MEASURED.length} · unknown ${standings.MISSING.length} — the three sum to ${MARKET_STATE_DIMENSION_KEYS.length}.`
                      : undefined
                  }
                >
                  {state
                    ? `${state.unknowns.length} dimension${state.unknowns.length === 1 ? "" : "s"}`
                    : "unknown"}
                </span>
              </span>
            </>
          );
        })()}
        {state?.contradictions && state.contradictions.length > 0 && (
          <span>
            <span style={{ color: "#55503f" }}>contradictions</span>{" "}
            <span style={{ color: "#c05a4a" }}>{state.contradictions.length}</span>
          </span>
        )}
        {!state && (
          <span style={{ color: "#c9a55c", fontStyle: "italic" }}>
            Awaiting the first canonical observation — the deck is subscribed to {symbol} and will populate as ticks arrive.
          </span>
        )}
      </div>
    </section>
  );
}

export default HeroTruth;
