"use client";
/**
 * THE ORDER-FLOW TOOLS SLOT — how Tools › Order flow shows chart TOOLS.
 *
 * Founder, 2026-09-24 08:13: "when you click on order flow you should see
 * order flow tools, absorption vs exhaustion, big trades, delta bubbles …
 * the mockups are actual chart tools not separate screens."
 *
 * The Order flow equipment descriptor is a memo whose deps are pinned by
 * `roomAdoptsEquipment.sentinel` to the READINGS it describes. The tools are
 * switches — they change on every click — and widening that memo would make
 * the descriptor churn with every toggle. So the dashboard PUBLISHES the tools
 * node here after each render and the drawer subscribes: the descriptor stays
 * about the readings, the drawer always shows the live switches.
 */
import React, { useSyncExternalStore } from "react";

let current: React.ReactNode = null;
const subs = new Set<() => void>();

export function publishOrderFlowTools(node: React.ReactNode): void {
  current = node;
  subs.forEach(fn => fn());
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

export function OrderFlowToolsSlot() {
  const node = useSyncExternalStore(subscribe, () => current, () => null);
  return <>{node}</>;
}
