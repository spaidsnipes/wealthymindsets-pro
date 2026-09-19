<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# Baton — the equipment opened inside the same Room

**Receipt, not authority.** Nothing here is a new rule. The rule was the Founder's
INTERACTION CUTOVER directive; this records what was built against it and what was
observed with eyes on the live product.

Commits: `3726184` (the meaning) · `9802ac3` (the adoption)
Live: https://wealthymindsetspro.com/command-deck

---

## The acceptance question

> Does this feel like I opened equipment inside the same WM Pro Room — or did
> another app load?

Answered by walking it on the production URL, in order, with the room deliberately
scrolled away from the top so RETURN had a real promise to keep.

| Stage | What was observed live |
|---|---|
| ROOM | Rail reads ROOMS → **WORKSPACE** → TOOLS. "Market reality" sits under WORKSPACE with the plain-language hint *what is resolved, what is missing, what blocks entry*. Room at `scrollTop: 1048`. |
| PREVIEW | Widget docked bottom-right, 220px tall. Verdict WAIT, the headline, and `0 resolved · 8 missing · 11 blocking`. The Passport's eight dimensions stayed fully readable behind it. URL became `?equip=market-reality&stage=preview` — **same pathname**. |
| DRAWER | Taller, not wider. UNRESOLVED (8) / WHY NOT (11) / CLEARED (1) all legible. The Passport is still there. The "Open drawer" control correctly disappeared — you cannot expand what is already expanded. |
| ENTER | Full screen, the room's own obsidian — not a white document. RETURN TO ROOM is the emphasised control, and the only control. Same verdict, same counts: one compilation, three depths. |
| RETURN | Landed back on **drawer**, the stage entered from — not reset to preview — and `scrollTop: 1048` exactly. The trader's place was kept. |
| CLOSE | `document.querySelectorAll('[data-testid="room-equipment"]').length === 0`. Query string cleared. Scroll still 1048. Nothing permanent was left on the chart. |

Verdict against the Founder's own criteria: **PASS.** Previewed it, entered it,
experienced its depth, returned without losing my place.

---

## Two traps that were live and are now closed

**The rail could not be an `<a href>`.** An anchor tears the document down and
remounts the chart — a blank frame, which *is* the "another app loaded" sensation
the directive names as FAIL. The Workspace entries are `<button>`s that ask the
room over a `document` CustomEvent. The journey is reflected with
`history.replaceState` on the same pathname, never `pushState`: Back means the
previous ROOM, not one stage shallower.

**RETURN could not be built on `window.scrollY`.** In this OS the `os-room`
`<main>` scrolls; the document does not. Measured live during this walk:
`{roomScrollTop: 1048, windowScrollY: 0}`. A RETURN reading `window.scrollY`
would have passed every unit test and dropped the trader at the top every single
time, while reporting success. Both the implementation and a Sentinel assertion
encode the real measurement.

---

## The Sentinel asks WHERE, not whether

`roomAdoptsEquipment.sentinel.test.ts` exists because `3726184` shipped a correct
reducer with **no adopter** — the same shape as the three defects sealed in
yesterday's baton. Every assertion names a place: WORKSPACE's index between the
room list and the other destinations; button-not-anchor; the full branch being the
only style that takes the screen; RETURN living inside it.

One assertion was caught vacuous before it shipped. A file-wide search for
`vm={marketCanvas}` **passed against the pre-adoption source** — `<MarketCanvasPanel
vm={marketCanvas} />` has sat in the evidence drawer for months, so the rule would
have kept passing if the equipment layer had been handed anything at all. It is now
scoped to the layer's own prop window. 13 of 13 checks re-proven to fail against
`HEAD`.

Gates: `tsc --noEmit` EXIT 0 · `vitest run` EXIT 0 — 689 files / 8461 tests.

---

## Honest, unclosed

- **`data-decision-id` is null on the live page.** The carriage is built and the
  Sentinel pins it, but Decision sealing has zero production callers — the deck
  says so itself: *"Decision sealing is not wired in this build."* The identity
  rides every stage the moment there is an identity to ride. Nothing was faked to
  make the attribute look populated.
- **FULL is currently the drawer's content at a wider measure.** The grammar is
  proven; the depth is thin. "ENTER allows that same intelligence to become its
  complete professional visual experience" is not yet true — it becomes the same
  intelligence with more whitespace. That is the next atom, and it must stay one
  compilation.
- The remaining §13 gates are untouched by this block: Live VP render geometry,
  `executionConnectivity` orphaned, Gate 4 responsive proof (blocked — programmatic
  resize does not take), `/journal` detail canvas (blocked — 0 entries).
