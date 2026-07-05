/**
 * Pine Script v6 Interpreter (v5 compatible)
 * Evaluates a Pine Script string against OHLCV bar data.
 * Returns PlotOutput, HLineOutput, PlotShapeOutput, BgColorOutput for chart rendering.
 *
 * Supported:
 *  - Variable declarations (var, float, int, bool, string, color, series)
 *  - Arithmetic, comparison, logical, ternary operators
 *  - Series indexing: close[1], sma(close,20)[2]
 *  - ta.* namespace (sma, ema, rsi, macd, bb, stoch, atr, etc.)
 *  - math.* namespace
 *  - input.* (returns literal defaults for preview)
 *  - plot(), plotshape(), plotarrow(), bgcolor(), hline()
 *  - if/else blocks
 *  - Basic for loops
 *  - Comments (//, /* *\/)
 */

import { OHLCVBar, PineOutput, PlotOutput, PlotShapeOutput, HLineOutput, BgColorOutput } from "./types";
import { ta, mathFns, colorFromPine, nz } from "./builtins";

const DEFAULT_COLORS = ["#4FA3E0","#00D4AA","#FF4D6A","#F0B429","#8B5CF6","#F97316","#E8EDF3"];

interface ExecContext {
  // Built-in series
  open:   number[];
  high:   number[];
  low:    number[];
  close:  number[];
  volume: number[];
  hl2:    number[];
  hlc3:   number[];
  ohlc4:  number[];
  // User variables (scalar or series array)
  vars:   Map<string, any>;
  // Outputs
  plots:    PlotOutput[];
  shapes:   PlotShapeOutput[];
  hlines:   HLineOutput[];
  bgColors: BgColorOutput[];
  plotCount: number;
  overlay:   boolean;
  title:     string;
  shortTitle:string;
  errors:   { line: number; msg: string }[];
}

/* ── Strip comments ────────────────────────────────────────── */
function stripComments(src: string): string {
  // Block comments
  src = src.replace(/\/\*[\s\S]*?\*\//g, match => "\n".repeat((match.match(/\n/g) || []).length));
  // Line comments
  src = src.replace(/\/\/[^\n]*/g, "");
  return src;
}

/* ── Pre-process: evaluate inputs ─────────────────────────── */
function processInputs(src: string): { src: string; params: Record<string, any> } {
  const params: Record<string, any> = {};
  // Replace input.* (and bare input(...)) calls with their default value.
  // The default is either the `defval=` named arg or the FIRST positional arg.
  // We scan for the call head, then consume a balanced-parenthesis argument
  // list so multi-arg inputs (with commas, nested calls, strings) are handled
  // correctly — the previous regex greedily swallowed the args and defaulted
  // every numeric input to 14, collapsing distinct lengths (e.g. fast/slow).
  let out = "";
  let i = 0;
  const n = src.length;
  const headRe = /(?:input\s*\.\s*(\w+)|input)\s*\(/y;
  while (i < n) {
    headRe.lastIndex = i;
    const m = headRe.exec(src);
    if (m && m.index === i) {
      const type = m[1] || "generic";
      // Find matching close paren for the "(" at end of match
      let depth = 1, j = headRe.lastIndex;
      for (; j < n && depth > 0; j++) {
        const c = src[j];
        if (c === "(") depth++;
        else if (c === ")") depth--;
        else if (c === '"' || c === "'") { const q = c; j++; while (j < n && src[j] !== q) { if (src[j] === "\\") j++; j++; } }
      }
      const inner = src.slice(headRe.lastIndex, j - 1);
      // Split top-level args
      const args: string[] = [];
      let cur = "", d = 0;
      for (let k = 0; k < inner.length; k++) {
        const c = inner[k];
        if (c === "(" || c === "[" || c === "{") { d++; cur += c; }
        else if (c === ")" || c === "]" || c === "}") { d--; cur += c; }
        else if (c === '"' || c === "'") { const q = c; cur += c; k++; while (k < inner.length && inner[k] !== q) { cur += inner[k]; if (inner[k] === "\\") { k++; cur += inner[k]; } k++; } cur += (inner[k] ?? ""); }
        else if (c === "," && d === 0) { args.push(cur); cur = ""; }
        else cur += c;
      }
      if (cur.trim()) args.push(cur);
      // defval= named, else first positional
      let def = "";
      const named = args.find(a => /^\s*defval\s*=/.test(a));
      if (named) def = named.replace(/^\s*defval\s*=/, "").trim();
      else if (args.length) def = args[0].trim();
      let repl: string;
      if (type === "float" || type === "int") repl = def || "14";
      else if (type === "bool") repl = def || "true";
      else if (type === "string" || type === "source") repl = def || '"input"';
      else if (type === "color") repl = def || "color.blue";
      else repl = def || "0";
      out += repl;
      i = j;
      continue;
    }
    out += src[i++];
  }
  return { src: out, params };
}

/* ── Tokenize an expression ─────────────────────────────────── */
type Tok = { t: string; v: string };

function tokenizeExpr(expr: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    // Skip whitespace
    if (/\s/.test(expr[i])) { i++; continue; }
    // String literal
    if (expr[i] === '"' || expr[i] === "'") {
      const q = expr[i++]; let s = "";
      while (i < expr.length && expr[i] !== q) s += expr[i++];
      i++;
      tokens.push({ t: "str", v: s });
      continue;
    }
    // Number
    if (/\d/.test(expr[i]) || (expr[i] === "." && /\d/.test(expr[i+1] || ""))) {
      let n = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) n += expr[i++];
      if (expr[i] === "e" || expr[i] === "E") {
        n += expr[i++];
        if (expr[i] === "+" || expr[i] === "-") n += expr[i++];
        while (i < expr.length && /\d/.test(expr[i])) n += expr[i++];
      }
      tokens.push({ t: "num", v: n });
      continue;
    }
    // Two-char operators
    const two = expr.slice(i, i + 2);
    if ([":=", "==", "!=", "<=", ">=", "=>"].includes(two)) {
      tokens.push({ t: "op", v: two }); i += 2; continue;
    }
    // Single-char operators
    if ("+-*/%<>=!?:.,()[]{}".includes(expr[i])) {
      tokens.push({ t: "op", v: expr[i++] }); continue;
    }
    // Identifier / keyword
    if (/[a-zA-Z_]/.test(expr[i])) {
      let id = "";
      while (i < expr.length && /[\w]/.test(expr[i])) id += expr[i++];
      // Allow dotted names: ta.sma, color.green, etc.
      while (i < expr.length && expr[i] === "." && /[\w]/.test(expr[i+1] || "")) {
        id += expr[i++];
        while (i < expr.length && /[\w]/.test(expr[i])) id += expr[i++];
      }
      tokens.push({ t: "id", v: id });
      continue;
    }
    i++;
  }
  return tokens;
}

/* ── Eval a single expression string ────────────────────────── */
function evalExpr(expr: string, ctx: ExecContext, barIdx: number): any {
  expr = expr.trim();
  if (!expr) return null;

  try {
    return evalTokens(tokenizeExpr(expr), ctx, barIdx);
  } catch {
    return null;
  }
}

function evalTokens(tokens: Tok[], ctx: ExecContext, barIdx: number): any {
  if (!tokens.length) return null;
  // Parse ternary
  const qIdx = findOp(tokens, ["?"]);
  if (qIdx !== -1) {
    const cIdx = findOpAfter(tokens, [":"], qIdx + 1);
    const cond = evalTokens(tokens.slice(0, qIdx), ctx, barIdx);
    const a    = evalTokens(tokens.slice(qIdx + 1, cIdx), ctx, barIdx);
    const b    = evalTokens(tokens.slice(cIdx + 1), ctx, barIdx);
    return cond ? a : b;
  }
  // Boolean or/and
  const orIdx  = findOp(tokens, ["or"]);
  if (orIdx  !== -1) return !!evalTokens(tokens.slice(0, orIdx),  ctx, barIdx) || !!evalTokens(tokens.slice(orIdx + 1),  ctx, barIdx);
  const andIdx = findOp(tokens, ["and"]);
  if (andIdx !== -1) return !!evalTokens(tokens.slice(0, andIdx), ctx, barIdx) && !!evalTokens(tokens.slice(andIdx + 1), ctx, barIdx);
  // Comparison
  for (const op of ["==","!=","<=",">=","<",">"]) {
    const idx = findOp(tokens, [op]);
    if (idx !== -1) {
      const l = evalTokens(tokens.slice(0, idx), ctx, barIdx);
      const r = evalTokens(tokens.slice(idx + 1), ctx, barIdx);
      if (op === "==") return l === r;
      if (op === "!=") return l !== r;
      if (op === "<=") return l <= r;
      if (op === ">=") return l >= r;
      if (op === "<")  return l < r;
      if (op === ">")  return l > r;
    }
  }
  // Addition/subtraction (right-to-left to get lowest precedence on right)
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].t === "op" && (tokens[i].v === "+" || tokens[i].v === "-") && i > 0) {
      // Check it's not unary
      const prev = tokens[i - 1];
      if (prev.t !== "op" || prev.v === ")" || prev.v === "]") {
        const l = evalTokens(tokens.slice(0, i), ctx, barIdx);
        const r = evalTokens(tokens.slice(i + 1), ctx, barIdx);
        return tokens[i].v === "+" ? l + r : l - r;
      }
    }
  }
  // Multiply/divide/modulo
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i].t === "op" && (tokens[i].v === "*" || tokens[i].v === "/" || tokens[i].v === "%") && i > 0) {
      const prev = tokens[i - 1];
      if (prev.t !== "op" || prev.v === ")" || prev.v === "]") {
        const l = evalTokens(tokens.slice(0, i), ctx, barIdx);
        const r = evalTokens(tokens.slice(i + 1), ctx, barIdx);
        if (tokens[i].v === "*") return l * r;
        if (tokens[i].v === "/") return r === 0 ? NaN : l / r;
        return l % r;
      }
    }
  }
  // Power
  const powIdx = findOp(tokens, ["^"]);
  if (powIdx !== -1) return Math.pow(evalTokens(tokens.slice(0, powIdx), ctx, barIdx), evalTokens(tokens.slice(powIdx + 1), ctx, barIdx));
  // Unary not/minus
  if (tokens[0].v === "not" || tokens[0].v === "!") return !evalTokens(tokens.slice(1), ctx, barIdx);
  if (tokens[0].v === "-" && tokens.length > 1) return -evalTokens(tokens.slice(1), ctx, barIdx);
  // Parentheses
  if (tokens[0].v === "(" && tokens[tokens.length - 1].v === ")") {
    return evalTokens(tokens.slice(1, -1), ctx, barIdx);
  }
  // Series index access: expr[n]
  if (tokens[tokens.length - 1].v === "]") {
    const closeB = tokens.length - 1;
    const openB  = findMatchingOpen(tokens, closeB, "[", "]");
    const offset = Number(evalTokens(tokens.slice(openB + 1, closeB), ctx, barIdx));
    const baseToks = tokens.slice(0, openB);
    let base: any = evalTokens(baseToks, ctx, barIdx);
    // History access like close[1], high[2], dir[1] needs the FULL series, but a
    // bare identifier evaluates to a scalar at barIdx. Resolve the array so
    // offsets into prior bars work (otherwise `[n]` always returned null and
    // silently broke FVG/transition/state-machine scripts).
    if (!Array.isArray(base) && baseToks.length === 1 && baseToks[0].t === "id") {
      const full = getFullSeries(baseToks[0].v, ctx);
      if (full.length) base = full;
    }
    if (Array.isArray(base)) {
      const idx = barIdx - offset;
      return idx >= 0 ? (base[idx] ?? null) : null;
    }
    return null;
  }
  // Function call: name(args...)
  if (tokens[tokens.length - 1].v === ")") {
    const closeP = tokens.length - 1;
    const openP  = findMatchingOpen(tokens, closeP, "(", ")");
    const fnName = tokens.slice(0, openP).map(t => t.v).join("");
    const argTokens = splitArgs(tokens.slice(openP + 1, closeP));
    const args = argTokens.map(a => evalTokens(a, ctx, barIdx));
    return callFunction(fnName, args, ctx, barIdx, argTokens);
  }
  // Single token
  if (tokens.length === 1) {
    const tok = tokens[0];
    if (tok.t === "num")  return parseFloat(tok.v);
    if (tok.t === "str")  return tok.v;
    if (tok.v === "true")  return true;
    if (tok.v === "false") return false;
    if (tok.v === "na")    return null;
    // Built-in series
    const seriesMap: Record<string, number[]> = {
      open: ctx.open, high: ctx.high, low: ctx.low, close: ctx.close,
      volume: ctx.volume, hl2: ctx.hl2, hlc3: ctx.hlc3, ohlc4: ctx.ohlc4,
    };
    if (tok.v in seriesMap) return seriesMap[tok.v][barIdx] ?? null;
    // Built-in scalars
    if (tok.v === "bar_index") return barIdx;
    if (tok.v === "bar_count") return ctx.close.length;
    // Math constants
    if (tok.v === "math.pi")  return Math.PI;
    if (tok.v === "math.e")   return Math.E;
    if (tok.v === "math.phi") return 1.618033988749895;
    // Color constants
    if (tok.v.startsWith("color.")) return colorFromPine(tok.v);
    // User variable
    const varVal = ctx.vars.get(tok.v);
    if (varVal !== undefined) {
      if (Array.isArray(varVal)) return varVal[barIdx] ?? null;
      return varVal;
    }
    return null;
  }
  return null;
}

function findOp(tokens: Tok[], ops: string[]): number {
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const v = tokens[i].v;
    if (v === "(" || v === "[" || v === "{") depth++;
    if (v === ")" || v === "]" || v === "}") depth--;
    if (depth === 0 && tokens[i].t === "op" && ops.includes(v)) return i;
    if (depth === 0 && tokens[i].t === "id" && ops.includes(v)) return i;
  }
  return -1;
}

function findOpAfter(tokens: Tok[], ops: string[], start: number): number {
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    const v = tokens[i].v;
    if (v === "(" || v === "[" || v === "{") depth++;
    if (v === ")" || v === "]" || v === "}") depth--;
    if (depth === 0 && tokens[i].t === "op" && ops.includes(v)) return i;
  }
  return tokens.length - 1;
}

function findMatchingOpen(tokens: Tok[], closeIdx: number, open: string, close: string): number {
  let depth = 0;
  for (let i = closeIdx; i >= 0; i--) {
    if (tokens[i].v === close) depth++;
    if (tokens[i].v === open)  depth--;
    if (depth === 0) return i;
  }
  return 0;
}

function splitArgs(tokens: Tok[]): Tok[][] {
  const args: Tok[][] = [];
  let current: Tok[] = [];
  let depth = 0;
  for (const tok of tokens) {
    if (tok.v === "(" || tok.v === "[") depth++;
    if (tok.v === ")" || tok.v === "]") depth--;
    if (tok.v === "," && depth === 0) { args.push(current); current = []; }
    else current.push(tok);
  }
  if (current.length) args.push(current);
  return args;
}

/* ── Function dispatch ─────────────────────────────────────── */
function getFullSeries(name: string, ctx: ExecContext): (number | null)[] {
  const seriesMap: Record<string, (number | null)[]> = {
    open: ctx.open, high: ctx.high, low: ctx.low, close: ctx.close,
    volume: ctx.volume, hl2: ctx.hl2, hlc3: ctx.hlc3, ohlc4: ctx.ohlc4,
  };
  if (name in seriesMap) return seriesMap[name];
  const v = ctx.vars.get(name);
  if (Array.isArray(v)) return v;
  return [];
}

function callFunction(name: string, args: any[], ctx: ExecContext, barIdx: number, argTokens?: Tok[][]): any {
  // Series-aware resolver: when an argument is a single identifier that names a
  // built-in series (close/high/…) or a user series-variable, return its FULL
  // array rather than the scalar value at barIdx. This is CRITICAL: bare tokens
  // like `close` evaluate to a scalar at barIdx, so without this every TA source
  // (ta.ema/ta.sma/ta.rsi/ta.macd/…) would compute on a constant-filled array
  // and return ≈ the source value — making all lengths identical and cross
  // signals never fire. Falls back to the constant-filled array (safe for
  // scalar/expression sources) so numeric length positions are never corrupted.
  const seriesArg = (idx: number): (number | null)[] => {
    const at = argTokens?.[idx];
    if (at && at.length === 1 && at[0].t === "id") {
      const full = getFullSeries(at[0].v, ctx);
      if (full.length) return full;
    }
    const a = args[idx];
    return Array.isArray(a) ? a : Array(barIdx + 1).fill(a);
  };
  const seriesTok = seriesArg;
  const numArg = (idx: number, def = 14): number => {
    const a = args[idx];
    return a == null ? def : Number(a);
  };

  switch (name) {
    // Cached TA calls (compute on full series, cache result, return value at barIdx)
    case "ta.sma": case "sma": {
      const key = `ta.sma_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.sma(seriesArg(0), numArg(1)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.ema": case "ema": {
      const key = `ta.ema_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.ema(seriesArg(0), numArg(1)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.wma": case "wma": {
      const key = `ta.wma_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.wma(seriesArg(0), numArg(1)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.hma": case "hma": {
      const key = `ta.hma_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.hma(seriesArg(0), numArg(1)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.rma": case "rma": {
      const key = `ta.rma_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.rma(seriesArg(0), numArg(1)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.rsi": case "rsi": {
      const key = `ta.rsi_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.rsi(seriesArg(0), numArg(1)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.dema": case "dema": {
      const key = `ta.dema_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.dema(seriesArg(0), numArg(1)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.tema": case "tema": {
      const key = `ta.tema_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.tema(seriesArg(0), numArg(1)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.wpr": case "ta.williamsr": case "wpr": {
      const key = `ta.wpr_${args[0]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.williamsr(ctx.close, ctx.high, ctx.low, numArg(0)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    // ── Tuple-returning functions (support both destructuring and direct use) ──
    case "ta.macd": case "macd": {
      const key = `ta.macd_${args[0]}_${args[1]}_${args[2]}_${args[3]}`;
      if (!ctx.vars.has(key)) {
        const r = ta.macd(seriesArg(0), numArg(1, 12), numArg(2, 26), numArg(3, 9));
        ctx.vars.set(key, { __pineTuple: [r.macd, r.signal, r.histogram] });
      }
      return ctx.vars.get(key);
    }
    case "ta.bb": case "bb": {
      const key = `ta.bb_${args[0]}_${args[1]}_${args[2]}`;
      if (!ctx.vars.has(key)) {
        const r = ta.bb(seriesArg(0), numArg(1, 20), numArg(2, 2));
        // Pine order: [middle, upper, lower]
        ctx.vars.set(key, { __pineTuple: [r.middle, r.upper, r.lower] });
      }
      return ctx.vars.get(key);
    }
    case "ta.kc": case "ta.keltner": case "kc": {
      const key = `ta.kc_${args[0]}_${args[1]}_${args[2]}`;
      if (!ctx.vars.has(key)) {
        const r = ta.keltner(ctx.close, ctx.high, ctx.low, numArg(1, 20), numArg(2, 2));
        ctx.vars.set(key, { __pineTuple: [r.middle, r.upper, r.lower] });
      }
      return ctx.vars.get(key);
    }
    case "ta.stoch": case "stoch": {
      // Pine ta.stoch returns a single %K float
      const key = `ta.stoch_${args[3] ?? 14}`;
      if (!ctx.vars.has(key)) {
        const r = ta.stoch(ctx.close, ctx.high, ctx.low, numArg(3, 14), 3);
        ctx.vars.set(key, r.k);
      }
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.supertrend": case "supertrend": {
      const key = `ta.supertrend_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) {
        const r = ta.supertrend(ctx.close, ctx.high, ctx.low, numArg(0, 3), numArg(1, 10));
        ctx.vars.set(key, { __pineTuple: [r.trend, r.direction] });
      }
      return ctx.vars.get(key);
    }
    case "ta.atr": case "atr": {
      const key = `ta.atr_${args[0]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.atr(ctx.close, ctx.high, ctx.low, numArg(0)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.cci": case "cci": {
      const key = `ta.cci_${args[0]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.cci(ctx.close, ctx.high, ctx.low, numArg(0)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.mfi": case "mfi": {
      const key = `ta.mfi_${args[0]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.mfi(ctx.close, ctx.high, ctx.low, ctx.volume, numArg(0)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.vwap": case "vwap": {
      if (!ctx.vars.has("ta.vwap")) ctx.vars.set("ta.vwap", ta.vwap(ctx.close, ctx.high, ctx.low, ctx.volume));
      return ctx.vars.get("ta.vwap")[barIdx] ?? null;
    }
    case "ta.obv": case "obv": {
      if (!ctx.vars.has("ta.obv")) ctx.vars.set("ta.obv", ta.obv(ctx.close, ctx.volume));
      return ctx.vars.get("ta.obv")[barIdx] ?? null;
    }
    case "ta.roc": case "roc": {
      const key = `ta.roc_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.roc(seriesArg(0), numArg(1, 9)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.change": case "change":
      return ta.change(seriesArg(0), numArg(1, 1))[barIdx] ?? null;
    case "ta.mom": case "mom":
      return ta.mom(seriesArg(0), numArg(1))[barIdx] ?? null;
    case "ta.sum": case "math.sum":
      return ta.sum(seriesArg(0), numArg(1))[barIdx] ?? null;
    case "ta.highest": case "highest":
      return ta.highest(seriesArg(0), numArg(1))[barIdx] ?? null;
    case "ta.lowest": case "lowest":
      return ta.lowest(seriesArg(0), numArg(1))[barIdx] ?? null;
    case "ta.stdev": case "stdev":
      return ta.stdev(seriesArg(0), numArg(1))[barIdx] ?? null;
    case "ta.crossover":  case "crossover":
      return ta.crossover(seriesTok(0),  seriesTok(1))[barIdx] ?? false;
    case "ta.crossunder": case "crossunder":
      return ta.crossunder(seriesTok(0), seriesTok(1))[barIdx] ?? false;
    case "ta.rising":  return ta.rising(seriesTok(0),  numArg(1))[barIdx] ?? false;
    case "ta.falling": return ta.falling(seriesTok(0), numArg(1))[barIdx] ?? false;
    case "ta.barssince": {
      const key = `ta.barssince_${JSON.stringify(args[0])?.slice(0,40)}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.barssince(seriesArg(0).map(v => !!v)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.valuewhen": case "valuewhen": {
      const key = `ta.valuewhen_${barIdx}_${args[2] ?? 0}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.valuewhen(seriesArg(0).map(v => !!v), seriesArg(1), numArg(2, 0)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    // ── True range, cumulative, linreg, pivots, SAR (common in TradingView community scripts) ──
    case "ta.tr": case "tr": {
      const key = `ta.tr_${args[0] ?? "d"}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.tr(ctx.close, ctx.high, ctx.low, args[0] !== false));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.cum": case "cum": {
      const key = `ta.cum_${args[0]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.cum(seriesArg(0)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.linreg": case "linreg": {
      const key = `ta.linreg_${args[0]}_${args[1]}_${args[2]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.linreg(seriesArg(0), numArg(1, 14), numArg(2, 0)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.percentrank": case "percentrank": {
      const key = `ta.pr_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.percentrank(seriesArg(0), numArg(1, 14)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.median": case "median": {
      const key = `ta.median_${args[0]}_${args[1]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.median(seriesArg(0), numArg(1, 14)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.pivothigh": case "pivothigh": {
      // ta.pivothigh([source], left, right) — source defaults to high
      const hasSrc = args.length >= 3;
      const src    = hasSrc ? seriesArg(0) : ctx.high;
      const left   = hasSrc ? numArg(1, 5) : numArg(0, 5);
      const right  = hasSrc ? numArg(2, 5) : numArg(1, 5);
      const key = `ta.pvh_${hasSrc}_${left}_${right}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.pivot(src, left, right, true));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.pivotlow": case "pivotlow": {
      const hasSrc = args.length >= 3;
      const src    = hasSrc ? seriesArg(0) : ctx.low;
      const left   = hasSrc ? numArg(1, 5) : numArg(0, 5);
      const right  = hasSrc ? numArg(2, 5) : numArg(1, 5);
      const key = `ta.pvl_${hasSrc}_${left}_${right}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.pivot(src, left, right, false));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.sar": case "sar": {
      const key = `ta.sar_${args[0]}_${args[1]}_${args[2]}`;
      if (!ctx.vars.has(key)) ctx.vars.set(key, ta.sar(ctx.high, ctx.low, numArg(0, 0.02), numArg(1, 0.02), numArg(2, 0.2)));
      return ctx.vars.get(key)[barIdx] ?? null;
    }
    case "ta.cross": case "cross": {
      const a = seriesTok(0), b = seriesTok(1);
      const over  = ta.crossover(a, b)[barIdx];
      const under = ta.crossunder(a, b)[barIdx];
      return !!over || !!under;
    }
    // Math namespace
    case "math.abs":   case "abs":   return Math.abs(numArg(0));
    case "math.ceil":  case "ceil":  return Math.ceil(numArg(0));
    case "math.floor": case "floor": return Math.floor(numArg(0));
    case "math.round": case "round": return Math.round(numArg(0));
    case "math.sqrt":  case "sqrt":  return Math.sqrt(numArg(0));
    case "math.pow":   case "pow":   return Math.pow(numArg(0), numArg(1));
    case "math.log":   case "log":   return Math.log(numArg(0));
    case "math.exp":   case "exp":   return Math.exp(numArg(0));
    case "math.max":   case "max":   return Math.max(...args.map(Number));
    case "math.min":   case "min":   return Math.min(...args.map(Number));
    case "math.avg":   case "avg":   return args.length ? args.map(Number).reduce((a,b)=>a+b,0)/args.length : NaN;
    case "math.todegrees": return numArg(0) * 180 / Math.PI;
    case "math.toradians": return numArg(0) * Math.PI / 180;
    case "math.round_to_mintick": return numArg(0);
    case "math.sign":  case "sign":  return Math.sign(numArg(0));
    case "math.sin":   case "sin":   return Math.sin(numArg(0));
    case "math.cos":   case "cos":   return Math.cos(numArg(0));
    case "math.tan":   case "tan":   return Math.tan(numArg(0));
    // Type functions
    case "float":  case "int":  return numArg(0);
    case "bool":   return Boolean(args[0]);
    case "str":    case "string": return String(args[0] ?? "");
    case "nz":     return nz(args[0], args[1] ?? 0);
    case "na":     return args[0] == null || isNaN(args[0]);
    case "fixnan": return isNaN(args[0]) ? (args[1] ?? 0) : args[0];
    // Color functions
    case "color.new":  return args[0] ?? "#FFFFFF";
    case "color.rgb":  return `rgba(${args[0]},${args[1]},${args[2]},${(args[3] ?? 0) / 100})`;
    case "color.from_gradient": return args[0] ?? "#FFFFFF";
    // Utility
    case "str.tostring": return String(args[0] ?? "");
    case "str.format":   return String(args[0] ?? "");
    // input.* — return defaults for preview
    case "input.float": case "input.int": return numArg(0, 14);
    case "input.bool":  return args[0] ?? true;
    case "input.string":case "input.source": return args[0] ?? "close";
    case "input.color": return args[0] ?? "#4FA3E0";
    case "input":       return args[0] ?? 0;
    // request.security(symbol, timeframe, expression, ...) — client-side we
    // cannot fetch a different timeframe's history, so we approximate the
    // higher-timeframe value with the expression evaluated on the CURRENT
    // series. This lets MTF scripts (e.g. multi-timeframe EMAs) plot cleanly
    // instead of returning null/flat lines. HONEST LIMITATION: the plotted
    // value tracks the current chart timeframe, not the literal HTF bar.
    case "request.security": case "security":
      return args[2] ?? args[args.length - 1] ?? null;
    // Label / line / table / alert primitives — accepted as no-ops so scripts
    // that create labels/alerts still run and plot their series.
    case "label.new": case "line.new": case "box.new": case "table.new":
    case "label.set_text": case "label.set_xy": case "label.delete":
    case "line.delete": case "alertcondition": case "alert":
      return null;
    case "timeframe.period": return "";
    // Array
    case "array.new_float": return Array(numArg(0, 0)).fill(numArg(1, 0));
    case "array.size": return Array.isArray(args[0]) ? args[0].length : 0;
    case "array.get":  return Array.isArray(args[0]) ? (args[0][numArg(1)] ?? null) : null;
    default:
      return null;
  }
}

/* ── Parse and exec a line ─────────────────────────────────── */
function execLine(line: string, ctx: ExecContext, barIdx: number): void {
  line = line.trim();
  if (!line) return;

  // Version directive (//@version=4|5|6) — accepted, no-op for the interpreter
  if (/^\/\/@version\s*=/.test(line)) return;

  // indicator() / strategy() declaration (strategy treated as indicator for plotting)
  const indMatch = line.match(/^(?:indicator|strategy)\s*\(([^)]*)\)/);
  if (indMatch) {
    const args = indMatch[1];
    const titleM = args.match(/title\s*=\s*["']([^"']+)["']/) || args.match(/["']([^"']+)["']/);
    const shortM = args.match(/shorttitle\s*=\s*["']([^"']+)["']/);
    const overlayM = args.match(/overlay\s*=\s*(true|false)/);
    if (titleM)   ctx.title     = titleM[1];
    if (shortM)   ctx.shortTitle = shortM[1];
    if (overlayM) ctx.overlay   = overlayM[1] === "true";
    return;
  }

  // plot() call
  //   Pine positional order: plot(series, title, color, linewidth, style, ...)
  //   Real TradingView scripts pass title/color positionally, so we resolve
  //   named-args first then fall back to positional slots. Each plot is keyed
  //   to a STABLE id (its title, or the source line if untitled) so it's created
  //   exactly once — never re-created per bar (which caused "Plot N" label spam).
  const plotMatch = line.match(/^plot\s*\((.+)\)$/s);
  if (plotMatch) {
    const plotArgs = parseNamedArgs(plotMatch[1]);
    const pick = (named: string, pos: number) => plotArgs[named] ?? plotArgs[pos];
    const seriesExpr = plotArgs["series"] ?? plotArgs[0] ?? "";
    const titleRaw   = pick("title", 1);
    const colorRaw   = pick("color", 2);
    const lwRaw      = pick("linewidth", 3);
    const styleRaw   = pick("style", 4);

    // Stable identity for this plot call-site
    const titleStr = titleRaw != null
      ? String(evalExpr(titleRaw, ctx, barIdx) ?? titleRaw).replace(/["']/g, "")
      : "";
    const stableId = titleStr || `__plot@${plotMatch[1].trim()}`;

    const colorStr   = colorRaw != null ? String(evalExpr(colorRaw, ctx, barIdx)) : DEFAULT_COLORS[ctx.plotCount % DEFAULT_COLORS.length];
    const styleStr   = styleRaw != null ? String(styleRaw).replace(/plot\.style_/, "").replace(/style\./, "") : "line";
    const lwStr      = lwRaw != null ? Number(evalExpr(lwRaw, ctx, barIdx)) || 1 : 1;

    // Get or create the series (matched by stable id — once per call-site)
    let existingPlot = ctx.plots.find(p => p.id === stableId);
    if (!existingPlot) {
      existingPlot = {
        id: stableId,
        title: titleStr || `Plot ${ctx.plotCount + 1}`,
        values: new Array(ctx.close.length).fill(null),
        color: colorFromPine((colorStr || "").replace(/["']/g, "")),
        style: styleStr as any,
        linewidth: lwStr,
        overlay: ctx.overlay,
      };
      ctx.plots.push(existingPlot);
      ctx.plotCount++;
    }
    // Evaluate and store value for this bar
    const val = evalExpr(seriesExpr, ctx, barIdx);
    existingPlot.values[barIdx] = typeof val === "number" ? val : null;
    return;
  }

  // hline()  —  positional: hline(price, title, color, linestyle, linewidth)
  const hlineMatch = line.match(/^hline\s*\((.+)\)$/);
  if (hlineMatch) {
    const hArgs = parseNamedArgs(hlineMatch[1]);
    const hpick = (named: string, pos: number) => hArgs[named] ?? hArgs[pos];
    const price = Number(evalExpr(hArgs["price"] ?? hArgs[0] ?? "0", ctx, barIdx));
    if (barIdx === 0) {
      const colorRaw = hpick("color", 2);
      const styleRaw = hpick("linestyle", 3);
      const lwRaw    = hpick("linewidth", 4);
      ctx.hlines.push({
        price,
        color: colorFromPine(String(evalExpr(colorRaw ?? '"gray"', ctx, barIdx))),
        style: String(styleRaw || "solid").replace(/line\.style_|linestyle\./,"") as any,
        width: Number(lwRaw || 1),
        title: String(hpick("title", 1) || "").replace(/["']/g,""),
      });
    }
    return;
  }

  // plotshape()  —  positional: plotshape(series, title, style, location, color, ...)
  const shapeMatch = line.match(/^plotshape\s*\((.+)\)$/s);
  if (shapeMatch) {
    const sArgs = parseNamedArgs(shapeMatch[1]);
    const spick = (named: string, pos: number) => sArgs[named] ?? sArgs[pos];
    const cond  = evalExpr(sArgs["series"] ?? sArgs[0] ?? "false", ctx, barIdx);
    const titleStr = String(spick("title", 1) || `"Shape${ctx.shapes.length}"`).replace(/["']/g,"");
    let shape = ctx.shapes.find(s => s.title === titleStr);
    if (!shape) {
      const colorRaw = spick("color", 4);
      shape = {
        title: titleStr,
        bars:  [],
        color: colorFromPine(String(colorRaw != null ? (evalExpr(colorRaw, ctx, barIdx) ?? colorRaw) : "#00D4AA").replace(/["']/g,"")),
        style: String(spick("style", 2) || "circle").replace(/shape\./,"") as any,
        location: String(spick("location", 3) || "abovebar").replace(/location\./,"") as any,
        text:  String(spick("text", 6) || "").replace(/["']/g,""),
      };
      ctx.shapes.push(shape);
    }
    if (cond && cond !== false && cond !== null && cond !== 0) shape.bars.push(barIdx);
    return;
  }

  // bgcolor()
  const bgMatch = line.match(/^bgcolor\s*\((.+)\)$/);
  if (bgMatch) {
    const bgArgs = parseNamedArgs(bgMatch[1]);
    const colorVal = evalExpr(bgArgs[0] || bgArgs["color"] || "na", ctx, barIdx);
    if (!ctx.bgColors.length) ctx.bgColors.push({ bars: [], colors: [] });
    const cond = bgArgs["condition"] ? evalExpr(bgArgs["condition"], ctx, barIdx) : true;
    if (colorVal && cond !== false) {
      ctx.bgColors[0].bars.push(barIdx);
      ctx.bgColors[0].colors.push(colorFromPine(String(colorVal).replace(/["']/g,"")));
    }
    return;
  }

  // Tuple destructuring: [macdLine, sigLine, hist] = ta.macd(...)
  const destMatch = line.match(/^\[\s*([\w\s,]+?)\s*\]\s*=\s*(.+)$/s);
  if (destMatch) {
    const names = destMatch[1].split(",").map(s => s.trim()).filter(Boolean);
    const val = evalExpr(destMatch[2], ctx, barIdx);
    const parts: any[] = val && (val as any).__pineTuple
      ? (val as any).__pineTuple
      : (Array.isArray(val) ? val : []);
    names.forEach((nm, k) => {
      const series = parts[k];
      if (Array.isArray(series)) ctx.vars.set(nm, series);
      else {
        // scalar member — build per-bar array
        let arr = ctx.vars.get(nm);
        if (!Array.isArray(arr)) arr = new Array(ctx.close.length).fill(null);
        arr[barIdx] = series ?? null;
        ctx.vars.set(nm, arr);
      }
    });
    return;
  }

  // Variable assignment: var|varip|float|int|bool|string|color [type] name := expr  OR  name := expr  OR  name = expr
  const assignMatch = line.match(/^(?:(?:var|varip|float|int|bool|string|color|series)\s+)*(\w+)\s*([:=]=?)\s*(.+)$/s);
  if (assignMatch) {
    const [, varName, op, expr] = assignMatch;
    const val = evalExpr(expr, ctx, barIdx);
    // If result is a series (array), store it; else store scalar
    if (Array.isArray(val)) {
      ctx.vars.set(varName, val);
    } else {
      // For scalar vars: build/update per-bar array
      let arr = ctx.vars.get(varName);
      if (!Array.isArray(arr)) arr = new Array(ctx.close.length).fill(null);
      arr[barIdx] = val;
      ctx.vars.set(varName, arr);
    }
  }
}

function parseNamedArgs(argsStr: string): Record<string | number, string> {
  const result: Record<string | number, string> = {};
  let posIdx = 0, depth = 0, current = "", currentKey = "";
  let inKey = true;

  for (let i = 0; i <= argsStr.length; i++) {
    const c = i < argsStr.length ? argsStr[i] : ",";
    if (c === "(" || c === "[" || c === "{") { depth++; current += c; }
    else if (c === ")" || c === "]" || c === "}") { depth--; current += c; }
    // Named-arg separator: a STANDALONE `=` whose left side is a bare identifier.
    // Must NOT match the `=` inside `==`, `<=`, `>=`, `!=`, `:=` — otherwise a
    // positional condition like `dir == 1 and dir[1] == -1` is mis-read as a
    // named arg `dir`, shifting every following positional (title/color/…) and
    // silently breaking plot/plotshape signals.
    else if (
      c === "=" && depth === 0 && inKey &&
      argsStr[i + 1] !== "=" &&
      /^\s*[a-zA-Z_]\w*\s*$/.test(current)
    ) {
      currentKey = current.trim();
      current = "";
      inKey = false;
    }
    else if (c === "," && depth === 0) {
      if (currentKey) { result[currentKey] = current.trim(); }
      else            { result[posIdx++]   = current.trim(); }
      current = ""; currentKey = ""; inKey = true;
    } else {
      current += c;
    }
  }
  return result;
}

/* ── Main interpreter entry point ──────────────────────────── */
export function interpretPine(script: string, bars: OHLCVBar[]): PineOutput {
  const errors: { line: number; msg: string }[] = [];

  try {
    const { src } = processInputs(stripComments(script));
    const lines   = src.split("\n");

    // Build series arrays
    const openS   = bars.map(b => b.open);
    const highS   = bars.map(b => b.high);
    const lowS    = bars.map(b => b.low);
    const closeS  = bars.map(b => b.close);
    const volS    = bars.map(b => b.volume);
    const hl2S    = bars.map(b => (b.high + b.low) / 2);
    const hlc3S   = bars.map(b => (b.high + b.low + b.close) / 3);
    const ohlc4S  = bars.map(b => (b.open + b.high + b.low + b.close) / 4);

    const ctx: ExecContext = {
      open: openS, high: highS, low: lowS, close: closeS, volume: volS,
      hl2: hl2S, hlc3: hlc3S, ohlc4: ohlc4S,
      vars: new Map(),
      plots: [], shapes: [], hlines: [], bgColors: [],
      plotCount: 0,
      overlay: true,
      title: "Custom Indicator",
      shortTitle: "Custom",
      errors,
    };

    // First pass: collect indicator() meta and simple assignments
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("indicator(") || t.startsWith("//@version")) {
        try { execLine(t, ctx, 0); } catch {}
      }
    }

    // Execute bar by bar
    for (let barIdx = 0; barIdx < bars.length; barIdx++) {
      let i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        if (!line || line.startsWith("//") || line.startsWith("//@")) { i++; continue; }
        if (line.startsWith("indicator(") || line.startsWith("//@version")) { i++; continue; }

        // if/else block — simplified single-line handling
        const ifMatch = line.match(/^if\s+(.+)\s*$/);
        if (ifMatch) {
          const cond = evalExpr(ifMatch[1], ctx, barIdx);
          i++;
          const bodyLines: string[] = [];
          const elseLines: string[] = [];
          let inElse = false;
          while (i < lines.length) {
            const rawLine = lines[i];
            const isIndented = rawLine.startsWith("    ") || rawLine.startsWith("\t");
            const trimmed = rawLine.trim();
            if (!isIndented && trimmed !== "") break;
            if (trimmed === "else") { inElse = true; i++; continue; }
            if (inElse) elseLines.push(trimmed);
            else bodyLines.push(trimmed);
            i++;
          }
          const execLines = cond ? bodyLines : elseLines;
          for (const bl of execLines) {
            if (bl) { try { execLine(bl, ctx, barIdx); } catch {} }
          }
          continue;
        }

        try { execLine(line, ctx, barIdx); } catch {}
        i++;
      }
    }

    return {
      plots:      ctx.plots,
      shapes:     ctx.shapes,
      hlines:     ctx.hlines,
      bgColors:   ctx.bgColors,
      title:      ctx.title,
      shortTitle: ctx.shortTitle,
      overlay:    ctx.overlay,
      errors,
    };
  } catch (e: any) {
    return {
      plots: [], shapes: [], hlines: [], bgColors: [],
      title: "Error", shortTitle: "ERR", overlay: true,
      errors: [{ line: 0, msg: String(e?.message || e) }],
    };
  }
}

/* ── Syntax validation only (no execution) ─────────────────── */
export function validatePine(script: string): { line: number; msg: string }[] {
  const errors: { line: number; msg: string }[] = [];
  const lines = stripComments(script).split("\n");
  const KNOWN_FNS = new Set([
    "plot","plotshape","plotarrow","bgcolor","hline","indicator","strategy",
    "ta.sma","ta.ema","ta.rsi","ta.macd","ta.bb","ta.atr","ta.rma","ta.wma","ta.hma",
    "ta.stoch","ta.cci","ta.mfi","ta.vwap","ta.obv","ta.roc","ta.change","ta.mom",
    "ta.crossover","ta.crossunder","ta.rising","ta.falling","ta.highest","ta.lowest",
    "ta.stdev","ta.barssince","ta.sum","sma","ema","rsi","rma","wma","hma",
    "ta.dema","ta.tema","ta.wpr","ta.williamsr","ta.kc","ta.keltner","ta.supertrend",
    "ta.variance","dema","tema","supertrend","stoch","macd","bb",
    "ta.tr","ta.cum","ta.linreg","ta.percentrank","ta.median","ta.pivothigh","ta.pivotlow",
    "ta.sar","ta.cross","ta.valuewhen","tr","cum","linreg","percentrank","median",
    "pivothigh","pivotlow","sar","cross","valuewhen","ta.donchian","donchian",
    "math.abs","math.ceil","math.floor","math.round","math.sqrt","math.pow","math.sign",
    "math.max","math.min","math.log","math.exp","math.sin","math.cos","math.tan",
    "math.avg","math.todegrees","math.toradians","math.round_to_mintick","avg","plotcandle","plotbar","fill",
    "input","input.float","input.int","color.new","color.rgb","str.tostring","str.format",
    "input.bool","input.string","input.color","input.source","nz","na","float","int","bool",
    "fixnan","alertcondition","alert","array.new_float","array.get","array.size",
    "request.security","security","label.new","line.new","box.new","table.new",
    "label.set_text","label.set_xy","label.delete","line.delete","timeframe.period",
  ]);
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("//")) continue;
    const callM = t.match(/^([\w.]+)\s*\(/);
    if (callM && !KNOWN_FNS.has(callM[1]) && !t.includes(":=") && !t.includes("=")) {
      errors.push({ line: i + 1, msg: `Unknown function: ${callM[1]}` });
    }
  }
  return errors;
}
