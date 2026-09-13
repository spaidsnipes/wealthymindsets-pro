# WM Pro sign-in recovery checkpoint — 2026-09-05

Continuation checkpoint, not shift completion or release certification.

Source: 9661336b47f67540ee15302fc243148c6e53137a, pushed to origin/main.
Parent f4cb2bab0d66c6eb6fc1b3ebaa50bed822336ec9 had been independently bound to Cloudflare build af81f6b5-2af8-4c12-8662-34cff98d13cf and the production diagnostics response. Deployment of 9661336 remains to be verified.

## Completed

- Reused prior team work; fixed whitespace-only service-role presence classification in f4cb2ba.
- Fresh Drive delta query after 2026-09-04T15:02Z returned no accessible changes.
- Corrected the existing Cloudflare NEXT_PUBLIC_SUPABASE_URL binding to the verified project address. No credential value appears in this checkpoint.
- Production diagnostics now reports SUPABASE_PROJECT_URL with no shape defects. Synthetic invalid login now returns HTTP 401 Invalid login credentials, replacing HTTP 503 AUTH BACKEND MISDIRECTED. This does not prove a real user's successful login.
- 9661336 preserves cached account display on temporary non-authentication HTTP failures; explicit 401/403 still clears the cache. Server authorization guards were unchanged.
- Focused route/revocation/logout tests 12/12; full regression 399 files, 3952 tests; TypeScript and Next webpack build passed.
- Inspected the generated opening thumbnail of the user's 5:59:43 recording: it shows the incorrect Supabase URL error. Full video was not inspected.

## NOW

Existing local SUPABASE_SERVICE_ROLE_KEY still needs installation as the encrypted same-name Cloudflare Worker secret. A specific async confirmation was requested and remains unanswered. Do not infer approval from elapsed time. Production diagnostics still reports this capability gap. Complete the approved transfer, then verify protected-route session checks and real user login without exposing credentials.

## NEXT

Verify 9661336 deployment and the corrected URL survives it. Test session recovery and expiry; do not claim indefinite reliability from a synthetic probe. Then continue the visible OS work from current canon, keeping one current-job surface and retiring duplicate UI.

Preserve unrelated modified WM-PRO-EVENING-2026-09-03.md, scratchpad/, and untracked screenReach.enforcement.test.ts. No brokerage orders or database mutations occurred. Actual elapsed execution is not equated with wall-clock time; the requested shift remains unfinished.
