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
 * 401 is SIGNED_OUT rather than a failure: a shared book is per-trader, so
 * there is genuinely nothing to look up until WM knows whose book it is.
 */

import { useEffect, useState } from "react";
import type { SharedAuthorityObservation } from "./capitalReach";
import { readClassifiedJsonReceipt } from "../marketData/readJsonReceipt";

const UNOBSERVED: SharedAuthorityObservation = {
  status: "UNOBSERVED",
  authority: null,
  note: null,
};

export function useSharedAuthorityProbe(): SharedAuthorityObservation {
  const [observation, setObservation] = useState<SharedAuthorityObservation>(UNOBSERVED);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await readClassifiedJsonReceipt<{ serverAuthority?: unknown; note?: unknown }>(
          fetch, "/api/decision-position", controller.signal,
        );

        if (!live) return;

        if (res.status === 401) {
          setObservation({ status: "SIGNED_OUT", authority: null, note: null });
          return;
        }

        if (!res.ok) {
          // The route answered something this hook was not built to read.
          // Reporting OBSERVED/null would assert the table is absent on the
          // strength of a response we did not understand — so we stay silent.
          setObservation(UNOBSERVED);
          return;
        }

        const body = res.body;
        if (!live) return;
        if (!body || typeof body !== "object" || Array.isArray(body)
          || !(body.serverAuthority === null || typeof body.serverAuthority === "string")) {
          setObservation(UNOBSERVED);
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
        if (live) setObservation(UNOBSERVED);
      }
    })();

    return () => {
      live = false;
      controller.abort();
    };
  }, []);

  return observation;
}
