/**
 * THE ONE FAILURE OWNER FOR PUBLIC AND MEMBER ROUTES (API audit P1-5, 2026-10-09).
 *
 * Ten routes answered a failure with `{ error: String(err) }` — a vendor's name,
 * an HTTP code, an exception string or an env-var name, handed to a guest or a
 * member ("Error: Yahoo HTTP 404", "GEMINI_API_KEY not set."). A caller needs
 * two things from a failure: words a person can read, and a STABLE CODE a
 * program can branch on. The raw text belongs in the server log.
 *
 * `publicFailure(err, lane)` gives both and writes the raw text to the log.
 * Readers branch on `code`; the old text is still accepted by the readers for
 * one release (fvgBarSource.upstreamSaysMissing), so a browser holding an older
 * bundle and a server on the new one never disagree.
 *
 * The words are short fragments with no full stop, because one reader sets them
 * inside its own sentence ("Yahoo was asked and refused — no data for this request.").
 *
 * PURE apart from the one log line.
 */
import { tastytradeOwnerGate } from "@/lib/broker/brokerOwner";

export const PUBLIC_FAILURE_CODES = ["UPSTREAM_NOT_FOUND", "UPSTREAM_BUSY", "UPSTREAM_UNAVAILABLE", "NOT_CONFIGURED", "INTERNAL"] as const;
export type PublicFailureCode = (typeof PUBLIC_FAILURE_CODES)[number];

export const PUBLIC_FAILURE_WORDS: Readonly<Record<PublicFailureCode, string>> = {
  UPSTREAM_NOT_FOUND: "no data for this request",
  UPSTREAM_BUSY: "the data source is busy — too many requests right now",
  UPSTREAM_UNAVAILABLE: "the data source did not answer",
  NOT_CONFIGURED: "this lane is not configured on WM Pro's server",
  INTERNAL: "the request could not be completed",
};

const text = (err: unknown): string => (err instanceof Error ? `${err.name}: ${err.message}` : String(err ?? ""));

/** Which kind of failure this is — read from the raw text once, here, so no caller has to. */
export function classifyFailure(err: unknown): PublicFailureCode {
  const t = text(err);
  if (/\bHTTP (404|400)\b|\bnot found\b|\bno data\b|\bdelisted\b/i.test(t)) return "UPSTREAM_NOT_FOUND";
  if (/\bHTTP 429\b|\brate.?limit|too many requests/i.test(t)) return "UPSTREAM_BUSY";
  if (/\bnot configured\b|\bnot set\b|\bis missing\b/i.test(t)) return "NOT_CONFIGURED";
  if (/\bHTTP 5\d\d\b|\bHTTP 40[13]\b|timed? ?out|abort|fetch failed|network|ECONN|ENOTFOUND|socket/i.test(t)) return "UPSTREAM_UNAVAILABLE";
  return "INTERNAL";
}

export interface PublicFailureBody {
  readonly error: string;
  readonly code: PublicFailureCode;
}

/** Words a person can read, forbidden words checked: no vendor name, no HTTP code, no variable name. */
export const PUBLIC_FAILURE_PLUMBING = /\b(yahoo|finnhub|alpaca|gemini|coinbase|kraken|polymarket|dexscreener|geckoterminal|cnn)\b|\bHTTP\b|\b[1-5]\d\d\b|\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{2,}\b|Error:|TypeError|SyntaxError/i;

/**
 * The body a non-owner receives, and the raw text to the server log.
 * `lane` names the route in the log only (never in the body).
 */
export function publicFailure(err: unknown, lane: string, log: (line: string) => void = line => console.error(line)): PublicFailureBody {
  const code = classifyFailure(err);
  try { log(`[wm:failure] lane=${lane} code=${code} raw=${text(err).slice(0, 500)}`); } catch { /* a log that cannot be written is not the failure */ }
  return { error: PUBLIC_FAILURE_WORDS[code], code };
}

/** True when a body is this owner's (a reader's switch from text to code). */
export function isPublicFailureCode(v: unknown): v is PublicFailureCode {
  return typeof v === "string" && (PUBLIC_FAILURE_CODES as readonly string[]).includes(v);
}

/* ── WHO MAY READ THE OPERATOR'S HALF OF A FAILURE (Founder ruling 2026-10-09) ──────────
   The earlier contract ("every WM API surface names the missing variable", Monday
   Test 2) put env-var names and setup words in front of any signed-in member and, on
   one route, a guest. NEW RULE — NAMES FOR THE OPERATOR ONLY:
     · the operator (the deployment's owner) still receives the full body: the
       sentence naming the variables, `missing`, `accepted`;
     · a member or a guest receives plain words, the SAME `edge`, a stable `code`,
       and `missing: []` (the field stays so a reader's shape check still holds).
   Every reader branches on `edge` / `code`, never on the sentence. */

/** The deployment's operator — the one audience that may read variable names. */
export function isOperator(userId: string | null | undefined, env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return typeof userId === "string" && userId.length > 0 && tastytradeOwnerGate(userId, env).allowed;
}

/** A typed edge → the stable code a program branches on. */
export function codeForEdge(edge: unknown): PublicFailureCode {
  const e = typeof edge === "string" ? edge.toUpperCase().replace(/_/g, " ") : "";
  if (e === "NOT CONFIGURED") return "NOT_CONFIGURED";
  if (e === "RATE LIMITED") return "UPSTREAM_BUSY";
  if (e === "NOT FOUND" || e === "NOT CARRIED HERE") return "UPSTREAM_NOT_FOUND";
  if (e === "AUTH BLOCKED" || e === "AUTH KEY REJECTED" || e === "FORBIDDEN" || e === "TRANSPORT" || e === "TIMEOUT" || e === "UNAVAILABLE" || e === "PROVIDER ERROR" || e === "INVALID RESPONSE" || e === "REDIRECT BLOCKED" || e === "UPSTREAM") return "UPSTREAM_UNAVAILABLE";
  return "INTERNAL";
}

/** What a non-operator reads for each typed edge: words about the fact, never about the setup. */
const EDGE_WORDS: Readonly<Record<string, string>> = {
  "NOT CONFIGURED": "this lane is not configured on WM Pro's server",
  "RATE LIMITED": "the data source is rate limiting requests right now",
  "AUTH BLOCKED": "the data source refused WM Pro's credentials",
  "AUTH KEY REJECTED": "the data source refused WM Pro's credentials",
  "FORBIDDEN": "the data source does not permit this request",
};

/** Fields that belong to the operator alone. */
const OPERATOR_FIELDS = ["accepted", "missingRecommended", "hint", "note"] as const;

/**
 * The same failure, for its audience. The operator's body is returned whole (plus
 * the code). A member's or guest's keeps `edge`, `source`, `state` and every
 * non-operator field; `error` becomes plain words, `missing` becomes [].
 */
export function audienceBody(operator: boolean, body: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const code = codeForEdge(body.edge);
  if (operator) return { ...body, code };
  const edge = typeof body.edge === "string" ? body.edge.toUpperCase().replace(/_/g, " ") : "";
  const out: Record<string, unknown> = { ...body, error: EDGE_WORDS[edge] ?? PUBLIC_FAILURE_WORDS[code], code };
  if ("missing" in body) out.missing = [];
  for (const k of OPERATOR_FIELDS) delete out[k];
  return out;
}
