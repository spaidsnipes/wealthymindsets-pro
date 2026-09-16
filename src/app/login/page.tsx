"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, TrendingUp, Zap, Shield, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { classifySignInFailure } from "@/lib/signInErrorMessage";
import { useSearchParams } from "next/navigation";
import WmWordmark from "@/components/brand/WmWordmark";
import { WM } from "@/lib/design/wmTokens";

/**
 * THE FRONT DOOR IS PART OF THE SANCTUARY.
 *
 * This route was never migrated onto the design system. It carried its own
 * private palette — #070A0F / #0A0F17 surfaces, #8B95A5 / #C5CDD8 / #5A6575
 * slate-blue text, and #00D4AA as the identity accent — none of which are WM
 * tokens. Measured on the running app at 1512x900 before this change: 18
 * elements painted rgb(0,212,170) on the first screen a trader ever sees.
 *
 * Two separate problems, and the second is the serious one:
 *
 *   1. ATMOSPHERE. A gold crest on the left and a mint-teal call to action on
 *      the right is not one room. The door read like a generic fintech
 *      template that happened to have the WM crest pasted into it.
 *
 *   2. §9 — "GOLD is identity metal only." #00D4AA is `wm-green`, a MARKET
 *      SEMANTIC token: it means up / buy / direction elsewhere in the product.
 *      Spending it as the brand and CTA colour on the entrance teaches the
 *      trader the wrong vocabulary before they have seen a single price, and
 *      puts a green "safe" shield ("Secured with…") on the door — the exact
 *      pre-attentive claim §9 exists to forbid.
 *
 * So the door now speaks the room's language: near-black depth, ivory
 * information, brass structure and brass confirmation. Green is not banned
 * from the product — it keeps carrying DIRECTION where direction is the fact.
 * It simply stops being the identity metal.
 *
 * Nothing about authentication behaviour changes here. This commit moves
 * colour, not credentials.
 */

const FEATURES = [
  { icon: TrendingUp, text: "Professional order flow charts" },
  { icon: Zap,        text: "Live market data with source-aware tools" },
  { icon: Shield,     text: "Order flow and volume analysis" },
];

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-wm-black" />}>
      <LoginPage />
    </Suspense>
  );
}

type Mode = "login" | "signup" | "forgot";

function LoginPage() {
  const { signIn, signUp, resendConfirmation, loading } = useAuth();
  const searchParams = useSearchParams();

  const [mode,       setMode]       = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resending, setResending] = useState(false);
  const confirmationHandled = useRef(false);

  useEffect(() => { setError(""); setSuccess(""); }, [mode, email, password]);

  useEffect(() => {
    if (confirmationHandled.current || typeof window === "undefined") return;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const hashError = fragment.get("error_description");
    if (!accessToken) {
      if (hashError) setError(decodeURIComponent(hashError.replace(/\+/g, " ")));
      if (searchParams.get("auth_error") === "expired_confirmation") setError("That confirmation link has expired. Request a fresh email and try again.");
      if (searchParams.get("auth_error") === "invalid_confirmation") setError("That confirmation link is not valid. Request a fresh email and try again.");
      if (searchParams.get("confirmed") === "1") setSuccess("Your email is verified. Sign in to open your WOW World workspace.");
      return;
    }
    confirmationHandled.current = true;
    window.history.replaceState({}, document.title, `${window.location.pathname}?confirmed=1`);
    setSubmitting(true);
    void fetch("/api/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ accessToken }),
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Your email was verified, but the WOW World session could not be created.");
      window.location.assign("/command-deck");
    }).catch(error => {
      setError(error instanceof Error ? error.message : "Your verification could not be completed.");
      setSubmitting(false);
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "signup") {
      if (password !== confirm) { setError("Passwords don't match"); return; }
      if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
      setSubmitting(true);
      const result = await signUp(email, password).finally(() => setSubmitting(false));
      if (result.error) {
        // User already exists — suggest sign in
        if (result.error.toLowerCase().includes("already") || result.error.toLowerCase().includes("exists")) {
          setError("An account with that email already exists. Try signing in instead.");
        } else {
          setError(result.error);
        }
      } else if (result.verificationRequired) {
        setVerificationEmail(email.trim().toLowerCase());
        setVerificationCode("");
        setSuccess("Check your email. Open the confirmation link here, or enter the six-digit code below on this same device.");
      }
      return;
    }

    if (mode === "login") {
      setSubmitting(true);
      const result = await signIn(email, password).finally(() => setSubmitting(false));
      if (result.error) {
        const failure = classifySignInFailure({
          status: result.status ?? 0,
          edge: result.edge,
          error: result.error,
        });
        if (failure.kind === "UNCONFIRMED_EMAIL") setVerificationEmail(email.trim().toLowerCase());
        setError(failure.message);
      }
      return;
    }

    if (mode === "forgot") {
      setSubmitting(true);
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({})) as { error?: string };
        // Truth surface: on a non-2xx (e.g. 503 NOT CONFIGURED naming missing
        // Supabase vars), show the server's actual reason instead of the "check
        // your inbox" success message — the Founder-reported "sign-in email
        // fails" pattern was masked by this exact optimism.
        if (!res.ok) {
          setError(data.error || `Password recovery failed (HTTP ${res.status}).`);
        } else {
          setSuccess("If that email is registered, you'll receive a password reset link shortly. Check your inbox.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const verifyEmailCode = async () => {
    if (!verificationEmail || !verificationCode.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: verificationEmail, token: verificationCode.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Your code could not be verified.");
      window.location.assign("/command-deck");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your code could not be verified.");
      setSubmitting(false);
    }
  };

  const resendVerificationEmail = async () => {
    const targetEmail = (verificationEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      setError("Enter your email address first.");
      return;
    }
    if (resending) return;
    setError("");
    setSuccess("");
    setResending(true);
    const result = await resendConfirmation(targetEmail).finally(() => setResending(false));
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess("If confirmation is still pending and resend is available, you'll receive a fresh email shortly. Check your inbox and spam folder.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-wm-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: WM.gold.mark, borderTopColor: "transparent" }} />
      </div>
    );
  }

  const modeLabel = mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password";

  return (
    <div className="min-h-screen bg-wm-black flex overflow-hidden">

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${WM.surface.deep} 0%, ${WM.surface.mid} 50%, ${WM.surface.deepest} 100%)` }}>

        {/* Grid overlay — brass ruling, not a teal blueprint. Kept at 4% so it
            reads as material texture rather than as a chart. */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `linear-gradient(${WM.gold.mark} 1px, transparent 1px), linear-gradient(90deg, ${WM.gold.mark} 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

        {/* Practical light — one warm brass wash behind the crest. The same
            "localized practical state lighting" the sanctuary uses, static:
            the door is not a place where anything is arriving. */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: `radial-gradient(circle, ${WM.halo.gold} 0%, transparent 70%)` }} />

        <div className="relative z-10 p-12">
          {/* Master crest — the REAL delivered hero mark (faceless gentleman +
              WM medallion + jeweled crown + wordmark + "STAY SHARP. STAY A
              STUDENT.", founder Drive kit 2026-08-24). This is the one surface
              the founder named for the full crest; kept to a calm hero size so
              WM Pro reads professional, never plastered. */}
          <div className="mb-12">
            <img
              src="/brand/wm-master-crest.jpeg"
              alt="WEALTHY MINDSETS — Stay Sharp. Stay a Student."
              style={{ height: 300, width: "auto", display: "block" }}
            />
            <div
              className="mt-4"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 11,
                letterSpacing: 1.6,
                color: "#8a8271",
                textTransform: "uppercase",
              }}
            >
              One Identity · One Kingdom · Unlimited Realms
            </div>
          </div>

          <div
            className="mb-4"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 13,
              letterSpacing: 0.36,
              color: "#c9a55c",
              textTransform: "uppercase",
              fontWeight: 400,
            }}
          >
            Trading Command Center
          </div>

          <h1 className="text-[46px] font-black leading-[1.05] mb-8 tracking-tight" style={{ color: WM.text.hero }}>
            Professional Trading<br />
            {/* Was teal→amber. The gradient now runs through the brass family
                only, so the one emphasised phrase on the door is identity
                metal rather than a market colour. */}
            <span style={{ background: `linear-gradient(135deg, ${WM.gold.hero}, ${WM.gold.halo})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Operating System
            </span>
          </h1>

          <p className="text-[14px] leading-relaxed mb-10 max-w-sm" style={{ color: WM.text.muted }}>
            The all-in-one platform for serious traders — order flow, smart money, community, and creator tools.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: WM.halo.gold, border: `1px solid ${WM.border.line}` }}>
                  <Icon size={15} style={{ color: WM.gold.mark }} />
                </div>
                <span className="text-[13px]" style={{ color: WM.text.body }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 p-12 grid grid-cols-3 gap-6">
          {[["Real data","Market tools"],["Private","Trade journal"],["Source-aware","Analytics"]].map(([val, lbl]) => (
            <div key={lbl}>
              <div className="text-[22px] font-black" style={{ color: WM.text.hero }}>{val}</div>
              <div className="text-[11px] font-medium" style={{ color: WM.text.muted }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ background: WM.surface.deepest }}>
        <div className="w-full max-w-[420px]">

          {/* Mobile brand — the compact WM wordmark (serif crown identity)
              matches the desktop-side hero wordmark and the app shell.
              The previous orange gradient "W" tile + generic sans copy
              read like a legacy dashboard, not the trading OS identity. */}
          <div className="mb-8 lg:hidden">
            <WmWordmark size="compact" subtitle="TRADING OPERATING SYSTEM" />
          </div>

          {/* Mode tabs — hidden in forgot mode */}
          {mode !== "forgot" && (
            <div className="flex items-center gap-1 p-1 rounded-xl mb-8"
              style={{ background: WM.surface.mid, border: `1px solid ${WM.border.hair}` }}>
              {(["login", "signup"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex-1 py-3 rounded-lg text-[13px] font-bold transition-all"
                  style={mode === m
                    ? { background: WM.surface.raised, color: WM.gold.hero, border: `1px solid ${WM.border.strong}` }
                    : { color: WM.text.muted }}>
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>
          )}

          {/* Back button in forgot mode */}
          {mode === "forgot" && (
            <button onClick={() => setMode("login")}
              className="flex items-center gap-2 text-[13px] transition-colors mb-8 hover:opacity-80"
              style={{ color: WM.text.muted }}>
              <ArrowLeft size={14} />
              Back to Sign In
            </button>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}>

              <h2 className="text-[22px] font-black mb-1" style={{ color: WM.text.hero }}>
                {mode === "login" ? "Welcome back" : mode === "signup" ? "Open your Operating System" : "Reset your password"}
              </h2>
              <p className="text-[13px] mb-7" style={{ color: WM.text.muted }}>
                {mode === "login"
                  ? "Sign in to open your trading operating system."
                  : mode === "signup"
                  ? "Create your account and start trading with real evidence, honest UNKNOWN, and durable memory."
                  : "Enter your email and we'll send you a reset link"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="wm-login-email" className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: WM.text.muted }}>Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: WM.text.muted }} />
                    <input
                      id="wm-login-email" name="email"
                      type="email" required autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-[#ede6d3] placeholder-[#55503f] outline-none transition-all"
                      style={{ background: WM.surface.mid, border: `1px solid ${WM.border.hair}` }}
                      onFocus={e => (e.currentTarget.style.borderColor = WM.border.strong)}
                      onBlur={e  => (e.currentTarget.style.borderColor = WM.border.hair)}
                    />
                  </div>
                </div>

                {/* Password — hidden in forgot mode */}
                {mode !== "forgot" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="wm-login-password" className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: WM.text.muted }}>Password</label>
                      {mode === "login" && (
                        <button type="button" onClick={() => setMode("forgot")}
                          className="py-3.5 text-[11px] transition-colors hover:opacity-80" style={{ color: WM.text.muted }}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: WM.text.muted }} />
                      <input
                        id="wm-login-password" name="password"
                        type={showPw ? "text" : "password"} required
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                        className="w-full pl-10 pr-10 py-3 rounded-xl text-[13px] text-[#ede6d3] placeholder-[#55503f] outline-none transition-all"
                        style={{ background: WM.surface.mid, border: `1px solid ${WM.border.hair}` }}
                        onFocus={e => (e.currentTarget.style.borderColor = WM.border.strong)}
                        onBlur={e  => (e.currentTarget.style.borderColor = WM.border.hair)}
                      />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        aria-label={showPw ? "Hide password" : "Show password"}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-4 transition-colors hover:opacity-80" style={{ color: WM.text.muted }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm password */}
                {mode === "signup" && (
                  <div>
                    <label htmlFor="wm-login-confirm" className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: WM.text.muted }}>Confirm Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: WM.text.muted }} />
                      <input
                        id="wm-login-confirm" name="confirm-password"
                        type={showPw ? "text" : "password"} required autoComplete="new-password"
                        value={confirm} onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat your password"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-[#ede6d3] placeholder-[#55503f] outline-none transition-all"
                        style={{ background: WM.surface.mid, border: `1px solid ${WM.border.hair}` }}
                        onFocus={e => (e.currentTarget.style.borderColor = WM.border.strong)}
                        onBlur={e  => (e.currentTarget.style.borderColor = WM.border.hair)}
                      />
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div role="alert" aria-live="assertive" className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                    style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.3)" }}>
                    <AlertCircle size={13} className="text-wm-red shrink-0" />
                    <span className="text-[12px] text-wm-red">{error}</span>
                  </div>
                )}

                {/* Success */}
                {success && (
                  <div role="status" aria-live="polite" className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
                    style={{ background: WM.halo.gold, border: `1px solid ${WM.border.line}` }}>
                    <CheckCircle size={13} className="shrink-0 mt-0.5" style={{ color: WM.gold.mark }} />
                    <span className="text-[12px]" style={{ color: WM.gold.mark }}>{success}</span>
                  </div>
                )}

                {verificationEmail && (
                  <div className="space-y-2 rounded-xl p-3" style={{ background: WM.surface.mid, border: `1px solid ${WM.border.line}` }}>
                    <label htmlFor="wm-login-otp" className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: WM.text.muted }}>Email confirmation code</label>
                    <input
                      id="wm-login-otp" name="one-time-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={verificationCode}
                      onChange={event => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="6-digit code"
                      className="w-full px-4 py-3 rounded-xl text-[15px] tracking-[0.35em] text-[#ede6d3] placeholder-[#55503f] outline-none"
                      style={{ background: WM.surface.mid, border: `1px solid ${WM.border.hair}` }}
                    />
                    <button type="button" onClick={() => void verifyEmailCode()} disabled={submitting || !verificationCode.trim()} className="w-full py-2.5 rounded-xl text-[13px] font-black disabled:opacity-60" style={{ background: WM.halo.gold, border: `1px solid ${WM.border.strong}`, color: WM.gold.hero }}>
                      Verify this device
                    </button>
                    <button type="button" onClick={() => void resendVerificationEmail()} disabled={resending} className="w-full py-2.5 rounded-xl text-[12px] font-bold disabled:opacity-60" style={{ border: `1px solid ${WM.border.hair}`, color: WM.text.body }}>
                      {resending ? "Requesting a fresh email…" : "Resend confirmation email"}
                    </button>
                    <p className="text-[11px]" style={{ color: WM.text.muted }}>Only enter a code from your own WealthyMindsets email. The code creates a secure session in this browser.</p>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={submitting} aria-busy={submitting}
                  className="w-full py-3.5 rounded-xl font-black text-[14px] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 mt-2"
                  style={{ background: `linear-gradient(135deg, ${WM.gold.hero}, ${WM.gold.line})`, color: WM.surface.deepest }}>
                  {submitting
                    ? <span className="flex items-center justify-center gap-2">
                        <span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-black/40 border-t-black animate-spin" />
                        {mode === "signup" ? "Creating account…" : mode === "forgot" ? "Sending reset link…" : "Signing in…"}
                      </span>
                    : modeLabel + " →"
                  }
                </button>

                {mode === "login" && !verificationEmail && (
                  <button type="button" onClick={() => void resendVerificationEmail()} disabled={resending}
                    className="w-full min-h-11 text-[12px] font-semibold transition-colors hover:opacity-80 disabled:opacity-60" style={{ color: WM.text.muted }}>
                    {resending ? "Requesting a fresh email…" : "Didn't receive your confirmation email? Resend it"}
                  </button>
                )}

                {/* Terms. `text.dim` measures 2.53:1 on the deepest surface —
                    below AA. This is a legal statement about enrollment, so it
                    gets `text.muted` (5.35:1). The old #3A4250 was dimmer still. */}
                {mode === "signup" && (
                  <p className="text-[11px] text-center mt-3" style={{ color: WM.text.muted }}>
                    Terms of Service and Privacy Policy documents must be published before public enrollment.
                  </p>
                )}
              </form>

              <div className="flex items-center gap-2 mt-6 px-3 py-2 rounded-lg"
                style={{ background: WM.surface.deep, border: `1px solid ${WM.border.hair}` }}>
                <CheckCircle size={12} className="shrink-0" style={{ color: WM.gold.mark }} />
                <span className="text-[10px]" style={{ color: WM.text.muted }}>
                  Secured with PBKDF2-SHA512 encryption · 30-day sessions
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
