# Supersession Receipt template

> Canon anchor: ATH SYSTEMS CLARITY + WIRING CONSTITUTION (2026-08-28) §7 —
> **"Building a replacement does not retire the thing it replaced."**
>
> LAW: NEW DOES NOT MEAN CUT OVER. CUT OVER DOES NOT MEAN RETIRED. PROVE EACH TRANSITION.

Every architectural or product cutover files one of these under
`docs/ops/supersessions/YYYY-MM-DD-<slug>.md`. It exists so no legacy
system stays influential just because nobody remembered to remove its
last caller.

Copy the block below verbatim, fill every field, drop `N/A` only when
the field is genuinely inapplicable (and say why).

---

**OLD OWNER / PATH** — the module, symbol, endpoint, or literal being
retired. Include file + line + git SHA where the OLD path lives.

**NEW OWNER / PATH** — the module, symbol, endpoint, or literal that
supersedes it. Include file + line + git SHA of the shipping code.

**WHY THE OLD PATH IS SUPERSEDED** — one paragraph. Canon change,
duplicate truth, provider retirement, correctness bug, or performance
constraint. If the reason is aesthetic, say so honestly.

**CALL SITES / DEPENDENTS** — every place that used to import,
consume, render, or reference the OLD path. Preferably a `git grep`
command that reproduces the list. Zero call sites means the retirement
is safe to complete; nonzero means dual-run is required until migration
finishes.

**MIGRATION STATE** — one of:
- `PLANNED` — receipt filed, no migration yet.
- `DUAL_RUN` — both paths active; readers can consume either.
- `SHADOWED` — new path is authoritative; old path is warn-only.
- `RETIRED` — old path is removed from the tree.

**DUAL-RUN RULE IF TEMPORARY** — the exact criterion under which dual-
run is acceptable, and the deadline for full retirement. Omit only if
migration went straight to RETIRED.

**CUTOVER PROOF** — the tests, screenshots, curl outputs, or deployed
Version IDs that prove the new path serves the same truth (or
strictly better truth) than the old one. Every claim must trace back
to observable evidence — canon §Truth.

**ROLLBACK** — the exact steps to revert if the cutover is discovered
to break something. Should be feasible in under 5 minutes; a
supersession that can't be rolled back is a rewrite, not a supersession.

**RETIREMENT CONDITION** — the observable condition under which the
receipt moves from SHADOWED/DUAL_RUN to RETIRED. Example: "72h with
zero warn-log entries against the old path in prod telemetry."

**FINAL DISPOSITION** — one of `MERGED` / `RETIRED` / `QUARANTINED`.
Blank until the retirement condition is met.

---

## Filed receipts

- `2026-08-28-canon-fidelity-vocabulary.md` — SHIFT-P retirement of
  four legacy chip strings (NO FEED / OHLCV ONLY / OHLC ONLY / DELAYED
  15 MIN) into the seven canonical Living Market Visual Systems
  labels. Included as the first worked example so future receipts have
  a concrete pattern to follow.
