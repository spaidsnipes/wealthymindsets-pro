"use client";

/**
 * Where a SpaidBot PROPOSAL waits for the trader (Garden 19 §24). One per chart
 * symbol, newest wins. The ticket shows it and offers "Load into ticket"; it
 * never sends, and nothing here can reach an order route.
 *
 * PRODUCER NOT WIRED (2026-10-07): SpaidBot's chat model is told it "cannot
 * stage, submit, replace, or cancel" orders and must never emit machine-
 * readable order tags (src/app/api/spaidbot/route.ts). Turning its words into
 * a proposal object needs a Founder ruling on that boundary, so only code that
 * builds a complete, validated proposal (validateProposal) may offer one.
 */

import { useSyncExternalStore } from "react";

import { validateProposal, type SpaidBotProposal } from "./spaidbotProposal";

let byChart = new Map<string, SpaidBotProposal>();
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const key = (s: string) => s.trim().toUpperCase();

/** Offer a proposal. An invalid one is refused with its reasons and never shown. */
export function offerSpaidBotProposal(p: SpaidBotProposal, nowMs = Date.now()): { ok: boolean; reasons: readonly string[] } {
  const v = validateProposal(p, nowMs);
  if (!v.ok) return { ok: false, reasons: v.reasons };
  byChart = new Map(byChart).set(key(p.chartSymbol), p);
  emit();
  return { ok: true, reasons: [] };
}

export function dismissSpaidBotProposal(chartSymbol: string): void {
  if (!byChart.has(key(chartSymbol))) return;
  const next = new Map(byChart);
  next.delete(key(chartSymbol));
  byChart = next;
  emit();
}

export function useSpaidBotProposal(chartSymbol: string): SpaidBotProposal | null {
  return useSyncExternalStore(subscribe, () => byChart.get(key(chartSymbol)) ?? null, () => null);
}
