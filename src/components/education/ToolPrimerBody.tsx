"use client";

/**
 * A TOOL PRIMER, laid out (Supermax §9). Words come from `toolPrimers.ts`,
 * which reads each tool's own ⓘ record — this file only arranges them.
 */
import React from "react";
import Link from "next/link";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { PRIMER_CANNOT_KNOW, PRIMER_GRADES_LEDE, PRIMER_SILENCE, type ToolPrimer } from "@/lib/academy/toolPrimers";

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="text-[12px] leading-relaxed"><span className="font-bold text-wm-text">{k}</span> <span className="text-wm-text-muted">{v}</span></div>
);

export function ToolPrimerBody({ primer, color }: { primer: ToolPrimer; color: string }) {
  return (
    <div data-testid="tool-primer" data-tool-primer={primer.id} className="px-4 py-4 space-y-4">
      <div>
        <div className="text-[11px] font-black uppercase tracking-wider" style={{ color }}>Primer {primer.n} of 6 · Reading the glass</div>
        <h2 className="mt-1 text-base font-bold text-wm-text" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}>{primer.title}</h2>
        <p className="mt-1 text-[12px] text-wm-text-muted leading-relaxed">These are the same words as the tool&apos;s ⓘ on the chart — one definition, written once.</p>
      </div>

      {primer.sections.map(s => (
        <section key={s.tool} data-testid="tool-primer-section" className="p-3 rounded-xl border border-wm-border bg-wm-surface/20 space-y-2">
          <div className="text-[13px] font-bold text-wm-text">{s.tool}</div>
          <p className="text-[12px] text-wm-text leading-relaxed">{s.question}</p>
          <Row k="On the chart:" v={s.appears} />
          <Row k="How to read it:" v={s.grammar} />
          <Row k="What it needs:" v={s.evidence} />
          <div className="pt-1 border-t border-wm-border/40 space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider" style={{ color }}>Evidence grades for this tool</div>
            <Row k="FULL:" v={s.full} />
            <Row k="PARTIAL:" v={s.partial} />
            <Row k="DEGRADED:" v={s.degraded} />
          </div>
        </section>
      ))}

      <div className="p-3 rounded-xl border bg-wm-surface/20 space-y-1.5" style={{ borderColor: "rgba(201,165,92,0.35)" }}>
        <p className="text-[12px] text-wm-text leading-relaxed">{PRIMER_GRADES_LEDE}</p>
        <p className="text-[12px] text-wm-text-muted leading-relaxed">{PRIMER_SILENCE}</p>
        <p className="text-[12px] text-wm-text-muted leading-relaxed">{PRIMER_CANNOT_KNOW}</p>
      </div>

      <Link href={INSTRUMENT_VIEW_ROUTE} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-[12px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
        style={{ borderColor: `${color}66`, color }}>
        Open the chart — find it in Tools →
      </Link>
    </div>
  );
}
