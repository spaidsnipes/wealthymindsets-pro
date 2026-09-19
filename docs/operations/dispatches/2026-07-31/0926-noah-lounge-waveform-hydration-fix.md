<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
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

# NOAH — Bounded fix spec for WM-LOUNGE-P2-01: waveform hydration mismatch

**From:** stray "fix lounge waveform" thread → routed onto the bus · **Time:** 2026-07-31 09:26 CDT · **Repo HEAD at dispatch:** `50dc7cb`

## Why this exists

The unassigned "fix lounge waveform" thread (the fragmentation Atlas flagged) diagnosed and verified a **specific, bounded rendering defect**. Per the Founder routing directive, the thread is **not self-shipping** — the code change was made, verified, then **reverted from the working tree** so implementation routes through you under ticket **WM-LOUNGE-P2-01**. This dispatch hands you the exact fix + evidence. You stay **held behind the P0 chart gate**; this is queued, not a jump.

## The defect (confirmed, not speculative)

React hydration mismatch on the `LoungeVibeHeader` "now playing" waveform.

- **File / line:** `src/app/lounge/page.tsx` — the 34-bar waveform map (`Array.from({ length: 34 })`, currently ~line 654; grep `Math.sin(i * 0.6)` to locate — line drifts as the file is reformatted).
- **Current code:**
  ```js
  const h = Math.min(100, 22 + Math.abs(Math.sin(i * 0.6)) * 78);
  return <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 1, background: `${theme.accent}99` }} />;
  ```
- **Symptom:** the server serializes the inline `height` as a rounded value (e.g. `88.66%`) while the client emits full float precision (`88.65871483088587%`). React logs **"tree hydrated but attributes didn't match"** on every `/lounge` load.

## The fix (one line, verified)

Quantize the height to a fixed precision deterministically so SSR and client emit identical strings:

```js
const h = Math.min(100, 22 + Math.abs(Math.sin(i * 0.6)) * 78).toFixed(2);
// height: `${h}%`  →  identical "XX.XX%" string on server and client
```

`h` becomes a string like `"66.04"`. Because the bar height is a pure deterministic function of the loop index `i` (no time/random/locale input) and both render passes now apply the same `.toFixed(2)`, the strings are byte-identical → mismatch eliminated.

## Evidence gathered by the thread (so you don't re-derive it)

- Fetched the SSR HTML of `/lounge` with the fix applied. All 34 waveform bar heights emitted quantized to 2 decimals — sample `["22.00","66.04","94.70","97.96","74.69","33.01", …]`, **zero** values exceeding two decimal places.
- Console-based check was unreliable because `/lounge` has a client-side auth guard that redirects to `/login` immediately after hydration, racing the console read — inspecting the emitted `height` attribute directly is the definitive check anyway (it's the exact attribute that was mismatching).

## Boundaries (from the ticket)

- **Bounded waveform render only.** Not the `wip/lounge-universal-hero-recovered` redesign. No lounge nav/hero restructure.
- **No calculation invention.** This is a purely visual/decorative placeholder waveform (no audio source wired); the fix only changes numeric-string precision, invents no audio-metadata (BPM/key/energy).
- **No new dependency.**
- **Design owner is Micah**, **verifier is Sentinel** — if Micah's forthcoming waveform spec supersedes this decorative bar strip entirely, this one-liner is moot; apply it only if the current bar strip survives the spec.

## Verify after implementing

- Sentinel: confirm the `/lounge` console no longer logs the hydration/attribute-mismatch warning, at 360×800, 390×844, 834×1194, desktop.

## Handoff chain

Micah (design spec / confirm the bar strip stays) → **Noah (apply the one-liner above)** → Sentinel (verify console clean at 4 viewports). Ticket: `WM-LOUNGE-P2-01`.
