# DECK ORGAN INVENTORY (strict-import census, verified 2026-09-19)

This is the M3 sub-atom the gate row named: "unwritten deck-organ inventory
with migration targets". It exists because /command-deck lost normal-route
authority (Founder order: "Preserve capability. Kill competing authority.")
and the capability it preserves must be enumerable before any organ migrates
or the rail door gets its legacy label.

## Methodology — and why a previous census was discarded

A first census counted TEXTUAL MENTIONS (comments, strings, test readFileSync
scans) and was demoted to DRAFT after spot-checks showed phantom importers
(e.g. `roomEquipment.ts` "importing" DecisionChainPanel via a string). This
census counts only real ES import statements: `grep 'from ".*<Module>"'`
across `src/`, both alias (`@/...`) and relative (`./...`) forms, with
test-file importers recorded but excluded from the SHARED verdict. Every row
below was verified by a direct grep in this repo on 2026-09-19 — not by an
agent's summary. Four claims from the agent-run census were overturned by
those greps; they are listed in "Corrections" so the error class stays
visible.

## DECK-ONLY organs (no non-test importer outside command-deck/page.tsx)

These are the capability /command-deck uniquely holds. If the deck is ever
retired outright, each needs a migration target or an explicit retirement
decision — nothing here may silently vanish.

| Organ | Path | Suggested migration target |
| --- | --- | --- |
| DLARStrip | `components/command-deck/DLARStrip` | /charts inspect rail (dimension truth) |
| WhyInspector | `components/command-deck/WhyInspector` | /charts inspect rail |
| OneStoryStrip | `components/command/OneStoryStrip` | /charts headline band |
| PassportStamp | `components/command/PassportStamp` | /charts receipt surface |
| StoryRibbon | `components/chart/StoryRibbon` | already lives in `components/chart/`; only live importer is the deck (see ConnectedStoryRibbon note) |
| DeckMarketChart | `components/experience/DeckMarketChart` | none — /charts already owns MainChart; retire with the deck |
| DecisionChainPanel | `components/chart/DecisionChainPanel` | /charts review surface |
| StructureContextNote | `components/chart/StructureContextNote` | /charts inspect rail |
| ObjectPassportSlots | `components/experience/ObjectPassportSlots` | /charts receipt surface |
| MarketHonestyPlaque | `components/experience/MarketHonestyPlaque` | /readiness or /charts diagnostics |
| GateRailColumn | `components/experience/GateRailColumn` | /charts review surface |
| CapitalPostureLine | `components/experience/CapitalPostureLine` | /paper (capital truth lives there) |
| DeckExpressionShortlist | `components/experience/DeckExpressionShortlist` | /charts expression surface |
| DecisionReceiptPanel | `components/experience/DecisionReceiptPanel` | /journal (receipts are journal material) |
| PerCapabilityFidelityGrid | `components/marketData/PerCapabilityFidelityGrid` | /readiness (it is a fidelity disclosure) |

Migration targets are SUGGESTIONS for the migration plan, not decisions —
each move is its own measured atom under the Command Deck law ("preserve
capability"), and some organs may correctly retire instead (DeckMarketChart).

## SHARED organs (the deck is one consumer among several — migration NOT required)

ATHOSInterventionPanel (/profile) · MirrorPanel (/journal, /morning-prep) ·
PrepChecklistBand (/journal) · OpeningBellEvidence (/morning-prep) ·
PersonalEdgeChip (/journal) · SectionBanner (/nectar, /nectar/[symbol]) ·
RealmGateway (/morning-prep) · CommandContextRibbon (/nectar) ·
SceneAdmissionPanel (/paper) · SceneAdmits (/paper) · SemanticZoom
(LearningGenomeInspector) · MarketObjectPassportPanel (ChartsDashboard) ·
DecisionWhyPanel (ChartsDashboard) · MarketCanvasPanel (/journal,
/nectar/[symbol], /ai-bot, ChartsDashboard) · SignalProvenanceStrip
(SceneAdmissionPanel → /paper) · OptionExpressionIntent (ChartsDashboard) ·
useCanonicalMarketState · useDecisionMemory · useDecisionContext.

These lose nothing when the deck is quarantined; they already live elsewhere.

## Corrections to the agent-run census (the four overturned claims)

1. **SignalProvenanceStrip** — claimed DECK-ONLY; actually SHARED via
   `SceneAdmissionPanel.tsx:67` (relative import), which /paper renders.
2. **OptionExpressionIntent** — claimed DECK+TEST; actually SHARED via
   `ChartsDashboard.tsx:22`.
3. **AvailableRChip** — claimed DECK-ONLY; the MODULE is shared:
   `DecisionSpineBand.tsx:53` imports `selectAvailableRDetail` from it. The
   component itself renders only on the deck, but the file cannot be moved or
   deleted without breaking DecisionSpineBand.
4. **StoryRibbon** — alias-only grep missed the relative import in
   `ConnectedStoryRibbon.tsx:3`. Verified further: **ConnectedStoryRibbon has
   ZERO importers anywhere in src/** — it is dead code. StoryRibbon is
   therefore effectively deck-only; its only non-deck importer is an orphan.

## Orphan found during verification

`components/chart/ConnectedStoryRibbon.tsx` — was imported by nothing.
REMOVED 2026-09-19 as its own cleanup atom (deleted along with its
`KNOWN_ORPHAN_COMPONENTS` entry in `screenReach.enforcement.test.ts`).
StoryRibbon is now deck-only with no orphan importer.
