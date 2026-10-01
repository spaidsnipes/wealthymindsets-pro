"use client";

import { useEffect, useState } from "react";

import { DEFAULT_GUARDRAILS, GUARDRAILS_CHANGED_EVENT, GUARDRAILS_STORAGE_KEY, readGuardrails, type Guardrails } from "./guardrails";

/** The trader's commitments, live across every open surface and tab. */
export function useGuardrails(): Guardrails {
  const [g, setG] = useState<Guardrails>(DEFAULT_GUARDRAILS);
  useEffect(() => {
    const read = () => { try { setG(readGuardrails(localStorage.getItem(GUARDRAILS_STORAGE_KEY))); } catch { setG(DEFAULT_GUARDRAILS); } };
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === GUARDRAILS_STORAGE_KEY) read(); };
    window.addEventListener(GUARDRAILS_CHANGED_EVENT, read);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(GUARDRAILS_CHANGED_EVENT, read); window.removeEventListener("storage", onStorage); };
  }, []);
  return g;
}

export function writeGuardrails(g: Guardrails): void {
  try {
    localStorage.setItem(GUARDRAILS_STORAGE_KEY, JSON.stringify(g));
    window.dispatchEvent(new Event(GUARDRAILS_CHANGED_EVENT));
  } catch { /* private mode: the commitment cannot be stored here */ }
}
