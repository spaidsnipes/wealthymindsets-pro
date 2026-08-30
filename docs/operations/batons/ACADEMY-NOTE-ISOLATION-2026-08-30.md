# Academy note isolation — local candidate receipt

## Scope and authority

Sole task `019ff368-8556-73c3-bb9a-2ef614e133ba`; ATHOS roles are internalized
sequentially. No new task, agent, deployment, push, provider, database, auth, or
brokerage action. This bounded atom corrects Academy note identity and unmount
loss only. MainChart, useWebSocket, PR24, and PR25 remain untouched and held.

Fresh continuation window began 2026-08-30T07:02:16Z (02:02:16 CDT). This
checkpoint was sealed at 2026-08-30T07:09:01Z; it records about seven minutes of
the active continuation, not three hours and not unobserved prior time.

## Canon and repository binding

- Base HEAD and cached `origin/main`: `8d7f8be2d615f77f4758c950a2e7aba210cc7d1b`.
  No fetch claim. The 29 commits after `14448b0` do not modify the three governed
  Academy code paths; the working diff was reconciled against the current base.
- Founding Contract `1KBF...` modified 2026-08-30T02:40:44.494Z: R00 RETURN /
  WM NO-GO; exact candidate, deployment, device, and recovery proof remain gated.
- Canon Index modified 2026-08-30T06:25:13.385Z and Universal Product Doctrine
  modified 2026-08-30T06:25:20.520Z: computer, phone, and iPad/tablet are three
  independent proof surfaces. Partial device proof is not complete proof.
- Fresh Launch Board modified 2026-08-30T06:33:15Z: finish-line work must close
  a real Founder-visible workflow; backend-only or test-only progress is not a
  product PASS.
- Capacity at continuation start: 4,720,960 KiB available. Above the 2 GiB local
  start floor, below the 10 GiB DATA floor. No install or cleanup was performed.

## Exact uncommitted candidate

| Path | SHA-256 |
| --- | --- |
| `src/app/education/page.tsx` | `1f14f7d8d9f8c6bbecf0fcf48a951d3d66b3fcf89852531c15b87a8559f1354f` |
| `src/lib/educationNotesStorage.ts` | `c79f494fec25d8563d7364c773a457e710e342f0becdd0431ef2c92b90a44ead` |
| `src/lib/educationNotesStorage.test.ts` | `339fafae72a483be35647a0e377bf6b7aa3bab688000d5cca02786e5b08cc045` |
| `scripts/verify-academy-notes.mjs` | `7405436d71dda0631faa467a0555da8279b892fc9305d9f1e18158b36e4aecbd` |

No unrelated preserved path is part of this candidate.

## Product delta

- The editor is keyed by lesson identity, so an A draft cannot migrate into B.
- Edits write and exact-readback synchronously in the edit event; there is no
  deferred timer or blur save to lose during route change or unmount.
- Browser storage is read after hydration. A failed read is `UNAVAILABLE`, not
  a fabricated empty note, and editing is disabled to protect unknown content.
- A failed write remains visibly `Not saved` while the draft stays onscreen.
- No new key, store, persistence service, request, server schema, or duplicate
  owner was introduced.

## Deterministic and runtime receipts

- Focused Academy storage/lifecycle source suite: 1 file, 11 tests, PASS.
- Full Vitest regression on current base: 250 files, 2,431 tests, PASS in 4.22s.
- TypeScript `--noEmit --incremental false`: exit 0.
- `git diff --check`: exit 0.
- Direct ESLint on the three code paths: 0 errors; one pre-existing unused
  `ChevronDown` warning at `education/page.tsx:12`, outside this candidate.
- Loopback fixture used the exact `LessonNotes` and storage-helper source from
  baseline `14448b0` and this working tree. Baseline source hashes were
  `61f81032...836ff` (page) and `63d157e0...1baba` (helper).
- Baseline reproduction: opening A after B reused B text; closing stale A could
  overwrite B. Immediate unmount after an edit restored the older value.
- Corrected runtime: A/B values remained isolated; immediate unmount/remount and
  reload retained the newest A value.
- Failure/recovery: blocked writes produced `Not saved — browser storage
  unavailable` while retaining the onscreen draft. Restoring storage, editing,
  and reloading returned `A recovered and persisted after storage restored`.
- Blocked reads produced `Could not read note — editing disabled to protect
  existing notes`; no editable fabricated blank note was exposed.
- Fixture browser console warnings/errors: none. Browser storage was never
  inspected. The controlled fixture tab was released and port 4391 was stopped.

## Limits, preservation, rollback

This proves a bounded isolated-origin lifecycle using the actual component code;
it is not production, authenticated account, cross-device, Worker, alias, or
deployment proof. Current full build was not run because the user's active local
app may share build output. Large-note per-keystroke latency is not benchmarked.
Failed drafts are not promised to survive navigation until a successful write.

Capacity at seal: 4,713,468 KiB available. Five previously preserved untracked
baton/dispatch/handoff paths remain unedited.
The Academy files are uncommitted. Rollback is the exact four-file Academy diff
only after checking for new overlap; never reset or clean the checkout.

## NOW / NEXT / AFTER

- NOW: Academy note-loss correction is locally sealed with deterministic,
  failure, recovery, and teardown receipts.
- NEXT: independent Sentinel-style exact-diff review of this candidate inside
  the sole task, then commit only the four Academy files plus this receipt if it
  returns APPROVE. No push.
- AFTER: take one collision-safe Founder-visible finish-line atom and obtain
  separate computer, iPad portrait/landscape, and iPhone evidence where lawful.

R00 RETURN / WM NO-GO. MISSION STATUS = ACTIVE / CONTINUATION REQUIRED.
