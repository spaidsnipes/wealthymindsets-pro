# WOW RESPONSIVE + TOUCH STANDARD — all products

**Owner:** Sentinel · **Established:** 2026-07-28 by Founder directive
**Scope:** WM Pro, Dreamboard, and **every** ATH product. No exceptions.
**Status:** ACTIVE — binding on all tickets from this date.

> Founder directive, 2026-07-28: *"a alooottt of people use their phone to trade on — the
> mobile and iPad experience needs to be immaculate… for not just these apps but every app.
> Each employee needs to get a visual confirmation also, not just confirming through code."*

---

## 1. Visual confirmation is now mandatory

**Code evidence alone no longer closes a ticket.** `tsc` + tests + build prove the code
compiles. They prove nothing about what a human sees on a 390px screen.

Every ticket touching a rendered surface must ship a screenshot at **each** breakpoint it
affects. "I read the CSS and it looks responsive" is not evidence. Neither is a desktop
screenshot.

**A screenshot that was not taken is a failed acceptance criterion, not a pending one.**

## 2. Required viewports

| Class | Size | Represents | Required |
|---|---|---|---|
| **Phone** | **390 × 844** | iPhone 14/15 — **the primary trading surface** | **Always** |
| Phone (small) | 360 × 800 | Android baseline / iPhone SE | Always |
| **iPad portrait** | **834 × 1194** | iPad Air — **primary tablet** | **Always** |
| iPad landscape | 1194 × 834 | iPad Air rotated | Always |
| Desktop | 1280 × 800 | baseline | Always |
| Wide | 1920 × 1080 | trading desk | Where layout is fluid |

**Rotation counts as a state.** A layout verified in portrait is not verified.

**Tesla / in-car (~1200×1920 portrait, touch, gloved/imprecise input) and watch-class
(<250px)** are Founder-stated targets. They are **not** yet required per-ticket — no
product renders on them today and inventing support without a device would be guessing.
They are recorded as a real future lane (`WM-RESP-P2-01`), and the touch and tap-target
rules below are the prerequisite for both. **Do not claim watch or Tesla support until a
real device or verified emulator produces a screenshot.**

## 3. Hard requirements

1. **Touch parity.** Every interaction driven by `onMouseDown`/`onMouseMove`/`onMouseUp`
   must have a pointer or touch equivalent. **Touch does not synthesize mouse-drag events** —
   a mouse-only drag handler is simply dead on a phone. Prefer Pointer Events
   (`onPointerDown`/`Move`/`Up`), which cover mouse, touch and stylus in one path.
2. **Tap targets ≥ 44 × 44 px** (Apple HIG; WCAG 2.5.5 AAA is 44, 2.5.8 AA is 24 minimum).
   Applies to the *hit area*, which may exceed the visual size via padding.
3. **Zero horizontal page overflow.** `document.documentElement.scrollWidth` must equal
   `window.innerWidth` at every required viewport. Wide content scrolls **inside its own
   container**, never the page body.
4. **Never disable zoom.** `maximum-scale=1` / `user-scalable=no` fails **WCAG 2.1 AA
   SC 1.4.4**. On a product where people read small numbers to risk money, blocking pinch
   is indefensible.
5. **Horizontal scroll must be discoverable.** A scroller with a hidden scrollbar and no
   fade, arrow, or overflow cue is invisible content. Users cannot scroll toward something
   they cannot tell exists.
6. **Safe areas honoured.** `viewport-fit=cover` requires `env(safe-area-inset-*)` padding,
   or content sits under the notch and home indicator.
7. **No hover-only affordances.** Anything revealed only on `:hover` is unreachable by touch.

## 4. Verification method (copy this)

```js
// Run in the page at each required viewport.
JSON.stringify({
  url: location.pathname,
  viewportMeta: document.querySelector('meta[name=viewport]')?.content || 'MISSING',
  horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
  scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
  smallTargets: [...document.querySelectorAll('button,a,input,select,textarea,[role=button]')]
    .map(e => { const r = e.getBoundingClientRect();
      return { txt: (e.innerText || e.placeholder || e.type || '').slice(0, 28),
               w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter(t => t.w > 0 && (t.h < 44 || t.w < 44)),
})
```

Then **screenshot**. Attach both to the handoff.

---

## 5. Baseline measured 2026-07-28 — WM Pro

Dev server `localhost:3000`, commit `0b7d4c4`.

### ✅ `/login` — PASSES structurally, two defects

Verified by screenshot at **390×844** and **834×1194**. Layout is genuinely good: centred
card, no horizontal overflow at either size (`scrollWidth === innerWidth === 390`), legible
type, full-width primary button. **This is the standard the rest of the app should meet.**

Two measured defects:

| Element | Measured | Required | Severity |
|---|---|---|---|
| Password reveal (eye) | **14 × 14 px** | 44 × 44 | **High** — 10% of the required area |
| "Forgot password?" | **93 × 17 px** | 44 tall | High — the account-recovery entry point |
| Sign In / Create Account tabs | 164 × 40 px | 44 tall | Medium |

`4 of 7` interactive elements on the first screen every mobile user touches are under the
minimum.

### 🔴 Charts surface — **NOT MOBILE CAPABLE.** Measured, not estimated.

```
Responsive breakpoints (sm:/md:/lg:/xl:) per file
  ChartToolbar.tsx    0
  charts/page.tsx     0
  MainChart.tsx       0
  heatmaps/page.tsx   0
  lounge/page.tsx    12   ← the only chart-adjacent file with any

Interaction handlers across all of src/components/chart/
  onMouseDown 4 · onMouseLeave 4 · onMouseUp 2 · onMouseMove 2 · onMouseEnter 1  = 13
  onTouch* / touchstart / pointerdown                                            =  0
```

**The entire charting surface has zero responsive breakpoints and zero touch handlers.**

`lightweight-charts` v5 supplies its own internal touch pan/zoom, so the *canvas* survives.
**WM Pro's own overlay layer does not.** Drawing tools, crosshair, measure and alert
placement are built on mouse-drag sequences that a touchscreen never fires. On iPhone and
iPad, **every WM Pro drawing tool is inert** — the tool selects, and then nothing happens.

Toolbar sizing compounds it: buttons are `h-6` (**24 px**, ×9) and `h-5` (**20 px**, ×5)
inside a `height: 36` bar — roughly **half** the 44 px minimum — and the bar is
`overflow-x-auto` with `scrollbarWidth: "none"`, so the timeframes that don't fit are
reachable only by a scroll gesture with **no visual indication they exist**.

### 🔴 Global — zoom is disabled

```
<meta name="viewport" content="width=device-width, initial-scale=1,
      maximum-scale=1, viewport-fit=cover, user-scalable=no">
```

`maximum-scale=1` + `user-scalable=no` **blocks pinch-zoom**. iOS Safari has ignored this
since iOS 10; **Android Chrome honours it.** So Android traders cannot zoom in on a price.
`viewport-fit=cover` is correctly present — but it is only safe if `env(safe-area-inset-*)`
padding is applied, which must be confirmed per-surface.

---

## 6. Honest limits of this baseline

- `/charts`, `/heatmaps` and every authenticated surface were **measured in source, not
  observed running** — they redirect to `/login` without a session (RISK-001). The handler
  and breakpoint counts are facts about the code; the *rendered* result is unconfirmed.
  **This baseline therefore under-reports.** There may be more, not fewer, defects.
- `/login` is the only surface with true visual proof at both required viewports.
- No Android, Tesla, or watch-class device was tested. No physical device was tested at all.
- Tap-target audit covered `/login` only.
