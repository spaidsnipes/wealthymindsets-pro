/**
 * classifySignInFailure — decides what a failed sign-in is allowed to tell a
 * human, and is the only place that decision is made.
 *
 * The defect this closes: the login form used to recognise "wrong password" by
 * searching the server's prose for "invalid", "credentials" or "password". Any
 * SYSTEM failure whose wording happened to contain one of those words was then
 * rewritten as "Incorrect email or password". That is reachable, not
 * hypothetical — when Supabase rejects the API key the route answers
 * `Supabase rejected the API key: "Invalid API key"`, which contains "invalid",
 * so a misconfigured host told every reader to doubt a password that was never
 * wrong. Monday Test 2: name the actual proven failure class.
 *
 * The server already separates these cases structurally, so judge the
 * structure and never the prose:
 *   - a credentials rejection is 401 with no `edge`
 *   - every configuration/transport failure carries an `edge` the route chose
 *     deliberately (NOT CONFIGURED, AUTH KEY REJECTED, AUTH BACKEND
 *     UNREACHABLE, AUTH BACKEND MISDIRECTED)
 *
 * Pure and total, so the mapping is testable without a network.
 */

export type SignInFailureKind = "UNCONFIRMED_EMAIL" | "BAD_CREDENTIALS" | "SERVER";

export interface SignInFailure {
  readonly kind: SignInFailureKind;
  readonly message: string;
}

/** The exact strings GoTrue uses. Matched narrowly so nothing else is reworded. */
const UNCONFIRMED_EMAIL = /email not confirmed/i;
const BAD_CREDENTIALS = /invalid login credentials|invalid credentials|invalid email or password/i;

export function classifySignInFailure(input: {
  readonly status: number;
  readonly edge?: string | null;
  readonly error?: string | null;
}): SignInFailure {
  const raw = (input.error ?? "").trim();

  // An `edge` means the route has already named the condition precisely. A
  // friendlier guess on top of it can only be less true.
  if (input.edge) {
    return { kind: "SERVER", message: raw || `Sign-in is unavailable (${input.edge}).` };
  }

  if (input.status === 401) {
    if (UNCONFIRMED_EMAIL.test(raw)) {
      return {
        kind: "UNCONFIRMED_EMAIL",
        message: "Please check your email and confirm your account, then try again.",
      };
    }
    if (BAD_CREDENTIALS.test(raw)) {
      return { kind: "BAD_CREDENTIALS", message: "Incorrect email or password. Please try again." };
    }
    // A 401 the backend worded some other way — pass it through rather than
    // assuming which of the two fields the reader should go and change.
    return { kind: "SERVER", message: raw || "Sign-in was rejected." };
  }

  return { kind: "SERVER", message: raw || `Sign-in failed (HTTP ${input.status}).` };
}
