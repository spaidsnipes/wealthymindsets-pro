/**
 * Pine Script v5 Engine — Type Definitions
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

export interface OHLCVBar {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

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
