"use client";

/**
 * useSharedAuthorityProbe — ask the shared position authority whether it is
 * actually there, on THIS device, right now.
 *
 * ── Why a probe and not a constant ───────────────────────────────────────────
 *
 * `selectCapitalReach` refuses to say ALL_DEVICES without a named authority,
 * and the whole value of that refusal is that the name has to be EARNED. A
 * boolean in a config file would defeat it in one commit: the day someone adds
 * `sharedStore: true`, every screen starts promising parity that no database
 * ever confirmed.
 *
 * So the surface asks. `/api/decision-position` calls the table's own RPC and
 * reports what came back. A missing env var and an unapplied migration produce
 * the same answer, because they are the same fact to the trader: his phone
 * cannot see his position.
 *
 * ── UNOBSERVED is the honest initial state ───────────────────────────────────
 *
 * The hook starts at UNOBSERVED, not at "no". Before the fetch resolves WM
 * knows nothing, and §14.1 forbids collapsing "I have not looked" into "there
 * is nothing there" — that is how a spinner becomes a claim.
 *
 * But UNOBSERVED covers three different silences, and §8 does not let them
 * share one sentence: WM has never asked (UNASKED), WM asked and cannot
 * re-check from here (CANNOT_RECHECK), WM asked and could not read the reply
 * (UNREADABLE). Only the first is entitled to `note: null`, which is what the
 * selector turns into "WM has not asked yet."
 *
 * 401 is SIGNED_OUT rather than a failure: a shared book is per-trader, so
 * there is genuinely nothing to look up until WM knows whose book it is.
 */

import { useEffect, useState } from "react";
import type { SharedAuthorityObservation } from "./capitalReach";
import { readClassifiedJsonReceipt } from "../marketData/readJsonReceipt";

/**
 * WM has never asked. `note: null` is what earns the selector's "WM has not
 * asked yet." sentence, so this constant is the ONLY one entitled to it.
 */
const UNASKED: SharedAuthorityObservation = {
  status: "UNOBSERVED",
  authority: null,
  note: null,
};

/**
 * WM asked before and cannot re-check from here. Still UNOBSERVED — WM is no
 * longer standing behind the old answer — but it is a different fact from
 * never having asked, and it says so in its own words.
 */
const CANNOT_RECHECK: SharedAuthorityObservation = {
  status: "UNOBSERVED",
  authority: null,
  note:
    "WM cannot re-check the shared record from a device that is offline or in "
    + "the background, so it is no longer standing behind the last answer.",
};

/** WM asked and could not read what came back. Also not "has not asked". */
const UNREADABLE: SharedAuthorityObservation = {
  status: "UNOBSERVED",
  authority: null,
  note:
    "WM asked the shared record and could not read the answer, so it is not "
    + "reporting one.",
};

export function useSharedAuthorityProbe(): SharedAuthorityObservation {
  const [observation, setObservation] = useState<SharedAuthorityObservation>(UNASKED);

  useEffect(() => {
    let live = true;
    let controller: AbortController | null = null;
    let revision = 0;

    const refresh = async () => {
      const requestRevision = ++revision;
      controller?.abort();
      // A RE-CHECK IS NOT AN UN-ASK. This used to reset to UNOBSERVED on every
      // pass, including the routine 60s poll — so /paper's cross-device block
      // read "WM has not asked yet." once a minute for the length of a fetch,
      // and `nextDependency` (the one migration sentence the founder can act
      // on) blinked out with it. A poll in flight is not a new fact; the last
      // answer stands until a new one replaces it.
      if (document.visibilityState === "hidden" || navigator.onLine === false) {
        // This IS a reason to stop asserting: WM cannot verify from here.
        setObservation(CANNOT_RECHECK);
        return;
      }
      const requestController = new AbortController();
      controller = requestController;
      const acceptsReceipt = () => live && requestRevision === revision;
      try {
        const res = await readClassifiedJsonReceipt<{ serverAuthority?: unknown; note?: unknown }>(
          fetch, "/api/decision-position", requestController.signal,
        );

        if (!live) return;
        if (!acceptsReceipt()) return;

        if (res.status === 401) {
          setObservation({ status: "SIGNED_OUT", authority: null, note: null });
          return;
        }

        if (!res.ok) {
          // The route answered something this hook was not built to read.
          // Reporting OBSERVED/null would assert the table is absent on the
          // strength of a response we did not understand — so we stay silent.
          setObservation(UNREADABLE);
          return;
        }

        const body = res.body;
        if (!live) return;
        if (!body || typeof body !== "object" || Array.isArray(body)
          || !(body.serverAuthority === null || typeof body.serverAuthority === "string")) {
          setObservation(UNREADABLE);
          return;
        }

        setObservation({
          status: "OBSERVED",
          authority: typeof body.serverAuthority === "string" ? body.serverAuthority : null,
          note: typeof body.note === "string" ? body.note : null,
        });
      } catch {
        // Offline, aborted, blocked. WM did not learn anything, and saying
        // "not there" would be inventing a finding out of a lost connection.
        // It did ASK, though — so it does not get to say it never asked.
        if (acceptsReceipt()) setObservation(CANNOT_RECHECK);
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);

    return () => {
      live = false;
      revision += 1;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  return observation;
}
