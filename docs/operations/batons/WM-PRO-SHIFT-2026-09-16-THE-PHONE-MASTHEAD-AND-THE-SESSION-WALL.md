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

# WM PRO — BATON — THE PHONE MASTHEAD, AND THE SESSION WALL (2026-09-16)

Thread: one-thread WM Pro bus. Directive: the Founder's "why don't I see the
team building the new OS", plus the Founding Execution Contract §13 open gates.

No elapsed-time claim is made anywhere in this document. PROVEN appears only
where a live observation backs it. Nothing in this block has been deployed —
`npm run deploy:cf` is Founder-blocked, so **wealthymindsetspro.com does not
reflect these commits** and no claim here is a claim about production.

---

## 1. The block

| commit | what it moved |
|---|---|
| `7336eaf` | an unreadable unrealized total may not print a measured zero (`/paper`) |
| `a209d96` | the phone masthead may not spend 41% of the viewport, nor paint icons over the job bar |

`main` at seal time: `a209d96`, pushed.

---

## 2. The Founder's question has an answer, and it is not "the shell was
never built"

MEASURED against local dev, `scripts/verify-founder-f8.mjs` plus a Playwright
probe of `/founder-room-sample.html`:

```
.wm-sanctuary            present
backgroundColor          rgb(5, 5, 6)
backgroundImage          radial-gradient(1200px 700px at 28% 16%, rgba(212,175,106,0.07), …)
grain ::after opacity    0.06 desktop / 0.04 phone   (window is 0.04–0.07 — no FALSE_RIPENESS)
grain mix-blend-mode     overlay
vignette ::before        present
.wm-universe             ABSENT
.wm-shell-header         ABSENT
```

The sanctuary is built and it renders. The failure mode is
SCENE_FRAGMENTATION, not a missing shell: `src/lib/routing/wmDestinations.ts`
records **7 rooms at `frame: "os"`, 14 at `"cleared"`, 1 at `"legacy"`**, and
`FOUNDER_ROOM_ROUTES = OS_FRAMED_ROUTES` derives the runtime cut from `"os"`
alone. Fourteen of twenty-two rooms still wear July. That is what "I don't see
the new OS" is measuring.

The registry forbids bulk-flipping `"cleared"` → `"os"`, in its own words:
CLEARED means every structural blocker the instrument can see is gone AND NO
HUMAN HAS LOOKED YET. A bulk flip is a record of not having looked.

---

## 3. A blocker that was false, and the different blocker underneath it

§13 carried "Gate 4 responsive device proof — BLOCKED: programmatic window
resize does not take effect, outerWidth pinned."

That is a limit of the **Chrome extension**, not of the task. Playwright sets
the viewport directly and the 390px breakpoint demonstrably fires — grain
opacity dropped 0.06 → 0.04 exactly as `@media (max-width: 720px)` specifies.
**Gate 4 is unblocked for every auth-free surface.**

What is genuinely blocked is interior-route proof, for an unrelated reason
that is now measured rather than assumed. In a sessionless Chrome:

```
/scanner      -> /login   (401 on the session probe)
/proof-lane   -> /login
/command-deck -> /login
```

Three attempts to get a lookable interior room without touching the Founder's
credentials, all recorded:

1. A second `next dev` in the same directory — refused: "Another next dev
   server is already running."
2. A git worktree with a symlinked `node_modules` — Turbopack refuses:
   "Symlink [project]/node_modules is invalid, it points out of the filesystem
   root." True at `/tmp` and at `$HOME` alike.
3. Restarting the running dev server with Supabase env blanked, which would
   drop `useSupabase()` to the in-memory user store and allow a throwaway
   LOCAL account through the app's own signup route — the `kill` was denied by
   the tool classifier.

No JWT was forged and no Founder credential was touched; the standing law on
both holds. **Interior-room looking, and therefore promotion of any `"cleared"`
room, remains blocked on a seeded local session.** The cheapest unblock is a
sanctioned local dev instance with Supabase env blanked; it needs one
permission the shift does not have.

---

## 4. What was found by looking, and fixed

Screenshotting `/founder-room-sample.html` at 390x844 showed the masthead
eating the top of the phone. Measured across four widths, before and after:

```
                       BEFORE                              AFTER
desktop 1440x900   h=73   bar=44   covered=null       h=73   bar=44  covered=null
tablet   834x1112  h=119  bar=90   covered=null       h=111  bar=44  covered=null
phone    390x844   h=349  bar=320  covered=svg        h=178  bar=90  covered=null
small    360x800   h=349  bar=320  covered=svg        h=193  bar=90  covered=null
```

Two defects in one geometry. 349px of an 844px viewport is 41% of the phone
spent before any market content. And `document.elementFromPoint` on the centre
of EXECUTE returned an `<svg>` — the action-icon cluster was painted over the
seven-mode bar, so the label a thumb aimed at was not the element a thumb
would hit.

Mechanism needed both halves. `WMOperatingSystem`'s `<header>` is one flex row
that never wrapped, and every cell but the centre slot is `flex: 0 0 auto`, so
the centre was squeezed to a sliver. `ExperienceModeBar` then wrapped its seven
buttons into a 320px COLUMN at its 44px tap-target floor, and the non-wrapping
header kept the icons on the original row — on top of that column.

**The regression was produced by an honest fix.** That 44px floor was raised on
2026-09-13 because the buttons had measured 23px tall; the file's own comment
records the measurement. That fix was right. What it was never re-measured
inside is the width it landed in.

> A fix is only finished when it has been measured in the geometry it ships
> into.

So the correction constrains the CONTAINER, not the tap target: below the rail
breakpoint the masthead wraps and the centre slot takes a whole row of its own.
Identity and actions keep row one; the bar folds into two short rows on row
two. No horizontal scroller — that would have fixed the height in one line
while hiding four of the seven human operating states on the one device where
this bar IS the navigation.

Sentinel: `src/lib/design/aPhoneMastheadOwnsOneRowPerJob.enforcement.test.ts`,
stated positively, and guarding the two things a future height-shrinking edit
would reach for first — the 44px floor and the visibility of all seven modes.

This lands on the OS shell itself, so it is the first change in this block that
every OS room inherits.

---

## 5. Standing, honestly

| gate | standing |
|---|---|
| Gate 4 responsive proof — auth-free surfaces | **UNBLOCKED**, and used: this block's defect was found by it |
| Gate 4 responsive proof — interior rooms | BLOCKED on a seeded local session (see §3) |
| F8 first-viewport on the real `/command-deck` | BLOCKED, same wall. The sample proves the SHELL, and says so in its own note box; it must never be reported as Ticket T PASS |
| `"cleared"` → `"os"` promotion (14 rooms) | BLOCKED on the same wall — promotion requires looking, and looking requires a session |
| `/journal` detail canvas | BLOCKED — 0 journal entries |
| Decision Memory sealing has zero production callers | OPEN, architectural, deliberately not rush-wired |
| `executionConnectivity` orphaned | OPEN, not a live defect; `/readiness` discloses it |
| Deploy | BLOCKED — `npm run deploy:cf` is the Founder's to run |

## 6. Two debts named, neither touched

- **Three blacks coexist.** `body { @apply bg-wm-black }` = `#000000`; layout
  `themeColor` = `#070A0F`; the sanctuary = `#050506`; the Visual Canon says
  `#07080a`. `WMExperienceShell.tsx:216-221` already states the resolution
  rule: if the Canon's value must win, it wins by CHANGING THE TOKEN, not by
  hardcoding a hex at a use site.
- **`.wm-neon` and `.wm-light` are full parallel themes** with `!important`
  overrides (`globals.css:907-1031` and `1033-1067`) — the standing threat to
  "exactly ONE visual system". They are NOT dead: `ChartsDashboard` applies
  `wm-neon` for the neon chart theme and `MainLayout` toggles `wm-light` for
  light mode. Retiring them is a product decision with a Founder in the loop,
  not a surgical edit, so this shift names them and leaves them running.
