# Ledger — P6 Market Object Passport + WHY / WHY NOT (2026-08-25)

**Session:** Five-Hour Megazord Finish Shift (continuous execution).
**Canon:** BUILD → TEST → BREAK → VERIFY → COMMIT → CONTINUE. P6 =
"WM Experience Shell + SurfaceLink + One Story + Question Router +
WHY/WHY NOT + Market Object Passport." "WHY is an evidence elevator, not
an essay button." Evidence-Reversibility Moat. Auto-Quiet.

## Starting SHA

`dbddc99` (prod recovered + desktop visual gate closed for mode band +
Question Router).

## Ending SHA

`58a5cee` (WHY / WHY NOT atom).

## Commits created

1. **`7cb9fd9` — Market Object Passport (Object DNA / evidence lineage).**
   - New pure view model `selectMarketObjectPassport(state)` compiles each
     of the 8 canonical dimensions (direction, location, structure,
     aggression, orderFlow, regime, profile, volatility — order mirrors
     SurfaceLink) into a Passport with lifecycle
     (RESOLVED / FORMING / UNRESOLVED), value, confidence, strongest
     evidence fidelity, distinct sources, evidence lineage, contradictions,
     and honest unknown residue. Null state → honest empty set
     (0/8 resolved, qualityState UNKNOWN).
   - New component `MarketObjectPassportPanel` — compact display with
     `<details>` progressive disclosure per object; resolved/forming lead
     (Auto-Quiet); reversibility surfaced (every claim → ≥1 evidence ref).
   - 11 deterministic tests (version, null empty set, 8-dimension order,
     provenance, UNRESOLVED/FORMING lifecycle, resolved value/confidence/
     lineage/contradiction, STRONGEST fidelity, distinct first-seen
     sources, reversibility invariant, summary). All pass.
   - Wired into `/command-deck` inside a collapsed `<details>` drawer.
   - Did NOT fabricate a non-existent P4 object graph — the Passport is
     the canonical-dimension DNA the engine already seals. No second
     truth producer created.

2. **`58a5cee` — WHY / WHY NOT (reverse the right-of-way verdict).**
   - New pure view model `selectDecisionWhyNot(oneStory, permission?)`
     reverses the compiled RightOfWay verdict to its concrete causes:
     engaged HARD rules → contradiction → unpaid evidence debt → warned
     evidence → engaged SOFT rules, sorted by severity (KIND_RANK).
     Forwards canonical reasons verbatim — never generates prose opinion
     ("evidence elevator, not an essay button"). ACTION → clear, no
     blockers. Null story → honest UNKNOWN. Clearances render the
     affirmative ledger (no contradiction / N/N nodes paid / no rules
     engaged).
   - New component `DecisionWhyPanel` — headline + severity-ordered
     blockers + CLEARED ledger; gold accent when clear, amber when blocked.
   - 10 deterministic tests (version, null honest UNKNOWN, ACTION clears,
     debt blockers + paid clearance, contradiction blocker + clearance,
     HARD+SOFT rules, strict severity ordering, no-rules clearance,
     fallback to oneStory.missing). All pass.
   - Rendered always-visible on `/command-deck` directly under the One
     Story strip. Complements — does NOT duplicate — the protected
     `WhyInspector` (object-evidence "why is X what it is"); this answers
     the complementary decision-level "why is right-of-way not open?".

## Subsystems touched

`src/lib/marketData/viewModels/` (2 new selectors + 2 test files),
`src/components/experience/` (2 new panels), `src/app/command-deck/page.tsx`
(imports + 2 memos + render wiring).

## Proof

- `tsc --noEmit --skipLibCheck` — clean.
- `vitest run` — 61/61 green across the new viewModels + experience dirs.
- `next build` (via `opennextjs-cloudflare build`) — clean.
- Deploy: `npm run deploy:cf` exit 0.
- **Production VERIFIED LIVE (desktop):** navigated the Founder's
  authenticated Chrome to `https://wealthymindsetspro.com/command-deck`.
  Page text confirms the WHY NOT panel renders truthfully — "WHY NOT ·
  RIGHT-OF-WAY / WAIT / Right-of-way is withheld — the market has not
  earned entry. / HARD RULE Trustworthy market data required / MISSING
  Regime, Direction, Location / SOFT RULE CLC setup evidence required /
  CLEARED: No active contradiction to the thesis. 0/9 evidence nodes
  paid." — and the Passport drawer shows "MARKET OBJECT PASSPORTS · 0/8
  RESOLVED". Confirming screenshot captured. No credentials entered
  (drove the already-authenticated session).

## DB / Supabase state

No migrations applied. No secrets touched. Pure view-model + display work
only.

## Founder-visible result

`/command-deck` now answers, at the decision point, both "WHY is
right-of-way not open?" (verbatim canonical blockers, severity-ordered)
and exposes every canonical dimension's evidence lineage as reversible
Object DNA. The interface now explains the engine's verdict without
inventing a reason — Evidence-Reversibility Moat made visible.

## Remaining limitations

- **Mobile 390px screenshot NOT VERIFIED THIS SESSION** — the connected
  Chrome window would not resize below the display's native width. Needs
  device emulation or a real phone to close the mobile visual gate.
- The live prod state shows 0/8 resolved / 0/9 nodes paid because the
  session had no live market packet sealed at capture time — the honest
  empty state, correctly rendered (not a bug).

## Anything now duplicate

Nothing. Both selectors are new; neither duplicates the protected
`WhyInspector` (object-level) nor any existing truth producer.

## Next real dependency

Continue P6/P8: a pure `selectDecisionReceipt` view model over
`decisionMemory.ts`'s `DecisionMemoryRecord` (canon "WAIT/NO-TRADE can
earn A+"), compiling only defensible evidence-backed process facts —
NO fabricated letter grade (respects the "SCORE ADDICTION" weakness).
