"use client";

/**
 * SQUABBLE REPLAY → CLIP (MISSING-INVENTIONS #14). A 15-second recording of THIS tab while the fight plays, saved to
 * his device as a WebM to share (WAVEMOTION takes the file as it is). The browser asks which tab to share — nothing is
 * captured without that choice — and the frame carries "Education, not financial advice" on the chart already.
 */
import React, { useState } from "react";

export const CLIP_SECONDS = 15;

export function SquabbleClipButton({ left: x = 392, bottom = 64 }: { readonly left?: number; readonly bottom?: number }) {
  const [left, setLeft] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  async function clip() {
    setNote(null);
    try {
      const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (o: unknown) => Promise<MediaStream> };
      if (!md.getDisplayMedia || typeof MediaRecorder === "undefined") { setNote("This browser can't record a clip."); return; }
      const stream = await md.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      const parts: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(parts, { type: "video/webm" }));
        a.download = `squabble-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.webm`;
        document.body.appendChild(a); a.click(); a.remove();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        setLeft(null); setNote("Clip saved to your downloads.");
      };
      rec.start(1000);
      let n = CLIP_SECONDS; setLeft(n);
      const t = window.setInterval(() => { n -= 1; setLeft(n); if (n <= 0) { window.clearInterval(t); rec.stop(); } }, 1000);
    } catch { setLeft(null); setNote("No tab was shared — nothing recorded."); }
  }
  return (
    <div data-testid="squabble-clip" style={{ position: "absolute", left: x, bottom, zIndex: 7, display: "flex", gap: 6, alignItems: "center" }}>
      <button type="button" onClick={clip} disabled={left != null} aria-label="Save a 15 second clip of the squabble"
        style={{ minHeight: 30, padding: "0 10px", borderRadius: 6, border: "1px solid rgba(212,175,55,0.7)", background: "rgba(7,9,15,0.9)", color: "#d4a94a", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", cursor: left != null ? "default" : "pointer" }}>
        {left != null ? `● REC ${left}s` : "● CLIP 15s"}
      </button>
      {note ? <span style={{ fontSize: 10.5, color: "#c8c0ae", background: "rgba(7,9,15,0.85)", padding: "2px 6px", borderRadius: 4 }}>{note}</span> : null}
    </div>
  );
}
