/**
 * CONNECT BROKERS — the ONE door (Founder finish-line shift, 2026-09-24:
 * "Restore/build one clean CONNECT BROKERS entry point. Utility / Settings
 * responsibility. Not another trading page.").
 *
 * The broker panel itself stays owned by the market room (`BrokerConnectPanel`
 * inside ChartsDashboard) so every connection still feeds the one
 * BrokerJoint / TradeLine path. Settings only KNOCKS on that door:
 *
 *   on the market home → an event the room answers by opening its panel;
 *   anywhere else      → the market home with `?connect=brokers`, which the
 *                        room reads once and then strips.
 */
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

export const BROKER_CONNECT_EVENT = "wm-open-broker-connect";
export const BROKER_CONNECT_PARAM = "connect";
export const BROKER_CONNECT_VALUE = "brokers";

/** Where a knock from `pathname` should go: an in-room event, or the market home. */
export function brokerConnectTarget(pathname: string): { kind: "EVENT" } | { kind: "NAVIGATE"; href: string } {
  return pathname === INSTRUMENT_VIEW_ROUTE || pathname.startsWith(`${INSTRUMENT_VIEW_ROUTE}/`)
    ? { kind: "EVENT" }
    : { kind: "NAVIGATE", href: `${INSTRUMENT_VIEW_ROUTE}?${BROKER_CONNECT_PARAM}=${BROKER_CONNECT_VALUE}` };
}

export function requestBrokerConnect(): void {
  if (typeof window === "undefined") return;
  const t = brokerConnectTarget(window.location.pathname);
  if (t.kind === "EVENT") window.dispatchEvent(new CustomEvent(BROKER_CONNECT_EVENT));
  else window.location.assign(t.href);
}
