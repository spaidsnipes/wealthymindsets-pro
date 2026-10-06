/**
 * What GoTrue's POST /auth/v1/signup actually answered (sign-in lane 2026-10-06).
 *
 * The sign-up route read `data.user` and `data.error.message`. GoTrue does not
 * answer in that shape in the two cases a new member meets first:
 *
 *   - Email confirmation ON (Supabase's default): the body IS the user —
 *     `{ id, email, identities, … }` with no `user` key and no session. The
 *     route answered 502 "Signup service returned an invalid response" while
 *     the account had been created and the confirmation email sent.
 *   - Errors arrive as `{ code, error_code, msg }` (current GoTrue) or
 *     `{ error, error_description }` (older), not `{ error: { message } }`.
 *     The commonest one — the built-in mailer's hourly cap,
 *     `over_email_send_rate_limit` — fell through to the same false 502.
 *
 * An address that already has an account comes back as an obfuscated user with
 * an empty `identities` array and no email is sent; saying "check your email"
 * there leaves the person waiting for nothing.
 */
export type SignupOutcome =
  | { kind: "SESSION"; user: { id: string; email?: string }; accessToken: string }
  | { kind: "VERIFICATION_REQUIRED"; user: { id: string; email?: string } }
  | { kind: "ALREADY_REGISTERED" }
  | { kind: "REJECTED"; httpStatus: number; message: string }
  | { kind: "MALFORMED" };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function interpretSignupResponse(status: number, data: unknown): SignupOutcome {
  if (!isObj(data)) return { kind: "MALFORMED" };

  const nested = isObj(data.error) ? str(data.error.message) : undefined;
  const message = nested ?? str(data.msg) ?? str(data.error_description) ?? str(data.message) ?? str(data.error);
  const code = str(data.error_code) ?? (isObj(data.error) ? str(data.error.code) : undefined) ?? "";
  const session = isObj(data.session) ? data.session : undefined;
  const accessToken = str(data.access_token) ?? (session ? str(session.access_token) : undefined);
  const user = isObj(data.user) ? data.user : (str(data.id) ? data : undefined);

  if (!user || !str(user.id)) {
    if (!message && !code) return { kind: "MALFORMED" };
    if (/rate_limit/.test(code) || status === 429) {
      return {
        kind: "REJECTED",
        httpStatus: 429,
        message: /email/.test(code) || /email/i.test(message ?? "")
          ? "Too many sign-up emails have been sent in the last hour. Wait a little, then try again — or sign in if you already confirmed an account."
          : "Too many attempts just now. Wait a few minutes and try again.",
      };
    }
    if (/user_already_exists|email_exists/.test(code) || /already (been )?registered|already exists/i.test(message ?? "")) {
      return { kind: "ALREADY_REGISTERED" };
    }
    if (/weak_password/.test(code)) {
      return { kind: "REJECTED", httpStatus: 422, message: message ?? "Choose a stronger password." };
    }
    if (/email_address_invalid|validation_failed/.test(code)) {
      return { kind: "REJECTED", httpStatus: 400, message: "That email address was not accepted. Check it for typos and try again." };
    }
    return { kind: "REJECTED", httpStatus: status >= 400 && status < 500 ? status : 400, message: message ?? "Sign-up was rejected." };
  }

  const who = { id: str(user.id) as string, email: str(user.email) };
  if (accessToken) return { kind: "SESSION", user: who, accessToken };
  if (Array.isArray(user.identities) && user.identities.length === 0) return { kind: "ALREADY_REGISTERED" };
  return { kind: "VERIFICATION_REQUIRED", user: who };
}
