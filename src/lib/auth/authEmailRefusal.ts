/**
 * WHY A FRIEND NEVER GETS IN — the auth EMAIL refusals (shift 1106; Codex
 * 01a19aea "Fix friends' email login… Supabase logs inconclusive").
 *
 * Diagnosed from code, no real accounts: every sign-up and every "resend the
 * confirmation" asks Supabase (GoTrue) to SEND MAIL. Two of its answers are
 * facts about the PROJECT's mail sender, not about the person:
 *
 *   email_address_not_authorized — the project still uses Supabase's built-in
 *     mail service, which (since 2024) only delivers to members of the
 *     Supabase organisation. The Founder (a member) can sign up; a friend's
 *     address is refused. Cure: a custom SMTP sender in the dashboard
 *     (Authentication → SMTP Settings). Founder-only step.
 *   over_email_send_rate_limit / 429 — the built-in sender's hourly cap
 *     (a handful of mails per hour for the WHOLE project). One friend's
 *     signup + a resend can exhaust it for everyone.
 *
 * Before this owner: signup printed GoTrue's raw sentence (or a generic
 * "rejected"), and /resend-confirmation THREW AWAY the answer and said "sent"
 * — so a friend stuck at "Email not confirmed" pressed resend, was told the
 * mail was on its way, and nothing ever arrived. Neither refusal reveals
 * whether an account exists, so both may be said out loud.
 *
 * PURE.
 */

export type AuthEmailRefusalKind = "SENDER_RESTRICTED" | "SEND_RATE_LIMITED";

export interface AuthEmailRefusal {
  readonly kind: AuthEmailRefusalKind;
  readonly httpStatus: number;
  /** What the person reads. */
  readonly message: string;
  /** What the operator reads in logs and the response (no address, no secret). */
  readonly edge: string;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function classifyAuthEmailRefusal(status: number, data: unknown): AuthEmailRefusal | null {
  const d = isObj(data) ? data : {};
  const code = str(d.error_code) || (isObj(d.error) ? str(d.error.code) : "") || str(d.code);
  const msg = `${str(d.msg)} ${str(d.message)} ${str(d.error_description)} ${isObj(d.error) ? str(d.error.message) : str(d.error)}`;
  if (/email_address_not_authorized/.test(code) || /not authorized/i.test(msg) && /email/i.test(msg)) {
    return {
      kind: "SENDER_RESTRICTED",
      httpStatus: 503,
      message: "We can't email this address yet — WM Pro's account emails are still limited to the team while our mail sender is being set up. Nothing is wrong with your address; please try again soon.",
      edge: "AUTH EMAIL SENDER RESTRICTED (Supabase built-in SMTP delivers only to org members — set a custom SMTP sender)",
    };
  }
  if (/over_email_send_rate_limit/.test(code) || (status === 429 && /email/i.test(`${code} ${msg}`))) {
    return {
      kind: "SEND_RATE_LIMITED",
      httpStatus: 429,
      message: "Too many account emails have gone out in the last hour. Wait a little, then press resend again.",
      edge: "AUTH EMAIL SEND RATE LIMITED (project-wide hourly cap of the built-in sender)",
    };
  }
  return null;
}
