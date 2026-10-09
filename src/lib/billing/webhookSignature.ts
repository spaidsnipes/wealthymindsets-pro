/**
 * WM PRO BILLING — THE WEBHOOK SIGNATURE (Web Crypto; Workers runtime).
 *
 * Stripe-Signature: t=<unix seconds>,v1=<hex>[,v1=<hex>…]
 * The signed string is `${t}.${rawBody}`, HMAC-SHA256 with the endpoint's
 * signing secret. A signature older or newer than the tolerance is refused
 * (replay), and the comparison is constant-time.
 *
 * The RAW body must be verified — never a re-serialised object.
 */
export const WEBHOOK_TOLERANCE_SEC = 300;

const hex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyStripeSignature(payload: string, header: string | null | undefined, secret: string | null | undefined, nowSec: number, toleranceSec = WEBHOOK_TOLERANCE_SEC): Promise<boolean> {
  const key = (secret ?? "").trim();
  if (!header || !key) return false;
  let t = NaN;
  const candidates: string[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim(), v = part.slice(eq + 1).trim();
    if (k === "t" && /^\d{1,12}$/.test(v)) t = Number(v);
    else if (k === "v1" && /^[0-9a-f]{64}$/i.test(v)) candidates.push(v.toLowerCase());
  }
  if (!Number.isFinite(t) || candidates.length === 0 || !Number.isFinite(nowSec) || Math.abs(nowSec - t) > toleranceSec) return false;
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = hex(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${t}.${payload}`))));
  let ok = false;
  for (const c of candidates) ok = constantTimeEqual(c, mac) || ok;      // no early exit
  return ok;
}

/** Test seam: the header Stripe would send for this payload (used by tests only). */
export async function signStripePayload(payload: string, secret: string, tSec: number): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `t=${tSec},v1=${hex(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${tSec}.${payload}`))))}`;
}
