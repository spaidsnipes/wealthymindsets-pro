"use client";
/**
 * SAVE MY STACK — the trader's own profile stack, one press to keep it and one
 * to put it back. Sits under the Profiles grid in Chart tools. Restoring goes
 * through the same switch door the Workspace desks use.
 */
import React, { useEffect, useState } from "react";
import type { ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import { MY_STACK_STORAGE_KEY, captureMyStack, countOn, parseMyStack } from "@/lib/marketData/viewModels/myProfileStack";

type Switches = Readonly<Partial<Record<ProfileId, boolean>>>;

export function MyStackBar({ active, onRestore }: { active: Switches; onRestore: (s: Switches) => void }) {
  const [saved, setSaved] = useState<Partial<Record<ProfileId, boolean>> | null>(null);
  useEffect(() => {
    try { setSaved(parseMyStack(localStorage.getItem(MY_STACK_STORAGE_KEY))); } catch { /* storage blocked */ }
  }, []);
  const save = () => {
    const s = captureMyStack(active);
    try { localStorage.setItem(MY_STACK_STORAGE_KEY, JSON.stringify(s)); } catch { /* storage blocked — kept for this visit only */ }
    setSaved(s);
  };
  return (
    <div
      data-testid="my-stack-bar"
      className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-wm-border px-3 py-2"
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-wm-text-dim">
        {saved ? `My stack · ${countOn(saved)} profile${countOn(saved) === 1 ? "" : "s"} on` : "My stack · not saved yet"}
      </span>
      <span className="flex gap-1">
        <button type="button" onClick={save} data-testid="my-stack-save"
          className="min-h-8 rounded border border-wm-border px-2 text-[10px] font-semibold text-wm-text hover:text-wm-gold">
          Save my stack
        </button>
        <button type="button" disabled={!saved} onClick={() => saved && onRestore(saved)} data-testid="my-stack-restore"
          className="min-h-8 rounded border border-wm-border px-2 text-[10px] font-semibold text-wm-text hover:text-wm-gold disabled:opacity-40">
          Restore
        </button>
      </span>
    </div>
  );
}
