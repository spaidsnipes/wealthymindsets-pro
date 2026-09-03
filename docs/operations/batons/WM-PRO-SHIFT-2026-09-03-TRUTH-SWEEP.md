# WM PRO SHIFT — continuous truth sweep
Date: 2026-09-03
Thread: ATHOS single-thread (Claude Code)
Prior batons: -PAPER-UNBRICK, -CANON-MERGE, -CANON-EXECUTION

## HEADLINE
Three Market Canvases were DEAD IN PRODUCTION from the commits that added them,
killed by a one-character timeframe typo that a defensive try/catch swallowed.
Found by grepping the pattern after fixing the first instance. All three now
render real compiler output on prod.

## SHIPPED (this stretch)
| SHA | Fix |
|---|---|
| 7185ec6 | /nectar symbol cards: live chip on a dead channel |
| 8878b5a | /journal: two tabs promising AI engines that never run |
| 428c115 | /journal: Session R chip must disclose its coverage |
| 9d2c329 | /journal: 5 of 13 tag filters were unreachable |
| 3c2a068 | /morning-prep: failed Growth Rings fetch must name the failure |
| 97d8f84 | fabio: stop claiming daily personalization over a static library |
| b4799d7 | /backtesting: random number rendered as progress |
| 3a7c198 | /news: a keyword tally is not a confidence score |
| a7864c2 | /ai-bot: Market Canvas never rendered (invalid timeframe) |
| bbd6664 | /journal + /nectar/[symbol]: same dead-canvas bug |
| bf2dd02 | /command-deck: "unknowns 0" was the opposite of the truth |
| e6b296b | /scanner: the A+ grade must say what it measures |

## THE DEAD-CANVAS CLASS (highest value)
`canonicalMarketStateIdentity` throws on an unknown timeframe — deliberately, so
a bad store key fails loudly rather than silently mismatching. Every call site
wraps it in try/catch to tolerate option OCC / non-canonical futures symbols.

Three pages passed `timeframe: "15"`. That is not a TFId ("15m" is) and has no
LEGACY alias, so `normalizeTFId` returned null and the constructor threw on
EVERY render. The catch — written for a different failure mode — absorbed it,
nulled the identity, and `useMarketCanvasVM` returned an empty VM. No canvas,
no error, no signal.

  /ai-bot            — a7864c2
  /journal (detail)  — bbd6664
  /nectar/[symbol]   — bbd6664

The throw was working exactly as designed. Nothing was listening.

**Repo-wide Sentinel added** (`canvasIdentityTimeframes.test.ts`): walks src/,
extracts every literal timeframe handed to canonicalMarketStateIdentity, and
asserts it normalizes. A typo now fails a test instead of quietly deleting a
surface.

**PROVEN ON PROD:**
- `/nectar/BTC` → "CANVAS · BTC NOW · Current 15m reality … NO TRADE · 1 blockers · 1 cleared"
- `/ai-bot` → "MARKET CANVAS · TSLA NOW … WHY NOT (1): Trustworthy market data required · CLEARED (1)"

## FABRICATED-ZERO CLASS
Three instances of a failure path borrowing the visual language of a real
measurement of zero:
- Growth Rings chip rendered the LOCAL JOURNAL entry count on fetch failure,
  under the Target icon that means Growth Rings → "0 local records" read as a
  finding. Now "Growth Rings unavailable", muted, with a title stating no count
  was retrieved.
- HeroTruth rendered "coverage 0 channels · unknowns 0" for a NULL state.
  "unknowns 0" inverts its own meaning — the most reassuring number on the
  strip, shown precisely when nothing had been resolved. Now "unknown", matching
  the sibling `session` field that was already correct.
- Backtesting rendered `p += Math.random() * 12` as "N%". Replaced with an
  indeterminate `role="progressbar"` + "working…".

## LABEL-OVERREACH CLASS
- "AI Strategy Coach" → "Strategy Evidence Coach". The panel is deterministic
  aggregation; its OWN internal headers already read "Strategy Evidence Coach",
  so the honest name existed and only the tab bar overclaimed.
- "AI Songs" → "Lyric Templates". generateSong() fills a hardcoded
  SONG_TEMPLATES string; its own reward toast already said "local lyric
  template".
- "WM Playbook — Today's Focus" → "WM Playbook", and a "context-aware" chip now
  reads "curated notes" while FABIO_CONTENT_IS_PLACEHOLDER — self-correcting
  once real content lands.
- /news `confidence = 60 + |score-50| * 0.8` removed. It restated the score's
  distance from neutral, so more keyword hits looked like more certainty, beside
  a brain icon implying a model. Now reports the real keyword-match count.
- /scanner "A+" now discloses `|change %| x0.5 + volume ratio x0.3`, the score,
  the thresholds, and that it is not a validated quality or prediction.

## STALE-AS-LIVE
/nectar symbol cards showed a green "OBSERVED" chip while the same page proved
CHANNELS STALE 6 / OBSERVING 0. The card read the static fidelity CLASS and
never `coverageState`. New pure `selectChannelLiveness` downgrades tone and adds
a STALE / UNAVAILABLE / CONNECTING badge; the fidelity LABEL is preserved
because the channel really did produce OBSERVED evidence.
**PROVEN ON PROD:** cards now render "OBSERVED  STALE", 6 badges for 6 channels,
agreeing with the ribbon ("6 stale · none observing") and the strip.

## COVERAGE-DISCLOSURE
/journal Session R chip drove cumulative R and the -2R HARD STOP gate from
R-tagged entries only. A 5-trade day with 2 tagged showed a gate verdict from 2.
Now appends "· N/M R-tagged" when partial and names the coverage in its title.
Deliberately NOT zero-filling untagged entries — that would invent flat trades
and corrupt the hard stop.

## SENTINEL PATTERN IMPROVED
Source-text Sentinels now strip comments before matching. Three times a Sentinel
documenting a defect matched its own explanation of that defect. The strip is
applied in backtestProgressTruth, newsSentimentTruth, aiBotCanvasIdentity,
heroTruthNullState and scannerStrengthTruth.

## TEST POSTURE
331 files / **3106 tests passing**. TypeScript clean (`tsc --noEmit`).
Note: exporting a helper from an App Router page breaks generated route types
(TS2344) — scanner disclosure helper lives in src/lib/scannerStrength.ts.

## CARRIED FORWARD
- /journal trade-detail canvas fixed but not yet live-verified (needs an entry
  selected on prod).
- DataHealth aria-label zero-fills optional counts (`${acknowledgedCount ?? 0}`);
  aria-only, low impact, left alone.
- Provider truth unchanged: Webull BLOCKED_AUTH (401), Longbridge NOT
  CONFIGURED, moomoo bridge absent, Tastytrade refresh token absent.
- ATHOS/ATH role-bible folders in Drive remain EMPTY.

## TIMING TRUTH
No shift duration claimed. 12 implementation commits this stretch, 4 production
verifications, 0 plan rewrites, 0 Founder questions.
