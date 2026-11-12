/**
 * THE SQUABBLE — a 15-minute fight in three 5-minute rounds, read from the SIGNED TAPE
 * (Founder 2026-11-05 09:29: "show the squabble, like the punches … animate it but it's real data";
 * 09:34: "pump, pump … flip"; 09:45: "bells and like maybe announcers").
 *
 *   FIGHT     the current 15-minute clock window (:00 / :15 / :30 / :45)
 *   ROUND     each 5-minute third of it (R1 · R2 · R3)
 *   EXCHANGE  each minute inside a round
 *   PUNCH     each 15-second bucket of prints: its side is the aggressor that out-traded the other
 *             in that bucket, its strength is |net aggressor size| against the fight's biggest punch.
 *
 * Round words, each one a measured fact of that round's prints — never a forecast:
 *   PUMP      buyers out-traded sellers and price rose
 *   DUMP      sellers out-traded buyers and price fell at least the fight's typical punch range × 3
 *   DRAG      sellers out-traded buyers and price fell, but slowly
 *   FLIP      the minute moves changed direction with the aggressor (one side took the round back)
 *   ABSORBED  one side out-traded the other and price went the OTHER way (effort without result)
 *   CLINCH    price barely moved
 *   HAYMAKER  one 15-second punch moved price ≥ 3× the fight's median punch move, in the punch's own direction
 *   NO TAPE   the round began before the tape this page heard (never guessed)
 *
 * PURE. DETERMINISTIC (given nowMs). No fetch, no storage, no React.
 */

export interface SquabblePrint {
  /** Epoch ms. */
  readonly time: number;
  readonly price: number;
  readonly size: number;
  readonly side: "buy" | "sell";
}

export type PunchSide = "BUY" | "SELL";
export type RoundWord = "PUMP" | "DUMP" | "DRAG" | "FLIP" | "ABSORBED" | "CLINCH" | "HAYMAKER" | "NO_TAPE" | "WAITING";

export interface SquabblePunch {
  /** Bucket start, epoch ms (15 s buckets). */
  readonly t0: number;
  /** Index 0–59 inside the fight. */
  readonly slot: number;
  readonly side: PunchSide;
  /** Buy size − sell size in the bucket. */
  readonly net: number;
  /** Last price − first price in the bucket. */
  readonly move: number;
  /** |net| / the fight's biggest |net| (0–1]. */
  readonly strength: number;
  readonly prints: number;
  readonly haymaker: boolean;
  /** The bucket's last price (where the punch landed). */
  readonly price: number;
}

export interface SquabbleRound {
  readonly n: 1 | 2 | 3;
  readonly startMs: number;
  readonly endMs: number;
  readonly punches: readonly SquabblePunch[];
  readonly buy: number;
  readonly sell: number;
  readonly move: number | null;
  readonly word: RoundWord;
  /** Which side the haymaker (if any) came from. */
  readonly haymakerSide: PunchSide | null;
  /** Who took the round: the side price travelled for (EVEN in a clinch); null while live or before it starts. */
  readonly winner: "BULLS" | "BEARS" | "EVEN" | null;
  readonly live: boolean;
  /** True while the round is still ahead of the clock. */
  readonly future: boolean;
}

export interface SquabbleFight {
  readonly reason: "DRAWN" | "NO_SIGNED_TAPE" | "NO_PRINTS_THIS_FIGHT";
  readonly fightStartMs: number;
  readonly fightEndMs: number;
  readonly rounds: readonly SquabbleRound[];
  /** Rounds won so far. */
  readonly score: { readonly bulls: number; readonly bears: number };
  /** The first print this page heard (the tape's honest start). */
  readonly tapeFromMs: number | null;
  /** The live round (1–3). */
  readonly liveRound: 1 | 2 | 3;
  /** The live punch slot 0–59. */
  readonly liveSlot: number;
  readonly haymakers: number;
}

export const FIGHT_MS = 15 * 60_000;
export const ROUND_MS = 5 * 60_000;
export const PUNCH_MS = 15_000;
export const SLOTS_PER_ROUND = ROUND_MS / PUNCH_MS; // 20
export const HAYMAKER_X = 3;
/** A round whose |move| is under this share of the fight's median punch move × slots is a CLINCH. */
const CLINCH_SHARE = 1;

const median = (xs: readonly number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function fightWindow(nowMs: number): { start: number; end: number } {
  const start = Math.floor(nowMs / FIGHT_MS) * FIGHT_MS;
  return { start, end: start + FIGHT_MS };
}

export function selectSquabble(prints: readonly SquabblePrint[], nowMs: number, opts?: { signedTape?: boolean }): SquabbleFight {
  const { start, end } = fightWindow(nowMs);
  const liveSlot = Math.max(0, Math.min(59, Math.floor((nowMs - start) / PUNCH_MS)));
  const liveRound = (Math.min(2, Math.floor((nowMs - start) / ROUND_MS)) + 1) as 1 | 2 | 3;
  const empty = (reason: SquabbleFight["reason"], tapeFromMs: number | null): SquabbleFight => ({
    reason, fightStartMs: start, fightEndMs: end, rounds: [], score: { bulls: 0, bears: 0 }, tapeFromMs, liveRound, liveSlot, haymakers: 0,
  });
  if (opts?.signedTape === false) return empty("NO_SIGNED_TAPE", null);
  let tapeFromMs: number | null = null;
  for (const p of prints) if (Number.isFinite(p.time) && (tapeFromMs == null || p.time < tapeFromMs)) tapeFromMs = p.time;
  const inFight = prints.filter(p => p.time >= start && p.time < end && p.time <= nowMs && p.size > 0 && Number.isFinite(p.price));
  if (!inFight.length) return empty("NO_PRINTS_THIS_FIGHT", tapeFromMs);

  // ── PUNCHES: 60 buckets of 15 s ──
  type B = { buy: number; sell: number; first: number; last: number; firstT: number; lastT: number; n: number };
  const buckets: (B | null)[] = Array.from({ length: 60 }, () => null);
  for (const p of [...inFight].sort((a, b) => a.time - b.time)) {
    const k = Math.min(59, Math.floor((p.time - start) / PUNCH_MS));
    const b = buckets[k] ?? (buckets[k] = { buy: 0, sell: 0, first: p.price, last: p.price, firstT: p.time, lastT: p.time, n: 0 });
    if (p.side === "buy") b.buy += p.size; else b.sell += p.size;
    if (p.time < b.firstT) { b.firstT = p.time; b.first = p.price; }
    if (p.time >= b.lastT) { b.lastT = p.time; b.last = p.price; }
    b.n++;
  }
  // A bucket's move runs from the previous bucket's last price when one exists (a punch is the change it made).
  let prevLast: number | null = null;
  const raw: { k: number; b: B; net: number; move: number }[] = [];
  buckets.forEach((b, k) => {
    if (!b) return;
    const from = prevLast ?? b.first;
    raw.push({ k, b, net: b.buy - b.sell, move: b.last - from });
    prevLast = b.last;
  });
  const maxNet = Math.max(...raw.map(r => Math.abs(r.net)), 0);
  const medMove = median(raw.map(r => Math.abs(r.move)).filter(m => m > 0));
  const punches: SquabblePunch[] = raw.filter(r => r.net !== 0).map(r => {
    const side: PunchSide = r.net > 0 ? "BUY" : "SELL";
    const haymaker = raw.length >= 6 && medMove > 0 && Math.abs(r.move) >= HAYMAKER_X * medMove && Math.sign(r.move) === Math.sign(r.net);
    return { t0: start + r.k * PUNCH_MS, slot: r.k, side, net: r.net, move: r.move, strength: maxNet > 0 ? Math.abs(r.net) / maxNet : 0, prints: r.b.n, haymaker, price: r.b.last };
  });

  // ── ROUNDS ──
  const rounds: SquabbleRound[] = ([1, 2, 3] as const).map(n => {
    const rs = start + (n - 1) * ROUND_MS, re = rs + ROUND_MS;
    const future = nowMs < rs;
    const live = nowMs >= rs && nowMs < re;
    const ps = punches.filter(p => p.t0 >= rs && p.t0 < re);
    const rb = raw.filter(r => start + r.k * PUNCH_MS >= rs && start + r.k * PUNCH_MS < re);
    const buy = rb.reduce((s, r) => s + r.b.buy, 0), sell = rb.reduce((s, r) => s + r.b.sell, 0);
    const base = { n, startMs: rs, endMs: re, punches: ps, buy, sell, live, future };
    if (future) return { ...base, move: null, word: "WAITING" as RoundWord, haymakerSide: null, winner: null };
    if (tapeFromMs != null && tapeFromMs > rs + PUNCH_MS) return { ...base, move: null, word: "NO_TAPE" as RoundWord, haymakerSide: null, winner: null };
    if (!rb.length) return { ...base, move: null, word: (live ? "WAITING" : "CLINCH") as RoundWord, haymakerSide: null, winner: live ? null : "EVEN" as const };
    // The round's move: its last price against the price it opened at (the bucket before it, else its own first).
    const before = raw.filter(r => start + r.k * PUNCH_MS < rs).at(-1);
    const open = before ? before.b.last : rb[0].b.first;
    const move = rb[rb.length - 1].b.last - open;
    const net = buy - sell;
    const hay = ps.filter(p => p.haymaker).sort((a, b) => Math.abs(b.move) - Math.abs(a.move))[0] ?? null;
    // Minute exchanges: the direction of each minute's move.
    const minuteMoves: number[] = [];
    for (let m = 0; m < 5; m++) {
      const mb = rb.filter(r => { const t = start + r.k * PUNCH_MS; return t >= rs + m * 60_000 && t < rs + (m + 1) * 60_000; });
      if (mb.length) minuteMoves.push(mb.reduce((s, r) => s + r.move, 0));
    }
    const signs = minuteMoves.filter(v => Math.abs(v) > medMove).map(Math.sign);
    let flips = 0;
    for (let i = 1; i < signs.length; i++) if (signs[i] !== signs[i - 1]) flips++;
    const clinchBand = medMove * CLINCH_SHARE * 2;
    let word: RoundWord;
    if (hay) word = "HAYMAKER";
    else if (Math.abs(move) <= clinchBand) word = "CLINCH";
    else if (flips >= 1 && signs.length >= 3 && Math.sign(signs[signs.length - 1]) !== Math.sign(signs[0])) word = "FLIP";
    else if (net > 0 && move > 0) word = "PUMP";
    else if (net < 0 && move < 0) word = Math.abs(move) >= medMove * HAYMAKER_X * 2 ? "DUMP" : "DRAG";
    else if (net !== 0 && Math.sign(net) !== Math.sign(move)) word = "ABSORBED";
    else word = move > 0 ? "PUMP" : "DRAG";
    // Price is the scorecard: the side price travelled for took the round (an absorbed push loses it).
    const winner = Math.abs(move) <= clinchBand ? "EVEN" as const : move > 0 ? "BULLS" as const : "BEARS" as const;
    return { ...base, move, word, haymakerSide: hay ? hay.side : null, winner: live ? null : winner };
  });
  const score = {
    bulls: rounds.filter(r => r.winner === "BULLS").length,
    bears: rounds.filter(r => r.winner === "BEARS").length,
  };
  return { reason: "DRAWN", fightStartMs: start, fightEndMs: end, rounds, score, tapeFromMs, liveRound, liveSlot, haymakers: punches.filter(p => p.haymaker).length };
}

/** The word a round prints on the glass. */
export function roundWordShown(r: SquabbleRound): string {
  if (r.word === "HAYMAKER") return `HAYMAKER ${r.haymakerSide === "BUY" ? "↑" : "↓"}`;
  if (r.word === "NO_TAPE") return "NO TAPE";
  if (r.word === "WAITING") return r.live ? "LIVE" : "—";
  return r.word;
}

/** The receipt: "DRAWN|R1:PUMP|R2:FLIP|R3:LIVE|SCORE:1-0|HAY:1|PUNCHES:37". */
export function squabbleReceipt(f: SquabbleFight): string {
  if (f.reason !== "DRAWN") return f.reason;
  return `DRAWN|${f.rounds.map(r => `R${r.n}:${r.word}`).join("|")}|SCORE:${f.score.bulls}-${f.score.bears}|HAY:${f.haymakers}|PUNCHES:${f.rounds.reduce((s, r) => s + r.punches.length, 0)}`;
}
