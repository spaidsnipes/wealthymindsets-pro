"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProcessLandscape from "@/components/profile/ProcessLandscape";
import Panel from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import type {
  DecisionMemorySnapshot,
  LandscapeCell,
} from "@/lib/traderMemory/viewModels/selectProcessLandscape";
import { useAuth } from "@/contexts/AuthContext";

/**
 * /profile/process — the Founder's "Your Process Landscape" surface.
 *
 * Standalone additive route so the 778-line /profile/page.tsx is untouched.
 * Renders the ProcessLandscape heatmap over the user's Decision Memory
 * snapshots when the store exists. Until the store lands, this route
 * truthfully renders the UNKNOWN empty state — never fabricates decisions.
 *
 * When a cell is clicked, this route routes to /journal/:decisionId as a
 * first cut. Later revisions can open a Memory drawer inline + Replay
 * embed + Mirror interpretation + Drill link per the Founder's loop.
 */

export default function ProcessLandscapePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCell, setSelectedCell] = React.useState<{
    cell: LandscapeCell;
    examples: readonly DecisionMemorySnapshot[];
  } | null>(null);

  // TODO(post-launch): replace with real Decision Memory store subscription.
  // Empty array today — the ProcessLandscape truthfully renders UNKNOWN
  // rather than fabricating any decisions.
  const decisions: readonly DecisionMemorySnapshot[] = React.useMemo(() => [], []);

  const ownerId = user?.id ?? "";

  const handleDrilldown = React.useCallback(
    (cell: LandscapeCell, examples: readonly DecisionMemorySnapshot[]) => {
      setSelectedCell({ cell, examples });
    },
    [],
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-[color:var(--wm-ob-0,#050506)] text-[color:var(--wm-text-1,#ede6d3)] p-6">
        <Panel label="Your Process Landscape">
          <p className="text-[13px] text-[color:var(--wm-text-2,#8a8271)]">
            Sign in to view your Process Landscape.
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--wm-ob-0,#050506)] text-[color:var(--wm-text-1,#ede6d3)]">
      {/* Nav header */}
      <header className="border-b border-[color:var(--wm-gold-hair,#6d5220)] px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push("/profile")}
          className="flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-[color:var(--wm-text-2,#8a8271)] hover:text-[color:var(--wm-gold-mark,#c9a55c)] transition-colors"
          aria-label="Back to profile"
        >
          <ArrowLeft size={12} />
          Profile
        </button>
        <div className="text-[10px] tracking-[0.32em] uppercase text-[color:var(--wm-gold-line,#8b6a29)]">
          ◆ Process Landscape ◆
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto p-6 space-y-6">
        <ProcessLandscape
          decisions={decisions}
          ownerId={ownerId}
          onDrilldown={handleDrilldown}
        />

        {/* Drilldown detail panel — appears when a cell is clicked */}
        {selectedCell && (
          <Panel
            label="Cell decisions"
            sublabel={`${selectedCell.cell.rowKey} × ${selectedCell.cell.colKey} — ${selectedCell.examples.length} decision(s) at ${selectedCell.cell.confidence.toLowerCase()} confidence`}
            halo
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] text-[color:var(--wm-text-2,#8a8271)]">
                Founder loop: <span className="text-[color:var(--wm-gold-mark,#c9a55c)]">Heatmap → Memory</span>{" "}
                → Replay → Mirror → Drill → Profile
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-[10px] tracking-[0.18em] uppercase text-[color:var(--wm-text-3,#55503f)] hover:text-[color:var(--wm-gold-mark,#c9a55c)]"
                aria-label="Close cell detail"
              >
                Close
              </button>
            </div>

            {selectedCell.examples.length === 0 ? (
              <div className="text-[12px] italic text-[color:var(--wm-text-2,#8a8271)]">
                No decisions found for this cell. Decision Memory store not yet
                connected — this route is a scaffold waiting for the store
                subscription.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedCell.examples.map((d) => (
                  <button
                    key={d.decisionId}
                    onClick={() => router.push(`/journal?decision=${d.decisionId}`)}
                    className="w-full text-left flex items-center justify-between p-3 rounded border border-[color:var(--wm-gold-hair,#6d5220)] hover:border-[color:var(--wm-gold-mark,#c9a55c)] transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-[12px] font-medium">
                        {new Date(d.capturedAt).toLocaleString()} — {d.playbookId} v{d.playbookVersion}
                      </div>
                      <div className="text-[10px] text-[color:var(--wm-text-2,#8a8271)] mt-1">
                        {d.plan.action} · expected {d.plan.expectedR.toFixed(2)}R
                        {d.outcome && ` · realized ${d.outcome.realizedR.toFixed(2)}R (${d.outcome.reason.toLowerCase()})`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.ruleAdherenceAtDecision ? (
                        <Pill state="aligned">Followed</Pill>
                      ) : (
                        <Pill state="warning">Violated</Pill>
                      )}
                      {d.externalInfluenceFlagged && <Pill state="warning">External influence</Pill>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Legend / doctrine footer */}
        <div className="text-[10px] text-[color:var(--wm-text-3,#55503f)] tracking-[0.14em] uppercase pt-4 border-t border-[color:var(--wm-gold-hair,#6d5220)]">
          Good process + bad outcome = professional loss · Bad process + good outcome = dangerous win
        </div>
      </main>
    </div>
  );
}
