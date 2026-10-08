/**
 * THE CHAIN'S STREAM WORD (Sheriff P2, 2026-10-08: NQ futures options showed
 * "● LIVE" over blank cells — the word was LIVE when only the PARENT future's
 * quote was streaming). LIVE is said only when option quotes are actually on
 * the chain; a live parent with an empty chain says exactly that.
 *
 * PURE.
 */
export interface FopStreamInput {
  /** The option contracts' stream state, and its reason when not LIVE. */
  readonly chainStream: string;
  readonly chainReason: string | null;
  /** The parent future's stream state. */
  readonly parentStream: string;
  /** Option contracts on screen that were asked for, and how many have a quote. */
  readonly optionsAsked: number;
  readonly optionsQuoted: number;
}

export interface FopStreamWords {
  readonly word: string;
  /** Green only when the chain itself is quoting. */
  readonly live: boolean;
}

export function fopStreamWords(i: FopStreamInput): FopStreamWords {
  if (i.chainStream === "LIVE" && i.optionsQuoted > 0) {
    return { word: i.optionsQuoted < i.optionsAsked ? `LIVE · ${i.optionsQuoted} of ${i.optionsAsked} quoted` : "LIVE", live: true };
  }
  if (i.chainStream === "CONNECTING") return { word: "CONNECTING", live: false };
  if (i.parentStream === "LIVE") {
    return { word: i.optionsAsked > 0 ? "FUTURE LIVE · option quotes not arriving yet" : "FUTURE LIVE · no strikes to quote", live: false };
  }
  return { word: i.chainReason ?? i.chainStream.replace(/_/g, " "), live: false };
}
