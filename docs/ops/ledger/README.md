# WM Pro — Living Implementation Ledger (repo-local mirror)

This directory is the append-only mirror of the Founder-canon Living
Implementation Ledger while the Google Drive MCP connector is
unauthorized in the current session.

## Rules

- **Append-only.** Never edit or delete a prior entry. If a prior entry
  is wrong, add a new entry that corrects it and reference the old
  filename in the correction.
- **One markdown file per session or per atom.** Filename format:
  `YYYY-MM-DD-<short-slug>.md`. If two sessions run the same date, add
  a suffix (`-am`, `-pm`, `-b`, etc.).
- **Every entry must contain the founder-canon fields**:
  - Date / time
  - Starting SHA
  - Ending SHA
  - Commits created (SHA + one-line purpose)
  - Subsystem(s) touched
  - Observed failure (before)
  - Root cause
  - Exact change made
  - Tests / build proof
  - Deployment state (LIVE / READY / applied? verified?)
  - Supabase / DB state (authored vs applied vs verified)
  - Founder-visible result
  - Remaining limitations
  - Anything now duplicate or unnecessary
  - Next real dependency for the following team
- **Never fabricate a proof.** If a step could not be run in the session
  (blocked by connector, missing auth, unavailable env), record it as
  `NOT VERIFIED THIS SESSION — <reason>` — never convert an unverified
  step into a claimed one.
- **Distinguish pre-fix and post-fix evidence.** Production evidence
  captured before a fix landed must not be relabelled as proof the fix
  worked.

## Sync-to-Drive workflow (manual)

Until the `google-drive` MCP connector is authorized, ledger entries
here must be periodically synced to the canonical Drive Living
Implementation Ledger. Suggested workflow:

1. In an interactive Claude session with the Drive connector authorized,
   run "sync docs/ops/ledger/*.md into the WM Pro Living Implementation
   Ledger, preserving append-only ordering."
2. Or copy-paste each new entry directly into Drive.

## Files

- `README.md` — this document.
- `2026-08-16-scoreexplainer-nextpractice-atom.md` — atom-close baton for
  the pending ScoreExplainer + profile/page.tsx conditional-hook fix
  awaiting Sentinel review.
- `2026-08-16-pm-execution-session.md` — prior session's ledger entry.
- `2026-08-24-experience-shell-cutover.md` — first WM Experience Shell
  cutover (live seven-mode band on /command-deck) + moomoo/webull env
  drift-lock fix. Records a P0: prod serving Cloudflare Error 1027
  (Workers plan-limit outage) — Founder action required.
- `2026-08-24-question-router-atom.md` — WM Question Router: compiles the
  one dominant question on /command-deck from (job mode) × canonical One
  Story signals. Deployed (Worker `ab64ff85`); visual verification still
  blocked by the same Error 1027 outage.
- `2026-08-25-verification-close.md` — prod recovered at the 00:00 UTC reset
  (login 200); DESKTOP visual gate CLOSED for the mode band + routed question
  (verified in the Founder's Chrome). Mobile 390px screenshot still open.
- `2026-08-25-p6-passport-whynot.md` — P6 Market Object Passport (`7cb9fd9`)
  + WHY / WHY NOT (`58a5cee`). Both pure view models + display panels wired
  into `/command-deck`, tested (61/61 green), deployed, and VERIFIED LIVE on
  desktop via the Founder's authenticated Chrome. Mobile 390px gate still
  open. Evidence-Reversibility Moat made visible.
- `2026-08-25-p8-receipt-job-emphasis.md` — P8 Decision Receipt (`186ca83`)
  + Job-Emphasis (`ccd2e0a`). `selectDecisionReceipt` projects a sealed
  DecisionMemoryRecord into a trader receipt (WAIT/NO_TRADE = complete; no
  fabricated grade); `selectDeckEmphasis` re-emphasises the deck surfaces
  around the human's current job. 209/209 green; deployed; VERIFIED LIVE on
  desktop — proved the OBSERVE→REVIEW switch flips the Passport/Receipt
  drawers. The "app → operating system" thesis made literal.
- `2026-08-25-job-mode-inference.md` — Job-Mode Inference (`cbe3090`). Pure
  `inferJobMode(signals)` reads concrete decision state (open position →
  MANAGE, unreviewed close → REVIEW, right-of-way → EXECUTE/WAIT, resolving
  state → OBSERVE, else PREP) and the deck surfaces it as a read-only
  suggestion chip that appears ONLY when the inferred job differs from the
  human's selection. Clicking accepts (setMode); WM never auto-switches. 9
  deterministic tests; deployed; VERIFIED LIVE on desktop — the chip
  rendered "SUGGESTED JOB → WAIT", accepted on click, then vanished
  (inferred == current). Suggest, never gate. Mobile 390px still open.
- `2026-08-25-deck-surface-reorder.md` — Deck Surface Reorder (`afd1a55`).
  Extends `selectDeckEmphasis` with a pure `order: DeckSurface[]` (full
  permutation, lead first) + `surfaceOrder` helper; the deck isolates the four
  decision surfaces in their own flex column and maps each to a CSS `order`, so
  the current job PHYSICALLY floats its lead surface to the top without any
  surface leaving the DOM. 58/58 green; deployed (Version `87f1b2bb`); VERIFIED
  LIVE on desktop — OBSERVE led with PASSPORT, switching to REVIEW reranked the
  column to lead with RECEIPT, restored on OBSERVE. Emphasis made physical.
  Mobile 390px still open.
- `2026-08-25-deck-emphasis-signals.md` — Signal-Aware Secondary Order
  (`db4f1fd`). `selectDeckEmphasis` gains an optional `DeckEmphasisSignals` arg
  that refines ONLY the secondary order (never the lead): a live unresolved
  contradiction raises WHY under the lead; an empty Receipt sinks so it never
  outranks a live surface; omitting signals reproduces the pure order exactly.
  62/62 green; deployed (Version `03adf20b`). Live-checked desktop: OBSERVE
  showed the pure order (signal-off path faithful) — the WHY-raise branch was
  NOT observed firing because the market carried no live contradiction
  (proven by unit tests only). Mobile 390px still open.
- `2026-08-25-layout-rationale-caption.md` — Layout-Rationale Caption
  (`0ddb6f5`). Renders a quiet "LAYOUT · <rationale>" line above the decision
  stack (aria-live=polite) so the deck's re-emphasis is never silent — reads the
  same `deckEmphasis.rationale` that drives the order, no new state. Deployed
  (Version `2f350623`); VERIFIED LIVE desktop: caption read the OBSERVE
  rationale, updated to the REVIEW rationale on switch, restored. "Every state
  must be explainable" applied to layout. Mobile 390px still open.
- `2026-08-25-job-suggestion-confidence.md` — Job-Suggestion Confidence Scaling
  (`7ef8925`). Pure `selectJobSuggestion(inference, currentMode)` resolves NONE /
  ACTIONABLE (HIGH·MEDIUM divergence, gold chip) / HINT (LOW divergence, muted
  dashed "Possibly →") so a weak guess never nags the human off their chosen
  job; both stay clickable, WM never auto-switches. 6 tests; 68/68 green;
  deployed (Version `792ad6ca`); VERIFIED LIVE desktop — MEDIUM WAIT divergence
  rendered the ACTIONABLE gold chip (solid border, opacity 1) confirmed by
  computed style. HINT variant NOT observed live (no LOW divergence in market).
  Mobile 390px root-caused: resize_window reports success but innerWidth stays
  1475 — the display won't render sub-640px, so responsive rules never fire.
- `2026-08-25-refinement-note-and-notrade.md` — two isolated experience-layer
  atoms landed under active parallel-builder conditions (a concurrent
  learning-genome thread was committing to `main`): `5b12ced` makes the layout
  caption NAME a signal-driven surface reorder (contradiction-raises-WHY /
  empty-Receipt-sink) instead of moving silently, via a new
  `DeckEmphasis.refinementNote` (null when a signal was a no-op — never a false
  claim); `e374845` fills a hole in `inferJobMode` so a compiled `NO TRADE`
  verdict infers OBSERVE ("stand down and watch") at MEDIUM confidence instead of
  decaying to the LOW/PREP fallback. 74/74 experience green; tsc clean. Built in
  an isolated git worktree (`shift/deck-emphasis-explain`) per ATHOS
  one-builder-per-branch law. NOT DEPLOYED — deferred to a settled, type-clean
  `main` (`origin/main` @ `285a14b` carried a transient `journal/page.tsx` type
  error already fixed in the owning builder's unpushed WIP).
- `2026-08-25-notrade-question-router.md` — WAIT NO TRADE Stand-Down Question
  (`a91c8da`). `routeQuestion` handled `NO TRADE` in EXECUTE but not WAIT, so a
  trader whose setup the engine rejected still got "Has the market earned my entry
  yet?" (implying entry was pending). Added a WAIT NO TRADE branch → "The setup
  was rejected — is the thesis dead, or a cleaner level ahead?", ordered so a live
  contradiction still outranks it. Closes the same `RightOfWay`-completeness gap
  in the router that `e374845` closed in `inferJobMode`. +2 tests; 76/76 green;
  tsc clean for changed files. NOT DEPLOYED (same parallel-builder gate).
- `2026-08-25-caution-question-router.md` — CAUTION Degraded-Grant Question
  (`04a2007`). CAUTION was the last `RightOfWay` member the router silently
  collapsed: in EXECUTE a degraded grant fell through to the clean "exact price"
  question, in WAIT to the quiet earned-entry fallback — both presenting a degraded
  verdict as either clean-go or still-pending. Added CAUTION branches → WAIT
  "Conditions are degraded — take a reduced entry, or wait for cleaner?" (a live
  contradiction still outranks it) and EXECUTE "Right-of-way is degraded — is my
  size cut to match the caution?". Completes the `RightOfWay`-totality closure
  across BOTH the inferred job and the dominant question (every compiled verdict —
  ACTION / WAIT / NO TRADE / CAUTION / UNKNOWN — now answered truthfully). +3 tests;
  76→79 green; tsc clean for changed files. NOT DEPLOYED (same parallel-builder gate).
- `2026-08-26-atoms-deploy-1027-block.md` — **DEPLOY milestone.** Single
  `deploy:cf` carried origin/main `61c09f1` (the four atoms `5b12ced` / `e374845`
  / `a91c8da` / `04a2007` PLUS the release-blocking journal TS2448 fix `61c09f1`)
  to Cloudflare. Build's TypeScript gate PASSED (journal fix cleared the sole
  error); Worker uploaded — new **Version `1a17536d-97a2-458d-9cb1-cab06e63225b`**.
  Atoms advanced TESTED → DEPLOYED. BUT prod is serving **Error 1027** (Workers
  free-plan daily quota exhausted at ~08:42 UTC) on every origin — Gate 3 (route)
  + Gate 4 (live/visual) BLOCKED; atoms DEPLOYED but NOT OBSERVED/VERIFIED.
  Founder-only fix: upgrade Workers plan (or 00:00 UTC reset). Build ran from the
  isolated worktree after converting its `node_modules` symlink to an APFS COW
  clone (Turbopack rejects the out-of-root symlink).
