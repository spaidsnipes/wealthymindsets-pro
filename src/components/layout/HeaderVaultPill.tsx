"use client";
import * as React from "react";
import Link from "next/link";
import { Database } from "lucide-react";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
} from "@/lib/marketData/sessionSymbolStore";
import {
  getSessionNectarSnapshot,
  subscribeToSessionNectar,
} from "@/lib/marketData/sessionNectar";

/**
 * HeaderVaultPill — persistent memory-safety indicator in the global
 * shell header. Appears on every route.
 *
 * Founder canon: "the trader should feel WM remembers what it truly
 * observed." This tiny gold pill quietly reinforces that promise on
 * every page — the trader can glance up and know how many symbols
 * still have retained memory, then click through to /nectar.
 *
 * Renders nothing when zero symbols have real trades — so it never
 * adds noise to an empty session. Reads the SAME store as the Vault
 * chip on /charts and the /nectar page, so all three surfaces agree.
 */
export function HeaderVaultPill() {
  // Gate the FIRST render on a client-mounted flag so both SSR and the
  // initial client paint agree (both null). Without this, SSR reads
  // sessionSymbolStore with no localStorage available and returns
  // count=0 → renders null; the very next client render hydrates
  // localStorage → count>0 → renders the pill. React interprets that
  // as a hydration mismatch (React #418) and warns.
  const [mounted, setMounted] = React.useState(false);
  const [, setTick] = React.useState(0);
  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => subscribeSessionSymbolStore(() => setTick(t => t + 1)), []);
  React.useEffect(() => subscribeToSessionNectar(() => setTick(t => t + 1)), []);

  if (!mounted) return null;

  const count = getKnownSessionSymbols().filter(s => s.slot.stats.tradeCount > 0).length;
  if (count === 0) return null;

  const nectar = getSessionNectarSnapshot();
  const gapCount = nectar.channels.reduce((a, c) => a + c.gapCount, 0);
  const hasGaps = gapCount > 0;

  return (
    <Link
      href="/nectar"
      aria-label={
        hasGaps
          ? `Nectar Vault: ${count} symbol${count === 1 ? "" : "s"} with retained browser-local stats, ${gapCount} coverage gap${gapCount === 1 ? "" : "s"} recorded. Open the Vault.`
          : `Nectar Vault: ${count} symbol${count === 1 ? "" : "s"} with retained browser-local stats. Open the Vault.`
      }
      title={
        `WM Nectar Vault — ${count} symbol${count === 1 ? "" : "s"} with retained browser-local tape stats ` +
        `(localStorage, up to 32 symbols, 7-day retention).\n` +
        (hasGaps ? `Coverage gaps recorded across channels: ${gapCount}. Open the Vault to inspect per-channel receipts.\n` : "") +
        `Summary is preserved across refresh and symbol switch within that window.\n` +
        `Open the Vault to see per-symbol Δ, trade counts, fidelity, and retention truth.`
      }
      style={{
        // Canonical responsive standard: preserve a real 44px touch target.
        display: "inline-flex", alignItems: "center", gap: 6,
        minHeight: 44,
        padding: "6px 12px", borderRadius: 999,
        border: `1px solid ${hasGaps ? "rgba(192,90,74,0.45)" : "rgba(212,175,55,0.40)"}`,
        background: hasGaps ? "rgba(192,90,74,0.10)" : "rgba(212,175,55,0.10)",
        color: hasGaps ? "#c05a4a" : "#d4af37",
        fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
        fontVariantNumeric: "tabular-nums",
        textDecoration: "none",
        textTransform: "uppercase",
        marginRight: 4,
        outlineOffset: 2,
      }}
    >
      <Database size={11} />
      VAULT · {count}
      {hasGaps && (
        <span
          aria-hidden="true"
          style={{
            marginLeft: 4,
            padding: "0 5px",
            borderRadius: 999,
            border: "1px solid rgba(192,90,74,0.5)",
            color: "#c05a4a",
            fontSize: 8, fontWeight: 900, letterSpacing: 0.4,
          }}
        >
          ! {gapCount}
        </span>
      )}
    </Link>
  );
}

export default HeaderVaultPill;
