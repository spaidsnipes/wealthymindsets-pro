# Ledger — Signal-Aware Secondary Surface Order (2026-08-25)

**Session:** Five-Hour Megazord Finish Shift (continuous execution).
**Canon:** BUILD → TEST → BREAK → VERIFY → COMMIT → CONTINUE. Transformation
thesis: the interface changes its emphasis around the human's current job. This
atom lets the SECONDARY surface order respond to concrete live state, while the
job still owns the lead.

## Starting SHA

`1722d40` (deck surface-reorder ledger).

## Ending SHA

`db4f1fd` (signal-aware secondary order).

## Commit created

**`db4f1fd` — Refine secondary surface order on live signals.**
- The prior reorder (`afd1a55`) used a fixed per-job permutation, so within a
  job the secondary order was blind to live state: a live right-of-way blocker
  sat wherever the static ranking put it, and an empty Decision Receipt could
  outrank surfaces that actually had content.
- Added an optional `DeckEmphasisSignals` arg to `selectDeckEmphasis`
  (`hasUnresolvedContradiction?`, `hasSealedReceipt?`). When supplied it refines
  ONLY the secondary order — the lead is NEVER moved (the job owns it) and the
  result stays a full permutation:
  - a live unresolved contradiction raises WHY directly under the lead (no-op
    when WHY already leads);
  - an empty Receipt sinks to last so it never outranks a live surface (but is
    never demoted below the lead when the job leads with RECEIPT).
  - Omitting `signals` reproduces the pure per-job order exactly.
- Wired the deck to feed `{ hasUnresolvedContradiction: oneStory.contradiction
  != null, hasSealedReceipt: !decisionReceipt.empty }` from records the deck
  already holds. No new truth producer.
- 4 new deterministic tests (13 total in the file).

## Subsystems touched

`src/lib/experience/selectDeckEmphasis.ts` (+ `DeckEmphasisSignals`, `refineOrder`),
`src/lib/experience/selectDeckEmphasis.test.ts` (+4 tests),
`src/app/command-deck/page.tsx` (deckEmphasis now a signal-fed memo placed after
the oneStory / decisionReceipt memos).

## Proof

- `tsc --noEmit --skipLibCheck` — clean.
- `vitest run src/lib/experience` — 62/62 green (6 files).
- `next build` — clean; `/command-deck` compiled.
- Deploy: `npm run deploy:cf` exit 0 — Version ID `03adf20b`. Prod `/login` = 200.
- **Production checked LIVE (desktop) via the Founder's authenticated Chrome**
  (no credentials entered; measured the deployed DOM):
  - Job **OBSERVE** → order `PASSPORT(0) → STORY(1) → WHY(2) → RECEIPT(3)` — the
    pure OBSERVE order. This is the CORRECT signal-off result: WHY sits at index
    2 (not raised) because `oneStory.contradiction` is null in the current
    market, and RECEIPT is already last (no sealed receipt for this user).
  - The refinement therefore correctly made NO change with the live signals
    present, confirming the omit/absent-signal path is faithful in production.

## Remaining limitations

- **The WHY-raise branch was NOT observed firing live this session** — it fires
  only when a live unresolved contradiction is present, and the market carried
  none at verification time. The branch is proven by unit tests, not by a live
  contradiction. NOT VERIFIED LIVE — no live contradiction to trigger it.
- **The empty-Receipt sink produced no visible change** because RECEIPT is
  already last (or the lead) in every pure per-job order, so an empty receipt
  never had a live surface to outrank in the current job. It is a safety net,
  proven by unit tests.
- **Mobile 390px screenshot NOT VERIFIED THIS SESSION** (task #6 still open).

## DB / Supabase state

No migrations applied. No secrets touched. Pure selector arg + memo wiring.

## Founder-visible result

The deck's secondary ordering can now react to live decision state — surfacing a
live blocker and refusing to let an empty receipt outrank live content — without
ever letting a signal seize the job's lead. Emphasis that responds, honestly.

## Anything now duplicate

Nothing. `DeckEmphasisSignals` extends the single `selectDeckEmphasis` mapping;
no second ordering owner. Signals derive from existing selectors (One Story,
Decision Receipt) — no new truth.

## Next real dependency

Optional: animate the reorder transition (CSS `order` jumps instantly today);
or, when a sealed history exists, verify the WHY-raise and Receipt-sink branches
live against a real contradiction / real receipt. Always presentation-only,
human job-selection authoritative.
