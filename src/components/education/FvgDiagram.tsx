"use client";

/**
 * FVG COURSE SCHEMATICS — small inline SVG drawings, one per lesson
 * (Garden 19 §33). SCHEMATIC, NOT MARKET DATA: every coordinate below is a
 * drawing position, never a price; no axis carries numbers.
 *
 * ATH material: graphite + gold, and FORM carries meaning, not colour alone —
 * bullish bars are hollow, bearish bars are filled, the territory is hatched
 * with a dashed boundary, and every role is written as a word.
 */
import React, { useId } from "react";
import type { FvgDiagramKind } from "@/lib/academy/fvgCourse";
import { fvgDiagramAlt } from "@/lib/academy/fvgDiagramText";

const GRAPHITE = "#8b8f97";
const INK = "#d6d2c4";
const GOLD = "#c9a55c";
const BG = "#0e0f12";

type Bar = { x: number; h: number; l: number; o: number; c: number };

function Candle({ b, w = 14 }: { b: Bar; w?: number }) {
  const up = b.c < b.o; // smaller y = higher: a close above the open is bullish
  const top = Math.min(b.o, b.c), bot = Math.max(b.o, b.c);
  return (
    <g>
      <line x1={b.x} x2={b.x} y1={b.h} y2={b.l} stroke={GRAPHITE} strokeWidth={1.4} />
      <rect x={b.x - w / 2} y={top} width={w} height={Math.max(1.5, bot - top)}
        fill={up ? BG : GRAPHITE} stroke={GRAPHITE} strokeWidth={1.4} rx={1} />
    </g>
  );
}

/**
 * Label size in viewBox units. The drawing is 300 units wide and fills the
 * lesson column, which MEASURES 318 px on a 390-px phone (serving 79bb6fd,
 * 2026-10-09; scale 1.06): 10.4 units render at 11 px there — the phone
 * floor. The old 9-unit labels rendered at 9.5 px and the 7.5-unit sub-labels
 * at 8 px. No label may be smaller than this; a label that would not fit at
 * this size is shortened or end-anchored, never shrunk.
 */
export const LABEL_UNITS = 10.4;
/** The lesson column's measured width on a 390-px phone, for the test that pins the floor. */
export const LESSON_COLUMN_PX_AT_390 = 318;

function Territory({ x1, x2, y1, y2, pat, label = "territory", dim = 1 }: { x1: number; x2: number; y1: number; y2: number; pat: string; label?: string | null; dim?: number }) {
  return (
    <g opacity={dim}>
      <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill={`url(#${pat})`} stroke={GOLD} strokeWidth={1} strokeDasharray="4 3" />
      {label ? <text x={x2 - 4} y={(y1 + y2) / 2 + 3} textAnchor="end" fontSize={LABEL_UNITS} fill={GOLD}>{label}</text> : null}
    </g>
  );
}

function T({ x, y, children, a = "start", c = INK, s = LABEL_UNITS }: { x: number; y: number; children: React.ReactNode; a?: "start" | "middle" | "end"; c?: string; s?: number }) {
  return <text x={x} y={y} textAnchor={a} fontSize={s} fill={c}>{children}</text>;
}

function HLine({ x1, x2, y, dash = "2 3", c = GRAPHITE }: { x1: number; x2: number; y: number; dash?: string; c?: string }) {
  return <line x1={x1} x2={x2} y1={y} y2={y} stroke={c} strokeWidth={1} strokeDasharray={dash} />;
}

// The canonical bullish three-bar shape: territory = [high(b1), low(b3)] → y 55..100.
const BULL: Bar[] = [
  { x: 50, h: 100, l: 132, o: 126, c: 106 },
  { x: 80, h: 40, l: 108, o: 102, c: 46 },
  { x: 110, h: 22, l: 55, o: 50, c: 28 },
];
// Mirrored bearish: territory = [high(b3), low(b1)] → y 50..95.
const BEAR: Bar[] = [
  { x: 50, h: 18, l: 50, o: 24, c: 44 },
  { x: 80, h: 42, l: 110, o: 48, c: 104 },
  { x: 110, h: 95, l: 128, o: 100, c: 122 },
];

function Bars({ bars, names = true }: { bars: Bar[]; names?: boolean }) {
  return (
    <g>
      {bars.map((b, i) => <Candle key={i} b={b} />)}
      {names ? bars.map((b, i) => <T key={`n${i}`} x={b.x} y={146} a="middle" c={GRAPHITE}>{`b${i + 1}`}</T>) : null}
    </g>
  );
}

function body(kind: FvgDiagramKind, pat: string): React.ReactNode {
  switch (kind) {
    case "imbalance":
      return (<g>
        <Candle b={{ x: 30, h: 104, l: 128, o: 110, c: 122 }} />
        <Candle b={{ x: 50, h: 102, l: 126, o: 120, c: 108 }} />
        <Bars bars={BULL.map(b => ({ ...b, x: b.x + 20 }))} names={false} />
        <Territory x1={70} x2={290} y1={55} y2={100} pat={pat} label="thinly traded" />
        <T x={20} y={20}>Price crossed fast — one side barely traded here.</T>
      </g>);
    case "three-candle":
      return (<g>
        <Bars bars={BULL} />
        <Territory x1={50} x2={290} y1={55} y2={100} pat={pat} />
        <line x1={124} x2={124} y1={14} y2={140} stroke={GOLD} strokeWidth={1} />
        <T x={128} y={20} c={GOLD}>created at b3 close</T>
        <T x={140} y={118}>compare b1 wick ↔ b3 wick</T>
        <T x={140} y={130} c={GRAPHITE}>b2 = displacement</T>
      </g>);
    case "bullish":
      return (<g>
        <Bars bars={BULL} />
        <Territory x1={50} x2={290} y1={55} y2={100} pat={pat} />
        <T x={130} y={52}>low(b3)</T>
        <T x={130} y={112}>high(b1)</T>
        <T x={180} y={20}>low(b3) &gt; high(b1)</T>
      </g>);
    case "bearish":
      return (<g>
        <Bars bars={BEAR} />
        <Territory x1={50} x2={290} y1={50} y2={95} pat={pat} />
        <T x={130} y={46}>low(b1)</T>
        <T x={130} y={107}>high(b3)</T>
        <T x={180} y={135}>high(b3) &lt; low(b1)</T>
      </g>);
    case "displacement":
      return (<g>
        <Bars bars={BULL} />
        <Territory x1={50} x2={290} y1={55} y2={100} pat={pat} label={null} />
        <path d="M 66 40 L 62 40 L 62 108 L 66 108" fill="none" stroke={GOLD} strokeWidth={1.2} />
        <T x={20} y={20} c={GOLD}>b2 — displacement</T>
        <line x1={250} x2={250} y1={60} y2={95} stroke={INK} strokeWidth={1} />
        <line x1={245} x2={255} y1={60} y2={60} stroke={INK} /><line x1={245} x2={255} y1={95} y2={95} stroke={INK} />
        <T x={244} y={78} a="end">height ≥ floor</T>
        <T x={292} y={130} a="end" c={GRAPHITE}>floor = max(1 tick, 0.10 × ATR14)</T>
      </g>);
    case "touch":
      return (<g>
        <Bars bars={BULL} names={false} />
        <Territory x1={50} x2={290} y1={55} y2={100} pat={pat} label={null} />
        <Candle b={{ x: 160, h: 16, l: 40, o: 34, c: 20 }} />
        <Candle b={{ x: 190, h: 18, l: 48, o: 22, c: 42 }} />
        <Candle b={{ x: 220, h: 36, l: 68, o: 40, c: 50 }} />
        <circle cx={220} cy={68} r={5} fill="none" stroke={GOLD} strokeWidth={1.4} />
        <T x={230} y={86} c={GOLD}>first touch</T>
        <T x={20} y={140} c={GRAPHITE}>a wick to the near edge is enough — no close needed</T>
      </g>);
    case "partial":
    case "full": {
      const reach = kind === "partial" ? 70 : 100;
      return (<g>
        <Bars bars={BULL} names={false} />
        <Territory x1={50} x2={290} y1={55} y2={100} pat={pat} label={null} />
        <HLine x1={50} x2={290} y={77.5} dash="1 3" c={INK} />
        <T x={288} y={74} a="end">50%</T>
        <Candle b={{ x: 180, h: 20, l: reach, o: 30, c: 44 }} />
        <circle cx={180} cy={reach} r={4} fill="none" stroke={GOLD} strokeWidth={1.4} />
        <T x={20} y={140} c={GOLD}>{kind === "partial" ? "reached < 50% of the territory — partial" : "reached the far boundary — full"}</T>
        <T x={196} y={kind === "partial" ? 70 : 112}>{kind === "partial" ? "deepest wick" : "far boundary high(b1)"}</T>
      </g>);
    }
    case "rejection-acceptance":
      return (<g>
        <Territory x1={10} x2={140} y1={55} y2={100} pat={pat} label={null} />
        <Candle b={{ x: 50, h: 30, l: 80, o: 40, c: 60 }} />
        <Candle b={{ x: 75, h: 34, l: 64, o: 58, c: 40 }} />
        <circle cx={75} cy={40} r={4} fill="none" stroke={GOLD} strokeWidth={1.4} />
        <T x={10} y={20} c={GOLD}>REJECTION</T>
        <T x={10} y={124}>closed back outside,</T><T x={10} y={136}>origin side, not full</T>
        <line x1={150} x2={150} y1={10} y2={140} stroke={GRAPHITE} strokeWidth={0.6} />
        <Territory x1={160} x2={290} y1={55} y2={100} pat={pat} label={null} />
        <Candle b={{ x: 200, h: 40, l: 82, o: 46, c: 70 }} />
        <Candle b={{ x: 225, h: 62, l: 92, o: 70, c: 86 }} />
        <circle cx={200} cy={70} r={3} fill={GOLD} /><circle cx={225} cy={86} r={3} fill={GOLD} />
        <T x={160} y={20} c={GOLD}>ACCEPTANCE</T>
        <T x={160} y={124}>2+ consecutive closes</T><T x={160} y={136}>inside the territory</T>
      </g>);
    case "time":
      return (<g>
        <Bars bars={BULL} names={false} />
        <Territory x1={50} x2={290} y1={55} y2={100} pat={pat} label={null} />
        {[140, 160, 180, 200, 220].map(x => <Candle key={x} b={{ x, h: 18, l: 40, o: 34, c: 24 }} w={10} />)}
        <Candle b={{ x: 245, h: 30, l: 64, o: 36, c: 52 }} w={10} />
        <path d="M 110 122 L 110 128 L 245 128 L 245 122" fill="none" stroke={GOLD} strokeWidth={1.2} />
        <T x={178} y={142} a="middle" c={GOLD}>bars from creation to touch</T>
      </g>);
    case "structure":
      return (<g>
        <polyline points="20,110 60,60 90,95 130,70 150,120" fill="none" stroke={GRAPHITE} strokeWidth={1.4} />
        <HLine x1={60} x2={290} y={60} c={INK} />
        <T x={64} y={54}>swing high</T>
        <polyline points="150,120 210,30" fill="none" stroke={INK} strokeWidth={2} />
        <Territory x1={180} x2={290} y1={70} y2={88} pat={pat} label={null} />
        <T x={286} y={22} a="end" c={GOLD}>the leg that broke it</T>
        <T x={286} y={104} a="end" c={GOLD}>territory inside that leg</T>
      </g>);
    case "profile":
      return (<g>
        <Territory x1={20} x2={200} y1={55} y2={100} pat={pat} />
        {[20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130].map((y, i) => {
          const thin = y >= 55 && y <= 100;
          const w = thin ? 8 + (i % 2) * 4 : 30 + ((i * 13) % 40);
          return <rect key={y} x={290 - w} y={y} width={w} height={8} fill={GRAPHITE} opacity={thin ? 0.45 : 0.9} />;
        })}
        <T x={200} y={146} a="end" c={GRAPHITE}>volume by price →</T>
        <T x={20} y={20}>thin rows across the territory</T>
      </g>);
    case "evidence": {
      const rows: [string, string][] = [["FULL", "every print states its side"], ["PARTIAL", "sides inferred — labelled"], ["DEGRADED", "too little — says what is missing"], ["SILENCE", "no sided tape — nothing drawn"]];
      return (<g>
        {rows.map(([k, v], i) => (
          <g key={k}>
            <rect x={20} y={14 + i * 32} width={70} height={24} fill={i === 0 ? GOLD : i === 1 ? `url(#${pat})` : "none"}
              stroke={GOLD} strokeWidth={1} strokeDasharray={i >= 2 ? "3 3" : undefined} opacity={i === 3 ? 0.5 : 1} />
            <T x={55} y={30 + i * 32} a="middle" c={i === 0 ? BG : INK}>{k}</T>
            <T x={100} y={30 + i * 32}>{v}</T>
          </g>
        ))}
      </g>);
    }
    case "trade-through":
      return (<g>
        <Bars bars={BULL} names={false} />
        <Territory x1={50} x2={290} y1={55} y2={100} pat={pat} label={null} />
        <Candle b={{ x: 180, h: 30, l: 124, o: 40, c: 116 }} />
        <path d="M 192 110 l 10 10 m 0 -10 l -10 10" stroke={GOLD} strokeWidth={1.6} />
        <T x={286} y={20} a="end" c={GOLD}>CLOSE beyond the far boundary</T>
        <T x={286} y={32} a="end">= traded through (invalid)</T>
      </g>);
    case "memory":
      return (<g>
        <Territory x1={20} x2={290} y1={20} y2={38} pat={pat} label="fresh · untouched" />
        <Territory x1={20} x2={290} y1={62} y2={80} pat={pat} label="visited 2×" dim={0.65} />
        <Territory x1={20} x2={290} y1={104} y2={122} pat={pat} label="old · other regime" dim={0.35} />
        <T x={20} y={142} c={GRAPHITE}>each territory keeps its own history</T>
      </g>);
    case "statistics":
      return (<g>
        <rect x={10} y={14} width={135} height={110} fill="none" stroke={GRAPHITE} />
        <T x={18} y={30} c={GOLD}>DESCRIPTIVE</T>
        <T x={18} y={50}>"X of N, in this sample"</T>
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1={20 + i * 9} x2={20 + i * 9} y1={68} y2={88} stroke={i < 7 ? INK : GRAPHITE} strokeWidth={1.4} opacity={i < 7 ? 1 : 0.5} />)}
        <T x={18} y={110} c={GRAPHITE}>always show N</T>
        <rect x={155} y={14} width={135} height={110} fill="none" stroke={GOLD} strokeDasharray="4 3" />
        <T x={163} y={30} c={GOLD}>PREDICTIVE?</T>
        <T x={163} y={50}>only if the future</T><T x={163} y={62}>resembles the sample:</T>
        <T x={163} y={80} c={GRAPHITE}>instrument · timeframe</T><T x={163} y={92} c={GRAPHITE}>session · regime · N</T>
      </g>);
    case "risk":
      return (<g>
        <Bars bars={BULL} names={false} />
        <Territory x1={50} x2={290} y1={55} y2={100} pat={pat} label="context" />
        <HLine x1={50} x2={290} y={110} dash="6 3" c={INK} />
        <T x={292} y={124} a="end">invalidation — written before entry</T>
        <T x={130} y={20} c={GOLD}>context ≠ permission</T>
      </g>);
    case "patience":
      return (<g>
        <Territory x1={20} x2={290} y1={100} y2={124} pat={pat} label={null} />
        {[40, 70, 100, 130, 160, 190, 220].map((x, i) => <Candle key={x} b={{ x, h: 26 + (i % 3) * 4, l: 52 + (i % 2) * 6, o: 34, c: 46 - (i % 2) * 6 }} w={10} />)}
        <circle cx={262} cy={40} r={14} fill="none" stroke={GOLD} strokeWidth={1.2} />
        <line x1={262} x2={262} y1={40} y2={30} stroke={GOLD} /><line x1={262} x2={270} y1={40} y2={44} stroke={GOLD} />
        <T x={20} y={90}>wait for the plan's conditions — with an end</T>
      </g>);
    case "management": {
      const lines: [number, string, string][] = [[30, "target (plan)", "6 3"], [70, "entry", "0"], [110, "invalidation (plan)", "2 3"]];
      return (<g>
        {lines.map(([y, t, d]) => (<g key={t}><HLine x1={20} x2={196} y={y} dash={d} c={t === "entry" ? INK : GOLD} /><T x={202} y={y + 3}>{t}</T></g>))}
        <line x1={170} x2={170} y1={18} y2={122} stroke={GRAPHITE} strokeDasharray="1 3" />
        <T x={166} y={16} a="end" c={GRAPHITE}>time limit</T>
        <T x={20} y={140} c={GOLD}>the plan decides — never "just hold"</T>
      </g>);
    }
    case "psychology":
      return (<g>
        <rect x={20} y={40} width={110} height={44} fill="none" stroke={INK} />
        <T x={75} y={60} a="middle">EVIDENCE</T><T x={75} y={74} a="middle" c={GRAPHITE}>closes · sides · N</T>
        <line x1={134} x2={166} y1={62} y2={62} stroke={GOLD} strokeWidth={1.4} />
        <path d="M 160 57 L 167 62 L 160 67" fill="none" stroke={GOLD} strokeWidth={1.4} />
        <rect x={170} y={40} width={110} height={44} fill="none" stroke={GOLD} strokeDasharray="4 3" />
        <T x={225} y={66} a="middle" c={GOLD}>LABEL</T>
        <T x={20} y={120}>first what happened — then, maybe, a name</T>
        <T x={20} y={134} c={GRAPHITE}>no mind-reading: prints, never intent</T>
      </g>);
    case "edge":
      return (<g>
        {[["JOURNAL", "reference a gap"], ["REVIEW", "market · session"], ["KEEP", "what N supports"]].map(([a, b], i) => (
          <g key={a}>
            <rect x={14 + i * 96} y={44} width={84} height={44} fill="none" stroke={i === 2 ? GOLD : INK} strokeDasharray={i === 2 ? "4 3" : undefined} />
            <T x={56 + i * 96} y={62} a="middle" c={i === 2 ? GOLD : INK}>{a}</T>
            <T x={56 + i * 96} y={78} a="middle" c={GRAPHITE}>{b}</T>
            {i < 2 ? <path d={`M ${100 + i * 96} 66 l 8 0 m -4 -4 l 4 4 l -4 4`} fill="none" stroke={GOLD} /> : null}
          </g>
        ))}
        <T x={14} y={124}>your journal, your markets — not a course's claim</T>
      </g>);
  }
}

export function FvgDiagram({ kind, title }: { kind: FvgDiagramKind; title: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const pat = `fvg-hatch-${uid}`;
  // Text alternative (accessibility pass): the drawing in words, bullish / bearish named.
  return (
    <svg viewBox="0 0 300 150" role="img" aria-labelledby={`fvg-dt-${uid}`} aria-describedby={`fvg-dd-${uid}`}
      data-testid="fvg-diagram" data-fvg-diagram={kind}
      style={{ width: "100%", maxWidth: 520, height: "auto", display: "block", background: BG, borderRadius: 10, border: "1px solid rgba(139,106,41,0.25)" }}>
      <title id={`fvg-dt-${uid}`}>{`Schematic: ${title}`}</title>
      <desc id={`fvg-dd-${uid}`}>{fvgDiagramAlt(kind, title)}</desc>
      <defs>
        <pattern id={pat} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
          <rect width={6} height={6} fill="rgba(201,165,92,0.08)" />
          <line x1={0} y1={0} x2={0} y2={6} stroke={GOLD} strokeWidth={1} opacity={0.45} />
        </pattern>
      </defs>
      {body(kind, pat)}
    </svg>
  );
}
