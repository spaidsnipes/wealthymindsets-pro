"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, TrendingUp, Zap, Shield, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";

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
  const { signIn, signUp, loading } = useAuth();
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

  useEffect(() => { setError(""); setSuccess(""); }, [mode, email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "signup") {
      if (password !== confirm) { setError("Passwords don't match"); return; }
      if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
      setSubmitting(true);
      const result = await signUp(email, password);
      setSubmitting(false);
      if (result.error) {
        // User already exists — suggest sign in
        if (result.error.toLowerCase().includes("already") || result.error.toLowerCase().includes("exists")) {
          setError("An account with that email already exists. Try signing in instead.");
        } else {
          setError(result.error);
        }
      } else if (result.verificationRequired) {
        setSuccess("Check your email to verify your account, then return here to sign in.");
        setMode("login");
      }
      return;
    }

    if (mode === "login") {
      setSubmitting(true);
      const result = await signIn(email, password);
      setSubmitting(false);
      if (result.error) {
        // Friendly error messages
        const msg = result.error.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setError("Please check your email and confirm your account, then try again.");
        } else if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("password")) {
          setError("Incorrect email or password. Please try again.");
        } else {
          setError(result.error);
        }
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
        await res.json();
        setSuccess("If that email is registered, you'll receive a password reset link shortly. Check your inbox.");
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-wm-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-wm-green border-t-transparent animate-spin" />
      </div>
    );
  }

  const modeLabel = mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password";

  return (
    <div className="min-h-screen bg-wm-black flex overflow-hidden">

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0A0F17 0%, #0D1520 50%, #060C14 100%)" }}>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#00D4AA 1px, transparent 1px), linear-gradient(90deg, #00D4AA 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)" }} />

        <div className="relative z-10 p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #F0B429, #FF8C00)" }}>
              <span className="text-black font-black text-lg">W</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight">WealthyMindsets</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-wm-green/20 text-wm-green border border-wm-green/30">PRO</span>
          </div>

          <div className="text-[13px] font-black tracking-[0.2em] uppercase mb-4"
            style={{ color: "#00D4AA" }}>WealthyMindsets Pro</div>

          <h1 className="text-[46px] font-black text-white leading-[1.05] mb-8 tracking-tight">
            Change the way<br />
            you think and<br />
            you&apos;ll change the<br />
            <span style={{ background: "linear-gradient(135deg, #00D4AA, #F0B429)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              way you live.
            </span>
          </h1>

          <p className="text-[14px] text-[#8B95A5] leading-relaxed mb-10 max-w-sm">
            The all-in-one platform for serious traders — order flow, smart money, community, and creator tools.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.2)" }}>
                  <Icon size={15} className="text-wm-green" />
                </div>
                <span className="text-[13px] text-[#C5CDD8]">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 p-12 grid grid-cols-3 gap-6">
          {[["Real data","Market tools"],["Private","Trade journal"],["Source-aware","Analytics"]].map(([val, lbl]) => (
            <div key={lbl}>
              <div className="text-[22px] font-black text-white">{val}</div>
              <div className="text-[11px] text-[#5A6575] font-medium">{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ background: "#070A0F" }}>
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #F0B429, #FF8C00)" }}>
              <span className="text-black font-black text-sm">W</span>
            </div>
            <span className="text-white font-black text-lg">WealthyMindsets PRO</span>
          </div>

          {/* Mode tabs — hidden in forgot mode */}
          {mode !== "forgot" && (
            <div className="flex items-center gap-1 p-1 rounded-xl mb-8"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {(["login", "signup"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all"
                  style={mode === m
                    ? { background: "linear-gradient(135deg, #00D4AA, #00A896)", color: "#000" }
                    : { color: "#5A6575" }}>
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>
          )}

          {/* Back button in forgot mode */}
          {mode === "forgot" && (
            <button onClick={() => setMode("login")}
              className="flex items-center gap-2 text-[13px] text-[#5A6575] hover:text-wm-green transition-colors mb-8">
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

              <h2 className="text-[22px] font-black text-white mb-1">
                {mode === "login" ? "Welcome back" : mode === "signup" ? "Join WealthyMindsets" : "Reset your password"}
              </h2>
              <p className="text-[13px] text-[#5A6575] mb-7">
                {mode === "login"
                  ? "Sign in to access your trading dashboard"
                  : mode === "signup"
                  ? "Create your free account and start trading smarter"
                  : "Enter your email and we'll send you a reset link"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6575]" />
                    <input
                      type="email" required
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-white placeholder-[#3A4250] outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,212,170,0.5)")}
                      onBlur={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                  </div>
                </div>

                {/* Password — hidden in forgot mode */}
                {mode !== "forgot" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider">Password</label>
                      {mode === "login" && (
                        <button type="button" onClick={() => setMode("forgot")}
                          className="text-[11px] text-[#5A6575] hover:text-wm-green transition-colors">
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6575]" />
                      <input
                        type={showPw ? "text" : "password"} required
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                        className="w-full pl-10 pr-10 py-3 rounded-xl text-[13px] text-white placeholder-[#3A4250] outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,212,170,0.5)")}
                        onBlur={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                      />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6575] hover:text-[#8B95A5] transition-colors">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm password */}
                {mode === "signup" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8B95A5] uppercase tracking-wider mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6575]" />
                      <input
                        type={showPw ? "text" : "password"} required
                        value={confirm} onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat your password"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-white placeholder-[#3A4250] outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,212,170,0.5)")}
                        onBlur={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                      />
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                    style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.3)" }}>
                    <AlertCircle size={13} className="text-wm-red shrink-0" />
                    <span className="text-[12px] text-wm-red">{error}</span>
                  </div>
                )}

                {/* Success */}
                {success && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
                    style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)" }}>
                    <CheckCircle size={13} className="text-wm-green shrink-0 mt-0.5" />
                    <span className="text-[12px] text-wm-green">{success}</span>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={submitting}
                  className="w-full py-3.5 rounded-xl font-black text-[14px] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 mt-2"
                  style={{ background: "linear-gradient(135deg, #00D4AA, #00A896)", color: "#000" }}>
                  {submitting
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-black/40 border-t-black animate-spin" />
                        {mode === "signup" ? "Creating account…" : mode === "forgot" ? "Sending reset link…" : "Signing in…"}
                      </span>
                    : modeLabel + " →"
                  }
                </button>

                {/* Terms */}
                {mode === "signup" && (
                  <p className="text-[11px] text-[#3A4250] text-center mt-3">
                    Terms of Service and Privacy Policy documents must be published before public enrollment.
                  </p>
                )}
              </form>

              <div className="flex items-center gap-2 mt-6 px-3 py-2 rounded-lg"
                style={{ background: "rgba(0,212,170,0.05)", border: "1px solid rgba(0,212,170,0.1)" }}>
                <CheckCircle size={12} className="text-wm-green shrink-0" />
                <span className="text-[10px] text-[#5A6575]">
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
