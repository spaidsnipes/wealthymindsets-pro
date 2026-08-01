# VIDEO QUEUE — order-flow / Fabio intelligence

**Owner:** Video Intelligence · **Ticket:** `VI-WM-P0-03` · **Created:** 2026-07-31

Founder intake for the "every Fabio video the Founder clicked on + related order-flow videos" directive
(15:06 directive, restated 2026-07-31). Drop links below; VI processes **oldest first** with yt-dlp
(`python3 -m yt_dlp` — installed `--user`, v2026.07.04), cleans/timestamps captions, and publishes a
transcript + honesty note on any failed pull. No transcript content is ever invented for a failed pull (rule §5).

## How to add a video (Founder)

Add a row to **Queue** with the URL and, if you have it, why it matters / the timestamp you parked on.
That's all VI needs — it will pull captions, timestamp them, and file a handoff.

## Queue (awaiting Founder list)

| # | URL | Why / parked timestamp | Status |
|---|---|---|---|
| _(empty — awaiting Founder's Fabio list)_ | | | — |

> **Honest status:** the Founder's click history is not accessible to VI, so no specific "Fabio video" can be
> queued until a link is dropped here. `VI-WM-P0-03` stays open for exactly this. This is the intake target the
> ticket referenced — not a fabricated list.

## Processed

| URL / ID | Title | Result | Artifact | Date |
|---|---|---|---|---|
| YouTube `Pz8f0wWW12M` | "Only Orderflow Guide You'll Ever Need" | ✅ 41m03s, 7576 raw lines → 944 unique timestamped cues | [`docs/research/transcripts/YT_Pz8f0wWW12M_orderflow_guide.txt`](research/transcripts/YT_Pz8f0wWW12M_orderflow_guide.txt) | 2026-07-30 (`cddaf74`) |

**Founder-parked note (Pz8f0wWW12M @ 4:52):** footprint worked-example of aggressive orders walking a resting
limit book across 101/102/103 with slippage — the exact phenomenon WM Pro's Big Trades / Delta Bubbles visualize.
Direct tie to the bubble-collision defect class.
