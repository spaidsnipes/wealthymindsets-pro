"use client";

/**
 * CommandContextRibbon — a shared WM Pro OS primitive.
 *
 * A compact 5-tile horizontal band that reads canonical owners already
 * present in the Command Deck (session, market state, tape/Nectar,
 * Available R, permission steward) and surfaces them as an at-a-glance
 * "where am I in the system" read WITHOUT hunting through the numbered
 * section cards below.
 *
 * Per the Founder 2026-08-19 Operating System Transformation Program:
 *   · Desktop target is "HERO TRUTH → PRIMARY CHART → PURPOSEFUL
 *     CONTEXT RAIL for Market Truth, Available R, Steward/risk,
 *     order/execution and evidence."
 *   · Reduces the current card-soup pattern by consolidating
 *     otherwise-scattered state into one honest strip.
 *   · Uses only canonical view models — never fabricates a value.
 *     Absent / UNKNOWN / DEGRADED are first-class visible states.
 *   · Shared design primitive (this file); other rooms consume the
 *     same component to propagate the OS DNA per §DESKTOP TARGET
 *     without duplicating owners.
 *
 * FIRST HOME: /command-deck (this shift). Later rooms (Charts, Nectar
 * Vault) may render the same ribbon with the same props — do not fork.
 */

import * as React from "react";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
} from "@/lib/marketData/sessionSymbolStore";
import type { CanonicalMarketState } from "@/lib/marketData/canonicalMarketState";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";
import type { AvailableRVM } from "@/lib/traderMemory/viewModels/selectAvailableR";
import type { DecisionChainNode } from "@/lib/marketData/viewModels/selectDecisionChain";
import {
  computeEvidenceDebt as computeEvidenceDebtCanonical,
  computeRightOfWay as computeRightOfWayCanonical,
  sampledLabelPhrase,
  type EvidenceDebt as CanonicalEvidenceDebt,
} from "@/lib/marketData/viewModels/decisionPermissionCompiler";
import { selectClarityState } from "@/lib/experience/selectClarityState";
import { WM, objectionTint } from "@/lib/design/wmTokens";
import type { SecondaryNoiseVM } from "@/lib/experience/selectSecondaryNoise";
import {
  selectContextDataReading,
  type ContextDataState,
} from "@/lib/marketData/contextDataTruth";
import {
  selectCanonicalSessionPresentation,
  SESSION_TOKEN_CLOSED,
  SESSION_TOKEN_CONTINUOUS,
} from "@/lib/marketData/canonicalIdentity";

export interface CommandContextRibbonProps {
  readonly symbol: string;
  readonly session: string;                 // RTH / ETH / OVERNIGHT / CLOSED / UNKNOWN
  readonly state: CanonicalMarketState | null;
  readonly wsConnected: boolean;
  readonly wsSource: string | null;         // "yahoo" / "coinbase" / "alpaca" / "unavailable" / null
  readonly availableR: AvailableRVM | null;
  readonly permission: PermissionVM | null;
  /**
   * Decision-chain nodes for the current phase. When provided, an
   * EVIDENCE DEBT tile renders honestly per Founder Market Reality
   * canon §Evidence Debt (2026-08-20): "Direction ✓ / Location ✓
   * / Aggression ? / CLC ? / Available R ✓ / EVIDENCE DEBT —
   * Awaiting aggression + confirmation." No debt paid = no
   * authorization. Zero fabrication — UNKNOWN nodes count as
   * missing, WARN nodes as watch, only OK counts as paid.
   */
  readonly chainNodes?: readonly DecisionChainNode[];
  /**
   * The compiled secondary-noise reading for the surface rendering this ribbon,
   * when that surface has one.
   *
   * OPTIONAL ON PURPOSE, AND OMITTING IT IS AN HONEST ANSWER — not every room
   * holds a MaterialityReading, and a room that does not must not synthesise
   * one. `undefined` therefore coerces to `null` at the single call site below
   * and NEVER to a manufactured reading; Screen Quiet is then disclosed as
   * OWNED-BUT-NOT-SUPPLIED rather than quietly dropped from the picture.
   *
   * Handing over an UNWATCHED reading is likewise not a way to buy a better
   * score — selectClarityState treats UNWATCHED as the sensor reporting that it
   * has nothing, which lands in exactly the same column as omitting the prop.
   */
  readonly noise?: SecondaryNoiseVM | null;
}

type Tone = "resolved" | "pending" | "unknown" | "warn";

interface Tile {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
  readonly tone: Tone;
}

export type ContextRibbonTone = Tone;

export const RIBBON_TONE_COLOR: Record<Tone, string> = {
  resolved: "#d4af37",  // gold — resolved / active / verified
  pending:  "#c9a55c",  // dimmed gold — computing / partial
  unknown:  "#8a8271",  // muted — UNKNOWN / not evaluated
  // The ribbon's `warn` tone is the OBJECTION terracotta, not `WM.state.warn`
  // (#c05a4a). The tone name predates the token and is kept for API stability;
  // the colour it resolves to is unchanged. See wmTokens.ts for why the two
  // reds are deliberately different.
  warn:     WM.state.objection,
};

export const RIBBON_TONE_BG: Record<Tone, string> = {
  resolved: "rgba(212,175,55,0.10)",
  pending:  "rgba(201,165,92,0.06)",
  unknown:  "rgba(255,255,255,0.02)",
  warn:     objectionTint(0.08),
};

export const RIBBON_TONE_BORDER: Record<Tone, string> = {
  resolved: "rgba(212,175,55,0.55)",
  pending:  "rgba(201,165,92,0.32)",
  unknown:  "rgba(139,106,41,0.35)",
  warn:     objectionTint(0.45),
};

// Local aliases keep the existing render loop tidy.
const TONE_COLOR = RIBBON_TONE_COLOR;
const TONE_BG = RIBBON_TONE_BG;
const TONE_BORDER = RIBBON_TONE_BORDER;

/**
 * ContextRibbonTile — the shared atom every OS ribbon uses.
 *
 * Consumers (CommandContextRibbon, /nectar Vault ribbon, /charts,
 * future rooms) compose their own tile array with their own canonical
 * owners, then render each cell through this atom for identical
 * visual DNA. One primitive, many views. Never duplicate this styling
 * — extend this atom instead.
 */
export interface ContextRibbonTileProps {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
  readonly tone: ContextRibbonTone;
}

export function ContextRibbonTile({ label, value, detail, tone }: ContextRibbonTileProps): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={`${label}: ${value}${detail ? " — " + detail : ""}`}
      style={{
        padding: "10px 12px",
        minHeight: 68,
        borderRadius: 8,
        border: `1px solid ${RIBBON_TONE_BORDER[tone]}`,
        background: RIBBON_TONE_BG[tone],
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#8a8271",
          fontWeight: 400,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: RIBBON_TONE_COLOR[tone],
          lineHeight: 1.15,
          fontVariantNumeric: "tabular-nums",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      {detail && (
        <div
          style={{
            fontSize: 9,
            letterSpacing: 0.2,
            color: "#6f6a5a",
            lineHeight: 1.2,
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

export interface ContextRibbonContainerProps {
  readonly ariaLabel: string;
  readonly children: React.ReactNode;
}

export function ContextRibbonContainer({ ariaLabel, children }: ContextRibbonContainerProps): React.ReactElement {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className="wm-cd-context-ribbon"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
        gap: 8,
        padding: 0,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Tone for the SESSION tile — derived from the PRESENTED value, never from the
 * raw `session` prop.
 *
 * The prop is `identity.session`, i.e. canonicalSession(extHours, cls): a STORE
 * KEY that reads "RTH" for every non-crypto instrument on every day. The old
 * body hit `s === "RTH" → "resolved"`, so on a Saturday this tile was painted
 * the ESTABLISHED colour while its own caption read "market closed". Colour is
 * a claim too, and this one was a third voice disagreeing inside one tile.
 *
 * There is deliberately no "RTH" case left: the presenter cannot return it, so
 * a branch for it would be a dead predicate — and a dead predicate is what
 * started this whole thread of defects.
 */
function sessionTone(presentedValue: string, connected: boolean): Tone {
  const s = presentedValue.toUpperCase();
  // Closed is not an alarm. It is the correct, established state of a market
  // on a Saturday, and colouring it "warn" would teach the trader that a
  // normal weekend is a malfunction.
  if (s === SESSION_TOKEN_CLOSED) return "unknown";
  if (s === SESSION_TOKEN_CONTINUOUS) return connected ? "resolved" : "warn";
  if (!connected) return "warn";
  return "unknown";
}

/**
 * sessionDetailText — I-Bkt 6 truth label + J-Bkt 5 local-day fix.
 *
 * Prior detail was a bare "connected" / "disconnected" that misled on
 * weekends (Founder saw "SESSION RTH · disconnected" on Saturday when
 * the truth is "market closed"). The I-Bkt 6 call site initially used
 * `getUTCDay()` which misclassifies Fri-evening local ET (Sat UTC) as
 * a weekend — technically true for a US trader but for a global user
 * base it should reflect the caller's LOCAL day. Call site now passes
 * `new Date().getDay()`.
 *
 * Pure. Testable. Caller supplies dayOfWeek so the helper stays
 * deterministic under tests.
 *
 * Rules:
 *  - If session === "CLOSED" or day is Sat/Sun → "market closed".
 *  - Else if not connected → "no data connection".
 *  - Else → "connected".
 */
function dataTone(ds: ContextDataState): Tone {
  switch (ds) {
    case "LIVE":        return "resolved";
    case "NEAR-LIVE":   return "pending";
    case "DELAYED":     return "pending";
    case "HISTORICAL":  return "unknown";
    case "DEGRADED":    return "warn";
    case "UNKNOWN":     return "unknown";
  }
}

function availableRTone(vm: AvailableRVM | null): Tone {
  if (!vm) return "unknown";
  if (vm.resolution === "UNKNOWN" || vm.conservativeR === "UNKNOWN") return "unknown";
  const r = vm.conservativeR;
  if (typeof r === "number") {
    if (r < 0) return "warn";
    if (r < 1) return "pending";
    return "resolved";
  }
  return "unknown";
}

function availableRText(vm: AvailableRVM | null): { value: string; detail?: string } {
  if (!vm) return { value: "UNKNOWN", detail: "no chain evidence" };
  if (vm.conservativeR === "UNKNOWN") {
    const missing = vm.missingInputs.length;
    return {
      value: "UNKNOWN",
      detail: missing > 0 ? `${missing} missing input${missing === 1 ? "" : "s"}` : (vm.reason ?? "unresolved"),
    };
  }
  const r = vm.conservativeR;
  return {
    value: `${r.toFixed(2)} R`,
    detail: typeof vm.optimisticR === "number" ? `opt ${vm.optimisticR.toFixed(2)}R` : undefined,
  };
}

// Local alias — the extracted canonical compiler owns the derivation.
const computeRightOfWay = computeRightOfWayCanonical;

// Nectar tile — count of tape sources with observed trades for THIS symbol,
// summed trade count. Reads sessionSymbolStore, the same canonical owner
// /nectar and /profile Nectar tab consume — no duplicate identity.
function useNectarForSymbol(symbol: string): { channels: number; trades: number; lastTradeAtMs: number | null; hydrated: boolean } {
  const [tick, force] = React.useReducer((n: number) => n + 1, 0);
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => { setHydrated(true); }, []);
  React.useEffect(() => subscribeSessionSymbolStore(() => force()), []);
  return React.useMemo(() => {
    if (!hydrated) return { channels: 0, trades: 0, lastTradeAtMs: null, hydrated: false };
    const upper = symbol.toUpperCase();
    const rows = getKnownSessionSymbols().filter(s => s.symbol.toUpperCase() === upper && s.slot.stats.tradeCount > 0);
    const trades = rows.reduce((sum, r) => sum + r.slot.stats.tradeCount, 0);
    const lastTradeAtMs = rows.reduce<number | null>((latest, row) => {
      const observedAt = row.slot.lastTradeAtMs ?? null;
      if (observedAt == null) return latest;
      return latest == null ? observedAt : Math.max(latest, observedAt);
    }, null);
    return { channels: rows.length, trades, lastTradeAtMs, hydrated: true };
  }, [symbol, tick, hydrated]);
}

// Local alias — the extracted canonical compiler owns the derivation.
// This ribbon renders the values but never re-implements the logic.
type EvidenceDebt = CanonicalEvidenceDebt;
const computeEvidenceDebt = computeEvidenceDebtCanonical;

export function CommandContextRibbon(props: CommandContextRibbonProps): React.ReactElement {
  const { symbol, session, state, wsConnected, wsSource, availableR, permission, chainNodes, noise } = props;
  const nectar = useNectarForSymbol(symbol);
  const [nowMs, setNowMs] = React.useState<number | null>(null);
  React.useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const timer = window.setInterval(updateNow, 5_000);
    return () => window.clearInterval(timer);
  }, []);
  const arText = availableRText(availableR);
  const debt = React.useMemo(() => computeEvidenceDebt(chainNodes), [chainNodes]);
  const rightOfWay = React.useMemo(() => computeRightOfWay(permission, debt), [permission, debt]);
  const sessionPresentation = selectCanonicalSessionPresentation({
    symbol,
    requestedSession: session,
    connected: wsConnected,
    // Was `dayOfWeek: new Date(nowMs ?? 0).getDay()`. Before the clock effect
    // runs, `nowMs` is null and `new Date(0)` is 1970-01-01 — a WEEKDAY. So on
    // every Saturday the first paint of this tile asserted a weekday and only
    // then settled. `Date | null` cannot express a fabricated day: null means
    // "not established", and the settle can only ever sharpen.
    at: nowMs == null ? null : new Date(nowMs),
    observedActivityAt: nectar.lastTradeAtMs,
    evaluatedAt: nowMs ?? 0,
  });

  const tiles: readonly Tile[] = [
    {
      key: "session",
      label: "SESSION",
      value: sessionPresentation.value,
      detail: sessionPresentation.detail,
      // Tone from the PRESENTED value, not the raw `session` store key. Passing
      // `session` here painted the tile "resolved" green on a Saturday because
      // canonicalSession() reads "RTH" every day of the week — a third voice
      // disagreeing with the caption directly beneath it.
      tone: sessionPresentation.activity === "OBSERVED"
        ? "pending"
        : sessionTone(sessionPresentation.value, wsConnected),
    },
    (() => {
      // The first render uses the snapshot's deterministic capture time so SSR
      // and hydration agree. After mount, the five-second clock ages a frozen
      // LIVE snapshot into DEGRADED even if transport remains connected.
      const reading = selectContextDataReading(
        state,
        wsConnected,
        wsSource,
        nowMs ?? state?.capturedAt ?? 0,
      );
      return {
        key: "data",
        label: "DATA",
        value: reading.value,
        detail: reading.detail,
        tone: dataTone(reading.value),
      };
    })(),
    {
      key: "nectar",
      label: "OBSERVED",
      value: !nectar.hydrated ? "…" : nectar.channels === 0 ? "NONE YET" : `${nectar.trades.toLocaleString("en-US")}`,
      detail: !nectar.hydrated
        ? undefined
        : nectar.channels === 0
          ? `${symbol} — nothing observed`
          : `${symbol} · ${nectar.channels} channel${nectar.channels === 1 ? "" : "s"}`,
      tone: !nectar.hydrated ? "unknown" : nectar.channels === 0 ? "unknown" : "resolved",
    },
    {
      key: "availableR",
      label: "AVAILABLE R",
      value: arText.value,
      detail: arText.detail,
      tone: availableRTone(availableR),
    },
    // EVIDENCE DEBT — direct Founder Market Reality canon §Evidence
    // Debt (2026-08-20). Rendered only when chainNodes prop supplied
    // (Command Deck provides it; other rooms may omit). Zero-fabrication:
    // UNKNOWN indicator = missing evidence; only OK counts as paid.
    ...(debt ? [{
      key: "evidenceDebt",
      label: "EVIDENCE",
      value: debt.missing === 0 && debt.warn === 0
        ? "COMPLETE"
        : debt.missing > 0
          ? `${debt.missing} MISSING`
          : `${debt.warn} WARN`,
      // Both branches truncate to two labels, so both must disclose what they
      // dropped. The WARN branch did not — it sat one line below a correct
      // application of the very same law. `sampledLabelPhrase` owns the pairing
      // so a seventh copy cannot drift the way this sixth one did.
      detail: debt.missing > 0
        ? `${debt.resolved}/${debt.payable} paid · need ${sampledLabelPhrase(debt.missingLabels, debt.missing, { lowercase: true })}`
        : debt.warn > 0
          ? `${debt.resolved}/${debt.payable} paid · watch ${sampledLabelPhrase(debt.warnLabels, debt.warn, { lowercase: true })}`
          : `${debt.payable}/${debt.payable} paid · authorization complete`,
      tone: (debt.missing === 0 && debt.warn === 0
        ? "resolved"
        : debt.warn > 0
          ? "warn"
          : "unknown") as Tone,
    } as Tile] : []),
    // RIGHT OF WAY — Decision Permission Compiler (Founder 2029 canon
    // §Decision Permission Compiler). Deterministic gate: unpaid debt
    // forces WAIT regardless of permission verdict. Cannot contradict
    // EVIDENCE tile above by construction.
    {
      key: "rightOfWay",
      label: "RIGHT OF WAY",
      value: rightOfWay.value,
      detail: rightOfWay.detail,
      tone: rightOfWay.tone,
    },
    // CLARITY STATE — Founder OS Overview canvas, compiled honestly.
    //
    // The Overview draws this organ as four bars, two of which nothing in this
    // product can measure: Physiological Coherence (no biometric input exists
    // anywhere in WM Pro) and Emotional Noise (not observable). `%` here is
    // therefore CONFIDENCE — the measured share of the picture the canon asks
    // for — and it is deliberately not 100.
    //
    // A tile that silently averaged only the components it could read would
    // score HIGHER the less it knew. selectClarityState forbids that shape by
    // construction: an unowned input may lower confidence and must produce a
    // disclosure, but it can never touch `level`.
    //
    // `noise ?? null` — the ribbon RELAYS a reading, it never invents one.
    //
    // This used to be a hard-coded `noise: null` justified by "the ribbon holds
    // no MaterialityReading". That was true of the COMPONENT and false of the
    // ROOM: /command-deck computes an honest secondaryNoise VM of its own and
    // simply never handed it over. Screen Quiet is a WM-owned, WM-measured
    // quantity that was sitting one scope away from the tile reporting it as
    // absent — which is why the roster fix disclosed it as OWNED BUT NOT
    // SUPPLIED rather than as something nothing can measure.
    //
    // The `?? null` is load-bearing and must stay: a room with no reading omits
    // the prop and keeps the honest degradation. Relaying is not fabricating,
    // and the two are one `??` apart.
    (() => {
      const clarity = selectClarityState({ debt, rightOfWay, noise: noise ?? null });
      return {
        key: "clarity",
        label: "CLARITY",
        // THE DETAIL LINE LEADS WITH THE DISCLOSURE, and that order was decided
        // by looking at the rendered tile rather than by reasoning about it.
        //
        // The first version read `${detail} · ${confidence}% measured — …
        // unavailable`. It was correct and it was invisible: the tile clips its
        // detail line, so what actually reached the eye was
        //
        //     CLEAR · 33%
        //     evidence paid · nothing flagg…
        //
        // The disclosure — the entire reason this tile is allowed to exist —
        // was past the ellipsis. It survived only in the `title` attribute, and
        // the PROVE criterion is explicit that risk information living in a
        // hover tooltip is a defect to fix, not a placement.
        //
        // So the scarce first characters of the detail line go to the thing
        // that cannot be inferred from anywhere else on the screen. The level
        // is already legible in the value above it; "2 of 4 measured" is not.
        value: `${clarity.value} · ${clarity.confidence}%`,
        // `clarity.askedFor` — NOT a denominator computed here.
        //
        // This line used to read `components.length + unownedComponents.length`,
        // which is the count of what ARRIVED plus the count of what can never
        // arrive. This tile passes `noise: null` (honestly, two comments up), so
        // Screen Quiet left the numerator and the denominator together and the
        // tile rendered "1 of 3 measured · 33%" for a picture the canon asks
        // FOUR components of. The honesty of the null was paid back as a better
        // score. The owner now publishes the roster size and nothing re-derives it.
        detail: `${clarity.components.length} of ${clarity.askedFor} measured · ${clarity.detail}`,
        tone: (clarity.level === "CLEAR"
          ? "resolved"
          : clarity.level === "CONTESTED"
            ? "warn"
            : clarity.level === "CLOUDED"
              ? "pending"
              : "unknown") as Tone,
      } as Tile;
    })(),
  ];

  return (
    <ContextRibbonContainer ariaLabel="Command Deck context ribbon">
      {tiles.map(tile => (
        <ContextRibbonTile
          key={tile.key}
          label={tile.label}
          value={tile.value}
          detail={tile.detail}
          tone={tile.tone}
        />
      ))}
    </ContextRibbonContainer>
  );
}

export default CommandContextRibbon;
