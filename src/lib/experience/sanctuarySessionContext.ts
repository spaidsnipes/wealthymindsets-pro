"use client";

/**
 * The sanctuary session signal — how the WATER-BREATH knows the tape is closed.
 *
 * ── Why this owner exists ────────────────────────────────────────────────────
 *
 * WMExperienceShell wraps `/command-deck` at the layout level, and the
 * session state comes from canonical market state that only the page can
 * compute (via canonicalMarketStateIdentity → useCanonicalMarketState →
 * selectCanonicalSessionToken). The shell has no way to reach that data
 * through props because it wraps `children`, not a specific component.
 *
 * This context is the tiny bridge: the page publishes ("CLOSED", "OPEN",
 * "UNKNOWN"), the shell reads. That is the ENTIRE contract. It is NOT a
 * new state store, NOT a second market truth, NOT a costume for provider
 * fidelity — the Founder brief's list of forbidden new owners
 * (dashboards, engines, state stores, visual religions) does not include
 * "one boolean-shaped signal" and the alternative (an out-of-band
 * document.querySelector write) would be worse in every dimension.
 *
 * Default is "UNKNOWN" so the shell reads calm-tempo only when a real
 * caller has proven the market is closed. Silence never implies closure.
 */

import * as React from "react";

export type SanctuarySessionSignal = "OPEN" | "CLOSED" | "UNKNOWN";

const SanctuarySessionContext = React.createContext<SanctuarySessionSignal>("UNKNOWN");

/**
 * The shell reads this once per render. Consumers that want to observe
 * changes just subscribe to the context normally.
 */
export function useSanctuarySession(): SanctuarySessionSignal {
  return React.useContext(SanctuarySessionContext);
}

/**
 * The page wraps its subtree with this to tell the SANCTUARY the market
 * is closed / open. The provider is intentionally light — no memo, no
 * state — because the value it receives IS already memoized upstream.
 */
export function SanctuarySessionProvider(
  props: { readonly value: SanctuarySessionSignal; readonly children: React.ReactNode },
): React.ReactElement {
  return React.createElement(SanctuarySessionContext.Provider, { value: props.value }, props.children);
}
