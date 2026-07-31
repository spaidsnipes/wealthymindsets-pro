# DISPATCHES

**Purpose:** Direct addressed wake-up messages to specific employees. Not queue prose. Not architecture docs. Short, imperative, one file per employee per drop.

**When Mission Control (Atlas / this coordinator) writes here:** the target employee has an open bounded next action, is idle, and needs to see it the moment they open their thread. The dispatch names them at the top ("NOAH — ..."), states the situation in one paragraph, gives the next action in numbered steps, and gets out of the way.

**When the target employee reads a dispatch:** treat it like a Founder ping to the extent of *doing the work*, but under the DEC-011 rule you never ping the Founder to confirm receipt. Do the work, publish the handoff, log the commit — the dispatch is retired the moment your commit references it.

**Layout:**

```
docs/operations/dispatches/
  README.md                       ← this file
  YYYY-MM-DD/
    HHMM-<employee>-<slug>.md    ← one message
```

Filename time is 24-hour CDT. Slug is 3-5 kebab-case words. Example:
`2026-07-30/2020-noah-unblocked-claim-p0-05b.md`

**Retirement:** when the target's commit lands referencing the dispatch (either by ID line or by matching ticket), Nehemiah moves the dispatch file into `dispatches/YYYY-MM-DD/retired/`. Nothing gets deleted; the bus stays auditable.
