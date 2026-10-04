"use client";

/**
 * Today's broker trades → the rail's "Today · your rules" card (Garden 18 v2
 * §70). Polls the owner-only ledger route's today mode once a minute while the
 * page is visible (the route itself keeps its answer 60 s). Not the owner, not
 * configured, or no trades → null, and the card draws nothing. Hidden for the
 * rest of the day when the trader dismisses it.
 */
import { useCallback, useEffect, useState } from "react";

import { reconstructEpisodes, type LedgerOrder } from "@/lib/broker/webullLedger";
import { todayRuleState, type TodayRuleState } from "@/lib/journal/todayRuleState";

export const RULE_CARD_HIDDEN_KEY = "wm_rule_card_hidden_day";

export function useTodayRuleState(): { state: TodayRuleState | null; dismiss: () => void } {
  const [state, setState] = useState<TodayRuleState | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string | null>(null);
  useEffect(() => { try { setHidden(localStorage.getItem(RULE_CARD_HIDDEN_KEY)); } catch { /* none */ } }, []);
  useEffect(() => {
    let alive = true;
    let t: number | undefined;
    const pull = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const r = await fetch("/api/broker/webull/ledger?today=1", { cache: "no-store" });
        // guest audit 2026-10-04: a 403 is the owner gate — this user has no broker here; stop asking every minute.
        if (r.status === 403) { window.clearInterval(t); if (alive) setState(null); return; }
        if (!r.ok) { if (alive) setState(null); return; }
        const j = await r.json() as { state?: string; day?: string; orders?: LedgerOrder[] };
        if (!alive) return;
        // A refusal (e.g. Webull's rate limit) keeps the last good reading rather than blinking the card away.
        if (j.state === "REFUSED") return;
        if (j.state !== "OK" || !Array.isArray(j.orders)) { setState(null); return; }
        let oneR: number | null = null;
        try { oneR = Number(localStorage.getItem("wm_ledger_one_r") ?? 0) || null; } catch { /* none */ }
        setDay(j.day ?? null);
        setState(todayRuleState(reconstructEpisodes(j.orders, Date.now()), oneR));
      } catch { if (alive) setState(null); }
    };
    void pull();
    t = window.setInterval(() => { void pull(); }, 60_000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);
  const dismiss = useCallback(() => {
    if (!day) return;
    setHidden(day);
    try { localStorage.setItem(RULE_CARD_HIDDEN_KEY, day); } catch { /* this visit only */ }
  }, [day]);
  return { state: day && hidden === day ? null : state, dismiss };
}
