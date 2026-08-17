"use client";

import React from "react";
import { ExternalLink, Handshake, Star, ChevronRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

type Partner = {
  name: string;
  tagline: string;
  description: string;
  url: string;
  cta: string;
  tier: "Featured Partner" | "Partner" | "Sponsor";
  gradient: string;
  glow: string;
  accent: string;
};

const PARTNERS: Partner[] = [];

export default function PartnershipsPage() {
  return (
    <div className="flex flex-col h-full bg-wm-black overflow-y-auto">
      {/* ── Header — WM atmosphere ────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 shrink-0 sticky top-0 z-10"
        style={{
          minHeight: 48,
          borderBottom: "1px solid rgba(139,106,41,0.15)",
          background: "linear-gradient(180deg, #0b0b0d 0%, rgba(11,11,13,0.6) 100%)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 12, letterSpacing: 0.32,
            color: "#c9a55c", textTransform: "uppercase", fontWeight: 400,
          }}
        >
          WM
        </span>
        <div style={{ width: 1, height: 16, background: "rgba(139,106,41,0.35)" }} aria-hidden="true" />
        <div
          className="grid place-items-center shrink-0"
          style={{
            width: 32, height: 32, borderRadius: 999,
            background: "linear-gradient(160deg, rgba(212,175,55,0.22), rgba(201,165,92,0.08))",
            border: "1px solid rgba(212,175,55,0.35)",
            color: "#d4af37",
          }}
        >
          <Handshake size={15} />
        </div>
        <div>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 14, fontWeight: 400,
              color: "#ede6d3", letterSpacing: -0.1, margin: 0,
            }}
          >
            Partnerships &amp; Sponsors
          </h1>
          <p
            style={{
              fontSize: 10, letterSpacing: 0.02,
              color: "#8a8271", margin: 0, marginTop: 2,
            }}
          >
            Only verified partner records are published here
          </p>
        </div>
        <div
          className="ml-auto"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 8px", borderRadius: 999,
            border: "1px solid rgba(92,184,92,0.35)",
            background: "rgba(92,184,92,0.08)",
            color: "#5cb85c",
            fontSize: 9, letterSpacing: 0.32, fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          <ShieldCheck size={10} /> Verification required
        </div>
      </div>

      {/* ── Intro ──────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 py-3 border-b border-wm-border"
        style={{ background: "linear-gradient(135deg, rgba(240,180,41,0.08), rgba(255,77,106,0.05))" }}
      >
        <p className="text-[11px] text-wm-text-muted leading-relaxed max-w-3xl">
          Partner listings remain hidden until the organization, destination, relationship, and claims have been verified.
          No unverified endorsement or outbound partner link is shown.
        </p>
      </div>

      {/* ── Partner cards ──────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {PARTNERS.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-wm-border bg-wm-dark overflow-hidden"
          >
            <div className="h-1.5 w-full" style={{ background: p.gradient }} />
            <div className="p-4 flex flex-col sm:flex-row gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-lg"
                style={{ background: p.gradient, boxShadow: p.glow }}
              >
                {p.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-sm font-black text-wm-text">{p.name}</h2>
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: `${p.accent}22`, color: p.accent }}
                  >
                    <Star size={9} /> {p.tier}
                  </span>
                </div>
                <p className="text-[11px] font-bold mb-1.5" style={{ color: p.accent }}>{p.tagline}</p>
                <p className="text-[11px] text-wm-text-muted leading-relaxed mb-3">{p.description}</p>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: p.gradient, boxShadow: p.glow }}
                >
                  {p.cta} <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
        {PARTNERS.length === 0 && (
          <div className="rounded-2xl border border-wm-border bg-wm-dark p-10 text-center">
            <ShieldCheck size={26} className="mx-auto mb-3 text-wm-gold" />
            <p className="text-sm font-black text-wm-text">No verified partners published yet</p>
            <p className="mt-1 text-[11px] text-wm-text-muted">Verified relationships will appear here with an official destination and disclosure.</p>
          </div>
        )}

        {/* ── Become a partner ─────────────────────────────── */}
        <div className="rounded-2xl border border-dashed border-wm-border bg-wm-dark/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-wm-black flex items-center justify-center shrink-0">
            <Handshake size={16} className="text-wm-text-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-wm-text">Interested in partnering with Wealthy Mindsets?</p>
            <p className="text-[10px] text-wm-text-muted">
              We work with education-first platforms and creators. Reach out through the Profile → Contact section.
            </p>
          </div>
          <ChevronRight size={16} className="text-wm-text-muted shrink-0" />
        </div>
      </div>
    </div>
  );
}
