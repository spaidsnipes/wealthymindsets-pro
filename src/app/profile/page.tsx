"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Settings, Edit3, Music, TrendingUp, Users, Star, Shield, Zap, Play, Heart, Share2, BarChart2, Save, X, CheckCircle, Coins, Rocket, ExternalLink, Plus } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { useWMS, WMS_CONTRACT } from "@/contexts/WMSContext";
import { useAuth } from "@/contexts/AuthContext";
import { isCoreTeam } from "@/lib/coreTeam";


interface ProfileData {
  name: string;
  handle: string;
  bio: string;
  email: string;
  timezone: string;
  botName: string;
}

const EMPTY_PROFILE: ProfileData = {
  name: "", handle: "", bio: "", email: "", timezone: "America/New_York", botName: "SpaidBot",
};

interface TradeRow { sym: string; dir: string; entry: string; exit: string; pnl: string; rr: string; date: string; }
interface LikedTrack { title: string; artist: string; duration: string; }

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"trades" | "music" | "posts" | "coins">("trades");
  const { wmsBalance, creatorCoin, totalEarned, recentEarnings, launchCreatorCoin, isDeployed } = useWMS();
  const { user, updateProfile: saveToAuth } = useAuth();
  const [showLaunchCoin, setShowLaunchCoin] = useState(false);
  const [newCoin, setNewCoin] = useState({ name: "", symbol: "", supply: 1000000, feeRate: 300, category: "Trading" });
  const [editMode, setEditMode] = useState(false);
  // Setup/onboarding only for genuinely-new users. A saved profile in
  // localStorage is authoritative — we must NOT drop into the empty setup form
  // just because the auth guard appended ?setup=1 (profileComplete doesn't
  // always survive a refresh), otherwise the profile appears to "reset".
  const [setupMode, setSetupMode] = useState(() => {
    if (typeof window === "undefined") return false;
    try { if (localStorage.getItem("wm-profile")) return false; } catch {}
    return window.location.search.includes("setup=1");
  });
  const [bgColor, setBgColor] = useState("#070A0F");
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [recentTrades, setRecentTrades] = useState<TradeRow[]>([]);
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);

  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [editProfile, setEditProfile] = useState<ProfileData>(EMPTY_PROFILE);

  // Seed profile from the auth user (the ACCOUNT) so it follows the user across
  // devices/logins — not just this browser's localStorage. Only non-empty
  // account values overwrite, so a fresh unsaved local edit is never clobbered
  // by a stale /api/auth/me poll. On a brand-new device (no local profile yet)
  // we also RESTORE localStorage from the account and leave setup, so the saved
  // profile — including bot name + prefs — reappears instead of an empty form.
  useEffect(() => {
    if (!user) return;
    const fromAuth: Partial<ProfileData> = { email: user.email };
    if (user.displayName) fromAuth.name = user.displayName;
    if (user.handle)      fromAuth.handle = user.handle;
    if (user.bio)         fromAuth.bio = user.bio;
    if (user.botName)     fromAuth.botName = user.botName;
    if (user.timezone)    fromAuth.timezone = user.timezone;
    setProfile(p => ({ ...p, ...fromAuth }));
    setEditProfile(p => ({ ...p, ...fromAuth }));
    if (user.avatar)  setAvatarUrl(user.avatar);
    if (user.bgColor) setBgColor(user.bgColor);

    try {
      const hasLocal = !!localStorage.getItem("wm-profile");
      if (!hasLocal && user.profileComplete && user.displayName) {
        const restored: ProfileData = {
          name:     user.displayName,
          handle:   user.handle ?? "",
          bio:      user.bio ?? "",
          email:    user.email,
          timezone: user.timezone ?? "America/New_York",
          botName:  user.botName ?? "SpaidBot",
        };
        localStorage.setItem("wm-profile", JSON.stringify(restored));
        if (user.avatar)  localStorage.setItem("wm-profile-avatar", user.avatar);
        if (user.bgColor) localStorage.setItem("wm-profile-bg", user.bgColor);
        setSetupMode(false);
      }
    } catch {}
  }, [user]);

  // Load everything from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wm-profile");
      if (saved) {
        const p = JSON.parse(saved);
        setProfile(p);
        setEditProfile(p);
      } else {
        // First time — open setup
        setSetupMode(true);
        setEditProfile(EMPTY_PROFILE);
      }
      const savedBg = localStorage.getItem("wm-profile-bg");
      if (savedBg) setBgColor(savedBg);
      const savedAvatar = localStorage.getItem("wm-profile-avatar");
      if (savedAvatar) setAvatarUrl(savedAvatar);

      // Load liked radio tracks
      const liked = JSON.parse(localStorage.getItem("wm-radio-liked") ?? "[]") as LikedTrack[];
      setLikedTracks(liked);

      // Load recent trades from journal + paper trading
      const journalRaw = JSON.parse(localStorage.getItem("wm_journal_entries") ?? "[]") as Array<{
        symbol?: string; direction?: string; entryPrice?: number; exitPrice?: number; pnl?: number; rr?: number; date?: string; createdAt?: string;
      }>;
      const paperState = JSON.parse(localStorage.getItem("wm_paper_state") ?? "null");
      const paperTrades: Array<{ symbol?: string; side?: string; entryPrice?: number; exitPrice?: number; pnl?: number; rr?: number; closedAt?: string; }> = paperState?.trades ?? [];

      const trades: TradeRow[] = [
        ...journalRaw.filter(t => t.pnl !== undefined).map(t => ({
          sym: t.symbol ?? "—",
          dir: t.direction ?? "LONG",
          entry: t.entryPrice != null ? String(t.entryPrice) : "—",
          exit: t.exitPrice != null ? String(t.exitPrice) : "—",
          pnl: t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}$${Math.abs(t.pnl).toFixed(0)}` : "—",
          rr: t.rr != null ? `${t.rr.toFixed(1)}R` : "—",
          date: t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
        })),
        ...paperTrades.filter(t => t.pnl !== undefined).map(t => ({
          sym: t.symbol ?? "—",
          dir: (t.side ?? "LONG").toUpperCase(),
          entry: t.entryPrice != null ? String(t.entryPrice) : "—",
          exit: t.exitPrice != null ? String(t.exitPrice) : "—",
          pnl: t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}$${Math.abs(t.pnl).toFixed(0)}` : "—",
          rr: t.rr != null ? `${t.rr.toFixed(1)}R` : "—",
          date: t.closedAt ? new Date(t.closedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
        })),
      ].slice(0, 20);
      setRecentTrades(trades);
    } catch {}
  }, []);

  // Compute stats from paper trading & journal
  const [stats, setStats] = useState({ winRate: "—", avgRR: "—", netPnl: "—", trades: "0" });
  useEffect(() => {
    try {
      const journalEntries = JSON.parse(localStorage.getItem("wm_journal_entries") ?? "[]") as Array<{ pnl?: number }>;
      const paperState = JSON.parse(localStorage.getItem("wm_paper_state") ?? "null");
      const paperTrades: Array<{ pnl?: number }> = paperState?.trades ?? [];
      const closedTrades = [...journalEntries, ...paperTrades].filter(t => t.pnl !== undefined);
      if (closedTrades.length > 0) {
        const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0).length;
        const losses = closedTrades.filter(t => (t.pnl ?? 0) < 0).length;
        const wr = Math.round((wins / closedTrades.length) * 100);
        const netPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
        const avgWin = wins > 0 ? closedTrades.filter(t => (t.pnl ?? 0) > 0).reduce((s, t) => s + (t.pnl ?? 0), 0) / wins : 0;
        const avgLoss = losses > 0 ? Math.abs(closedTrades.filter(t => (t.pnl ?? 0) < 0).reduce((s, t) => s + (t.pnl ?? 0), 0) / losses) : 1;
        const rr = avgLoss > 0 ? (avgWin / avgLoss).toFixed(1) : "—";
        setStats({
          winRate: `${wr}%`,
          avgRR: rr !== "—" ? `${rr}:1` : "—",
          netPnl: `${netPnl >= 0 ? "+" : ""}$${Math.abs(netPnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
          trades: String(closedTrades.length),
        });
      }
    } catch {}
  }, []);

  const saveProfile = async () => {
    if (!editProfile.name.trim()) { toast.error("Please enter your name."); return; }
    if (!editProfile.handle.trim()) { toast.error("Please enter a handle."); return; }
    const saved = { ...editProfile, handle: editProfile.handle.startsWith("@") ? editProfile.handle : `@${editProfile.handle}` };
    setProfile(saved);
    setEditProfile(saved);
    try { localStorage.setItem("wm-profile", JSON.stringify(saved)); } catch {}
    // Persist to auth JWT cookie
    await saveToAuth({
      displayName:     saved.name,
      handle:          saved.handle,
      bio:             saved.bio,
      avatar:          avatarUrl ?? undefined,
      botName:         saved.botName,
      timezone:        saved.timezone,
      bgColor:         bgColor,
      profileComplete: true,
    });
    setEditMode(false);
    setSetupMode(false);
    toast.success("Profile saved!", { icon: "✅" });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setAvatarUrl(url);
      try { localStorage.setItem("wm-profile-avatar", url); } catch {}
      saveToAuth({ avatar: url }).catch(() => {});
    };
    reader.readAsDataURL(file);
  };

  const changeBg = (c: string) => {
    setBgColor(c);
    try { localStorage.setItem("wm-profile-bg", c); } catch {}
  };

  const exportData = () => {
    try {
      const positions = JSON.parse(localStorage.getItem("wm-paper-positions") ?? "[]");
      const rows = [["Symbol","Side","AvgPx","Qty"], ...positions.map((p: { symbol: string; qty: number; avgPx: number }) => [p.symbol, p.qty > 0 ? "LONG" : "SHORT", p.avgPx, Math.abs(p.qty)])];
      const csv = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "wm-paper-positions.csv";
      a.click();
      toast.success("CSV exported!", { icon: "📥" });
    } catch {
      toast.error("No paper trading data to export.");
    }
  };

  const STAT_LIST = [
    { label: "Win Rate", val: stats.winRate, color: "#00D4AA" },
    { label: "Avg R:R",  val: stats.avgRR,   color: "#F0B429" },
    { label: "Net P&L",  val: stats.netPnl,  color: "#00D4AA" },
    { label: "Trades",   val: stats.trades,  color: "#4FA3E0" },
  ];

  // ── Setup / onboarding modal ─────────────────────────────────
  if (setupMode) {
    return (
      <div className="flex flex-col h-full bg-wm-black items-center p-6 overflow-y-auto">
        <div className="w-full max-w-md glass rounded-2xl p-6 space-y-5 my-auto shrink-0">
          <div className="text-center">
            <div className="text-3xl mb-2">👋</div>
            <h2 className="text-xl font-black text-wm-text">Set Up Your Profile</h2>
            <p className="text-xs text-wm-text-muted mt-1">This is your space — make it yours.</p>
          </div>

          {/* Avatar upload */}
          <div className="flex justify-center">
            <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl text-wm-black border-4 border-wm-border overflow-hidden"
                style={{ background: avatarUrl ? undefined : "linear-gradient(135deg, #00D4AA, #4FA3E0)" }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : (editProfile.name.charAt(0).toUpperCase() || "?")}
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-bold">Upload</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-wm-text-dim uppercase tracking-wider font-bold block mb-1">Display Name *</label>
              <input value={editProfile.name} onChange={e => setEditProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. John Trader" autoFocus
                className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-green/50" />
            </div>
            <div>
              <label className="text-[10px] text-wm-text-dim uppercase tracking-wider font-bold block mb-1">Handle *</label>
              <input value={editProfile.handle} onChange={e => setEditProfile(p => ({ ...p, handle: e.target.value }))}
                placeholder="@yourhandle"
                className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-green/50" />
            </div>
            <div>
              <label className="text-[10px] text-wm-text-dim uppercase tracking-wider font-bold block mb-1">Bio</label>
              <textarea value={editProfile.bio} onChange={e => setEditProfile(p => ({ ...p, bio: e.target.value }))}
                placeholder="Tell the community about your trading style…" rows={3}
                className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-green/50 resize-none" />
            </div>
            <div>
              <label className="text-[10px] text-wm-text-dim uppercase tracking-wider font-bold block mb-1">Email</label>
              <input value={editProfile.email} onChange={e => setEditProfile(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com" type="email"
                className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-green/50" />
            </div>
            <div>
              <label className="text-[10px] text-wm-text-dim uppercase tracking-wider font-bold block mb-1">Timezone</label>
              <select value={editProfile.timezone} onChange={e => setEditProfile(p => ({ ...p, timezone: e.target.value }))}
                className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-wm-green/50">
                {["America/New_York","America/Chicago","America/Los_Angeles","Europe/London","Asia/Tokyo","Australia/Sydney"].map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#7C3AED] uppercase tracking-wider font-bold block mb-1">AI Bot Name</label>
              <input value={editProfile.botName} onChange={e => setEditProfile(p => ({ ...p, botName: e.target.value }))}
                placeholder="e.g. SpaidBot" maxLength={24}
                className="w-full bg-wm-surface border border-[#7C3AED]/30 rounded-lg px-3 py-2 text-sm text-wm-text outline-none focus:border-[#7C3AED]/60" />
            </div>
          </div>

          <button onClick={saveProfile}
            className="w-full py-3 rounded-xl bg-wm-green text-wm-black font-black text-sm hover:opacity-90 transition-all">
            Create My Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-wm-black overflow-y-auto">
      {/* Profile banner */}
      <div className="relative shrink-0" style={{
        height: 140,
        background: `linear-gradient(135deg, ${bgColor} 0%, #00D4AA18 50%, #8B5CF618 100%)`,
        borderBottom: "1px solid #252D38",
      }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "repeating-linear-gradient(45deg, #00D4AA 0, #00D4AA 1px, transparent 0, transparent 50%)",
          backgroundSize: "20px 20px",
        }} />

        <div className="absolute top-3 right-3 flex gap-2 items-center">
          {["#070A0F", "#0D0A1F", "#0A1A0D", "#1A0A0A"].map(c => (
            <button key={c} onClick={() => changeBg(c)}
              className="w-5 h-5 rounded-full border-2 transition-all"
              style={{ background: c, borderColor: bgColor === c ? "#F0B429" : "#252D38" }} />
          ))}
          <button onClick={() => { setEditProfile(profile); setEditMode(e => !e); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-wm-surface/80 text-wm-text-muted hover:text-wm-text text-xs transition-colors">
            <Edit3 size={11} /> {editMode ? "Cancel" : "Edit"}
          </button>
          <button onClick={exportData}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-wm-surface/80 text-wm-text-muted hover:text-wm-text text-xs transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1">
        {/* Profile header */}
        <div className="px-6 pt-0 pb-4 border-b border-wm-border">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            {/* Avatar — clickable to change */}
            <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl text-wm-black border-4 border-wm-black shadow-xl overflow-hidden"
                style={{ background: avatarUrl ? undefined : "linear-gradient(135deg, #00D4AA, #4FA3E0)" }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-wm-gold border-2 border-wm-black flex items-center justify-center">
                <Star size={9} className="text-wm-black fill-wm-black" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-bold">Change</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

            <div className="mb-1 flex-1">
              {editMode ? (
                <div className="space-y-2">
                  <input value={editProfile.name} onChange={e => setEditProfile(p => ({ ...p, name: e.target.value }))}
                    className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-sm font-bold text-wm-text outline-none focus:border-wm-green/50 w-48" />
                  <input value={editProfile.handle} onChange={e => setEditProfile(p => ({ ...p, handle: e.target.value }))}
                    className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-xs text-wm-text-muted outline-none focus:border-wm-green/50 w-48 block" />
                  <input value={editProfile.email} onChange={e => setEditProfile(p => ({ ...p, email: e.target.value }))}
                    placeholder="email" type="email"
                    className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-xs text-wm-text outline-none focus:border-wm-green/50 w-64 block" />
                  <select value={editProfile.timezone} onChange={e => setEditProfile(p => ({ ...p, timezone: e.target.value }))}
                    className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-xs text-wm-text outline-none focus:border-wm-green/50">
                    {["America/New_York","America/Chicago","America/Los_Angeles","Europe/London","Asia/Tokyo"].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-wm-text">{profile.name}</h1>
                  {/* Blue verified check */}
                  <span title="Verified"><Shield size={14} className="text-wm-blue" /></span>
                  {/* Crown W badge for core team */}
                  {isCoreTeam(profile.handle, profile.email) ? (
                    <span title="WealthyMindsets Core Team — Unlimited Access" className="flex items-center gap-1">
                      <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Crown on top */}
                        <path d="M8 14 L12 8 L20 13 L28 8 L32 14 L28 14 L20 11 L12 14 Z" fill="#F0B429"/>
                        {/* W circle */}
                        <circle cx="20" cy="26" r="13" fill="#0D1117" stroke="#F0B429" strokeWidth="1.5"/>
                        <path d="M11 21 L14.5 31 L18 24 L21.5 31 L25 21" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </span>
                  ) : null}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-wm-gold/20 text-wm-gold border border-wm-gold/30 flex items-center gap-1">
                    <Zap size={9} className="fill-wm-gold" /> PRO
                  </span>
                </div>
              )}
              {!editMode && <div className="text-sm text-wm-text-muted">{profile.handle}{profile.email ? ` · ${profile.email}` : ""}</div>}
            </div>

            <div className="flex gap-2 mb-1">
              {editMode ? (
                <button onClick={saveProfile}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-wm-green text-wm-black text-xs font-bold hover:opacity-90 transition-all">
                  <Save size={12} /> Save
                </button>
              ) : (
                <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied!"); }}
                  className="p-1.5 rounded-lg bg-wm-surface border border-wm-border text-wm-text-muted hover:text-wm-text transition-colors">
                  <Share2 size={13} />
                </button>
              )}
            </div>
          </div>

          {editMode ? (
            <div className="space-y-2 mb-4 max-w-lg">
              <textarea value={editProfile.bio} onChange={e => setEditProfile(p => ({ ...p, bio: e.target.value }))}
                rows={3} className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-text-muted outline-none focus:border-wm-green/50 resize-none" />
              <div className="flex items-center gap-2 bg-wm-surface border border-[#7C3AED]/30 rounded-lg px-3 py-2">
                <span className="text-[10px] text-[#7C3AED] font-bold uppercase tracking-wider whitespace-nowrap">AI Bot Name</span>
                <input
                  value={editProfile.botName ?? "SpaidBot"}
                  onChange={e => setEditProfile(p => ({ ...p, botName: e.target.value }))}
                  placeholder="e.g. SpaidBot"
                  maxLength={24}
                  className="flex-1 bg-transparent text-sm text-wm-text outline-none"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-wm-text-muted max-w-lg leading-relaxed mb-4 whitespace-pre-line">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 flex-wrap">
            {STAT_LIST.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-base font-black" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] text-wm-text-dim uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-wm-border px-4 shrink-0">
          {[
            { id: "trades", icon: BarChart2, label: "Trades" },
            { id: "music",  icon: Music,     label: "Music" },
            { id: "posts",  icon: TrendingUp,label: "Posts" },
            { id: "coins",  icon: Coins,     label: "My Coins" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={clsx("flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold border-b-2 transition-all",
                tab === t.id ? "border-wm-green text-wm-green" : "border-transparent text-wm-text-muted hover:text-wm-text")}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {tab === "trades" && (
            <div className="space-y-2">
              {recentTrades.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-wm-text-muted">
                  <BarChart2 size={32} className="opacity-20" />
                  <div className="text-sm">No trades yet</div>
                  <div className="text-xs text-wm-text-dim text-center max-w-xs">Your closed trades from the Journal and Paper Trading will appear here automatically.</div>
                </div>
              ) : recentTrades.map((t, i) => (
                <div key={i} className="glass rounded-xl p-3 flex items-center gap-4 hover:border-wm-border/80 transition-all">
                  <div className="text-xs font-mono text-wm-text-muted w-16 shrink-0">{t.date}</div>
                  <div className="font-bold text-wm-text w-14 shrink-0">{t.sym}</div>
                  <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold shrink-0",
                    t.dir === "LONG" ? "bg-wm-green/15 text-wm-green" : "bg-wm-red/15 text-wm-red")}>
                    {t.dir}
                  </span>
                  <div className="text-xs text-wm-text-muted hidden sm:block">Entry: <span className="text-wm-text font-mono">{t.entry}</span></div>
                  <div className="text-xs text-wm-text-muted hidden sm:block">Exit: <span className="text-wm-text font-mono">{t.exit}</span></div>
                  <div className="ml-auto flex items-center gap-3">
                    <span className={clsx("text-sm font-bold", t.pnl.startsWith("+") ? "text-wm-green" : "text-wm-red")}>{t.pnl}</span>
                    <span className="text-xs text-wm-gold font-semibold">{t.rr}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "music" && (
            <div className="space-y-2">
              {likedTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-wm-text-muted">
                  <Music size={32} className="opacity-20" />
                  <div className="text-sm">No liked tracks yet</div>
                  <div className="text-xs text-wm-text-dim text-center max-w-xs">Heart tracks in the Radio to save them here.</div>
                </div>
              ) : (
                <>
                  <div className="text-xs text-wm-text-muted mb-3">Liked Tracks · {likedTracks.length}</div>
                  {likedTracks.map((track, i) => (
                    <div key={i} className="glass rounded-xl p-3 flex items-center gap-3 hover:border-wm-border/80 transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wm-purple to-wm-blue flex items-center justify-center">
                        <Play size={13} className="text-white ml-0.5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-wm-text">{track.title}</div>
                        <div className="text-[10px] text-wm-text-muted">{track.artist}</div>
                      </div>
                      <div className="text-xs text-wm-text-muted font-mono">{track.duration}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "posts" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-wm-text-muted text-sm">Your Lounge posts appear here.</p>
              <button
                onClick={() => router.push("/lounge")}
                className="px-6 py-2.5 rounded-lg font-bold text-sm transition-all"
                style={{ background: "linear-gradient(135deg, #00E5CC, #7B6CF7)", color: "#000" }}
              >
                Open Lounge
              </button>
            </div>
          )}

          {/* ── My Coins tab ──────────────────────────────── */}
          {tab === "coins" && (
            <div className="space-y-4 pb-4">

              {/* WM$ Main Token Card */}
              <div className="rounded-xl border border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/10 to-transparent p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#00D4AA] flex items-center justify-center text-white font-black text-sm">
                      WM$
                    </div>
                    <div>
                      <div className="text-sm font-black text-wm-text">Wealthy Mindsets</div>
                      <div className="text-[10px] text-[#7C3AED] font-bold">WM$ · Main Ecosystem Token</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-wm-text font-mono">{wmsBalance.toLocaleString()}</div>
                    <div className="text-[9px] text-wm-text-dim">WM$ balance</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { l: "Total Earned", v: totalEarned.toLocaleString() + " WM$" },
                    { l: "Status",       v: isDeployed ? "🟢 On-Chain" : "🟡 Pre-Launch" },
                    { l: "Chain",        v: "Base Network" },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-wm-surface/50 rounded-lg p-2 text-center">
                      <div className="text-[8px] text-wm-text-dim uppercase tracking-wider">{l}</div>
                      <div className="text-[10px] font-bold text-wm-text mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>

                {isDeployed ? (
                  <div className="space-y-1.5 mb-3">
                    <div className="text-[9px] text-wm-text-dim uppercase tracking-wider font-bold mb-1">Contract Details</div>
                    <div className="bg-wm-surface/60 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-wm-text-dim">Contract</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono text-wm-text">{WMS_CONTRACT.address.slice(0,8)}…{WMS_CONTRACT.address.slice(-6)}</span>
                          <button onClick={() => { navigator.clipboard.writeText(WMS_CONTRACT.address); toast.success("Copied!"); }}
                            className="text-[#7C3AED] hover:text-[#00D4AA] transition-colors"><ExternalLink size={9}/></button>
                        </div>
                      </div>
                      {[
                        ["Network",      WMS_CONTRACT.network],
                        ["Total Supply", WMS_CONTRACT.totalSupply + " WM$"],
                        ["Max Supply",   WMS_CONTRACT.maxSupply + " WM$"],
                        ["Decimals",     String(WMS_CONTRACT.decimals)],
                      ].map(([k,v]) => (
                        <div key={k} className="flex justify-between items-center">
                          <span className="text-[9px] text-wm-text-dim">{k}</span>
                          <span className="text-[9px] font-bold text-wm-text">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <a href={WMS_CONTRACT.blockscout} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-center py-1.5 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[9px] text-[#7C3AED] font-bold hover:bg-[#7C3AED]/30 transition-all">
                        Blockscout ↗
                      </a>
                      <a href={WMS_CONTRACT.basescan} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-center py-1.5 rounded-lg bg-[#00D4AA]/10 border border-[#00D4AA]/20 text-[9px] text-[#00D4AA] font-bold hover:bg-[#00D4AA]/20 transition-all">
                        Basescan ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-[9px] text-wm-text-muted bg-[#7C3AED]/10 rounded-lg px-3 py-2 border border-[#7C3AED]/20 mb-3">
                    🚀 <strong>Pre-launch:</strong> Your WM$ balance is tracked in-app and converts 1:1 to real on-chain tokens once the contract deploys on Base.
                  </div>
                )}

                <div className="mt-3">
                  <div className="text-[9px] text-wm-text-dim uppercase tracking-wider mb-2 font-bold">Recent Earnings</div>
                  <div className="space-y-1 max-h-28 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {recentEarnings.slice(0, 8).map((e, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px]">
                        <span className="text-wm-text-muted">{e.reason}</span>
                        <span className="font-black text-[#7C3AED] font-mono">+{e.amount} WM$</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Creator Coin Section */}
              {creatorCoin ? (
                <div className="rounded-xl border p-4" style={{ borderColor: creatorCoin.logoColor + "40", background: creatorCoin.logoColor + "10" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs" style={{ background: creatorCoin.logoColor }}>
                        {creatorCoin.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-wm-text">{creatorCoin.name}</div>
                        <div className="text-[10px] font-bold" style={{ color: creatorCoin.logoColor }}>
                          {creatorCoin.symbol} · {creatorCoin.category} Creator Coin
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-wm-text font-mono">{creatorCoin.supply.toLocaleString()}</div>
                      <div className="text-[9px] text-wm-text-dim">total supply</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: "Transfer Fee", v: (creatorCoin.feeRate / 100).toFixed(1) + "%" },
                      { l: "Category",     v: creatorCoin.category },
                      { l: "Launched",     v: new Date(creatorCoin.deployedAt).toLocaleDateString() },
                    ].map(({ l, v }) => (
                      <div key={l} className="bg-wm-surface/50 rounded-lg p-2 text-center">
                        <div className="text-[8px] text-wm-text-dim uppercase tracking-wider">{l}</div>
                        <div className="text-[10px] font-bold text-wm-text mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-wm-border p-5 text-center">
                  <Rocket size={24} className="text-wm-text-dim mx-auto mb-2 opacity-40"/>
                  <div className="text-sm font-bold text-wm-text mb-1">Launch Your Creator Coin</div>
                  <div className="text-[10px] text-wm-text-muted mb-3">
                    Create your own ERC-20 token. Fans buy it, every transfer sends fees to the WM$ treasury creating buy pressure.
                  </div>
                  <button
                    onClick={() => setShowLaunchCoin(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00D4AA] text-white text-xs font-black hover:opacity-90 transition-all"
                  >
                    + Launch My Creator Coin
                  </button>
                </div>
              )}

              {/* Launch Creator Coin form */}
              {showLaunchCoin && (
                <div className="rounded-xl border border-[#7C3AED]/40 bg-[#7C3AED]/5 p-4 space-y-3">
                  <div className="text-sm font-black text-wm-text flex items-center justify-between">
                    <span>🪙 Launch Creator Coin</span>
                    <button onClick={() => setShowLaunchCoin(false)}><X size={14} className="text-wm-text-dim"/></button>
                  </div>
                  {[
                    { label: "Coin Name",   key: "name",   placeholder: "e.g. SpaidFX Coin" },
                    { label: "Symbol",      key: "symbol", placeholder: "e.g. SPAID" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1">{label}</label>
                      <input
                        value={(newCoin as any)[key]}
                        onChange={e => setNewCoin(c => ({ ...c, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-xs text-wm-text outline-none focus:border-[#7C3AED]/50"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1">Category</label>
                    <select value={newCoin.category} onChange={e => setNewCoin(c => ({ ...c, category: e.target.value }))}
                      className="w-full bg-wm-surface border border-wm-border rounded-lg px-3 py-2 text-xs text-wm-text outline-none">
                      {["Trading","Music","Art","Business","Brand","Gaming","Education","Fitness"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1">Transfer Fee: {(newCoin.feeRate/100).toFixed(1)}%</label>
                    <input type="range" min={200} max={500} step={50} value={newCoin.feeRate}
                      onChange={e => setNewCoin(c => ({ ...c, feeRate: +e.target.value }))}
                      className="w-full accent-[#7C3AED]"/>
                    <div className="flex justify-between text-[8px] text-wm-text-dim"><span>2% min</span><span>5% max</span></div>
                  </div>
                  <button
                    onClick={() => {
                      if (!newCoin.name || !newCoin.symbol) return toast.error("Name and symbol required");
                      launchCreatorCoin({ name: newCoin.name, symbol: newCoin.symbol.toUpperCase(), supply: newCoin.supply, feeRate: newCoin.feeRate, category: newCoin.category });
                      setShowLaunchCoin(false);
                      toast.success(`🚀 ${newCoin.symbol.toUpperCase()} launched! +500 WM$`);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00D4AA] text-white text-xs font-black hover:opacity-90 transition-all"
                  >
                    🚀 Launch {newCoin.symbol.toUpperCase() || "My Coin"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
