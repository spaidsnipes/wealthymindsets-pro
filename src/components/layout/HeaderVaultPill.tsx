"use client";
import * as React from "react";
import Link from "next/link";
import { Database } from "lucide-react";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
} from "@/lib/marketData/sessionSymbolStore";

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
  const [, setTick] = React.useState(0);
  React.useEffect(() => subscribeSessionSymbolStore(() => setTick(t => t + 1)), []);

  const count = getKnownSessionSymbols().filter(s => s.slot.stats.tradeCount > 0).length;
  if (count === 0) return null;

  return (
    <Link
      href="/nectar"
      aria-label={`Nectar Vault: ${count} symbol${count === 1 ? "" : "s"} with retained memory this session. Open the Vault.`}
      title={
        `WM Nectar Vault — ${count} symbol${count === 1 ? "" : "s"} with retained tape memory this session.\n` +
        `Session summary is preserved across refresh and symbol switch.\n` +
        `Open the Vault to see per-symbol Δ, trade counts, fidelity, and retention truth.`
      }
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 8px", borderRadius: 999,
        border: "1px solid rgba(212,175,55,0.30)",
        background: "rgba(212,175,55,0.08)",
        color: "#d4af37",
        fontSize: 9.5, fontWeight: 800, letterSpacing: "0.10em",
        fontVariantNumeric: "tabular-nums",
        textDecoration: "none",
        textTransform: "uppercase",
        marginRight: 4,
      }}
    >
      <Database size={11} />
      VAULT · {count}
    </Link>
  );
}

export default HeaderVaultPill;
