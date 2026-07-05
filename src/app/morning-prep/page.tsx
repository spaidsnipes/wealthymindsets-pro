"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sun, Plus, X, Check, Trash2, Image as ImageIcon, Flame,
  CheckCircle2, Circle, Coffee, Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

/* ══════════════════════════════════════════════════════════════
   Morning Prep — a focused space for building discipline through
   morning routines and personal development.

   Entries persist per-user in localStorage so a member's prep log
   survives reloads without depending on a backend table.
══════════════════════════════════════════════════════════════ */

interface ChecklistItem { id: string; text: string; done: boolean; }
interface PrepEntry {
  id: string;
  date: string;          // ISO date string
  routine: string;       // free-text routine / intentions
  mood: string;          // emoji
  checklist: ChecklistItem[];
  photo?: string | null; // data URL
  createdAt: number;
}

const MOODS = ["😴", "🙂", "😃", "🔥", "🧠", "💪", "🎯", "☕"];

const STARTER_CHECKLIST = [
  "Hydrate + no phone for first 30 min",
  "Review overnight moves & key levels",
  "Set 1 primary intention for the day",
  "Breathwork / meditation (5 min)",
  "Journal yesterday's lesson",
];

function storeKey(handle: string) { return `wm_morning_prep_${handle || "guest"}`; }

function loadEntries(handle: string): PrepEntry[] {
  try { return JSON.parse(localStorage.getItem(storeKey(handle)) || "[]") as PrepEntry[]; }
  catch { return []; }
}
function saveEntries(handle: string, entries: PrepEntry[]) {
  try { localStorage.setItem(storeKey(handle), JSON.stringify(entries)); } catch {}
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default function MorningPrepPage() {
  const { user } = useAuth();
  const handle = user?.handle ?? user?.email?.split("@")[0] ?? "guest";

  const [entries, setEntries] = useState<PrepEntry[]>([]);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => { setEntries(loadEntries(handle)); }, [handle]);

  const persist = useCallback((next: PrepEntry[]) => {
    setEntries(next);
    saveEntries(handle, next);
  }, [handle]);

  const toggleItem = (entryId: string, itemId: string) => {
    persist(entries.map(e => e.id !== entryId ? e : {
      ...e, checklist: e.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i),
    }));
  };
  const deleteEntry = (id: string) => persist(entries.filter(e => e.id !== id));

  // Streak = number of consecutive days (ending today) with an entry.
  const streak = (() => {
    const days = new Set(entries.map(e => e.date.slice(0, 10)));
    let count = 0;
    const d = new Date();
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) { count++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return count;
  })();

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: "#070A0F" }}>
      {/* ── Header ── */}
      <div className="border-b" style={{ borderColor: "#1E2030", background: "linear-gradient(180deg,#0D1117,#070A0F)" }}>
        <div className="max-w-3xl mx-auto px-6 py-7">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#F0B429,#F97316)" }}>
              <Sun size={22} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Morning Prep</h1>
              <p className="text-sm text-wm-text-muted" style={{ color: "#8B8FA8" }}>
                A focused space for building discipline through morning routines and personal development.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(240,180,41,0.10)", border: "1px solid rgba(240,180,41,0.30)" }}>
              <Flame size={15} style={{ color: "#F0B429" }} />
              <span className="text-sm font-bold" style={{ color: "#F0B429" }}>{streak}-day streak</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(0,212,170,0.10)", border: "1px solid rgba(0,212,170,0.30)" }}>
              <Target size={15} style={{ color: "#00D4AA" }} />
              <span className="text-sm font-bold" style={{ color: "#00D4AA" }}>{entries.length} entries</span>
            </div>
            <button onClick={() => setShowCompose(true)}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.35)", color: "#00D4AA" }}>
              <Plus size={15} /> New Prep
            </button>
          </div>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Coffee size={40} style={{ color: "#4A5070" }} className="mb-4" />
            <p className="text-base font-semibold text-white mb-1">Start your first morning routine</p>
            <p className="text-sm mb-5" style={{ color: "#8B8FA8" }}>
              Build the habits that build discipline. Log a routine, check off your prep, and grow your streak.
            </p>
            <button onClick={() => setShowCompose(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.35)", color: "#00D4AA" }}>
              <Plus size={14} /> Create first entry
            </button>
          </div>
        ) : (
          entries.map(e => {
            const done = e.checklist.filter(i => i.done).length;
            const pct = e.checklist.length ? Math.round((done / e.checklist.length) * 100) : 0;
            return (
              <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5" style={{ background: "#0D1117", border: "1px solid #1E2030" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{e.mood || "☀️"}</span>
                    <div>
                      <div className="text-sm font-bold text-white">{fmtDate(e.date)}</div>
                      <div className="text-[11px]" style={{ color: "#8B8FA8" }}>{pct}% complete · {done}/{e.checklist.length}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteEntry(e.id)} style={{ color: "#6B7280" }}
                    className="hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                </div>

                {/* progress bar */}
                <div className="h-1.5 rounded-full mb-3" style={{ background: "#1E2030" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct === 100 ? "#00D4AA" : "#F0B429" }} />
                </div>

                {e.routine && (
                  <p className="text-sm text-white leading-relaxed whitespace-pre-line mb-3">{e.routine}</p>
                )}

                {e.photo && (
                  <img src={e.photo} alt="Prep" className="w-full max-h-64 object-cover rounded-xl mb-3"
                    style={{ border: "1px solid #1E2030" }} />
                )}

                <div className="space-y-1.5">
                  {e.checklist.map(i => (
                    <button key={i.id} onClick={() => toggleItem(e.id, i.id)}
                      className="flex items-center gap-2.5 w-full text-left group">
                      {i.done
                        ? <CheckCircle2 size={17} style={{ color: "#00D4AA" }} className="shrink-0" />
                        : <Circle size={17} style={{ color: "#4A5070" }} className="shrink-0" />}
                      <span className="text-sm transition-colors"
                        style={{ color: i.done ? "#5B6270" : "#C0C8D8", textDecoration: i.done ? "line-through" : "none" }}>
                        {i.text}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {showCompose && (
          <ComposeModal
            onClose={() => setShowCompose(false)}
            onSave={(entry) => { persist([entry, ...entries]); setShowCompose(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Compose modal
══════════════════════════════════════════════════════════════ */
function ComposeModal({ onClose, onSave }: { onClose: () => void; onSave: (e: PrepEntry) => void }) {
  const [routine, setRoutine] = useState("");
  const [mood, setMood] = useState("🔥");
  const [items, setItems] = useState<ChecklistItem[]>(
    STARTER_CHECKLIST.map((t, i) => ({ id: `s${i}`, text: t, done: false }))
  );
  const [newItem, setNewItem] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems(list => [...list, { id: `n${Date.now()}`, text: newItem.trim(), done: false }]);
    setNewItem("");
  };
  const removeItem = (id: string) => setItems(list => list.filter(i => i.id !== id));

  const save = () => {
    const entry: PrepEntry = {
      id: `e${Date.now()}`,
      date: new Date().toISOString(),
      routine: routine.trim(),
      mood,
      checklist: items,
      photo,
      createdAt: Date.now(),
    };
    onSave(entry);
  };

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(7,10,15,0.82)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        className="w-[540px] max-w-full rounded-2xl p-5 shadow-2xl max-h-[88vh] overflow-y-auto"
        style={{ background: "#0D1117", border: "1px solid #1E2030" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Sun size={17} style={{ color: "#F0B429" }} /> New Morning Prep
          </h3>
          <button onClick={onClose} style={{ color: "#8B8FA8" }}><X size={18} /></button>
        </div>

        {/* Mood */}
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest font-bold block mb-2" style={{ color: "#6B7280" }}>How do you feel?</label>
          <div className="flex gap-1.5 flex-wrap">
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m)}
                className="w-9 h-9 rounded-xl text-lg transition-all"
                style={{ background: mood === m ? "rgba(240,180,41,0.18)" : "#161A24",
                  border: `1px solid ${mood === m ? "rgba(240,180,41,0.5)" : "#1E2030"}` }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Routine */}
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest font-bold block mb-2" style={{ color: "#6B7280" }}>Routine & intentions</label>
          <textarea value={routine} onChange={e => setRoutine(e.target.value)} rows={4}
            placeholder="My primary intention today is…  Key levels I'm watching…  How I want to show up…"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none"
            style={{ background: "#161A24", border: "1px solid #1E2030" }} />
        </div>

        {/* Checklist */}
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest font-bold block mb-2" style={{ color: "#6B7280" }}>Prep checklist</label>
          <div className="space-y-1.5 mb-2">
            {items.map(i => (
              <div key={i.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "#161A24" }}>
                <Check size={13} style={{ color: "#4A5070" }} />
                <span className="flex-1 text-sm" style={{ color: "#C0C8D8" }}>{i.text}</span>
                <button onClick={() => removeItem(i.id)} style={{ color: "#6B7280" }}><X size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addItem(); }}
              placeholder="Add a checklist item…"
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: "#161A24", border: "1px solid #1E2030" }} />
            <button onClick={addItem} className="px-3 rounded-lg text-sm font-bold"
              style={{ background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.35)", color: "#00D4AA" }}>
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* Photo */}
        <div className="mb-4">
          {photo ? (
            <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid #1E2030" }}>
              <img src={photo} alt="Prep" className="w-full max-h-48 object-cover" />
              <button onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.6)" }}><X size={13} className="text-white" /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: "#161A24", border: "1px solid #1E2030", color: "#8B8FA8" }}>
              <ImageIcon size={15} /> Add a photo
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setPhoto(ev.target?.result as string); r.readAsDataURL(f); } }} />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "#1E2030" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ color: "#8B8FA8" }}>Cancel</button>
          <button onClick={save} className="px-5 py-2 rounded-xl text-sm font-bold"
            style={{ background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.35)", color: "#00D4AA" }}>
            Save Prep
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
