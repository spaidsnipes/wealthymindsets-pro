# WM Pro — Shift R — LOCKED OUT: the service failed, so we blamed the person

**Date:** 2026-09-05
**Founder call:** *"also i cant even sign in me or the homie"*
**Commits:** `767faaa` → `21057fc` → `c8d1f5b` → `2fc15db` → `56ffeb2` → `59079d1` (all on `main`, all **live**)
**Parent:** `1027d2b`
**Predecessor:** `WM-PRO-SHIFT-2026-09-05-Q-ADMISSION-ENFORCED.md`

---

## 0. One-paragraph handoff

Two people could not sign in to production. Every WM auth route told them it was
their fault — wrong password, expired code, or a reset email that had been sent
and never was. **None of that was true.** A single environment variable on the
Cloudflare Worker, `NEXT_PUBLIC_SUPABASE_URL`, holds a Supabase *publishable
key* instead of a project URL, so every auth request leaves for the wrong host
and comes back as HTML. Six commits removed the blame from four routes and added
a diagnostic that names the broken variable out loud. **The lockout itself is
NOT fixed and cannot be fixed by code** — it is one value in a secrets box, and
that box is Founder-only (§6). What changed is that WM now says so.

---

## 1. Root cause — PROVEN, not inferred

Production states it itself. `GET /api/diagnostics/supabase`, observed live at
`59079d1`:

```json
{
  "present": true,
  "missing": [],
  "shapes": {
    "NEXT_PUBLIC_SUPABASE_URL":             "PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY":        "ABSENT"
  },
  "defects": [{
    "variable": "NEXT_PUBLIC_SUPABASE_URL",
    "holds":    "PUBLISHABLE_KEY",
    "expected": "a project URL ending in .supabase.co",
    "severity": "BLOCKING"
  }],
  "serviceRoleKeyPresent": false,
  "healthy": false
}
```

The failure chain, end to end:

1. `NEXT_PUBLIC_SUPABASE_URL` holds `sb_publishable_…`.
2. It has no scheme, so `normalizeSupabaseUrl` helpfully prefixes `https://`.
   The repair that exists for a pasted hostname turns a pasted key into a
   syntactically valid URL — so nothing throws.
3. `fetch` resolves that hostname to an unrelated server.
4. That server answers `403 text/plain`.
5. `res.json()` rejects.
6. Before this block: the rejection was swallowed and the empty result was read
   as a **verdict about the person**.

**`present: true` and `missing: []` are the point of this whole shift.** Every
presence check WM had said the host was configured. It was configured. It was
configured *wrong*, and presence cannot see the difference.

---

## 2. The defect family: "the service failed, so we blamed the person"

The same shape, four times, in four owners. In each case a *service* fault was
rendered as a *user* fault — the most expensive category of lie a product can
tell, because the user goes looking for a mistake they did not make.

| # | Route | What the user was told | What was true | Closed by |
|---|---|---|---|---|
| 1 | `/api/auth/login` | "Incorrect email or password" | The backend was never reached | `767faaa`, `21057fc` |
| 2 | `/api/auth/forgot-password` | `{ok:true}` — "check your email" | No email was ever sent | `c8d1f5b` |
| 3 | `/api/auth/signup` | "the Supabase project is paused" | Disproved — the project answers JSON | `2fc15db` |
| 4 | `/api/auth/confirm` | "That email code has expired or is not valid" | The code was fine; nothing read it | `56ffeb2` |

Instance 2 is the worst of the four and deserves to be remembered. A locked-out
user asks for a reset, is told the mail is on its way, and waits. There is no
error to report, no retry that behaves differently, and no way to learn that
nothing happened. **A false success is more damaging than a false failure**,
because it removes the user's reason to escalate.

Instance 4 is the most persistent: a user with a *correct* code would have
requested fresh ones forever, each new one just as correct and just as rejected.

Instance 3 is the one that shows why guessing is not diagnosis. "Project paused"
was a plausible story someone wrote into the copy. It was never checked. The
Supabase project `zrzaifaxecwgpfrqctkp` was awake the entire time and answering
JSON on request. **A confident wrong diagnosis sends the operator to fix a box
that is not broken.**

---

## 3. What shipped

### `767faaa` — read the response instead of assuming it is JSON

`supabaseJson(res, url)`: read the body as text, `JSON.parse` it, and throw a
named `SupabaseAuthShapeError` when it will not parse. A Supabase auth endpoint
answers JSON for **every** request including rejected ones, so a non-JSON body
does not mean "auth failed" — it means the request never reached Supabase.

### `21057fc` — withhold the value; stop calling a config error a wrong password

The **DISCLOSURE RULE**, and the single most important security decision in the
block. The obvious fix is "print the misconfigured URL so the operator can see
it." That is exactly wrong: the variable is misconfigured *because someone
pasted a key into it*, so echoing its value publishes the secret to any
anonymous caller.

The rule as shipped: **name the host only when its hostname genuinely ends in
`.supabase.(co|in|net)`** — public by design. Otherwise describe it by shape and
never quote it. The path is always omitted (some auth paths carry a token) and
the response body is never included (it is attacker-influenced).

### `c8d1f5b` — a reset email that was not sent is not a success

`passwordRecoveryOutcome` as the single owner. It must distinguish three things
while preserving GoTrue's enumeration semantics: `/auth/v1/recover` answers 2xx
for registered **and** unregistered addresses on purpose. A distinguishable
failure would be a two-request account oracle. Edge `RECOVERY NOT SENT` reports
the *service*, never the *address*.

### `2fc15db` — stop asserting a cause nobody verified

Replaced the "paused project" fiction with the proven failure class.

### `56ffeb2` — the confirm route, and one owner for "the backend threw"

Two layers. `supabaseVerifyEmail` / `supabaseGetUser` / `supabaseResendSignup`
lost their `.catch(() => ({}))` and now parse strictly. The route wraps the
Supabase work in `confirmWithSupabase` and classifies a throw.

`classifyAuthBackendFault` is the new **§24 single owner** for "a call to the
auth backend threw — what may the caller be told?" It existed inline in signup
and was about to be written a second time in confirm; a third copy was the
predictable next step. Its rule:

> Exactly one thrown value carries a message safe to repeat verbatim:
> `SupabaseAuthShapeError`, whose text is built from a request's origin, status
> and content-type and never from a header or a response body. Everything else
> contributes its **class name only** — a bare `TypeError: Invalid URL: sb_…`
> would otherwise hand the misconfigured secret straight back to an anonymous
> caller.

Signup's live copy is byte-preserved through the extraction, so pulling the
owner out changed no observable behaviour.

The 401 branch **stays** — it is now reserved for a verdict that genuinely came
back from Supabase. A real bad code is still a real bad code.

### `59079d1` — name the box, never its contents

`supabaseEnvShape` classifies a value as one of `ABSENT / SUPABASE_PROJECT_URL /
OTHER_URL / PUBLISHABLE_KEY / SECRET_KEY / JWT / UNRECOGNISED`. Every branch
returns a **fixed label**; no input is ever echoed. `supabaseEnvDefects` names
every variable holding the wrong *kind* of thing, and detects the two real
defects a presence check cannot see:

- a key pasted into the URL box → `BLOCKING` (this is the live one)
- a **secret** key in a `NEXT_PUBLIC_` variable → `SECURITY`, worded as *already
  published*, because `NEXT_PUBLIC_` is inlined into the client bundle by design.
  It is not misplaced; it is public and must be rotated.

`GET /api/diagnostics/supabase` is **deliberately unauthenticated**, and the
header comment records why:

> It is the diagnostic for being locked out, so requiring a session would make
> it useless in the only situation it exists for. That constraint is what
> dictates the contents: shapes and variable names only, never a configured
> value, so there is nothing here worth authenticating.

---

## 4. §22 Orkin ledger

### The revive-attempt that mattered

**Confirm route, `56ffeb2`.** Restored the old behaviour — a caught fault
returning `401 "That email code has expired or is not valid."` — and ran the
suite unpiped. `ORKIN_EXIT=1`, three named failures:

- `REGRESSION: a misdirected backend is never reported as an expired code`
- `REGRESSION: an unreachable backend is never reported as an expired code`
- `a throw while exchanging an access token is also a service fault, not a bad session`

Reverted; gates re-run green. The sentinel is proven to fire, not assumed to.

### The test that was wrong, and the code that was right

Writing the shape-error tests I asserted
`expect(error.message).toContain("not-a-supabase-host.example")` for all three
helpers. Three failures, `VITEST_EXIT=1`. **The code was correct and my
assertion was the bug** — passing it would have required re-introducing the
exact value leak closed in `767faaa`. Rewritten to lock the two-branch
disclosure rule instead, with a `// SECURITY:` comment stating why.

Recorded because the reflex — "test red, change the code" — would have
reopened a security hole to satisfy an assertion I had written thirty seconds
earlier.

### Standing leak guards now in the suite

- A `TypeError` whose message contains `sb_publishable_LEAKED_VALUE` → the value
  does not reach the caller.
- A thrown bare string `sb_secret_LEAKED_VALUE` → reported as `(Error)`.
- Every defect report serialised with secrets in all three slots → no slot value
  and no `SLOT_SECRET` substring survives.
- `never blames the person`: no fault message may match
  `/expired|not valid|invalid code|incorrect|wrong password|try again/i`.

---

## 5. Evidence — PROVEN and NOT PROVEN

All gates observed **unpiped** (a pipe masks the exit code; `>` preserves it):

| Gate | Observation |
|---|---|
| `vitest run` @ `56ffeb2` | 399 files / **3936** tests, `VITEST_EXIT=0` |
| `tsc --noEmit` @ `56ffeb2` | `TSC_EXIT=0`, 0 lines |
| `vitest run` @ `59079d1` | 399 files / **3943** tests, `VITEST_EXIT=0` |
| `tsc --noEmit` @ `59079d1` | `TSC_EXIT=0`, 0 lines |
| `git push origin main` | `2fc15db..56ffeb2`, then `56ffeb2..59079d1` |

### PROVEN LIVE on `https://wealthymindsetspro.com` — observed by curl

All four auth routes, probed after the Cloudflare build landed:

```
POST /api/auth/login            → 503   edge="AUTH BACKEND MISDIRECTED"
POST /api/auth/signup           → 503   edge="AUTH BACKEND MISDIRECTED"
POST /api/auth/forgot-password  → 503   edge="AUTH BACKEND MISDIRECTED"
POST /api/auth/confirm          → 503   edge="AUTH BACKEND MISDIRECTED"
GET  /api/diagnostics/supabase  → 200   healthy=false, 1 BLOCKING defect
```

`/api/auth/confirm` verbatim:

> Account verification failed: NEXT_PUBLIC_SUPABASE_URL on this host is not a
> Supabase project URL — its hostname does not end in .supabase.co. Whatever it
> points at answered HTTP 403 with "text/plain; charset=UTF-8" instead of JSON.
> The usual cause is a Supabase KEY pasted into the URL variable. Correct
> NEXT_PUBLIC_SUPABASE_URL in the host runtime secrets (e.g. Cloudflare) and
> redeploy. The configured value is withheld here because it may be a secret.

Confirmed absent from production: the "expired code" 401, the "paused project"
copy, the `{ok:true}` reset lie, the "incorrect password" verdict.

### NOT PROVEN — stated plainly

- **Sign-in is NOT restored.** It cannot be restored by code. §6 is the fix.
- **No successful sign-in has been observed** by anyone, before or after this
  block. Every claim here is about *what WM says when it fails*.
- **No elapsed-time claim** is made anywhere in this baton.

### A probe ordering decision worth repeating

`/confirm` and `/login` (non-mutating) were probed **before** `/signup`. Had the
Founder already fixed the variable, a signup probe would have created a real
Supabase account. Only after login proved the backend still misdirected — and
therefore incapable of creating anything — was signup probed.

---

## 6. FOUNDER ACTION — the P0 does not close without this

I do not touch secrets. This is four steps in the Cloudflare Worker settings for
`wealthymindsetspro.com`:

1. **`NEXT_PUBLIC_SUPABASE_URL`** → set to `https://zrzaifaxecwgpfrqctkp.supabase.co`
   (verified alive and answering JSON). It currently holds a publishable key.
2. **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** → already holds a correctly-shaped
   publishable key. Leave it.
3. **Redeploy.**
4. **Rotate the publishable key.** It sat in a variable whose value was briefly
   quotable in an error body. Rotation is cheap; assuming it was never read is not.

**Verify in one request, no sign-in needed:**

```
curl -s https://wealthymindsetspro.com/api/diagnostics/supabase
```

Expected after the fix: `"NEXT_PUBLIC_SUPABASE_URL":"SUPABASE_PROJECT_URL"`,
`"defects":[]`, `"healthy":true`. Anything else names the box still wrong.

---

## 7. Preserved dirty lanes — DO NOT COMMIT

Verified intact before and after every commit in this block:

- `docs/operations/batons/WM-PRO-EVENING-2026-09-03.md` (modified)
- `scratchpad/` (untracked)
- `src/lib/screenReach.enforcement.test.ts` (untracked, **never executed**)

Every commit staged files **by name**. No `git add -A`, no `--no-verify`, no
force-push. No secret value was written, committed, logged, or copied anywhere.

---

## 8. Open items carried forward

- **`serviceRoleKeyPresent: false`** — newly observed live. Anything depending on
  the Supabase admin API is dead on this host. Not investigated; recorded so it
  is not mistaken for a new finding later.
- **`supabaseBumpSessionEpoch` fails silently.** `supabaseGetUserById` returns
  `null` on any non-ok response and the bump returns `false` — so "log out all
  devices" reports nothing and does nothing. Its `| null` contract is honest, so
  this is a *caller* defect, not the swallow-defect class fixed above. Deserves
  its own atom.
- **Signup lacks login's `isKeyIssue` branch.** A Supabase key rejection
  (`{"message":"Invalid API key"}` with no `.error`) falls through to a nameless
  502 on signup while login names `AUTH KEY REJECTED`.
- `src/lib/screenReach.enforcement.test.ts` — must be RUN before any claim is
  made about it, then §22 Orkin'd, gated, and committed by name.
- `f25d7ba` was never live-verified.
- `resolveQuoteDayChange.ts:100` — undisclosed SESSION_OPEN fallback.
- `compileScene` still has exactly one consumer. A one-route OS is a demo.
- §19 "toolbar tattoo" canon tension vs the restored Smart Money `WMLogo` trigger.

---

## 9. Known blockers — recorded honestly, not worked around

| Blocker | Why it is blocked | Who unblocks it |
|---|---|---|
| **Sign-in itself** | One env var; secrets are Founder-only | **Founder** — §6 |
| Wrangler observability / rollback / Worker logs | `wrangler login` needs an interactive terminal, and I must never set `CLOUDFLARE_API_TOKEN` | **Founder** — `./node_modules/.bin/wrangler login` |
| Gate 4 responsive device proof | Programmatic resize does not take effect; `outerWidth` stays pinned | Needs a real device or a different harness |
| `/journal` detail canvas | 0 journal entries exist | Needs real entries |
| Shared server-side Decision/Position store | DB mutation outside this shift's authority | Founder decision |
| Real broker order path | §22-B / H17 — adapters honestly refuse `submitOrder` | Founder decision |

---

## 10. The sentence to carry forward

> Presence is not configuration. `NEXT_PUBLIC_SUPABASE_URL` was **set**, and it
> was set to a key.
>
> Every check WM had asked *is the box full?* — and the box was full. The
> question that mattered was *what is in it?*, and no one was asking.
>
> So the software did the one thing software must never do when it cannot tell:
> it picked the explanation where the failure belonged to the user.
