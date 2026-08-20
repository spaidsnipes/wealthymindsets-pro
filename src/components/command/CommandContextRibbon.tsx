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

export interface CommandContextRibbonProps {
  readonly symbol: string;
  readonly session: string;                 // RTH / ETH / OVERNIGHT / CLOSED / UNKNOWN
  readonly state: CanonicalMarketState | null;
  readonly wsConnected: boolean;
  readonly wsSource: string | null;         // "yahoo" / "coinbase" / "alpaca" / "unavailable" / null
  readonly availableR: AvailableRVM | null;
  readonly permission: PermissionVM | null;
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
  warn:     "#e07b5c",  // amber-warn — degraded / stale / blocked
};

export const RIBBON_TONE_BG: Record<Tone, string> = {
  resolved: "rgba(212,175,55,0.10)",
  pending:  "rgba(201,165,92,0.06)",
  unknown:  "rgba(255,255,255,0.02)",
  warn:     "rgba(224,123,92,0.08)",
};

export const RIBBON_TONE_BORDER: Record<Tone, string> = {
  resolved: "rgba(212,175,55,0.55)",
  pending:  "rgba(201,165,92,0.32)",
  unknown:  "rgba(139,106,41,0.35)",
  warn:     "rgba(224,123,92,0.45)",
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

function sessionTone(session: string, connected: boolean): Tone {
  const s = session.toUpperCase();
  if (s === "CLOSED") return "unknown";
  if (!connected) return "warn";
  if (s === "RTH") return "resolved";
  if (s === "OVERNIGHT" || s === "ETH") return "pending";
  return "unknown";
}

/**
 * Explicit data-state semantics. Four honest cells:
 *   LIVE        — state resolved AND wsFeed connected  → live truth
 *   CACHED      — state resolved BUT wsFeed offline    → last-known truth
 *   COMPUTING   — wsFeed connected BUT state unresolved (first-load, pre-hydration)
 *   UNAVAILABLE — wsFeed missing/offline AND no state  → nothing to say
 */
type DataState = "LIVE" | "CACHED" | "COMPUTING" | "UNAVAILABLE";
function dataState(state: CanonicalMarketState | null, connected: boolean, source: string | null): DataState {
  const feedOn = connected && !!source && source !== "unavailable";
  if (state && feedOn) return "LIVE";
  if (state && !feedOn) return "CACHED";
  if (!state && feedOn) return "COMPUTING";
  return "UNAVAILABLE";
}
function dataTone(ds: DataState): Tone {
  switch (ds) {
    case "LIVE":        return "resolved";
    case "CACHED":      return "warn";      // amber — real data but not being refreshed
    case "COMPUTING":   return "pending";
    case "UNAVAILABLE": return "warn";
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

function permissionTone(vm: PermissionVM | null): Tone {
  if (!vm) return "unknown";
  if (vm.verdict === "ALLOWED") return "resolved";
  if (vm.verdict === "RESTRICTED") return "warn";
  if (vm.verdict === "ADVISORY") return "pending";
  return "unknown"; // UNKNOWN
}

function permissionText(vm: PermissionVM | null): { value: string; detail?: string } {
  if (!vm) return { value: "NOT EVALUATED", detail: undefined };
  const detail = (vm as unknown as { reason?: string }).reason;
  return {
    value: vm.verdict,
    detail: detail ? detail.slice(0, 40) + (detail.length > 40 ? "…" : "") : undefined,
  };
}

// Nectar tile — count of tape sources with observed trades for THIS symbol,
// summed trade count. Reads sessionSymbolStore, the same canonical owner
// /nectar and /profile Nectar tab consume — no duplicate identity.
function useNectarForSymbol(symbol: string): { channels: number; trades: number; hydrated: boolean } {
  const [tick, force] = React.useReducer((n: number) => n + 1, 0);
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => { setHydrated(true); }, []);
  React.useEffect(() => subscribeSessionSymbolStore(() => force()), []);
  return React.useMemo(() => {
    if (!hydrated) return { channels: 0, trades: 0, hydrated: false };
    const upper = symbol.toUpperCase();
    const rows = getKnownSessionSymbols().filter(s => s.symbol.toUpperCase() === upper && s.slot.stats.tradeCount > 0);
    const trades = rows.reduce((sum, r) => sum + r.slot.stats.tradeCount, 0);
    return { channels: rows.length, trades, hydrated: true };
  }, [symbol, tick, hydrated]);
}

export function CommandContextRibbon(props: CommandContextRibbonProps): React.ReactElement {
  const { symbol, session, state, wsConnected, wsSource, availableR, permission } = props;
  const nectar = useNectarForSymbol(symbol);
  const arText = availableRText(availableR);
  const permText = permissionText(permission);

  const tiles: readonly Tile[] = [
    {
      key: "session",
      label: "SESSION",
      value: session.toUpperCase(),
      detail: wsConnected ? "connected" : "disconnected",
      tone: sessionTone(session, wsConnected),
    },
    (() => {
      const ds = dataState(state, wsConnected, wsSource);
      const dsDetail =
        ds === "LIVE"        ? (wsSource ?? "streaming") :
        ds === "CACHED"      ? "last-known · feed offline" :
        ds === "COMPUTING"   ? (wsSource ? `${wsSource} · resolving` : "resolving") :
        /* UNAVAILABLE */      "no feed · no state";
      return {
        key: "data",
        label: "DATA",
        value: ds,
        detail: dsDetail,
        tone: dataTone(ds),
      };
    })(),
    {
      key: "nectar",
      label: "NECTAR",
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
    {
      key: "steward",
      label: "STEWARD",
      value: permText.value,
      detail: permText.detail,
      tone: permissionTone(permission),
    },
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
