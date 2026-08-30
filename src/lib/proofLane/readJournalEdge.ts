import { readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import { journalRecordsToEdgeEntries } from "./journalEdgeAdapter";
import { selectSessionEdge, type SessionEdge } from "./selectSessionEdge";

export type ProofLaneJournalEdgeRead =
  | { readonly status: "RESOLVED"; readonly edge: SessionEdge }
  | { readonly status: "ABSENT" }
  | { readonly status: "UNAVAILABLE"; readonly reason: string };

/**
 * Read-only Proof Lane adapter over the canonical Journal storage owner.
 * Invalid or unavailable bytes stay unavailable; they are never promoted to
 * an empty measured sample.
 */
export function readProofLaneJournalEdge(
  storage: Pick<Storage, "getItem">,
): ProofLaneJournalEdgeRead {
  const read = readJournalStorage(storage);
  if (read.status === "ABSENT") return { status: "ABSENT" };
  if (read.status === "INVALID" || read.status === "UNAVAILABLE") {
    return { status: "UNAVAILABLE", reason: read.reason };
  }
  return {
    status: "RESOLVED",
    edge: selectSessionEdge(journalRecordsToEdgeEntries(read.records)),
  };
}
