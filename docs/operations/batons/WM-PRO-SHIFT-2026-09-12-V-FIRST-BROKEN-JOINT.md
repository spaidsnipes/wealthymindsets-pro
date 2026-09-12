# BATON — 2026-09-12 — V — THE FIRST BROKEN JOINT

**Authority:** WM PRO OS HARD-FOCUS LOCK (Drive, 2026-09-12). Ticket B.
Per CORE LAW — *memory may teach, only current authority may command* — the
older /loop gate list (Delta Bubbles, Live VP, paper-execution realism) is
NEXT, not NOW, and was not worked this window.

**Scope closed:** Ticket B, all three layers — owner, seam, founder-visible
surface — plus one live-discovered label defect found by looking rather than
by reading.

**Colour:** 🟡 HUMAN_PROOF_REQUIRED. Never GREEN this window. See §5.

---

## 1. The defect, named

Broker cards on `/connect` and rows on `/readiness` collapsed an entire
capability ladder into one word. Webull alone measured anything. moomoo and
tastytrade rendered **static prose** — a caption that reads *identically*
whether the OpenD bridge is down, the credential was never deployed to this
host, or the integration does not exist. That is not merely wrong; it is
**unfalsifiable**. No observation could change the pixel.

FAILURE CLASS: FALSE_RIPENESS — collapsing configuration, deployment,
authentication, entitlement, availability, freshness, execution and recovery
into a single undifferentiated state.

## 2. What shipped

| SHA | What |
|---|---|
| `f4ac921` | **Owner.** `src/lib/broker/selectFirstBrokenJoint.ts` + 17 tests. The twelve-rung ladder, `STAGE_QUESTION` glosses, `UNREACHED`/`UNKNOWN`/`FAIL` separation, `assertStageEvidence` (throws on a causeless FAIL), and a G2 shared-spelling pin against `HEALTH_DIMENSIONS`. 582 insertions. |
| `5b5d4bc` | **Seam + surface.** `src/lib/broker/providerReportToStageEvidence.ts` + 8 tests; `CapabilityLadderStatus` in `BrokerConnectPanel.tsx`, which demotes the static prose to an explicitly-labelled *"How this wire is meant to work — not a measurement."* 513 insertions. |
| `113dde6` | **Live defect.** `/readiness` said *"This provider still needs setup in the current runtime"* about an integration that **exists in the build**. Replaced with a sentence that names the deployment binding. Pinned in `responsiveShell.test.ts`. |

**Gates, every commit, UNPIPED** (a pipe masks the exit code):
`./node_modules/.bin/vitest run` → 531 files / 6083 tests, EXIT=0.
`tsc --noEmit` → EXIT=0.

## 3. The one judgement this work turns on

`connected: false` maps to **UNKNOWN, not FAIL**.

`moomooAdapter` returns it *unconditionally*, with the comment "Never claim a
connection we have not observed this request." So `false` means **nobody
looked** — an absence of observation, not an observation of refusal.
Reporting it as FAIL would invent a defect and send a human to debug an
authentication that was never attempted.

The asymmetry that makes this defensible: `envConfigured: false` **is** a
measured FAIL, because for `DEPLOYED_SECRET_PRESENT` the observer and the
observed are the **same process** — it read its own environment. For
`AUTHENTICATED` the observed party is remote, and silence proves nothing.

The mapping emits **at most three rungs**. Nine blanks remain. Filling them
to make the card look finished is precisely the collapse the ladder exists to
prevent — **the nine blanks ARE the finding**: they show how far provider
proof actually reaches today.

## 4. REVIVE LEDGER — `selectFirstBrokenJoint.ts`

Per REVIVE LAW, every new Sentinel must be intentionally broken at least once
and fail **by name** before earning FAILURE-PROVEN.

| Break | vitest | tsc |
|---|---|---|
| stop flag neutered (`if (false && stopped)`) | EXIT=1, 6 tests failed by name | **EXIT=0 — did NOT catch it** |
| `"AUTHENTICATED"` → `"AUTHORIZED"` | EXIT=1, 6 tests failed by name | EXIT=2 — caught it |

Both restored byte-identically before commit (`RESTORE_DIFF_EMPTY=yes`,
shasum `4f96aca0e5349e4ee7d219848b78f079e7125dfe`).

**Finding worth carrying forward:** *renames are type-visible; wrong answers
are not.* For break 1 the suite was the only gate standing. Do not treat a
green `tsc` as coverage for logic.

## 5. Live production evidence — the BEFORE

Captured from the Founder's authenticated Chrome, prod, tab 773535786:

```
status:200
webull:impl=true,env=true,conn=false
alpaca:impl=true,env=true,conn=false
tastytrade:impl=true,env=false,conn=false
moomoo:impl=true,env=false,conn=false
gemini:impl=true,env=true,conn=false
```

On the same host, `/readiness` was rendering moomoo and tastytrade as
**NOT CONFIGURED / still needs setup** while the API on that very host
reported `implemented=true`. The integration exists; only the host binding is
missing. Those two readings imply **opposite next actions** — *build an
integration* vs *bind a secret to THIS environment*. This is the 3-RUNTIME
TEST and Weakness 5 (*credential present + bridge absent = TRANSCEIVER/
LOCALITY BLOCK, never MISSING_KEY*) showing up in the live product.

Also probed live: `hasLadder:false`. **The new UI is not deployed.** Pushing
to `main` does not auto-build here.

## 6. Blocker — stated honestly, not routed around

**HOUSE LOCATION:** deploy pipeline, Cloudflare Workers / OpenNext.
**FAILURE CLASS:** OPERATOR_CREDENTIAL_EXPIRED (not a code defect).
**CANONICAL OWNER:** Founder — the only party who can authenticate `wrangler`.
**CURRENT EVIDENCE:** `wrangler whoami` run UNPIPED → `WRANGLER_EXIT=1`,
*"Not logged in. Your auth token has expired and could not be refreshed, and
the environment is non-interactive."* First attempt was piped to `head` and
falsely reported EXIT=0 — the exact failure mode the shift directive warns
about. `.github/workflows/` contains only `sentinels.yml`; there is no deploy
workflow to trigger instead.
**CONSEQUENCE:** all three commits are repo-proven and (for the defect)
live-observed as a BEFORE, but **no AFTER scene has been observed**.
**NEXT ACTION:** Founder runs `wrangler login` in an interactive terminal. A
token will not be accepted in plaintext here — Drive canon: *never expose
secret values; presence/name/provider/state only.*
**GREEN EXIT CRITERION:** `wrangler whoami` EXIT=0 → deploy lands → the twelve
rungs are **observed rendering** on `/connect` and `/readiness` in the
Founder's browser, with moomoo/tastytrade showing a red break at
`DEPLOYED_SECRET_PRESENT` and webull/alpaca/gemini showing a neutral gap at
`AUTHENTICATED`.

The VISUAL FALLBACK LADDER was exhausted, not skipped: Chrome tool reached
prod and read the BEFORE; there is no AFTER to photograph because the build
is not live. Typecheck, 6083 green tests and commit prose **cannot**
substitute. 🟡, never 🟢.

## 7. Anti-orphan ledger, for the record

`screenReach.enforcement.test.ts` caught `selectFirstBrokenJoint.ts` as an
orphan on arrival. It was entered as AWAITING_SURFACE with
`BrokerConnectPanel` named as the creditor in `f4ac921`, and that entry was
**deleted one commit later** in `5b5d4bc` when the panel actually consumed it.
Second time the reciprocal sentinel has forced a same-session deletion. It is
behaving as written.

## 8. Handoff

- **Ticket T — NOT STARTED.** Founder browser transformation to Thesis +
  attached Option Expression with honest role/source/asOf and one canonical
  `DECISION_ID`. Note `d5bc1c6` already advanced option-entitlement labelling;
  start by reading it rather than re-deriving.
- **Ticket B continuation.** `/readiness`'s wireboard is a **second** surface
  that collapses the same distinction. This window only sharpened its
  sentence. It should *compose the ladder* rather than carry a parallel
  vocabulary. `WireboardBlockerClass`'s `"NOT CONFIGURED"` spelling was left
  alone deliberately — it is canonized Founder vocabulary (COLLISION LAW).
- **Decision Memory sealing** still has zero production callers. Surfaced
  here, per directive: **do not rush-wire.**
- Six older baton files and `scratchpad/` remain untracked, unrelated to this
  work.
