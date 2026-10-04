"use client";

/**
 * wmConfirm — the room's own "are you sure?" (2026-10-04).
 *
 * Every destructive action used the browser's window.confirm(): a grey
 * system box that freezes the page and, on a phone, sits outside the app.
 * This keeps the exact sentence each call site wrote — the first paragraph is
 * the question, the rest is the named consequence — and answers a Promise.
 *
 * Mounted on demand into its own root, so no provider is needed: a call site
 * changes `if (!window.confirm(msg)) return;` to
 * `if (!(await wmConfirm(msg))) return;`. Cancel is the default: Escape, a
 * click outside, and the initially focused button all mean "no".
 */
import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

export interface WmConfirmOptions {
  /** The word on the yes button. Default "Confirm". */
  readonly confirmLabel?: string;
}

function ConfirmSheet({ message, confirmLabel, onDone }: { message: string; confirmLabel: string; onDone: (yes: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [question, ...rest] = message.split(/\n\s*\n/);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onDone(false); return; }
      // A modal keeps Tab inside itself: the two answers, round and round.
      if (e.key === "Tab") {
        const btns = Array.from(dialogRef.current?.querySelectorAll("button") ?? []);
        if (!btns.length) return;
        const i = btns.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);
  return (
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onDone(false); }}
      style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(3,3,5,0.72)", display: "grid", placeItems: "center", padding: 16 }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="wm-confirm-q"
        aria-describedby={rest.length ? "wm-confirm-body" : undefined}
        style={{ width: "min(420px, 100%)", background: "#0b0a08", border: "1px solid rgba(201,165,92,0.35)", borderRadius: 14, padding: "20px 20px 16px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", color: "#ede6d3", fontFamily: "inherit" }}
      >
        <div id="wm-confirm-q" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, lineHeight: 1.35 }}>{question}</div>
        {rest.length ? (
          <div id="wm-confirm-body" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: "#a89c80", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{rest.join("\n\n")}</div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button ref={cancelRef} type="button" onClick={() => onDone(false)}
            style={{ minHeight: 44, padding: "0 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "#ede6d3", fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={() => onDone(true)}
            style={{ minHeight: 44, padding: "0 18px", borderRadius: 8, border: "1px solid rgba(224,120,107,0.6)", background: "rgba(224,120,107,0.14)", color: "#f0a596", fontWeight: 700, cursor: "pointer" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function wmConfirm(message: string, opts: WmConfirmOptions = {}): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise<boolean>(resolve => {
    const host = document.createElement("div");
    host.setAttribute("data-wm-confirm", "");
    document.body.appendChild(host);
    const root = createRoot(host);
    const previous = document.activeElement as HTMLElement | null;
    let settled = false;
    const done = (yes: boolean) => {
      if (settled) return;
      settled = true;
      root.unmount();
      host.remove();
      try { previous?.focus(); } catch { /* element gone */ }
      resolve(yes);
    };
    root.render(<ConfirmSheet message={message} confirmLabel={opts.confirmLabel ?? "Confirm"} onDone={done} />);
  });
}
