# /charts masthead → C-101 right-flank rooms — implementation plan

> ## ⚠️ READ THIS FIRST — TWO PREMISES OF THIS PLAN ARE WRONG (adjudicated 2026-09-21 BY LOOKING)
>
> I opened the canon frames next to a production capture instead of arguing from the written
> summaries, and two things this document tells you to do are **off-canon**. They are struck in
> place below rather than deleted, because a deleted mistake gets re-derived.
>
> **WRONG PREMISE 1 — "move Workspace/Tools to the right flank" (Atom 1).**
> `F24-workspace-equipment-over-live-chart.jpg` draws the Workspace and Tools plates **top-left,
> large, adjacent, in a masthead band** — exactly where they are today, and exactly what the
> `:1867-1898` media query was written to produce. That media query is **canon-correct**. Deleting
> it, as Atom 1 instructs, would have moved a compliant control off-canon and re-opened the very
> complaint ("the two targets sit adjacent, large, top-left desktop") that the block was shipped to
> close. The masthead's 79px is NOT the plates being wrong; it is the plates being right.
> What IS off-canon in that band is everything else: F24's masthead carries the two plates and
> **one** `INDICATIVE · asOf` chip, nothing more. Production carries a full-width news/ticker strip
> ABOVE the masthead plus a dense second toolbar row — neither appears in any canon frame. **That**
> is the July shell, and it is where the height should come from.
>
> **WRONG PREMISE 2 — "the equipment panel should stay an overlay" (old Atom 4).**
> `F24` and `G02-workspace-activator.jpg` BOTH draw the panel occupying **its own column** with the
> chart beside it. In G02 the candles, both axes and every annotation begin to the right of the
> Workspace panel; nothing is behind it. Canon does not cover the market with equipment.
>
> ### The genuine conflict, and why it is not resolved by picking a side
>
> `WMOperatingSystem.tsx:1300-1325` carries a documented decision AGAINST the column layout, with a
> measurement behind it: as a flex column the panel "took 176px away from the room, so reaching for
> a tool RESIZED the market: the chart canvas reflowed and redrew, and the exact camera the trader
> was reading moved under their hand." It cites a canon §3 clause — "the equipment wall is an
> OVERLAY at D≈0 and the chart stays."
>
> So both sides are holding a real fact:
> - **Canon frames:** the market must never be hidden. (Measured cost today: 246px, **21% of the
>   candles**, the oldest bars — `scratchpad/probe-tools-reflow.mjs`.)
> - **The §3 comment:** picking up a tool must not move the camera.
>
> "The chart stays" is the shared intent of BOTH, and overlay only satisfies it by accident —
> it keeps the camera by hiding the market. The reading that satisfies both literally: **the panel
> gets its own floor AND the chart preserves its visible logical range across the resize.**
> `lightweight-charts` exposes the visible range; capturing it before the width change and
> restoring it after means the camera does not move even though the canvas does. That is the
> enabling atom, and until it exists, reserving floor WOULD reintroduce the measured camera jump —
> which is why the overlay is not simply a bug to be reverted.
>
> **Do not ship the column layout without the camera-preservation atom in front of it.**

Desktop only (>= `OS_RAIL_BREAKPOINT_PX + 1`). RESEARCH/PLAN doc; no source edited.

Measured baseline (1440, today): 129px above the candles =
`.wm-os-masthead` 79 + `.wm-chart-toolbar` 36 + `.wm-chart-toolbar-pinned` 35 (overlapping).
Canon F24 budget ≈ 9.5%. Target at 900px tall: ≤ ~86px total, and **0px of it owned by
navigation**.

---

## 1. What is actually in the masthead today

`src/components/os/WMOperatingSystem.tsx:1011-1240` draws one `<header className="wm-os-masthead">`,
`padding: 10px 18px`, `borderBottom: 1px solid RULE`. Left→right:

| # | Object | Owner | What it does | C-101 verdict |
|---|--------|-------|--------------|---------------|
| 1 | identity cell `os-identity` | OS :1026 | crest + wordmark, or caller `brand` | already neutered on /charts — `brand={<></>}` (`WMExperienceShell.tsx:549`), caption `undefined` :550 |
| 2 | `wm-os-equipment-plates` → `os-equipment-workspace`, `os-equipment-tools` | OS :1079-1184 | two brass plates, toggle `equipment` state → the shared `#wm-os-rail` panel | **the whole violation.** 176×58 forced by the desktop media query :1867-1898 → this pair, not type, is what makes the header 79px. Gold on navigation breaks G-001. Canon puts these as DOORS on the right flank. |
| 3 | `os-rail-toggle` "Rooms" | OS :1186-1218 | not rendered on /charts (`equipmentMode`) | n/a |
| 4 | hairline + `os-surface` | OS :1223-1233 | room's published surface name | drop on /charts (F24 top band has no legend) |
| 5 | `wm-os-masthead-center` | OS :1235 | `<ExperienceModeBar collapsed>` — one gold job chip on /charts | candidate to move into Workspace room |
| 6 | `mastheadActions` (see below) | shell :555-564 | rail toggle + `ShellAccessChrome` | must relocate, not delete |
| 7 | `FeedBadge` `os-feed-standing` | OS :626, :1239 | tone/asOf chip | **this is the canon's single `INDICATIVE · asOf` chip.** The one object F24 keeps. |

### The right cluster in detail (`src/components/layout/ShellAccessChrome.tsx`)

Six objects where F24 draws one:

1. `<HeaderPnL/>` :156 — realized paper P&L badge (`wm-mobile-hide`).
2. `<WMSBar/>` :157-161 — WM points balance, only when `useWMSAvailable()`.
3. Search button :163-182 — opens `SearchPanel`; also owns the global ⌘K/Ctrl-K listener :124-133.
4. Bell :184-210 — `NotificationsPanel` + unread pip.
5. Settings gear :212-226 — `SettingsPanel`.
6. Profile `User` button :228-244 — opens a `role="menu"` holding **My Profile**, **Settings**,
   **Sign Out** (:293-310) and **Log out all devices** (:311-323).

Plus the shell's own `railToggle` (`WMExperienceShell.tsx:177+`, rendered only when a
context rail exists).

### COMPLICATION — sign-out lives here and nowhere else

`ShellAccessChrome` is the **only** sign-out on an OS-framed room; that is literally why the file
exists (its header comment, :30-43) and `ShellAccessParity.test.tsx:115-118` is the guard that
keeps it reachable. `signOut` / `signOutAllDevices` come from `useAuth()` and are not mounted
anywhere else in the OS frame. **No atom below deletes this cluster — every atom relocates it,
and the parity guard is re-aimed at the new location in the same commit, never dropped.**

### Tools drawer — the A-201 status is better than assumed, verify before acting

- The OS panel in equipment mode already leaves the flex flow: `position:absolute; left:0;
  top:0; bottom:0; width: OS_EQUIPMENT_RAIL_WIDTH_PX (264)` (`WMOperatingSystem.tsx:1324-1336`),
  guarded by `roomAdoptsEquipment.sentinel.test.ts:1334-1398`.
- `RoomEquipmentLayer` is `position: fixed` at every stage (`RoomEquipmentLayer.tsx:238-281`).
- So the reflow complaint is either (a) the 264px opaque panel **covering** the left third of the
  candles — an A-201 opacity/side problem, not a reflow one — or (b) a MainChart resize observer
  reacting to something else. **Atom 0 is a measurement, not a fix.**

---

## 2. Atoms, in order

Every atom: desktop only, one commit, `npx vitest run` green, plus a numeric before/after from
`scratchpad/desktop-chrome-stack.mjs` (+ `measure-chrome-above-candles.mjs`) at 1440×900 and a
screenshot. Guards may be **re-aimed, never weakened** — if an assertion moves, the replacement
must assert the same or a stronger fact about the new owner.

### Atom 0 — MEASURE (no source change) — ✅ DONE 2026-09-21, `scratchpad/probe-tools-reflow.mjs`

**VERDICT: COVER, not REFLOW.** At 1440×900 the candle canvas is `x=18 y=129 w=1159 h=689`
**identically** with Tools closed and open, and the canvas element is the **same instance** across
the toggle (no remount). The panel is `x=0 y=79 w=264 h=787`, `position:absolute`, `z-index:40`,
`background rgb(7,8,10)`, `opacity:1`.

Consequences for the atoms below, and they are not small:

- **A-201 is already satisfied.** `MarketCanvas` is neither unmounted nor resized. Atom 4 as
  originally written ("make it an overlay") is **work against a defect that does not exist** — it
  is already an overlay. Do not write that commit.
- **The real defect is worse than the reported one.** The panel hides `x=18..264` of a canvas that
  spans `x=18..1177` — **246px, 21% of the candles**, and specifically the OLDEST bars, the context
  a trader reads to place the current one. "The chart got smaller" and "the chart got covered"
  produce the same complaint and need opposite repairs.
- **Do not "fix" it by flipping the panel to the right flank.** C-101 puts the *doors* on the right;
  it does not say the room behind them may stand on the market. An opaque wall on the right covers
  the **price axis** — one of only two pieces of axis furniture canon keeps. That is a worse
  occlusion bought with a canon misreading.
- The honest repair gives the panel **its own floor** (the footer-band lesson: a canvas cannot draw
  into room it was never given, and a panel should not stand in room it was never given either).
  That costs chart width while open, which is a real trade-off and a **Founder-facing decision**,
  not a silent one.

Atom 4 is therefore **rewritten below** and is no longer a mechanical conformance task.

### Atom 1 — RIGHT-FLANK DOORS (the big win: ~79px → ~0px of nav chrome)
Move the Workspace/Tools pair out of `<header>` and mount them as two vertical door plates on the
**right edge of the room region** (`.wm-os-body`, which is already `position: relative`, :1255),
stacked as C-101 draws them: Workspace upper, Tools lower, outside the price axis.
- Keep the exact same `equipment` state, `setEquipment`, `equipmentTriggers` refs, Escape handling
  (:935-945) and `aria-controls={open ? "wm-os-rail" : undefined}` (:1116) — this is a **move**,
  so `ShellAccessParity.test.tsx:313-322` and `roomAdoptsEquipment.sentinel.test.ts:1526` keep
  passing on the same testids and labels.
- Delete the desktop media-query block `WMOperatingSystem.tsx:1867-1898` (the 176×58 sizing that
  is the 79px) and re-express the plate sizing in the new flank stylesheet.
- G-001: the door plates lose the gold gradient fill and gold word ink. Gold survives only as the
  **open**-state hairline, i.e. identity/state hardware, not as a navigation invitation.
- Verify: masthead height drops to the remaining row (~34-38px); `os-equipment-workspace` and
  `os-equipment-tools` still present, still `aria-expanded`, still Escape-dismissable; canvas
  width unchanged when closed.

### Atom 2 — THE SINGLE TRAILING CHIP
Reduce the masthead right side to `FeedBadge` alone.
- `HeaderPnL`, `WMSBar`, Search, Bell, Settings, Profile+Sign Out move **into the Workspace
  room** (the panel Atom 1's upper door opens), as a named "Account" group at its foot.
- Keep the ⌘K listener alive — it lives in `ShellAccessChrome`, so the component must stay
  MOUNTED, just rendered inside the Workspace panel. Do not split it.
- Guard work: `ShellAccessParity.test.tsx:109-118, 144-146, 275-277` currently asserts those four
  aria-labels appear in the /charts HTML **with the rail closed**. Re-aim, don't weaken: assert
  they appear in the **Workspace-panel-open** render of /charts AND add a new assertion that a
  path from closed-state /charts to Sign Out exists in ≤ 2 activations (door → menu). A weaker
  version (deleting the instrument-view branch) is not acceptable.
- Verify: masthead contains exactly one non-empty child besides the center slot; grep the rendered
  /charts markup for `os-feed-standing` count === 1.

### Atom 3 — DISSOLVE THE MASTHEAD ELEMENT ON /charts
With nothing left but the collapsed mode chip and the feed chip, stop drawing the `<header>` band
on the instrument view: hand both chips to the canvas's own top-right corner (over the chart, at
F24's position) and render no masthead row at all.
- Landmark guard: `oneRoomHasOneLandmark.enforcement.test.ts` and
  `ShellAccessParity.test.tsx:111/277` assert `wm-os-masthead` exists. Re-aim to: /charts has
  exactly zero `<header>` landmarks **and** exactly one `banner`-equivalent labelled region
  carrying the standing chip — the landmark count assertion gets stricter, not looser.
- `aPhoneMastheadOwnsOneRowPerJob.enforcement.test.ts:48-75` is phone-scoped and must stay green
  untouched; therefore the masthead element must still be drawn below the breakpoint. Route- and
  width-scoped removal only.
- Verify: chrome above candles ≤ 71px at 1440×900 (36 + 35, toolbars only).

### Atom 4 — ~~A-201 OVERLAY CONFORMANCE~~ → THE PANEL NEEDS ITS OWN FLOOR (rewritten after Atom 0)

**The original text of this atom is struck.** It read "the panel enters from the RIGHT flank …
and `MarketCanvas` must not unmount or resize", which Atom 0 proved is ALREADY TRUE and, in the
right-flank part, actively harmful. Preserved here rather than deleted so nobody re-derives it.

The measured defect is a **246px opaque wall over the oldest 21% of the candles**. Three candidate
repairs, and the choice is the Founder's because each costs something visible:

1. **Reserve floor while open** — the room's content box shrinks by 264px so the canvas is *given*
   less room rather than *covered*. Honest, matches the footer-band cure, and is the only option
   where no market is ever hidden. Cost: the chart genuinely narrows while Tools is open, and it
   DOES resize `MarketCanvas` — which is permitted (A-201 forbids UNMOUNT, not resize) but must be
   proven not to drop pan/zoom or drawings.
2. **Translucent wall** — cheapest, and wrong: candles read through a 30% scrim are candles you
   cannot price off. `roomAdoptsEquipment.sentinel.test.ts:1355` pins the panel OPAQUE on purpose;
   A-201's 30% clause is the WEATHER LENS layer, not the equipment wall. Do not weaken that guard.
3. **Narrow/transient drawer** — reduce the wall to a strip that covers only dead margin. Smallest
   change, smallest benefit, and 264px of tools does not fit in the margin.

Whichever ships, the new sentinel is NOT "main's width is byte-identical" — Atom 0 shows that
already holds and it would be a guard that can never fail. The fact worth pinning is the one that
was actually violated: **with equipment open, no pixel of the candle canvas is covered by an
opaque node** — i.e. the panel's box and the canvas's box do not intersect.

### Atom 5 — TOOLBAR MERGE (the remaining 71px)
Out of scope for C-101's masthead clause but the only way to reach 9.5%: fold
`.wm-chart-toolbar` + `.wm-chart-toolbar-pinned` (`ChartToolbar.tsx:831`, :1278) into the Tools
room. Touch only after Atoms 1-4 ship. Guards that pin the current two-row shape:
`chartPhoneControlReachability.test.ts:157-159`, `smartMoneyTriggerReachability.test.ts:130,173`,
`chartsRoomChrome.test.ts:169-176`, `chartsCategoryFusion.test.ts:31`,
`profilesMenuIsTheOneDoor.sentinel.test.ts:80`, `responsiveShell.test.ts:581`.

---

## 3. Guard inventory to re-aim (never weaken)

| File | Assertion | Atom |
|---|---|---|
| `src/components/layout/ShellAccessParity.test.tsx` :111,:277,:505 | `wm-os-masthead` present | 3 |
| same :115-118,:144-146 | four access aria-labels reachable | 2 |
| same :313-322 | exactly 2 `os-equipment-*` testids, both labelled | 1 |
| same :318-319 | no `os-rail-toggle`/"Rooms" on /charts | keep as-is |
| `src/lib/design/aPhoneMastheadOwnsOneRowPerJob.enforcement.test.ts` :48-75 | masthead class + phone wrap rules | must stay green untouched → forces width-scoped removal |
| `src/lib/design/oneRoomHasOneLandmark.enforcement.test.ts` | one landmark per room | 3 |
| `src/lib/design/theStandingConditionsHaveOneOwner.enforcement.test.ts` | no re-typed breakpoint literals in the OS stylesheet — the reason the plate CSS uses a fixed 176px (:1874-1879) | 1 (new flank CSS must obey the same rule) |
| `src/lib/workspace/roomAdoptsEquipment.sentinel.test.ts` :1334-1398 | panel out of flow, opaque, pinned to the room | 1, 4 |
| same :1236-1330 | Escape + tap-chart dismissal, focus return | 1 (refs move with the buttons) |
| same :1467-1538 | equipment mode renders no destinations; exactly the canon's two hands | 1 |
| `src/components/os/AriaControlsResolves.sentinel.test.ts` | `aria-controls` only while the target is mounted | 1 |
| `src/components/os/WMOperatingSystem.frame.sentinel.test.tsx` :131-186 | rail/room shrink + `maxHeight:100%` cap | 1, 3 (the "100vh is 104px too generous" comment at :1353-1366 hard-codes a 73px masthead in prose — update the reasoning when the band goes) |
| `src/lib/design/roomViewportFloor.test.ts` :64-70 | forbids `calc()` subtracting a hand-typed masthead height | 3 — do not "fix" the flank height with such a calc |
| `src/lib/experience/chartsRoomChrome.test.ts` | `.wm-room-chrome` single owner, no opaque slabs | 1, 5 |

## 4. Risk register
- **R1 (biggest):** sign-out becomes unreachable, or reachable only through a panel that also
  covers the chart. Mitigation: Atom 2 ships the relocation and the re-aimed parity guard in the
  same commit; manual proof = signed-in session on /charts reaches Sign Out in ≤ 2 activations.
- **R2:** removing the `<header>` on one route only trips the phone masthead guards. Mitigation:
  width-scoped, phone branch untouched, Atom 3 gated on the phone suite staying green with zero edits.
- **R3:** `ExperienceModeBar` collapsed chip loses its home; do not drop the mode — it feeds
  `shellEmphasis` and the sanctuary tempo (`.wm-sanctuary[data-mode]`).
- **R4:** ⌘K dies if `ShellAccessChrome` is unmounted rather than moved.
