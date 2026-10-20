/**
 * The SHAPE of a pasted tastytrade credential pair — shared by the Connect
 * form (inline validation, before anything leaves the phone) and the server
 * (which refuses a bad shape before it ever reaches tastytrade). PURE; it
 * never echoes a value. tastytrade alone decides whether a pair is valid.
 */
/** What a pasted credential pair is missing, in the member's words. Empty = shape is fine. */
export function credentialProblems(body: { clientSecret?: unknown; refreshToken?: unknown }): { clientSecret?: string; refreshToken?: string } {
  const out: { clientSecret?: string; refreshToken?: string } = {};
  const check = (v: unknown, min: number, name: string): string | undefined => {
    if (typeof v !== "string" || !v.trim()) return `Paste the ${name}.`;
    const t = v.trim();
    if (/\s/.test(t)) return `The ${name} has a space or line break in it — copy it again without extra characters.`;
    if (t.length < min) return `That is too short to be a tastytrade ${name} — copy the whole value.`;
    if (t.length > 4096) return `That is too long to be a tastytrade ${name}.`;
    return undefined;
  };
  const cs = check(body.clientSecret, 8, "client secret");
  const rt = check(body.refreshToken, 16, "refresh token");
  if (cs) out.clientSecret = cs;
  if (rt) out.refreshToken = rt;
  if (!cs && !rt && String(body.clientSecret).trim() === String(body.refreshToken).trim()) {
    out.refreshToken = "The refresh token is the same as the client secret — they are two different values.";
  }
  return out;
}

