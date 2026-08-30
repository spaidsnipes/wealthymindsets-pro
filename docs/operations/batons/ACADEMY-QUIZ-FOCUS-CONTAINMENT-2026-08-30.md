# WM Pro — Academy Quiz Focus Containment Checkpoint

Status: LOCAL IMPLEMENTATION + ENGINEERING VERIFIED / DEVICE EXPERIENCE UNPROVEN

- Base HEAD: `a7cfbf7244c128e284e56916a881e098ef9a58e4`
- Governed staged source/test diff SHA-256: `c9e7ce17070c2d7e7a3a2b5d8f104037d866f0f0174896c0870375683c608845`
- Exact source paths:
  - `src/app/education/page.tsx`
  - `src/lib/educationQuizAccessibility.test.ts`
- PR24/25 exact-path overlap: none

## Founder-visible correction

The Academy lesson quiz already declared itself modal and closed on Escape, but keyboard focus could escape behind it and closure did not reliably return focus to the opening control. The correction reuses the canonical `useShellModalFocus` owner already used by the application shell:

- the modal panel now owns dialog semantics and a visible programmatic heading;
- initial focus moves to the 44px close control;
- Tab and Shift+Tab remain inside the active quiz;
- Escape closes through the canonical owner;
- focus returns to the connected opening control when the quiz closes;
- backdrop dismissal is separate from interaction inside the panel;
- no second focus manager, store, persistence layer, identity, or request owner was created.

## Fresh Drive authority readback

A content-level pass read all 11 named authorities. New revisions were present in the company/WM layer and were applied without broadening the atom:

- Founding Contract/Ledger — revision `AIroW37LeShA04oax9_U_6uHnQjoZRVR75qEu0UOsPmpjAWkmkFdrVMlwNkb8zx0JXF4ru-3BPtyK3QDCqDhF6IZpXv5AgZw4Uvjz1izMDM`; modified `2026-08-30T02:40:44.494Z`.
- Launch companion — revision `ANLCKQl700eppSqXy5W4crj1dQ5ROPODlpqseeDnk6QKlN89KZ6apopxgFwU2cMsRI9O97Ty5CS25XrR-_rE1AnqZcmjNeGEzGHxG8nji20`; modified `2026-08-19T22:38:51.929Z`.
- Nectar authority — revision `AIroW37cZ4mDE4VfjMYBW9b9gi40OPEETOrgTdrAIFFi-uu_m23wHE6458yq6j6fJ4TdbczDv-ziam16M4GGwdjdYuxTxlxjuTPiJcmVeMo`; modified `2026-08-20T12:13:56.514Z`.
- WM Pro Bible — revision `AIroW34K4Eo17cDjJZo99eHIVVC3OfaWy1_O7B_zFiaADeXKzAGHgrms7tEZQmQ9yD6OnNdHQhGzGpLlmh-5EJ6tzHdHbJaF6LTJlIoX1go`; modified `2026-08-30T14:42:54.966Z`.
- ATH Master Bible — revision `AIroW34wAAiMYpJXjep_p4d00oXh1NdXhLtYbKFE54N_6gIO5Xk_4spvZZBbiUBLKqszDhN89KE3YfJKOvNFCtty0oDwVF1kM4pHDP53HEs`; modified `2026-08-30T14:45:43.403Z`.
- Canon Index — revision `AIroW34pX5p1FwsDZBurWO3VeZImw0S87E8TsvtCPPPJk0Ty5CAQ5aQeiqvme0AsPPTYddsZrw8cy61wYMQmfswKg3hiU-htEPKZDXxcTSg`; modified `2026-08-30T14:44:11.074Z`.
- Universal Product Doctrine — revision `ANLCKQkH0xiHD9pD6wKt_X8_0Z093Emn6VGQ-wJaj9F20FJg72L0bKGMwMU3e25JbdOPIDJC5T5y2MZJpfOS2MjJTpGDBMmuyGBl7USppug`; modified `2026-08-30T14:41:00.949Z`.
- Super Team OS — revision `AIroW35MA2V7s03yW9cSX3BA2rc8RYMYzhbciom26ibZAocMs86gGeaWFmd1xDZr-Kb6H2ZfU4x2UCg5EvZ9IyUMlOL350dFlYwGoIOeDuk`; modified `2026-08-11T23:32:53.206Z`.
- ATHOS continuity — revision `AIroW35N-GQaIQJWguCk6bzDTIfX5a7cuTEJb6RgA8dHOuOmSfpqCIzPVa40OsfbRFEKiFK9z27eGHBmtGxBZsp-kofPpIGrfjY5kOvCNwI`; modified `2026-07-28T03:03:07.254Z`.
- Replacement synthesis — revision `AIroW3764_kVJ55QFvzTjvfX-CG40w2Cz-nlonv9FaALTi3ScwY6h1hzPTgCsB9lvDVMtqYgLgPAODVrSAnUh1AlOgVaMlyiU4V41Amf144`; modified `2026-08-12T01:34:34.083Z`.
- Responsive standard — revision `ANLCKQntrAtkvIgAb_55wbqpfLRiNtKVtnj28GaR_R7o3mpE4O4_GnVOCnYPMgWwqvLm5oDbahUFrp_P6LSyalfRp-4rAf43wlSq5HbBwAc`; modified `2026-07-29T01:59:16.466Z`.

Supersession conclusion: newest company/WM law strengthens one canonical truth owner, purposeful human-job surfaces, KISS foreground behavior, no sideways duplication, and the full proof ladder. It does not close any deployment, authenticated-device, PR24/25, or release gate.

## Evidence

- Focused regression: 26/26 tests passed across 5 files.
- Full regression: 2,446/2,446 tests passed across 252 files.
- TypeScript: pass.
- Scoped ESLint: pass with 0 errors and 0 warnings.
- Current-diff `git diff --check`: pass.
- Turbopack build: host-blocked while attempting to bind an internal process port (`EPERM`); no product defect inferred.
- Webpack production build: pass; 78 static pages generated.

## Separate device rows

The exact build server reached READY on loopback port 4333 only after an action-time host approval delay, but the controlled verification client could not connect across the sandbox boundary. The server was stopped. No screenshot, console, network, accessibility-tree, or interaction claim is inferred.

| Surface | Same-candidate quiz interaction | Result |
|---|---|---|
| Computer 1280/1920 | not observed | BLOCKED / UNPROVEN |
| iPad portrait 768x1024 | not observed | BLOCKED / UNPROVEN |
| iPad landscape 1024x768 | not observed | BLOCKED / UNPROVEN |
| iPhone 390x844 | not observed | BLOCKED / UNPROVEN |

## Preservation and rollback

- No push, deploy, Cloudflare, Vercel, Supabase, DB, auth, provider, brokerage, or PR mutation.
- MainChart, `useWebSocket`, PR24, and PR25 paths were untouched.
- Five unrelated untracked operations/handoff records remained preserved.
- No protected Founder browser tab or browser storage was touched.
- Capacity at seal: `10,577,080 KiB` available.
- Rollback: revert only the eventual commit containing these two governed source/test paths and this checkpoint.

NOW: Academy quiz keyboard containment and focus restoration sealed locally.

NEXT: independently exercise the authenticated Academy quiz on computer, iPad portrait/landscape, and iPhone from a controlled session, including focus loop, Escape, backdrop, opener restoration, zoom, overflow, and reduced-motion evidence.

AFTER: reconcile current local candidate to remote/deployment identity and independent Sentinel proof before any push or release action.

R00 RETURN / WM NO-GO

MISSION STATUS = ACTIVE / CONTINUATION REQUIRED
