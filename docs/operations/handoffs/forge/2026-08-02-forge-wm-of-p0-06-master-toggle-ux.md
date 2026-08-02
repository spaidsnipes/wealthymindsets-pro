# WM-OF-P0-06 — Order-flow master toggle UX · DESIGN CONTRACT (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-08-02 · **Repo HEAD:** `499e504`
**Type:** Design contract → Micah (visual) + Noah (impl). Forge does not ship (DEC-008/DEC-012).
**Founder proof:** with master `ORDER FLOW: OFF`, individual OF tool buttons "don't populate."

---

## 0. Premise correction (verified against code — the two-option framing is off)

The baton offered "(A) sub-tool click auto-enables master + toast" vs "(B) sub-tool buttons disabled while master OFF" as if unbuilt. **Option (A) is already implemented:** `ChartsDashboard.tsx:817-819` — clicking any sub-tool runs `setFootprintEnabled(true); setFootprintType(t)`. So a click **does** auto-enable master today.

Therefore the Founder's "don't populate" is **not** a dead click. It is one (or both) of two real, different gaps:

- **Gap 1 — illegible master state.** When master is OFF, the sub-tool buttons look identical to their normal idle state (`FootprintControls.tsx:528-533` only highlights the *active+enabled* tool; OFF is shown solely by the red "OFF" chip). The user can't tell OF is off from the tools, so clicking "does nothing visible" reads as broken even though it auto-enables.
- **Gap 2 — enabled-but-empty.** After auto-enable, the tool often draws nothing because the five profile tools are real-tape-only with **no honest empty state** — that is exactly **`WM-OF-P0-05`** (already contracted, `2026-07-31-forge-wm-of-p0-05-toolset-audit.md`). "Populates nothing" is P0-05, not a toggle bug.

Picking "A vs B" blindly would either add a redundant toast to behavior that already exists, or *remove* the working auto-enable in favor of a disabled state — a regression. The honest fix addresses Gap 1 + defers Gap 2 to P0-05.

## 1. Design decision (truthfulness rule §5)

**Keep auto-enable (A), add legibility, do NOT switch to pure-(B).** Rationale: §5 is about never showing a false/ambiguous state — not about blocking actions. Pure-(B) (disable the tools while OFF) would *remove* a working one-click affordance and force an extra OFF→ON step; that's less usable and not more honest. The honest gap is **state legibility**, so fix that:

1. **Auto-enable stays.** Clicking a sub-tool while OFF enables master and activates that tool (current behavior — correct, keep).
2. **Visible state feedback on enable.** On the auto-enable transition (OFF→ON via a tool click), surface a brief, honest confirmation — a small inline "ORDER FLOW ON" pill/toast (Micah owns the visual). This makes the state change legible instead of silent.
3. **Dim tools while OFF for legibility (a touch of B, for clarity not blocking).** While master is OFF, render the sub-tool buttons at reduced opacity with `aria-disabled`-style *appearance* but **still clickable** (clicking enables). Add `title="Order Flow is off — click to enable this tool"`. This tells the user the current state and the exact recovery, honestly, without removing the affordance.
4. **Explicit ON state on the cluster.** The "ORDER FLOW:" label + chip should read a clear ON/OFF (today only OFF is prominent). Micah specifies the ON treatment mirroring the red OFF chip.

This is honest-by-§5 (state is never ambiguous), non-regressive (auto-enable preserved), and resolves the Founder's actual confusion (couldn't tell it was off / clicking "did nothing").

## 2. Cross-dependency (do not duplicate)

The "enabled but draws nothing" half is **`WM-OF-P0-05`** — honest `capturing`/`unavailable` per-tool empty state. This ticket (`P0-06`) is **toggle-state legibility only**; P0-05 is **data-empty honesty**. They compose: after P0-06 the user knows OF is on; after P0-05 a tapeless tool says "capturing live tape…" instead of blank. Reference P0-05, do not re-spec it here.

## 3. Split of ownership

- **Micah (visual):** the ON pill/toast, the OFF-state dimming treatment, the ON/OFF chip parity, `title` copy, contrast in light/dark. Spec at `handoffs/micah/…-wm-of-p0-06-visual.md`.
- **Noah (impl):** wire the OFF→ON feedback event; apply dimmed-but-clickable styling + `title` while `!footprintEnabled` in `FootprintControls.tsx`; ensure keyboard/`aria` state reflects enabled/disabled honestly.

## 4. Acceptance (Noah + Micah → Sentinel)

- With master OFF, sub-tool buttons are visibly dimmed with an honest `title`, and are still one-click-to-enable.
- Clicking a tool while OFF enables master, activates that tool, and shows the "ORDER FLOW ON" confirmation.
- Master ON/OFF state is unambiguous from the toolbar without reading the OFF chip alone.
- No regression to the existing auto-enable (`ChartsDashboard:817-819`).
- The empty-after-enable case is handled by `WM-OF-P0-05` (not this ticket); this ticket does not claim to populate data.
- Type-check + build green; **Sentinel** confirms on the live app that OFF state is legible and enabling is one click, in both light and dark.

**BATON → Micah** (visual spec) **+ Noah** (impl). Cite this handoff in commits. Note the P0-05 dependency for the empty-state half.
