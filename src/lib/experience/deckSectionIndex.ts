/**
 * deckSectionIndex — the ONE owner of the /command-deck numbered deep-read
 * sections.
 *
 * WHY THIS MODULE EXISTS. The deck rendered its numbered sections in two
 * unrelated places:
 *
 *   1. `<SectionBanner number={2..5} label=… />` — the real headings, when the
 *      canonical market state has arrived.
 *   2. A hardcoded array inside the "Awaiting first observation" placeholder —
 *      the INDEX shown before any state exists, promising what will appear.
 *
 * They drifted. The Story Ribbon was retired into a nested chapter-history
 * drawer, and a Sentinel was added forbidding `SectionBanner number={1}
 * label="Story Ribbon · Market Narrative"`. The banner went. The PROMISE did
 * not: the placeholder kept advertising "1 · Story Ribbon · Market Narrative"
 * as a section that was coming. A Sentinel pinned to a spelling is not pinned
 * to a meaning.
 *
 * So the trader's very first impression of the deck — the one screen they see
 * while it is still empty — was an index to a section that no longer exists.
 * An index that lists a chapter the book does not contain is worse than no
 * index, because it is read as a commitment.
 *
 * TWO OWNERS OF ONE FACT. Now there is one. The banners read their number and
 * label from here, and the waiting index maps over the same array. A section
 * cannot be promised without also being rendered, and cannot be renamed in one
 * place only.
 *
 * THE NUMBERS START AT 2 ON PURPOSE and that is recorded here rather than left
 * as a mystery in the JSX: 1 belonged to the retired Story Ribbon, and the
 * numbers 2–5 are load-bearing in two enforcement tests that pin the auction
 * lens and the decision chain by ordinal. Renumbering is a separate, visible
 * decision — not a side effect of this consolidation.
 *
 * PURE DATA. No market fact, no formatting, no React.
 */

export const DECK_SECTION_INDEX_VERSION = "wm.deck-section-index.v1" as const;

export interface DeckSection {
  /** The ordinal the trader sees. Stable; see the docblock on why it starts at 2. */
  readonly n: number;
  /** The heading. Rendered verbatim by both the banner and the waiting index. */
  readonly label: string;
  /** The banner's sub-line. The waiting index does not show it. */
  readonly tagline: string;
}

export const DECK_SECTIONS: readonly DeckSection[] = [
  { n: 2, label: "Direction · Location · Aggression · Response", tagline: "the auction lens" },
  { n: 3, label: "Decision Chain", tagline: "regime → management" },
  { n: 4, label: "Steward · Rules Verdict", tagline: "informs, never gates" },
  { n: 5, label: "Data Fidelity · Market Evidence", tagline: "what did WM actually witness" },
];

/**
 * Look a section up by ordinal. Throws rather than returning a hole: a banner
 * that silently renders a blank heading is the absent-cell defect again.
 */
export function deckSection(n: number): DeckSection {
  const found = DECK_SECTIONS.find((s) => s.n === n);
  if (!found) throw new Error(`deckSection: no /command-deck section numbered ${n}`);
  return found;
}

export default DECK_SECTIONS;
