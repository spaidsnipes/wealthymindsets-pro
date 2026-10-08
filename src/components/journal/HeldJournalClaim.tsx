"use client";

/**
 * HELD ROWS, CLAIMED BY THE TRADER — Garden 19 member isolation, 2026-10-08.
 *
 * Rows saved on this browser before entries were tied to an account are adopted automatically only
 * when they can be TIED to the signing-in member (managementOwner.legacyRowsBelongTo). When nothing
 * ties them (cache cleared, a copied browser profile) they are HELD — and a trader's real journal
 * must never simply look empty. So a signed-in member sees ONE honest line: how many entries this
 * browser holds (a count, never their contents) and a two-press claim that moves them — with any
 * held plans, review answers and tickets — into this account through the same owner (byte for byte;
 * union when the account already has rows). Not shown to a guest; nothing moves without the presses.
 */

import React, { useEffect, useState } from "react";

import { claimHeldLegacyRows, heldLegacyRows, type HeldLegacyRows } from "@/lib/journal/managementOwner";
import { useManagementOwnerVersion } from "@/lib/journal/useManagementOwner";

const GOLD = "#C9A55C", MUTED = "#8a8271", INK = "#ede6d3", LINE = "rgba(139,106,41,0.25)";

/** The line's words — pure, so the copy is testable. */
export function heldClaimLine(h: HeldLegacyRows): string {
  const extra = h.otherStores > 0 ? " (with saved plans or review answers from that time)" : "";
  if (h.journalEntries > 0) {
    return `This browser holds ${h.journalEntries} journal ${h.journalEntries === 1 ? "entry" : "entries"} saved before entries were tied to an account${extra}. If they're yours:`;
  }
  return "This browser holds saved plans or review answers made before they were tied to an account. If they're yours:";
}

export function HeldJournalClaim() {
  const ownerVersion = useManagementOwnerVersion();
  const [held, setHeld] = useState<HeldLegacyRows | null>(null);
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { setHeld(heldLegacyRows()); setArmed(false); }, [ownerVersion]);
  if (!held) return note ? <p role="status" style={{ margin: 0, padding: "6px 16px", fontSize: 11, color: MUTED }}>{note}</p> : null;
  const press = () => {
    if (!armed) { setArmed(true); return; }
    const left = claimHeldLegacyRows();
    setArmed(false);
    setHeld(left);
    setNote(left ? null : "Brought into your journal.");
  };
  return (
    <div role="note" data-testid="held-journal-claim" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: `1px solid ${LINE}`, fontSize: 12, color: INK }}>
      <span style={{ minWidth: 0 }}>{heldClaimLine(held)}</span>
      <button type="button" onClick={press} style={{ minHeight: 44, padding: "0 12px", borderRadius: 6, border: `1px solid ${GOLD}`, background: armed ? GOLD : "transparent", color: armed ? "#0b0a08" : GOLD, fontSize: 12, cursor: "pointer" }}>
        {armed ? "Press again to confirm — they become this account's" : "Bring them into my journal"}
      </button>
      {armed ? <button type="button" onClick={() => setArmed(false)} style={{ minHeight: 44, padding: "0 10px", background: "transparent", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}>Not mine</button> : null}
    </div>
  );
}
