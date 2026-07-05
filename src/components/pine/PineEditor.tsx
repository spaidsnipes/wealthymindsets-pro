"use client";

/**
 * Pine Script v6 Code Editor
 * Textarea-based editor with:
 *  - Syntax highlighting overlay (no extra packages)
 *  - Line numbers
 *  - Real-time error underlines
 *  - Autocomplete suggestions
 *  - Tab → 4 spaces
 */

import React, { useRef, useState, useEffect, useCallback } from "react";

/* ── Token colors ───────────────────────────────────────────── */
const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/**
 * Single-pass tokenizer highlighter.
 * A sequential regex-replace approach corrupts the HTML: later passes match
 * plain words ("string", "color", "plot") that appear INSIDE the class names
 * of spans inserted by earlier passes, injecting nested tags and breaking the
 * markup (it then renders as literal `<span ...>` text). This scanner consumes
 * comments/strings first as whole tokens and only classifies bare identifiers,
 * so no inserted markup is ever re-scanned.
 */
function highlight(code: string): string {
  let out = "";
  let i = 0;
  const n = code.length;
  const wrap = (cls: string, txt: string) => `<span class="${cls}">${esc(txt)}</span>`;

  const KW = new Set("if else for while switch case break continue return var varip float int bool string color series array true false na and or not import export method type by to".split(" "));

  while (i < n) {
    const c = code[i];

    // Line comment
    if (c === "/" && code[i + 1] === "/") {
      let j = i; while (j < n && code[j] !== "\n") j++;
      out += wrap("pine-comment", code.slice(i, j)); i = j; continue;
    }
    // Block comment
    if (c === "/" && code[i + 1] === "*") {
      let j = i + 2; while (j < n && !(code[j] === "*" && code[j + 1] === "/")) j++;
      j = Math.min(n, j + 2);
      out += wrap("pine-comment", code.slice(i, j)); i = j; continue;
    }
    // String
    if (c === '"' || c === "'") {
      let j = i + 1; while (j < n && code[j] !== c) { if (code[j] === "\\") j++; j++; }
      j = Math.min(n, j + 1);
      out += wrap("pine-string", code.slice(i, j)); i = j; continue;
    }
    // Number
    if (/\d/.test(c) || (c === "." && /\d/.test(code[i + 1] || ""))) {
      let j = i; while (j < n && /[\d.]/.test(code[j])) j++;
      if (code[j] === "e" || code[j] === "E") { j++; if (code[j] === "+" || code[j] === "-") j++; while (j < n && /\d/.test(code[j])) j++; }
      out += wrap("pine-number", code.slice(i, j)); i = j; continue;
    }
    // Identifier (with dotted namespace: ta.sma, color.green)
    if (/[a-zA-Z_]/.test(c)) {
      let j = i; while (j < n && /[\w]/.test(code[j])) j++;
      while (code[j] === "." && /[\w]/.test(code[j + 1] || "")) { j++; while (j < n && /[\w]/.test(code[j])) j++; }
      const word = code.slice(i, j);
      let cls = "";
      if (/^color\./.test(word))                              cls = "pine-color-const";
      else if (/^(ta|math|input|str|request|array|matrix|map|syminfo|timeframe|strategy)\./.test(word)) cls = "pine-ta";
      else if (/^(plot|plotshape|plotarrow|plotbar|plotcandle|bgcolor|hline|fill|indicator|strategy|library|alertcondition|alert)$/.test(word)) cls = "pine-plot";
      else if (/^(open|high|low|close|volume|hl2|hlc3|ohlc4|bar_index|bar_count|time|timenow|nz|na|fixnan)$/.test(word)) cls = "pine-builtin";
      else if (KW.has(word))                                  cls = "pine-keyword";
      out += cls ? wrap(cls, word) : esc(word);
      i = j; continue;
    }
    // Operators
    if ("+-*/%^<>=!?:".includes(c)) {
      out += wrap("pine-op", c); i++; continue;
    }
    // Anything else (whitespace, brackets, commas)
    out += esc(c); i++;
  }
  return out;
}

/* ── Autocomplete suggestions ───────────────────────────────── */
const SUGGESTIONS = [
  // TA
  "ta.sma(source, length)", "ta.ema(source, length)", "ta.rsi(source, length)",
  "ta.macd(source, fastlen, slowlen, siglen)", "ta.bb(source, length, mult)",
  "ta.atr(length)", "ta.stoch(close, high, low, length)", "ta.vwap",
  "ta.cci(source, length)", "ta.mfi(source, length)", "ta.roc(source, length)",
  "ta.crossover(source1, source2)", "ta.crossunder(source1, source2)",
  "ta.highest(source, length)", "ta.lowest(source, length)",
  "ta.stdev(source, length)", "ta.change(source)", "ta.mom(source, length)",
  "ta.supertrend(factor, atrLength)", "ta.keltner(source, length, mult)",
  // Plot
  "plot(series, title, color, linewidth, style)",
  "plotshape(series, title, style, location, color)",
  "bgcolor(color, transp, offset, editable, title)",
  "hline(price, title, color, linestyle, linewidth)",
  // Input
  "input.float(defval, title, minval, maxval, step)",
  "input.int(defval, title, minval, maxval, step)",
  "input.bool(defval, title)", "input.color(defval, title)",
  "input.source(defval, title)",
  // Misc
  "indicator(title, shorttitle, overlay, precision)",
  "nz(source, replacement)", "na(source)",
  // Colors
  "color.green", "color.red", "color.blue", "color.yellow",
  "color.orange", "color.purple", "color.white", "color.black",
  "color.new(color, transp)", "color.rgb(r, g, b, transp)",
  // Series
  "open", "high", "low", "close", "volume", "hl2", "hlc3", "ohlc4",
  "bar_index", "bar_count",
  // Style
  "plot.style_line", "plot.style_area", "plot.style_columns",
  "plot.style_histogram", "plot.style_circles", "plot.style_cross",
  "shape.circle", "shape.triangleup", "shape.triangledown",
  "shape.arrowup", "shape.arrowdown", "shape.labelup", "shape.labeldown",
  "location.abovebar", "location.belowbar", "location.top", "location.bottom",
];

interface Props {
  value:     string;
  onChange:  (v: string) => void;
  errors?:   { line: number; msg: string }[];
  height?:   number;
}

export function PineEditor({ value, onChange, errors = [], height = 400 }: Props) {
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestIdx,  setSuggestIdx]  = useState(0);
  const [cursorWord,  setCursorWord]  = useState("");

  // Sync scroll between textarea and highlight div
  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop  = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Tab → 4 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const start = ta.selectionStart, end = ta.selectionEnd;
      const newVal = value.substring(0, start) + "    " + value.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4; });
      return;
    }

    // Autocomplete navigation
    if (suggestions.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSuggestIdx(i => (i + 1) % suggestions.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSuggestIdx(i => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        if (e.key === "Enter") e.preventDefault();
        applySuggestion(suggestions[suggestIdx]);
        return;
      }
      if (e.key === "Escape") { setSuggestions([]); return; }
    }

    // Auto-pair brackets
    const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
    if (pairs[e.key]) {
      e.preventDefault();
      const start = ta.selectionStart;
      const newVal = value.substring(0, start) + e.key + pairs[e.key] + value.substring(ta.selectionEnd);
      onChange(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    // Compute autocomplete
    const pos  = e.target.selectionStart;
    const before = newVal.substring(0, pos);
    const wordMatch = before.match(/[\w.]+$/);
    const word = wordMatch ? wordMatch[0] : "";
    setCursorWord(word);
    if (word.length >= 2) {
      const filtered = SUGGESTIONS.filter(s => s.toLowerCase().startsWith(word.toLowerCase()));
      setSuggestions(filtered.slice(0, 8));
      setSuggestIdx(0);
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (sug: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos    = ta.selectionStart;
    const before = value.substring(0, pos);
    const after  = value.substring(pos);
    const start  = before.lastIndexOf(cursorWord);
    const newVal = before.substring(0, start) + sug + after;
    onChange(newVal);
    setSuggestions([]);
    requestAnimationFrame(() => {
      const newPos = start + sug.length;
      ta.selectionStart = ta.selectionEnd = newPos;
      ta.focus();
    });
  };

  // Error line markers
  const errorLines = new Set(errors.map(e => e.line));
  const lines      = value.split("\n");

  return (
    <div className="relative font-mono text-xs" style={{ height }}>
      {/* Highlight + line numbers */}
      <div className="flex absolute inset-0 overflow-hidden rounded-lg border border-wm-border bg-wm-black">
        {/* Line numbers */}
        <div
          className="shrink-0 select-none text-right pr-3 pt-3 text-wm-text-dim bg-wm-surface border-r border-wm-border"
          style={{ width: 44, lineHeight: "21px", overflowY: "hidden", fontFamily: "JetBrains Mono, monospace" }}
          ref={el => {
            if (el && textareaRef.current) el.scrollTop = textareaRef.current.scrollTop;
          }}
        >
          {lines.map((_, i) => (
            <div
              key={i}
              style={{
                color: errorLines.has(i + 1) ? "#FF4D6A" : undefined,
                fontSize: 10,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Highlight overlay */}
        <div
          ref={highlightRef}
          className="absolute left-[44px] right-0 top-0 bottom-0 overflow-auto pointer-events-none"
          style={{ padding: "12px 12px 12px 8px", lineHeight: "21px" }}
        >
          <pre
            className="pine-code"
            dangerouslySetInnerHTML={{ __html: highlight(value) + "\n" }}
            style={{ margin: 0, fontFamily: "JetBrains Mono, monospace", fontSize: 12, whiteSpace: "pre" }}
          />
        </div>

        {/* Actual textarea (transparent) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          className="absolute left-[44px] right-0 top-0 bottom-0 bg-transparent text-transparent caret-white outline-none resize-none"
          style={{
            padding:    "12px 12px 12px 8px",
            lineHeight: "21px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize:   12,
            caretColor: "#00D4AA",
            WebkitTextFillColor: "transparent",
          }}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
        />
      </div>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div
          className="absolute z-50 bg-wm-card border border-wm-border rounded-lg shadow-2xl overflow-hidden"
          style={{ top: "100%", left: 44, minWidth: 300, maxWidth: 500 }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s}
              onMouseDown={e => { e.preventDefault(); applySuggestion(s); }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${
                i === suggestIdx ? "bg-wm-green/20 text-wm-green" : "text-wm-text hover:bg-wm-surface"
              }`}
            >
              <span className="text-wm-blue">{s.split("(")[0]}</span>
              {s.includes("(") && <span className="text-wm-text-dim">{`(${s.split("(").slice(1).join("(")}`}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-wm-red/10 border-t border-wm-red/30 px-3 py-1.5 max-h-20 overflow-y-auto">
          {errors.map((e, i) => (
            <div key={i} className="text-[10px] text-wm-red font-mono">
              Line {e.line}: {e.msg}
            </div>
          ))}
        </div>
      )}

      {/* Pine Script CSS */}
      <style jsx global>{`
        .pine-comment     { color: #6A737D; font-style: italic; }
        .pine-string      { color: #F0B429; }
        .pine-keyword     { color: #FF79C6; font-weight: 600; }
        .pine-ta          { color: #4FA3E0; }
        .pine-plot        { color: #00D4AA; }
        .pine-builtin     { color: #8B5CF6; }
        .pine-color-const { color: #F97316; }
        .pine-number      { color: #BD93F9; }
        .pine-op          { color: #E8EDF3; opacity: 0.7; }
      `}</style>
    </div>
  );
}
