/**
 * Pine Script v6 Engine — Type Definitions
 * Supports the core subset needed for indicator development.
 */

export type PineValue = number | string | boolean | null | PineSeries;

export class PineSeries {
  values: (number | null)[];
  constructor(values: (number | null)[] = []) { this.values = values; }
  get(i = 0): number | null { return this.values[this.values.length - 1 - i] ?? null; }
  push(v: number | null) { this.values.push(v); }
  get length() { return this.values.length; }
}

export type PlotStyle = "line" | "columns" | "area" | "circles" | "cross" | "histogram" | "stepline";

export interface PlotOutput {
  id:     string;
  title:  string;
  values: (number | null)[];    // one per bar
  color:  string;
  style:  PlotStyle;
  linewidth: number;
  overlay: boolean;             // true = on price chart, false = separate pane
}

export interface PlotShapeOutput {
  title:   string;
  bars:    number[];            // bar indices where shape appears
  color:   string;
  style:   "circle" | "triangleup" | "triangledown" | "arrowup" | "arrowdown" | "labelup" | "labeldown" | "xcross" | "cross" | "flag";
  location:"abovebar" | "belowbar" | "top" | "bottom";
  text:    string;
}

export interface HLineOutput {
  price:  number;
  color:  string;
  style:  "solid" | "dashed" | "dotted";
  width:  number;
  title:  string;
}

export interface BgColorOutput {
  bars:   number[];
  colors: string[];
}

export interface PineOutput {
  plots:      PlotOutput[];
  shapes:     PlotShapeOutput[];
  hlines:     HLineOutput[];
  bgColors:   BgColorOutput[];
  title:      string;
  shortTitle: string;
  overlay:    boolean;
  errors:     { line: number; msg: string }[];
}

/*
 * THE PINE ENGINE NO LONGER DECLARES ITS OWN `OHLCVBar` (2026-09-18).
 *
 * What stood here was byte-for-byte `LegacyOhlcvTuple`: six numbers, the same
 * six, under a sixth name. It is gone and NO ALIAS WAS LEFT BEHIND — this
 * module stopped EXPORTING a bar type rather than re-exporting one, so every
 * importer was enumerated by `tsc` and repointed at the artery directly.
 *
 * WHAT THIS BUYS, STATED HONESTLY: one fewer duplicate DECISION about what a
 * bar is, and ZERO canonical identity. `interpretPine` below still receives
 * six anonymous numbers. A user-authored Pine script is, by construction, a
 * claim a trader will act on, and this engine cannot tell the script WHICH
 * symbol, WHICH session, at WHAT fidelity, or from WHAT source those bars came
 * — nor whether a later correction has superseded them. A script that reads
 * `close` has no way to know it is reading a RECONSTRUCTED bar folded from a
 * finer interval (see `yahooTimeframes`) rather than one that actually traded.
 *
 * THAT GAP IS NOT CLOSED HERE and is named at this site so it is not mistaken
 * for closed. It closes only when the ingress feeding `interpretPine` carries
 * a CanonicalBar.
 */

// Pine Script token types
export type TokenType =
  | "NUMBER" | "STRING" | "BOOL" | "IDENT" | "NA"
  | "PLUS" | "MINUS" | "STAR" | "SLASH" | "PERCENT" | "CARET"
  | "EQ" | "NEQ" | "LT" | "GT" | "LTE" | "GTE"
  | "AND" | "OR" | "NOT"
  | "ASSIGN" | "REASSIGN"   // = vs :=
  | "LPAREN" | "RPAREN" | "LBRACKET" | "RBRACKET" | "LBRACE" | "RBRACE"
  | "COMMA" | "DOT" | "COLON" | "QUESTION" | "ARROW"
  | "NEWLINE" | "INDENT" | "DEDENT" | "EOF"
  | "IF" | "ELSE" | "FOR" | "TO" | "BY" | "WHILE" | "BREAK" | "CONTINUE" | "RETURN"
  | "VAR" | "VARIP" | "FLOAT" | "INT" | "BOOL_TYPE" | "STRING_TYPE" | "COLOR_TYPE" | "SERIES" | "ARRAY"
  | "IMPORT" | "EXPORT" | "METHOD" | "TYPE" | "ENUM"
  | "SWITCH" | "CASE" | "DEFAULT";

export interface Token {
  type: TokenType;
  value: string | number | boolean | null;
  line: number;
  col:  number;
}
