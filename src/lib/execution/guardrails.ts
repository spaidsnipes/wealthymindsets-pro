/**
 * SELF-CONTROL BUILT INTO THE GLASS — Garden 18 §CXVII.
 *
 * Commitments the calm trader makes to protect the pressured one: a master
 * live-trading arm, and per-order ceilings. Every live-send surface asks THIS
 * owner before it can even arm; the server's execution firewall still runs
 * behind it. A ceiling left empty is "no ceiling", stated as such.
 *
 * Futures notional is deliberately NOT computed: it needs the contract's
 * multiplier, which WM does not hold for every product yet — futures and
 * futures options are capped by contract count. PURE (storage is passed in).
 */

export interface Guardrails {
  /** Master switch. Disarmed = no live order can be armed anywhere. */
  readonly liveArmed: boolean;
  readonly maxContractsPerOrder: number | null;
  readonly maxSharesPerOrder: number | null;
  /** Stock-option premium per order: limit × contracts × 100. */
  readonly maxOptionPremiumPerOrder: number | null;
}

export const GUARDRAILS_STORAGE_KEY = "wm_execution_guardrails_v1";
export const GUARDRAILS_CHANGED_EVENT = "wm:guardrails-changed";

export const DEFAULT_GUARDRAILS: Guardrails = {
  liveArmed: true,
  maxContractsPerOrder: null,
  maxSharesPerOrder: null,
  maxOptionPremiumPerOrder: null,
};

const ceiling = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function readGuardrails(json: string | null): Guardrails {
  let raw: unknown = null;
  try { raw = json ? JSON.parse(json) : null; } catch { raw = null; }
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    liveArmed: typeof o.liveArmed === "boolean" ? o.liveArmed : DEFAULT_GUARDRAILS.liveArmed,
    maxContractsPerOrder: ceiling(o.maxContractsPerOrder),
    maxSharesPerOrder: ceiling(o.maxSharesPerOrder),
    maxOptionPremiumPerOrder: ceiling(o.maxOptionPremiumPerOrder),
  };
}

export type GuardedOrder =
  | { readonly kind: "EQUITY"; readonly qty: number }
  | { readonly kind: "EQUITY_OPTION"; readonly qty: number; readonly limitPx: number | null }
  | { readonly kind: "FUTURE" | "FUTURE_OPTION"; readonly qty: number };

export type GuardVerdict = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/** The commitment this order would break, in the trader's own terms — or ok. */
export function checkOrder(g: Guardrails, o: GuardedOrder): GuardVerdict {
  if (!g.liveArmed) return { ok: false, reason: "Live trading is disarmed in Settings › Execution. Arm it there when you are ready." };
  if (o.kind === "EQUITY") {
    if (g.maxSharesPerOrder != null && o.qty > g.maxSharesPerOrder) return { ok: false, reason: `${o.qty} shares is above your ${g.maxSharesPerOrder}-share ceiling (Settings › Execution).` };
    return { ok: true };
  }
  if (g.maxContractsPerOrder != null && o.qty > g.maxContractsPerOrder) {
    return { ok: false, reason: `${o.qty} contracts is above your ${g.maxContractsPerOrder}-contract ceiling (Settings › Execution).` };
  }
  if (o.kind === "EQUITY_OPTION" && g.maxOptionPremiumPerOrder != null && o.limitPx != null) {
    const premium = o.limitPx * o.qty * 100;
    if (premium > g.maxOptionPremiumPerOrder) return { ok: false, reason: `$${premium.toFixed(2)} of premium is above your $${g.maxOptionPremiumPerOrder} ceiling (Settings › Execution).` };
  }
  return { ok: true };
}
