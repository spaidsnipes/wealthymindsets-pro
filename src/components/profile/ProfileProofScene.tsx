"use client";

/**
 * /profile?scene=profile-fixture — PROOF SCENE (Garden 19, 2026-10-08). Three SAMPLE books (0, 7,
 * 24 closed trades) through the page's own tile view and edge panels, so the measured zero, the
 * INSUFFICIENT EVIDENCE tiles (1–19) and the MEASURED tiles (≥ 20) can be read on serving without
 * one record on anyone's account.
 *
 * HARD LIMITS (pinned by profileProofScene.sentinel.test.tsx): a banner that says it is sample data,
 * always on screen; ZERO storage writes and ZERO network calls; shown only for a signed-in trader
 * with the token (ProfileRouteSwitch) — inert for guests.
 */

import React, { useMemo } from "react";

import PersonalEdgePanel from "@/components/profile/PersonalEdgePanel";
import PlaybookDNAPanel from "@/components/profile/PlaybookDNAPanel";
import SessionEdgePanel from "@/components/profile/SessionEdgePanel";
import { ProfilePerfTiles } from "@/components/profile/ProfilePerfTiles";
import { DepartureLessonRowsFor } from "@/components/profile/DepartureLessonRows";
import { PlanAdherenceView } from "@/components/journal/PlanAdherenceBySetup";
import { journalFixture } from "@/lib/journal/journalProofFixture";
import { PROFILE_FIXTURE_BANNER, PROFILE_FIXTURE_NOW_MS, PROFILE_FIXTURE_OWNER, PROFILE_FIXTURE_SIZES, profileFixtureBook } from "@/lib/profile/profileProofFixture";
import { STAT_SAMPLE_MIN } from "@/lib/journal/statGuard";
import { selectPersonalEdge } from "@/lib/traderMemory/viewModels/selectPersonalEdge";
import { selectPlaybookDNA } from "@/lib/traderMemory/viewModels/selectPlaybookDNA";
import { selectSessionEdge } from "@/lib/traderMemory/viewModels/selectSessionEdge";

const GOLD = "#d4af37";
const TITLE: Readonly<Record<number, string>> = {
  0: "Book A · 0 closed trades — a measured zero; the ratios have no basis",
  7: `Book B · 7 closed trades — below ${STAT_SAMPLE_MIN}: INSUFFICIENT EVIDENCE, never a rate`,
  24: `Book C · 24 closed trades — ${STAT_SAMPLE_MIN} or more: MEASURED`,
};

/** The first `n` synthetic plan-vs-actual results of the journal proof fixture (no storage, no network). */
function departureSample(n: number) {
  const f = journalFixture();
  return f.entries.slice(0, n).map(e => f.planResults[e.id]);
}

export function ProfileProofScene(): React.ReactElement {
  const books = useMemo(() => PROFILE_FIXTURE_SIZES.map(n => profileFixtureBook(n)), []);
  const fx = useMemo(() => journalFixture(), []);
  return (
    // The shell hands this room its own scroll (`data-scroll-owner="workspace"`: main is
    // overflow hidden). The real profile scrolls in its root; the proof scene had no
    // scroller, so everything past the first screen was unreachable (read at 390, 2026-10-09).
    <div className="h-full overflow-y-auto" data-testid="profile-proof-scroll">
    <div className="px-4 py-4 space-y-4 max-w-4xl mx-auto" data-testid="profile-proof-scene" data-proof-scene="profile-fixture">
      <div role="status" data-testid="profile-proof-banner"
        className="rounded-lg border px-3 py-2 text-[12px] font-black tracking-wider"
        style={{ borderColor: GOLD, color: GOLD, background: "rgba(212,175,55,0.08)" }}>
        {PROFILE_FIXTURE_BANNER}
        <span className="block text-[11px] font-normal tracking-normal text-wm-text-muted">
          Three synthetic books (SAMPLE-FVG) through the profile&apos;s own tiles and edge panels.
          Nothing here is saved, fetched or sent — leave the page (or drop <code>?scene=profile-fixture</code>) to return to your profile.
        </span>
      </div>
      {books.map(b => (
        <section key={b.size} data-testid="profile-proof-book" data-size={b.size} className="rounded-lg border border-wm-border p-3 space-y-3">
          <h2 className="text-[12px] font-bold tracking-wider" style={{ color: GOLD }}>{TITLE[b.size] ?? `Book · ${b.size} closed trades`}</h2>
          <ProfilePerfTiles stats={b.stats} />
          {b.size > 0 ? (
            <>
              <PersonalEdgePanel vm={selectPersonalEdge({ ownerId: PROFILE_FIXTURE_OWNER, decisions: b.snapshots, nowMs: PROFILE_FIXTURE_NOW_MS })} />
              {/* Departures with their lesson doors: the first N sample decisions of the journal fixture (synthetic plans). */}
              <DepartureLessonRowsFor results={departureSample(b.size)} />
              {/* The Journal's Personal Edge view on the same sample decisions (book C only — the fixture's full set):
                  FVG study list with WAITED, the timing and untraded-touch sentences, read from the sample ledger. */}
              {b.size >= STAT_SAMPLE_MIN ? (
                <div data-testid="profile-proof-gap-study" style={{ border: "1px solid rgba(139,106,41,0.35)", borderRadius: 10, background: "rgba(11,11,13,0.9)", padding: 16 }}>
                  <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>Personal Edge · your plans and gap decisions · SAMPLE</span>
                  <PlanAdherenceView rows={fx.adherence} fvgRows={fx.studyRows} edge={fx.counterfactual} edgeNote="Read from the sample ledger in this page — nothing was fetched." showEdge onCompare={() => {}} splits={fx.splits} />
                </div>
              ) : null}
              <PlaybookDNAPanel vm={selectPlaybookDNA({ ownerId: PROFILE_FIXTURE_OWNER, decisions: b.snapshots, nowMs: PROFILE_FIXTURE_NOW_MS })} />
              <SessionEdgePanel vm={selectSessionEdge({ ownerId: PROFILE_FIXTURE_OWNER, decisions: b.snapshots, nowMs: PROFILE_FIXTURE_NOW_MS, metric: "avg_realized_r" })} />
            </>
          ) : null}
        </section>
      ))}
    </div>
    </div>
  );
}
