"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Heart, MessageCircle, Share2, Bookmark, Music, Video,
  Plus, Search, MoreHorizontal, Flame, Star, Zap, Globe,
  Upload, Play, Volume2, VolumeX,
  ChevronUp, ChevronDown, Crown, CheckCircle, X, Send,
  Repeat2, BarChart2, TrendingUp, Users, Radio, Image, Smile,
  UserCheck, UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
const LiveRoom = dynamic(() => import("@/components/lounge/LiveRoom"), { ssr: false });
import { useAuth } from "@/contexts/AuthContext";

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */
type FeedTab = "for-you" | "following" | "explore" | "shorts";

interface Post {
  id:           number;
  user_handle:  string;
  user_name:    string;
  user_avatar:  string;
  user_color:   string;
  user_tier:    string;
  user_verified:boolean;
  user_ceo:     boolean;
  content:      string;
  type:         string;
  trade_card?:  { sym:string; dir:"LONG"|"SHORT"; entry:string; target:string; stop:string; rr:string; status:string } | null;
  music?:       { title:string; artist:string; duration:string } | null;
  video?:       { title:string; duration:string; views:string } | null;
  tags:         string[];
  created_at:   string;
  // client-side aggregates fetched separately
  like_count:   number;
  comment_count:number;
  liked_by_me:  boolean;
}

interface Comment {
  id:          number;
  user_handle: string;
  user_name:   string;
  user_avatar: string;
  user_color:  string;
  body:        string;
  created_at:  string;
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
const TIER_STYLE: Record<string, { bg:string; text:string; border:string }> = {
  ELITE:   { bg:"rgba(240,180,41,0.18)",  text:"#F0B429", border:"rgba(240,180,41,0.40)" },
  PRO:     { bg:"rgba(0,212,170,0.15)",   text:"#00D4AA", border:"rgba(0,212,170,0.35)" },
  CREATOR: { bg:"rgba(139,92,246,0.15)",  text:"#8B5CF6", border:"rgba(139,92,246,0.35)" },
  BASIC:   { bg:"rgba(79,163,224,0.12)",  text:"#4FA3E0", border:"rgba(79,163,224,0.30)" },
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.floor(ms / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name: string) {
  return name?.trim()?.[0]?.toUpperCase() ?? "?";
}

/* ══════════════════════════════════════════════════════════════
   VERIFIED BADGE
══════════════════════════════════════════════════════════════ */
function VerifiedBadge({ ceo, size = 12 }: { ceo?: boolean; size?: number }) {
  if (ceo) {
    return (
      <span title="WealthyMindsets CEO — Verified">
        <svg width={size+2} height={size+2} viewBox="0 0 16 16" fill="none" className="inline-block">
          <path d="M8 1L9.5 5.5H14L10.3 8.2L11.7 13L8 10.5L4.3 13L5.7 8.2L2 5.5H6.5L8 1Z"
            fill="#F0B429" stroke="#F0B429" strokeWidth="0.5"/>
          <text x="8" y="10" textAnchor="middle" fontSize="6" fill="#000" fontWeight="900">W</text>
        </svg>
      </span>
    );
  }
  return <CheckCircle size={size} className="inline-block" style={{ color:"#4FA3E0", fill:"#4FA3E0" }} />;
}

/* ══════════════════════════════════════════════════════════════
   AVATAR
══════════════════════════════════════════════════════════════ */
function Avatar({ src, name, color, size = 40, ceo = false }: { src?:string; name:string; color:string; size?:number; ceo?:boolean }) {
  return (
    <div className="relative shrink-0" style={{ width:size, height:size }}>
      {src ? (
        <img src={src} alt={name} className="rounded-xl object-cover w-full h-full" />
      ) : (
        <div className="rounded-xl flex items-center justify-center font-black text-white w-full h-full"
          style={{ background:`linear-gradient(135deg,${color},${color}88)`, fontSize: size * 0.35 }}>
          {initials(name)}
        </div>
      )}
      {ceo && <span className="absolute -top-1 -right-1 text-[10px]">👑</span>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMMENTS PANEL
══════════════════════════════════════════════════════════════ */
function CommentsPanel({ postId, myHandle, myName, myAvatar, myColor }:
  { postId:number; myHandle:string; myName:string; myAvatar:string; myColor:string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody]         = useState("");
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    supabase.from("lounge_comments")
      .select("*").eq("post_id", postId).order("created_at")
      .then(({ data }) => setComments((data ?? []) as Comment[]));
  }, [postId]);

  const submit = async () => {
    if (!body.trim() || !myHandle) return;
    setSending(true);
    const { data, error } = await supabase.from("lounge_comments").insert({
      post_id: postId, user_handle: myHandle, user_name: myName,
      user_avatar: myAvatar, user_color: myColor, body: body.trim(),
    }).select().single();
    if (!error && data) setComments(c => [...c, data as Comment]);
    setBody("");
    setSending(false);
  };

  return (
    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
      className="mt-3 border-t border-wm-border/40 pt-3 space-y-2">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2">
          <Avatar src={c.user_avatar} name={c.user_name} color={c.user_color} size={26} />
          <div className="flex-1 bg-wm-surface rounded-lg px-3 py-2">
            <span className="text-[10px] font-bold text-wm-text">{c.user_name}</span>
            <span className="text-[9px] text-wm-text-dim ml-2">{timeAgo(c.created_at)}</span>
            <p className="text-xs text-wm-text-muted mt-0.5">{c.body}</p>
          </div>
        </div>
      ))}
      {myHandle ? (
        <div className="flex gap-2">
          <Avatar src={myAvatar} name={myName} color={myColor} size={26} />
          <input value={body} onChange={e => setBody(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 bg-wm-surface border border-wm-border rounded-lg px-3 py-1.5 text-xs text-wm-text outline-none focus:border-wm-blue/50"
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
          />
          <button disabled={sending || !body.trim()} onClick={submit}
            className="w-7 h-7 rounded-lg bg-wm-blue/20 text-wm-blue flex items-center justify-center hover:bg-wm-blue/30 disabled:opacity-40">
            <Send size={12} />
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-wm-text-dim">Sign in to comment.</p>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   POST CARD
══════════════════════════════════════════════════════════════ */
function PostCard({ post, myHandle, myName, myAvatar, myColor, onDelete }:
  { post:Post; myHandle:string; myName:string; myAvatar:string; myColor:string; onDelete?:(id:number)=>void }) {

  const [liked,      setLiked]      = useState(post.liked_by_me);
  const [likeCount,  setLikeCount]  = useState(post.like_count);
  const [bookmarked, setBookmarked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("wm_lounge_bookmarks") || "[]") as string[]); } catch { return new Set<string>(); }
  });
  const toggleBookmark = (postId: string) => {
    setBookmarked(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      try { localStorage.setItem("wm_lounge_bookmarks", JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const [commenting, setCommenting] = useState(false);
  const ts = TIER_STYLE[post.user_tier] ?? TIER_STYLE.BASIC;

  const toggleLike = async () => {
    if (!myHandle) { toast.error("Sign in to like posts"); return; }
    if (liked) {
      await supabase.from("lounge_likes").delete()
        .eq("post_id", post.id).eq("user_handle", myHandle);
      setLiked(false); setLikeCount(c => c - 1);
    } else {
      await supabase.from("lounge_likes").insert({ post_id: post.id, user_handle: myHandle });
      setLiked(true); setLikeCount(c => c + 1);
    }
  };

  const sharePost = () => {
    const url = `${window.location.origin}/lounge?post=${post.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Link copied!");
  };

  const deletePost = async () => {
    if (post.user_handle !== myHandle) return;
    await supabase.from("lounge_posts").delete().eq("id", post.id);
    onDelete?.(post.id);
    toast.success("Post deleted");
  };

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} whileHover={{ y:-2 }}
      className="glass rounded-xl p-4 hover:border-wm-gold/40 transition-all">
      <div className="flex items-start gap-3">
        <Avatar src={post.user_avatar} name={post.user_name} color={post.user_color} ceo={post.user_ceo} />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-sm font-bold text-wm-text">{post.user_name}</span>
            {post.user_verified && <VerifiedBadge ceo={post.user_ceo} size={12} />}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
              style={{ background:ts.bg, color:ts.text, borderColor:ts.border }}>
              {post.user_tier}
            </span>
            <span className="text-xs text-wm-text-dim">{post.user_handle}</span>
            <span className="text-xs text-wm-text-dim ml-auto">{timeAgo(post.created_at)}</span>
            {post.user_handle === myHandle && (
              <button onClick={deletePost} className="text-wm-text-dim hover:text-wm-red transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Content */}
          <p className="text-sm text-wm-text leading-relaxed whitespace-pre-line mb-2">{post.content}</p>

          {/* Trade card */}
          {post.trade_card && (
            <div className="p-3 rounded-xl bg-wm-surface border border-wm-green/20 flex flex-wrap items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-wm-text">{post.trade_card.sym}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{ background:post.trade_card.dir==="LONG"?"rgba(0,212,170,0.2)":"rgba(255,77,106,0.2)",
                           color:post.trade_card.dir==="LONG"?"#00D4AA":"#FF4D6A" }}>
                  {post.trade_card.dir==="LONG"?"▲":"▼"} {post.trade_card.dir}
                </span>
                <span className="text-[10px] text-wm-text-dim capitalize">{post.trade_card.status}</span>
              </div>
              {([["Entry",post.trade_card.entry,"#E8EDF3"],["Target",post.trade_card.target,"#00D4AA"],
                 ["Stop",post.trade_card.stop,"#FF4D6A"],["R:R",post.trade_card.rr,"#F0B429"]] as [string,string,string][])
                .map(([k,v,c])=>(
                  <div key={k} className="text-center">
                    <div className="text-[9px] text-wm-text-dim uppercase tracking-wide">{k}</div>
                    <div className="text-xs font-bold font-mono" style={{color:c}}>{v}</div>
                  </div>
              ))}
            </div>
          )}

          {/* Music card */}
          {post.music && (
            <div className="p-3 rounded-xl bg-wm-surface border border-wm-purple/20 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{background:"linear-gradient(135deg,#8B5CF6,#4FA3E0)"}}>
                <Music size={16} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-wm-text">{post.music.title}</div>
                <div className="text-[10px] text-wm-text-muted">{post.music.artist} · {post.music.duration}</div>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{background:"linear-gradient(135deg,#8B5CF6,#4FA3E0)"}}>
                <Play size={13} className="text-white ml-0.5"/>
              </div>
            </div>
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {post.tags.map(t=>(
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-all hover:scale-105"
                  style={{ background:"rgba(232,185,35,0.12)", color:"#E8B923", border:"1px solid rgba(232,185,35,0.25)" }}>{t}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2 border-t border-wm-border/40">
            <button onClick={toggleLike}
              className={clsx("flex items-center gap-1.5 text-xs transition-colors",
                liked ? "text-wm-red" : "text-wm-text-muted hover:text-wm-red")}>
              <Heart size={14} className={liked ? "fill-wm-red" : ""}/>{likeCount}
            </button>
            <button onClick={() => setCommenting(c => !c)}
              className="flex items-center gap-1.5 text-xs text-wm-text-muted hover:text-wm-blue transition-colors">
              <MessageCircle size={14}/>{post.comment_count}
            </button>
            <button onClick={sharePost}
              className="flex items-center gap-1.5 text-xs text-wm-text-muted hover:text-wm-green transition-colors">
              <Share2 size={14}/>
            </button>
            <button onClick={() => toggleBookmark(String(post.id))}
              className={clsx("ml-auto transition-colors", bookmarked.has(String(post.id)) ? "text-wm-gold" : "text-wm-text-muted hover:text-wm-gold")}>
              <Bookmark size={14} className={bookmarked.has(String(post.id)) ? "fill-wm-gold" : ""}/>
            </button>
          </div>

          {/* Comments */}
          <AnimatePresence>
            {commenting && (
              <CommentsPanel postId={post.id} myHandle={myHandle}
                myName={myName} myAvatar={myAvatar} myColor={myColor} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CREATE POST MODAL
══════════════════════════════════════════════════════════════ */
const EMOJIS = ["🎯","📈","📉","🔥","💰","💎","🚀","⚡","✅","❌","🟢","🔴","📊","🎵","👑","💹","🏆","⚠️","🎬","🎤","📸","🤝","💪","🧠"];
const POST_TYPES = ["text","trade"] as const;

function CreatePostModal({ onClose, onPost, user }:
  { onClose:()=>void; onPost:(p:Post)=>void;
    user:{ handle:string; name:string; avatar:string; color:string; tier:string; verified:boolean; ceo:boolean } }) {

  const [text,       setText]       = useState("");
  const [postType,   setPostType]   = useState<"text"|"trade">("text");
  const [showEmoji,  setShowEmoji]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<string | null>(null);

  // Trade card fields
  const [sym,    setSym]    = useState("");
  const [dir,    setDir]    = useState<"LONG"|"SHORT">("LONG");
  const [entry,  setEntry]  = useState("");
  const [target, setTarget] = useState("");
  const [stop,   setStop]   = useState("");
  const [rr,     setRr]     = useState("");

  const extractTags = (t: string) =>
    [...t.matchAll(/#[\w]+/g)].map(m => m[0]);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    const tags = extractTags(text);
    const trade_card = postType === "trade" && sym
      ? { sym, dir, entry, target, stop, rr, status:"open" }
      : null;

    const { data, error } = await supabase.from("lounge_posts").insert({
      user_handle:   user.handle,
      user_name:     user.name,
      user_avatar:   user.avatar,
      user_color:    user.color,
      user_tier:     user.tier,
      user_verified: user.verified,
      user_ceo:      user.ceo,
      content:       text.trim(),
      type:          postType,
      trade_card:    trade_card ?? null,
      tags,
    }).select().single();

    if (error) { toast.error("Post failed — try again"); setSubmitting(false); return; }
    const newPost: Post = { ...(data as Post), like_count: 0, comment_count: 0, liked_by_me: false };
    onPost(newPost);
    onClose();
    toast.success("Post published! 🚀");
  };

  return (
    <motion.div className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{background:"rgba(7,10,15,0.80)"}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <motion.div initial={{scale:0.92,y:16}} animate={{scale:1,y:0}} exit={{scale:0.92,y:16}}
        className="w-[520px] rounded-2xl border border-wm-border bg-wm-dark p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-wm-text">Create Post</h3>
            <div className="flex gap-1">
              {POST_TYPES.map(t => (
                <button key={t} onClick={() => setPostType(t)}
                  className={clsx("px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-all border",
                    postType === t
                      ? "bg-wm-green/15 text-wm-green border-wm-green/30"
                      : "text-wm-text-dim border-transparent hover:text-wm-text")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-wm-text-muted hover:text-wm-text"><X size={16}/></button>
        </div>

        <div className="flex gap-3">
          <Avatar src={user.avatar} name={user.name} color={user.color} size={36} />
          <div className="flex-1">
            <textarea value={text} onChange={e=>setText(e.target.value)}
              placeholder="Share a trade idea, insight, or update…"
              rows={5} className="w-full bg-transparent text-sm text-wm-text outline-none resize-none placeholder-wm-text-dim leading-relaxed"/>
            {attachment && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-wm-border">
                <img src={attachment} className="w-full h-40 object-cover" alt="Attachment"/>
                <button onClick={()=>setAttachment(null)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                  <X size={12} className="text-white"/>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trade card fields */}
        {postType === "trade" && (
          <div className="mt-3 p-3 rounded-xl bg-wm-surface border border-wm-border grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[9px] text-wm-text-dim uppercase tracking-wide">Symbol</label>
              <input value={sym} onChange={e=>setSym(e.target.value.toUpperCase())} placeholder="NQ1!, BTC…"
                className="w-full bg-transparent border-b border-wm-border text-xs text-wm-text outline-none py-1"/>
            </div>
            <div>
              <label className="text-[9px] text-wm-text-dim uppercase tracking-wide">Direction</label>
              <div className="flex gap-1 mt-1">
                {(["LONG","SHORT"] as const).map(d=>(
                  <button key={d} onClick={()=>setDir(d)}
                    className={clsx("flex-1 py-0.5 rounded text-[10px] font-bold transition-all",
                      dir===d
                        ? d==="LONG" ? "bg-wm-green/20 text-wm-green" : "bg-wm-red/20 text-wm-red"
                        : "text-wm-text-dim hover:text-wm-text")}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {[["Entry",entry,setEntry],["Target",target,setTarget],["Stop",stop,setStop],["R:R",rr,setRr]].map(([label,val,setter])=>(
              <div key={label as string}>
                <label className="text-[9px] text-wm-text-dim uppercase tracking-wide">{label as string}</label>
                <input value={val as string} onChange={e=>(setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                  placeholder="—"
                  className="w-full bg-transparent border-b border-wm-border text-xs text-wm-text outline-none py-1"/>
              </div>
            ))}
          </div>
        )}

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
              className="mt-2 p-2 rounded-xl bg-wm-surface border border-wm-border grid gap-1"
              style={{gridTemplateColumns:"repeat(12,1fr)"}}>
              {EMOJIS.map(e=>(
                <button key={e} onClick={()=>{setText(t=>t+e);setShowEmoji(false)}}
                  className="text-xl hover:bg-wm-card rounded-lg p-1 transition-colors">{e}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-wm-border">
          <div className="flex items-center gap-1">
            <button onClick={()=>fileRef.current?.click()}
              className="w-8 h-8 rounded-lg hover:bg-wm-surface flex items-center justify-center text-wm-text-muted hover:text-wm-text transition-colors">
              <Image size={15}/>
            </button>
            <button onClick={()=>setShowEmoji(s=>!s)}
              className="w-8 h-8 rounded-lg hover:bg-wm-surface flex items-center justify-center text-wm-text-muted hover:text-wm-text transition-colors">
              <Smile size={15}/>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=ev=>setAttachment(ev.target?.result as string);r.readAsDataURL(f);}}}/>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-wm-text-dim">{text.length}/1000</span>
            <button onClick={submit} disabled={!text.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-wm-green/15 border border-wm-green/30 text-wm-green text-xs font-bold hover:bg-wm-green/25 transition-all disabled:opacity-40">
              <Send size={12}/> {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const LIVE_ROOMS = [
  { name: "wm-wealthy-mindsets", label: "Wealthy Mindsets", color: "#00FFC2", desc: "The main room — community & live trading" },
  { name: "wm-nq-morning",   label: "Smart Money Talk", color: "#00D4AA", desc: "Futures & order flow" },
  { name: "wm-crypto-talk",  label: "Crypto Talk",   color: "#F0B429", desc: "BTC, ETH, alts" },
  { name: "wm-beats-vibes",  label: "Beats & Vibes", color: "#8B5CF6", desc: "Music & community" },
  { name: "wm-market-open",  label: "Market Open",   color: "#FF4D6A", desc: "Pre-market & open" },
];

const SIDEBAR_TAGS: Record<string, string[]> = {
  "Hot Right Now":  [],
  "Trade Setups":   ["trade"],
  "Market Talk":    ["market","spx","btc","macro","nq","es"],
  "Chart Snaps":    ["chart","ta","analysis"],
  "Creator Hub":    ["creator","music","beats"],
};

/* ── Lounge vibe header — MySpace-soul profile hero + stories ──
   Themed customizable banner (Harlem Nights / Golden Vinyl / Trading /
   Royal), gold-ring avatar, editable "Current Vibe" status, and a glowing
   stories row. Theme + vibe persist in localStorage (no DB migration). */
const LOUNGE_THEMES = [
  { id: "harlem",  name: "Harlem Nights",  grad: "linear-gradient(120deg, #2a0e1a, #4a1524 45%, #140a10)", accent: "#E8B923" },
  { id: "vinyl",   name: "Golden Vinyl",   grad: "linear-gradient(120deg, #1c1408, #3d2e10 50%, #0f0c06)", accent: "#E8B923" },
  { id: "trading", name: "Trading Lounge", grad: "linear-gradient(120deg, #06231c, #0a3a2c 50%, #061512)", accent: "#059669" },
  { id: "royal",   name: "Royal Purple",   grad: "linear-gradient(120deg, #180e2e, #2e1a4a 50%, #0f0a1a)", accent: "#8B5CF6" },
];

const LOUNGE_TOP8 = [
  { name: "SpaidFX",       color: "#00D4AA", avatar: "S" },
  { name: "WealthQueen",   color: "#8B5CF6", avatar: "W" },
  { name: "TradeMuse",     color: "#4FA3E0", avatar: "T" },
  { name: "NQ_Sniper",     color: "#F0B429", avatar: "N" },
  { name: "GoldRush",      color: "#FF6B9D", avatar: "G" },
  { name: "ChartFanatics", color: "#FF4D6A", avatar: "C" },
  { name: "CryptoKing",    color: "#00C853", avatar: "K" },
  { name: "TapeReader",    color: "#E8B923", avatar: "T" },
];

function LoungeVibeHeader({ name, handle, avatar, color, ceo, postCount, stories }: {
  name: string; handle: string; avatar: string; color: string; ceo: boolean;
  postCount: number;
  stories: { handle: string; name: string; avatar: string; color: string; ceo: boolean }[];
}) {
  const [themeId, setThemeId] = useState("harlem");
  const [vibe, setVibe]       = useState("");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    try {
      setThemeId(localStorage.getItem("wm_lounge_theme") || "harlem");
      setVibe(localStorage.getItem("wm_lounge_vibe") || "");
    } catch {}
  }, []);
  const theme = LOUNGE_THEMES.find(t => t.id === themeId) ?? LOUNGE_THEMES[0];
  const pickTheme = (id: string) => { setThemeId(id); try { localStorage.setItem("wm_lounge_theme", id); } catch {} };
  const commitVibe = () => { setEditing(false); try { localStorage.setItem("wm_lounge_vibe", vibe.trim()); } catch {} };

  return (
    <div>
      {/* ── Themed profile banner ── */}
      <div className="relative rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(232,185,35,0.22)" }}>
        <div className="relative" style={{ height: 150, background: theme.grad }}>
          {/* serif theme title (Harlem Nights / Golden Vinyl / …) */}
          <div className="absolute inset-x-0 flex flex-col items-center pointer-events-none z-[1]" style={{ top: 24 }}>
            <span className="text-[8px] font-black uppercase tracking-[0.32em] mb-1" style={{ color: theme.accent }}>WM Lounge</span>
            <span className="font-black text-white leading-none" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 30, letterSpacing: 1.5, textTransform: "uppercase", textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}>{theme.name}</span>
          </div>
          {/* faint trading chart line */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 120">
            <polyline points="0,92 40,80 80,88 120,58 160,70 200,40 240,52 280,26 320,36 360,14 400,22"
              fill="none" stroke={theme.accent} strokeWidth="2" />
          </svg>
          {/* faint vinyl grooves */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ background: `repeating-radial-gradient(circle at 88% 28%, ${theme.accent} 0 1px, transparent 1px 9px)` }} />
          {/* theme switcher */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {LOUNGE_THEMES.map(t => (
              <button key={t.id} onClick={() => pickTheme(t.id)} title={t.name} aria-label={t.name}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{ background: t.grad, border: `2px solid ${themeId === t.id ? t.accent : "rgba(255,255,255,0.25)"}` }} />
            ))}
          </div>
        </div>
        {/* identity + vibe */}
        <div className="relative bg-wm-dark px-4 pb-3">
          <div className="flex items-end gap-3" style={{ marginTop: -34 }}>
            <div className="rounded-full p-[3px] shrink-0" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}55)`, boxShadow: `0 0 18px ${theme.accent}66` }}>
              <Avatar src={avatar} name={name} color={color} size={64} ceo={ceo} />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-black text-wm-text truncate">{name}</span>
                {ceo && <VerifiedBadge ceo size={13} />}
              </div>
              <div className="text-[11px] text-wm-text-muted">{handle ? `@${handle.replace(/^@/, "")}` : "guest"} · {postCount} post{postCount !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest shrink-0" style={{ color: theme.accent }}>Current Vibe</span>
            {editing ? (
              <input autoFocus value={vibe} maxLength={80}
                onChange={e => setVibe(e.target.value)} onBlur={commitVibe}
                onKeyDown={e => { if (e.key === "Enter") commitVibe(); }}
                placeholder="What's the vibe today?"
                className="flex-1 bg-wm-black border border-wm-border rounded-lg px-2 py-1 text-[12px] text-wm-text outline-none" />
            ) : (
              <button onClick={() => setEditing(true)} className="flex-1 text-left text-[12px] italic text-wm-text-muted hover:text-wm-text truncate">
                {vibe || "Set your vibe… 🎧"}
              </button>
            )}
          </div>

          {/* Circle of Excellence — Top 8 + now playing */}
          <div className="mt-3 flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: theme.accent }}>Circle of Excellence</span>
                <span className="text-[9px] text-wm-text-dim">· Top 8</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {LOUNGE_TOP8.map(m => (
                  <div key={m.name} className="rounded-full p-[2px]" title={m.name} style={{ background: `linear-gradient(135deg, ${theme.accent}, ${m.color})` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-[12px]" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}88)`, border: "2px solid #0D0E14" }}>{m.avatar}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* now playing — spinning vinyl + waveform */}
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.accent}33`, minWidth: 210 }}>
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center animate-[spin_4s_linear_infinite]" style={{ background: "repeating-radial-gradient(circle, #141310 0 1.5px, #08080c 1.5px 3.5px)", border: `1px solid ${theme.accent}66` }}>
                <div className="w-3 h-3 rounded-full" style={{ background: theme.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-wm-text truncate">{theme.name} — Lo-Fi Set</div>
                <div className="flex items-end gap-[2px] mt-1" style={{ height: 12 }}>
                  {Array.from({ length: 34 }).map((_, i) => { const h = Math.min(100, 22 + Math.abs(Math.sin(i * 0.6)) * 78); return <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 1, background: `${theme.accent}99` }} />; })}
                </div>
              </div>
              <Play size={15} style={{ color: theme.accent }} className="shrink-0" />
            </div>
          </div>

          {/* Achievement badges */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <span className="text-[9px] font-black uppercase tracking-widest shrink-0 mr-1" style={{ color: theme.accent }}>Badges</span>
            {[{ e: "🏆", c: "#E8B923" }, { e: "🥇", c: "#F0B429" }, { e: "💎", c: "#4FA3E0" }, { e: "🔥", c: "#FF4D6A" }, { e: "📈", c: "#00D4AA" }, { e: "🎧", c: "#8B5CF6" }, { e: "👑", c: "#E8B923" }, { e: "⭐", c: "#F0B429" }].map((b, i) => (
              <div key={i} className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[15px]" style={{ background: `${b.c}18`, border: `1px solid ${b.c}40` }}>{b.e}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stories row ── */}
      <div className="flex items-center gap-3 overflow-x-auto py-3" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-14 h-14 rounded-full flex items-center justify-center relative" style={{ background: "rgba(255,255,255,0.05)", border: "2px dashed rgba(232,185,35,0.5)" }}>
            <Avatar src={avatar} name={name} color={color} size={46} />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#E8B923", color: "#0b0a06" }}>
              <Plus size={12} />
            </div>
          </div>
          <span className="text-[9px] text-wm-text-muted">Your story</span>
        </div>
        {stories.map(u => (
          <div key={u.handle} className="flex flex-col items-center gap-1 shrink-0">
            <div className="rounded-full p-[2px]" style={{ background: "conic-gradient(from 210deg, #E8B923, #FF6B9D, #8B5CF6, #059669, #E8B923)" }}>
              <div className="rounded-full p-[2px] bg-wm-dark">
                <Avatar src={u.avatar} name={u.name} color={u.color} size={44} ceo={u.ceo} />
              </div>
            </div>
            <span className="text-[9px] text-wm-text-muted truncate" style={{ maxWidth: 56 }}>{u.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoungePage() {
  const { user } = useAuth();
  const [feedTab,       setFeedTab]       = useState<FeedTab>("for-you");
  const [search,        setSearch]        = useState("");
  const [posts,         setPosts]         = useState<Post[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showCreate,    setShowCreate]    = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState<string | null>(null);
  const [follows,       setFollows]       = useState<Set<string>>(new Set());
  const [activeRoom,    setActiveRoom]    = useState<string | null>(null);
  const [activeRoomIsHost, setActiveRoomIsHost] = useState(false);

  // Deep-link support: a shared live link (…/lounge?room=<name>) drops the visitor
  // straight into that room as a viewer. Runs once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const roomParam = new URLSearchParams(window.location.search).get("room");
    if (roomParam && LIVE_ROOMS.some(r => r.name === roomParam)) {
      setActiveRoomIsHost(false);
      setActiveRoom(roomParam);
    }
  }, []);

  const myHandle  = user?.handle  ?? user?.email?.split("@")[0] ?? "";
  const myName    = user?.displayName ?? "You";
  const myAvatar  = user?.avatar  ?? "";
  const myColor   = "#00D4AA";
  const myTier    = "BASIC";
  const myVerified = false;
  const myCeo     = false;

  /* ── Load posts + like counts ── */
  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data: rawPosts } = await supabase
      .from("lounge_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);

    if (!rawPosts) { setLoading(false); return; }

    // Fetch like counts and whether current user liked each post
    const ids = rawPosts.map(p => p.id);
    const { data: likesData } = await supabase
      .from("lounge_likes").select("post_id, user_handle").in("post_id", ids);
    const { data: commentsData } = await supabase
      .from("lounge_comments").select("post_id").in("post_id", ids);

    const likeMap: Record<number, number> = {};
    const likedSet: Set<number> = new Set();
    const commentMap: Record<number, number> = {};

    (likesData ?? []).forEach(l => {
      likeMap[l.post_id] = (likeMap[l.post_id] ?? 0) + 1;
      if (l.user_handle === myHandle) likedSet.add(l.post_id);
    });
    (commentsData ?? []).forEach(c => {
      commentMap[c.post_id] = (commentMap[c.post_id] ?? 0) + 1;
    });

    setPosts(rawPosts.map(p => ({
      ...p,
      like_count:    likeMap[p.id]    ?? 0,
      comment_count: commentMap[p.id] ?? 0,
      liked_by_me:   likedSet.has(p.id),
    })));
    setLoading(false);
  }, [myHandle]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  /* ── Realtime: new posts stream in ── */
  useEffect(() => {
    const channel = supabase
      .channel("lounge_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lounge_posts" }, payload => {
        const newPost = { ...(payload.new as Post), like_count: 0, comment_count: 0, liked_by_me: false };
        setPosts(prev => {
          // Don't duplicate if we already have it (from optimistic add)
          if (prev.some(p => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ── Follow / unfollow ── */
  useEffect(() => {
    if (!myHandle) return;
    supabase.from("lounge_follows").select("following_handle").eq("follower_handle", myHandle)
      .then(({ data }) => setFollows(new Set((data ?? []).map(r => r.following_handle))));
  }, [myHandle]);

  const toggleFollow = async (handle: string) => {
    if (!myHandle) { toast.error("Sign in to follow"); return; }
    if (follows.has(handle)) {
      await supabase.from("lounge_follows").delete()
        .eq("follower_handle", myHandle).eq("following_handle", handle);
      setFollows(f => { const n = new Set(f); n.delete(handle); return n; });
      toast.success(`Unfollowed ${handle}`);
    } else {
      await supabase.from("lounge_follows").insert({ follower_handle: myHandle, following_handle: handle });
      setFollows(f => new Set([...f, handle]));
      toast.success(`Following ${handle}! 🔔`);
    }
  };

  /* ── Filter logic ── */
  const visiblePosts = posts.filter(p => {
    if (feedTab === "following") return follows.has(p.user_handle);
    if (feedTab === "explore")   return p.like_count >= 5;
    return true;
  }).filter(p => {
    if (!sidebarFilter || sidebarFilter === "Hot Right Now") return true;
    if (sidebarFilter === "Trade Setups") return p.type === "trade";
    const kws = SIDEBAR_TAGS[sidebarFilter] ?? [];
    const hay = `${p.content} ${p.tags?.join(" ")}`.toLowerCase();
    return kws.some(k => hay.includes(k));
  }).filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.content.toLowerCase().includes(q) || p.user_name.toLowerCase().includes(q) || p.user_handle.includes(q);
  });

  /* ── Top posters for sidebar ── */
  const topPosters = Array.from(
    posts.reduce((acc, p) => {
      if (!acc.has(p.user_handle)) acc.set(p.user_handle, { handle: p.user_handle, name: p.user_name, avatar: p.user_avatar, color: p.user_color, ceo: p.user_ceo, count: 0 });
      acc.get(p.user_handle)!.count++;
      return acc;
    }, new Map<string, { handle:string; name:string; avatar:string; color:string; ceo:boolean; count:number }>())
    .values()
  ).sort((a, b) => b.count - a.count).slice(0, 4).filter(u => u.handle !== myHandle);

  const TAB_LABELS = [
    { id:"for-you"   as FeedTab, label:"For You",   icon:<Flame size={12}/> },
    { id:"following" as FeedTab, label:"Following", icon:<Users size={12}/> },
    { id:"explore"   as FeedTab, label:"Explore",   icon:<Globe size={12}/> },
  ];

  return (
    <div style={{display:"flex",width:"100%",height:"100%",overflow:"hidden"}} className="bg-wm-black">

      {/* ── Left sidebar ── */}
      <div style={{width:200,flexShrink:0}} className="border-r border-wm-border bg-wm-dark flex flex-col p-3 gap-1 overflow-y-auto">
        <div className="text-[9px] font-black text-wm-text-muted uppercase tracking-widest mb-2">The Lounge</div>

        {[
          { icon:<Flame size={13}/>,      label:"Hot Right Now", color:"#FF4D6A" },
          { icon:<TrendingUp size={13}/>, label:"Trade Setups",  color:"#00D4AA" },
          { icon:<BarChart2 size={13}/>,  label:"Market Talk",   color:"#4FA3E0" },
          { icon:<Star size={13}/>,       label:"Chart Snaps",   color:"#00D4AA" },
          { icon:<Crown size={13}/>,      label:"Creator Hub",   color:"#F0B429" },
        ].map(({icon,label,color}) => (
          <button key={label}
            onClick={() => setSidebarFilter(f => f === label ? null : label)}
            className={clsx("flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all text-left",
              sidebarFilter === label
                ? "bg-wm-surface text-wm-text border border-wm-border/60"
                : "text-wm-text-muted hover:bg-wm-surface hover:text-wm-text")}>
            <span style={{color}}>{icon}</span>{label}
          </button>
        ))}

        {/* Live Rooms — powered by LiveKit */}
        <div className="mt-3 text-[9px] font-black text-wm-text-muted uppercase tracking-widest mb-1">Live Rooms</div>
        <AnimatePresence mode="wait">
          {activeRoom ? (
            <LiveRoom
              key={activeRoom}
              roomName={activeRoom}
              roomLabel={LIVE_ROOMS.find(r => r.name === activeRoom)?.label ?? activeRoom}
              color={LIVE_ROOMS.find(r => r.name === activeRoom)?.color ?? "#00D4AA"}
              userName={myHandle || myName}
              isHost={activeRoomIsHost}
              onClose={() => { setActiveRoom(null); setActiveRoomIsHost(false); }}
            />
          ) : (
            <motion.div key="room-list" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="space-y-1">
              {LIVE_ROOMS.map(r => (
                <div key={r.name} className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-wm-surface transition-all group">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{background: r.color}} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-wm-text group-hover:text-wm-green">{r.label}</div>
                    <div className="text-[9px] text-wm-text-dim mb-1">{r.desc}</div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setActiveRoomIsHost(true); setActiveRoom(r.name); }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-wm-red/15 text-wm-red border border-wm-red/30 hover:bg-wm-red/25 transition-all">
                        🔴 Go Live
                      </button>
                      <button
                        onClick={() => { setActiveRoomIsHost(false); setActiveRoom(r.name); }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-wm-surface text-wm-text-dim border border-wm-border/40 hover:text-wm-text transition-all">
                        👁 Watch
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto pt-3 border-t border-wm-border">
          {myHandle && (
            <div className="flex items-center gap-2 px-1">
              <Avatar src={myAvatar} name={myName} color={myColor} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-wm-text truncate">{myName}</div>
                <div className="text-[9px] text-wm-text-dim truncate">{myHandle}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main feed ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 border-b border-wm-border shrink-0" style={{height:44}}>
          <div className="flex gap-0.5">
            {TAB_LABELS.map(t => (
              <button key={t.id} onClick={() => setFeedTab(t.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  feedTab === t.id
                    ? "bg-wm-surface text-wm-text border border-wm-border"
                    : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface/50")}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-wm-surface border border-wm-border rounded-lg px-2.5 py-1">
              <Search size={11} className="text-wm-text-muted"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search posts…"
                className="w-32 bg-transparent text-xs text-wm-text outline-none placeholder-wm-text-dim"/>
            </div>
            <button onClick={() => myHandle ? setShowCreate(true) : toast.error("Sign in to post")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-wm-green/15 border border-wm-green/30 text-wm-green text-xs font-bold hover:bg-wm-green/25 transition-all">
              <Plus size={13}/> Post
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
            <LoungeVibeHeader
              name={myName} handle={myHandle} avatar={myAvatar} color={myColor} ceo={myCeo}
              postCount={posts.filter(p => p.user_handle === myHandle).length}
              stories={topPosters}
            />

            {/* Inline post composer */}
            {myHandle && (
              <div className="rounded-2xl border border-wm-border/60 bg-wm-card/50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar src={myAvatar} name={myName} color={myColor} size={36} ceo={myCeo} />
                  <button onClick={() => setShowCreate(true)}
                    className="flex-1 text-left px-3 py-2 rounded-xl bg-wm-black border border-wm-border text-[12px] text-wm-text-muted hover:text-wm-text transition-colors truncate">
                    Share a trade idea, drop a track, post for the culture…
                  </button>
                  <button onClick={() => setShowCreate(true)}
                    className="px-4 py-2 rounded-xl text-[11px] font-black shrink-0" style={{ background: "linear-gradient(135deg,#E8B923,#059669)", color: "#0b0a06" }}>
                    For the Culture
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  {[{ icon: <Image size={13} />, label: "Photo", c: "#4FA3E0" }, { icon: <TrendingUp size={13} />, label: "Trading Insights", c: "#00D4AA" }, { icon: <Music size={13} />, label: "Music", c: "#8B5CF6" }].map(b => (
                    <button key={b.label} onClick={() => setShowCreate(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                      style={{ background: `${b.c}14`, color: b.c, border: `1px solid ${b.c}2a` }}>
                      {b.icon}{b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {loading ? (
              Array.from({length:3}).map((_,i) => (
                <div key={i} className="rounded-xl border border-wm-border bg-wm-dark p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-wm-surface shrink-0"/>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-wm-surface rounded w-1/3"/>
                      <div className="h-2 bg-wm-surface rounded w-full"/>
                      <div className="h-2 bg-wm-surface rounded w-3/4"/>
                    </div>
                  </div>
                </div>
              ))
            ) : visiblePosts.length > 0 ? (
              visiblePosts.map(p => (
                <PostCard key={p.id} post={p}
                  myHandle={myHandle} myName={myName} myAvatar={myAvatar} myColor={myColor}
                  onDelete={id => setPosts(ps => ps.filter(x => x.id !== id))}/>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl mb-3">
                  {feedTab === "following" ? "👥" : "📝"}
                </div>
                <p className="text-sm font-semibold text-wm-text mb-1">
                  {feedTab === "following" ? "No posts from people you follow" : "No posts yet"}
                </p>
                <p className="text-xs text-wm-text-muted mb-4">
                  {feedTab === "following"
                    ? "Follow some traders to see their posts here."
                    : "Be the first to share a trade idea or insight."}
                </p>
                {myHandle && (
                  <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-wm-green/15 border border-wm-green/30 text-wm-green text-xs font-bold hover:bg-wm-green/25 transition-all">
                    <Plus size={12}/> Create first post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right sidebar — who to follow + trending ── */}
      <div style={{width:220,flexShrink:0}} className="border-l border-wm-border bg-wm-dark flex flex-col p-3 overflow-y-auto">
        <div className="text-[9px] font-black text-wm-text-muted uppercase tracking-widest mb-2">Who to Follow</div>
        {topPosters.length > 0 ? topPosters.map(u => (
          <div key={u.handle} className="flex items-center gap-2 py-2">
            <Avatar src={u.avatar} name={u.name} color={u.color} size={28} ceo={u.ceo} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-wm-text truncate">{u.name}</div>
              <div className="text-[9px] text-wm-text-dim">{u.count} post{u.count !== 1 ? "s" : ""}</div>
            </div>
            <button onClick={() => toggleFollow(u.handle)}
              className={clsx("text-[10px] font-semibold transition-colors flex items-center gap-0.5",
                follows.has(u.handle) ? "text-wm-green" : "text-wm-blue hover:text-wm-text")}>
              {follows.has(u.handle)
                ? <><UserCheck size={11}/></>
                : <><UserPlus size={11}/></>}
            </button>
          </div>
        )) : (
          <p className="text-[10px] text-wm-text-dim px-1">Post something to see other members here.</p>
        )}

        {/* Live trending tags from actual posts */}
        <div className="mt-4 text-[9px] font-black text-wm-text-muted uppercase tracking-widest mb-2">Trending Tags</div>
        {(() => {
          const tagCounts: Record<string, number> = {};
          posts.forEach(p => p.tags?.forEach(t => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; }));
          const sorted = Object.entries(tagCounts).sort((a,b) => b[1]-a[1]).slice(0,8);
          if (sorted.length === 0) return (
            <p className="text-[10px] text-wm-text-dim px-1">Tags from real posts will appear here.</p>
          );
          return sorted.map(([tag, count], i) => (
            <button key={tag} onClick={() => { setSearch(tag.replace("#","")); setFeedTab("explore"); }}
              className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-wm-surface transition-all group text-left">
              <div>
                <div className="text-xs font-bold text-wm-text group-hover:text-wm-blue">{tag}</div>
                <div className="text-[9px] text-wm-text-muted">{count} post{count !== 1 ? "s" : ""}</div>
              </div>
              <span className="text-[9px] text-wm-text-dim">#{i+1}</span>
            </button>
          ));
        })()}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreate && myHandle && (
          <CreatePostModal
            onClose={() => setShowCreate(false)}
            onPost={p => setPosts(ps => [p, ...ps])}
            user={{ handle:myHandle, name:myName, avatar:myAvatar, color:myColor, tier:myTier, verified:myVerified, ceo:myCeo }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
