/**
 * JOURNAL SAVE → RELOAD, PROVED ON SERVING WITHOUT TOUCHING ANYONE'S BOOK (Garden 19, 2026-10-08). PURE.
 *
 * WM never writes on the Founder's account, so "Reference an FVG → save → reload → the same snapshot"
 * cannot be shown on his real book. This runs the SAME path in a throwaway in-memory Storage:
 *   the Journal's own writer (writeJournalStorage, the member's key) → its own reader
 *   (readJournalStorage) → the page's hydrator (hydrateJournalEntries) → the reference reader
 *   (readJournalFvgReference) — and a second save → reload for byte stability.
 * It returns the before / after facts for the proof scene to show. The in-memory Storage is created
 * here and dropped; the browser's own storage is never named.
 */

import { readJournalStorage, writeJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import { fvgContextNote, type JournalFvgContext } from "./fvgDecisionContext";
import { fvgReferenceSentence, type JournalFvgReference } from "./fvgDecisionReference";
import { hydrateJournalEntries } from "./hydrateJournalEntries";

export interface RoundTripRow {
  readonly field: string;
  readonly before: string;
  readonly after: string;
  readonly same: boolean;
}

export interface RoundTripProof {
  readonly key: string | null;
  readonly bytes: number;
  readonly readStatus: string;
  readonly rows: readonly RoundTripRow[];
  readonly referenceDeepEqual: boolean;
  readonly secondSaveByteStable: boolean;
  readonly verdict: "SAME SNAPSHOT AFTER RELOAD" | "DIFFERS AFTER RELOAD" | "NOT SAVED";
}

/** A throwaway Storage that lives only inside this call. */
function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    keys: () => [...m.keys()],
  };
}

const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

/** One sample entry, shaped as the Journal page's form builds it (`{ ...form }`), carrying the reference. */
export function sampleEntryWith(id: string, fvgRef: JournalFvgReference, fvgContext?: JournalFvgContext | null) {
  return {
    ...(fvgContext ? { fvgContext } : {}),
    id, date: new Date(fvgRef.decisionAtMs).toISOString().slice(0, 10), symbol: fvgRef.symbol, side: fvgRef.snapshot.direction === "BULLISH" ? "long" : "short",
    entry: 100, exit: 101, size: 1, pnl: 1, pct: 1, tags: [], notes: "sample entry (proof scene)", mood: "neutral", result: "win",
    processQuality: "UNRESOLVED", processOutcome: "UNRESOLVED", starred: false, images: [], voiceSec: 0, setup: "SAMPLE", mistakes: "", lessons: "", emojis: [], fvgRef,
  };
}

export function journalRoundTrip(fvgRef: JournalFvgReference, id = "SAMPLE-ROUNDTRIP-1", fvgContext: JournalFvgContext | null = null): RoundTripProof {
  const st = memoryStorage();
  const before = sampleEntryWith(id, fvgRef, fvgContext);
  const json = JSON.stringify([before]);
  if (!writeJournalStorage(st, json)) {
    return { key: null, bytes: 0, readStatus: "NOT SAVED", rows: [], referenceDeepEqual: false, secondSaveByteStable: false, verdict: "NOT SAVED" };
  }
  const key = st.keys()[0] ?? null;
  const read = readJournalStorage(st);
  const after = hydrateJournalEntries(read.status === "RESOLVED_CANONICAL" ? read.records : []).entries[0] ?? null;
  const a = after?.fvgRef ?? null;
  const row = (field: string, b: string, x: string | null): RoundTripRow => ({ field, before: b, after: x ?? "(missing)", same: x === b });
  const s0 = fvgRef.snapshot, s1 = a?.snapshot;
  const rows: RoundTripRow[] = [
    row("Entry id", before.id, after?.id ?? null),
    row("Object id", fvgRef.objectId, a?.objectId ?? null),
    row("Decision time (ms)", String(fvgRef.decisionAtMs), a ? String(a.decisionAtMs) : null),
    row("Read as of (ms)", String(fvgRef.readAsOfMs), a ? String(a.readAsOfMs) : null),
    row("Gap", `${s0.bottom}–${s0.top} ${s0.direction}`, s1 ? `${s1.bottom}–${s1.top} ${s1.direction}` : null),
    row("State · interaction", `${s0.state} · ${s0.interaction} (${s0.interactionsSoFar})`, s1 ? `${s1.state} · ${s1.interaction} (${s1.interactionsSoFar})` : null),
    row("Deepest penetration", String(s0.maxPenetration), s1 ? String(s1.maxPenetration) : null),
    row("Evidence senses", s0.evidence.map(e => `${e.sense}:${e.state}`).join(", "), s1 ? s1.evidence.map(e => `${e.sense}:${e.state}`).join(", ") : null),
    row("Sentence the trader reads", fvgReferenceSentence(fvgRef), a ? fvgReferenceSentence(a) : null),
    // §40: the context read with the reference comes back with it (or stays "not recorded" on both sides).
    row("Context at the decision", fvgContextNote(fvgRef, fvgContext), a ? fvgContextNote(a, after?.fvgContext) : null),
  ];
  // Second save → reload: the reloaded entry written back must produce the same bytes for the reference.
  const st2 = memoryStorage();
  writeJournalStorage(st2, JSON.stringify(after ? [after] : []));
  const again = hydrateJournalEntries((() => { const r = readJournalStorage(st2); return r.status === "RESOLVED_CANONICAL" ? r.records : []; })()).entries[0]?.fvgRef ?? null;
  const referenceDeepEqual = !!a && canon(a) === canon(fvgRef);
  const secondSaveByteStable = !!again && canon(again) === canon(a);
  return {
    key, bytes: json.length, readStatus: read.status, rows, referenceDeepEqual, secondSaveByteStable,
    verdict: referenceDeepEqual && secondSaveByteStable && rows.every(r => r.same) ? "SAME SNAPSHOT AFTER RELOAD" : "DIFFERS AFTER RELOAD",
  };
}
