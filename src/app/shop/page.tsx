"use client";

import React, { useState } from "react";
import { ShoppingCart, Star, Heart, Zap, X, Plus, Minus } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const PRODUCTS = [
  {
    id: 1, name: "W$ Bomber Jacket", price: 189, category: "Apparel",
    desc: "Premium varsity bomber with embroidered Wealthy Mindsets W$ logo. Limited run.",
    badge: "HOT", stars: 4.9, reviews: 847,
    colors: ["#000000", "#1a1a1a", "#2C3E50"],
    emoji: "🧥", accent: "#F0B429",
    details: ["100% genuine leather sleeves", "Wool body", "Embroidered W$ logo", "Limited to 500 units"],
  },
  {
    id: 2, name: "WM Pro Trading Hoodie", price: 89, category: "Apparel",
    desc: "Heavyweight 400gsm fleece. W$ chest logo + 'Wealthy Mindsets Pro' print on back.",
    badge: "NEW", stars: 4.8, reviews: 312,
    colors: ["#070A0F", "#1C2128", "#0D1117"],
    emoji: "👕", accent: "#00D4AA",
    details: ["400gsm French terry", "Double-stitched seams", "Kangaroo pocket", "Unisex sizing"],
  },
  {
    id: 3, name: "Smart Money Snapback", price: 45, category: "Accessories",
    desc: "Structured 6-panel with W$ embroidery. Premium adjustable snapback.",
    badge: null, stars: 4.7, reviews: 521,
    colors: ["#000000", "#F0B429", "#00D4AA"],
    emoji: "🧢", accent: "#4FA3E0",
    details: ["Structured 6-panel", "Embroidered W$ logo", "Snapback closure", "One size fits most"],
  },
  {
    id: 4, name: "Order Flow Mug", price: 28, category: "Lifestyle",
    desc: "Pre-market ritual mug. 'Context. Location. Confirmation.' printed in gold.",
    badge: null, stars: 4.6, reviews: 234,
    colors: ["#070A0F", "#F0B429"],
    emoji: "☕", accent: "#F0B429",
    details: ["16oz ceramic", "Gold lettering", "Dishwasher safe", "Microwave safe"],
  },
  {
    id: 5, name: "WM Gold Chain", price: 149, category: "Accessories",
    desc: "14k gold-plated W$ pendant on 4mm Cuban link. Statement piece.",
    badge: "EXCLUSIVE", stars: 5.0, reviews: 89,
    colors: ["#F0B429"],
    emoji: "📿", accent: "#F0B429",
    details: ["14k gold-plated", "Cuban link chain", "W$ pendant", "Gift box included"],
  },
  {
    id: 6, name: "Trading Desk Mat XL", price: 55, category: "Lifestyle",
    desc: "900×400mm non-slip desk mat. WM chart pattern design with W$ corner logo.",
    badge: null, stars: 4.8, reviews: 408,
    colors: ["#0D1117"],
    emoji: "🖥️", accent: "#00D4AA",
    details: ["900×400mm", "Non-slip base", "Stitched edges", "WM chart design"],
  },
  {
    id: 7, name: "Trading for a Living", price: 49, category: "Books",
    desc: "The definitive guide to psychology, risk, and discipline for the serious trader.",
    badge: "BESTSELLER", stars: 4.9, reviews: 1204,
    colors: ["#8a5a1a", "#E8B923"], emoji: "📗", accent: "#E8B923",
    details: ["Hardcover, 320 pages", "Psychology + risk", "Signed WM edition", "Ships worldwide"],
  },
  {
    id: 8, name: "The Little Book of Black Success", price: 29, category: "Books",
    desc: "Wealth, wisdom, and Black excellence in business, arts, and trading culture.",
    badge: "NEW", stars: 5.0, reviews: 318,
    colors: ["#0D0E14", "#059669"], emoji: "📘", accent: "#059669",
    details: ["Hardcover, 180 pages", "WM team foreword", "Cultural essays", "Gift-ready"],
  },
  {
    id: 9, name: "Kente Heritage Print", price: 199, category: "Art",
    desc: "Museum-grade giclée kente pattern on archival cotton. Numbered, limited run.",
    badge: "EXCLUSIVE", stars: 4.9, reviews: 76,
    colors: ["#E8B923", "#059669", "#8B5CF6"], emoji: "🖼️", accent: "#E8B923",
    details: ["Giclée on cotton", "24×36 in", "Numbered / limited", "Certificate included"],
  },
  {
    id: 10, name: "Order Flow Chart Art", price: 299, category: "Art",
    desc: "Original abstract of a live order-flow session — gold, emerald, and charcoal.",
    badge: null, stars: 4.8, reviews: 41,
    colors: ["#059669", "#E8B923"], emoji: "📈", accent: "#059669",
    details: ["Hand-finished print", "30×40 in", "Framed option", "Signed"],
  },
  {
    id: 11, name: "WM Grooming Bundle", price: 79, category: "Beauty",
    desc: "Premium beard + skin ritual set. Shea, gold oil, and a heritage scent.",
    badge: null, stars: 4.7, reviews: 263,
    colors: ["#3a2c10", "#F0B429"], emoji: "🧴", accent: "#F0B429",
    details: ["Beard oil + balm", "Shea butter", "Heritage scent", "Gift box"],
  },
  {
    id: 12, name: "Heritage Beauty Set", price: 59, category: "Beauty",
    desc: "Luxury skincare essentials in kente-wrapped packaging. Self-care, elevated.",
    badge: "NEW", stars: 4.8, reviews: 154,
    colors: ["#8B5CF6", "#E8B923"], emoji: "💄", accent: "#FF6B9D",
    details: ["Cleanser + serum", "Kente packaging", "Cruelty-free", "All skin types"],
  },
  {
    id: 13, name: "WM Excellence Vinyl", price: 39, category: "Music",
    desc: "Limited-press vinyl — WM Radio's finest hip-hop, R&B, and smooth jazz cuts.",
    badge: "LIMITED", stars: 5.0, reviews: 208,
    colors: ["#0D0E14", "#E8B923"], emoji: "🎵", accent: "#E8B923",
    details: ["180g heavyweight vinyl", "Gatefold sleeve", "12 tracks", "Numbered press"],
  },
  {
    id: 14, name: "WM Beat Pack Vol. 1", price: 19, category: "Music",
    desc: "20 royalty-free beats for creators — trap, lo-fi, and soul. Instant download.",
    badge: null, stars: 4.9, reviews: 512,
    colors: ["#8B5CF6", "#4FA3E0"], emoji: "💿", accent: "#8B5CF6",
    details: ["20 beats, WAV + MP3", "Royalty-free", "Trap · lo-fi · soul", "Instant download"],
  },
];

const CATEGORIES = ["All", "Books", "Art", "Music", "Beauty", "Apparel", "Accessories", "Lifestyle"];

interface CartItem { id: number; qty: number; }

export default function ShopPage() {
  const [cat,        setCat]        = useState("All");
  const [search,     setSearch]     = useState("");
  const [cartItems,  setCartItems]  = useState<CartItem[]>([]);
  const [wishlist,   setWishlist]   = useState<number[]>([]);
  const [cartOpen,   setCartOpen]   = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [detail,     setDetail]     = useState<typeof PRODUCTS[0] | null>(null);

  const products = PRODUCTS.filter(p =>
    (cat === "All" || p.category === cat) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase()))
  );

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => {
    const p = PRODUCTS.find(x => x.id === i.id);
    return s + (p?.price ?? 0) * i.qty;
  }, 0);

  const addToCart = (id: number, name: string) => {
    setCartItems(c => {
      const existing = c.find(x => x.id === id);
      if (existing) return c.map(x => x.id === id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { id, qty: 1 }];
    });
    toast.success(`${name} added to cart`, { icon: "🛍️" });
  };

  const changeQty = (id: number, delta: number) => {
    setCartItems(c => c.map(x => x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x).filter(x => x.qty > 0));
  };

  const removeFromCart = (id: number) => {
    setCartItems(c => c.filter(x => x.id !== id));
  };

  const toggleWishlist = (id: number) => {
    setWishlist(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]);
    toast.success(wishlist.includes(id) ? "Removed from wishlist" : "Added to wishlist", { icon: "❤️" });
  };

  const checkout = () => {
    setCheckoutDone(true);
  };

  return (
    <div className="flex flex-col h-full bg-wm-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-wm-border bg-wm-dark shrink-0">
        <h1 className="text-sm font-bold text-wm-text">WM Shop</h1>
        <span className="text-[10px] text-wm-text-muted">Premium merch for the Wealthy Mindsets community</span>
        <div className="ml-auto flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-wm-surface border border-wm-border rounded-lg px-2.5 py-1">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
              className="bg-transparent text-xs text-wm-text outline-none w-32 placeholder-wm-text-dim" />
            {search && <button onClick={() => setSearch("")} className="text-wm-text-dim hover:text-wm-text"><X size={11}/></button>}
          </div>
          {/* Category filters */}
          <div className="flex gap-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={clsx("px-3 py-1 rounded text-xs font-medium transition-all",
                  cat === c ? "bg-wm-gold/20 text-wm-gold border border-wm-gold/40" : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface")}>
                {c}
              </button>
            ))}
          </div>
          {/* Cart button */}
          <button onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wm-gold/15 border border-wm-gold/30 text-wm-gold text-xs font-semibold hover:bg-wm-gold/20 transition-colors">
            <ShoppingCart size={13} />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-wm-red text-white text-[9px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hero banner */}
      <div className="mx-4 mt-4 rounded-2xl p-6 border border-wm-gold/20 shrink-0 flex items-center gap-6"
        style={{ background: "linear-gradient(135deg, rgba(240,180,41,0.08) 0%, rgba(0,212,170,0.05) 100%)" }}>
        <div className="text-5xl">🧥</div>
        <div>
          <div className="text-xs font-semibold text-wm-gold uppercase tracking-widest mb-1">Limited Drop</div>
          <h2 className="text-xl font-black text-wm-text mb-2">W$ Bomber Jacket</h2>
          <p className="text-sm text-wm-text-muted mb-3">Premium leather-and-wool varsity with embroidered Wealthy Mindsets logo. Only 500 made.</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-wm-gold">$189</span>
            <button onClick={() => addToCart(1, "W$ Bomber Jacket")}
              className="px-4 py-2 rounded-lg bg-wm-gold text-wm-black text-sm font-bold hover:opacity-90 transition-colors">
              Shop Now
            </button>
            <span className="text-xs text-wm-red font-semibold animate-pulse">187 / 500 remaining</span>
          </div>
        </div>
      </div>

      {/* Products grid */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {products.length === 0 && (
          <div className="flex items-center justify-center h-40 text-wm-text-muted text-sm">
            No products match "{search}"
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          {(cat === "All" && !search
            ? [...PRODUCTS].sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category))
            : products
          ).flatMap((product, i, arr) => {
            const showHdr = cat === "All" && !search && (i === 0 || arr[i - 1].category !== product.category);
            const card = (
            <motion.div key={product.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="glass rounded-xl overflow-hidden hover:border-wm-border/80 transition-all group cursor-pointer"
              onClick={() => setDetail(product)}>
              <div className="relative h-44 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0D1117, #1C2128)" }}>
                <span className="text-6xl">{product.emoji}</span>

                {product.badge && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{
                      background: product.badge === "HOT" ? "rgba(255,77,106,0.25)" : product.badge === "EXCLUSIVE" ? "rgba(240,180,41,0.25)" : "rgba(0,212,170,0.25)",
                      color: product.badge === "HOT" ? "#FF4D6A" : product.badge === "EXCLUSIVE" ? "#F0B429" : "#00D4AA",
                      border: `1px solid ${product.badge === "HOT" ? "rgba(255,77,106,0.4)" : product.badge === "EXCLUSIVE" ? "rgba(240,180,41,0.4)" : "rgba(0,212,170,0.4)"}`,
                    }}>
                    {product.badge}
                  </div>
                )}

                <button onClick={e => { e.stopPropagation(); toggleWishlist(product.id); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-wm-surface/80 hover:bg-wm-surface transition-colors">
                  <Heart size={13} className={wishlist.includes(product.id) ? "text-wm-red fill-wm-red" : "text-wm-text-muted"} />
                </button>

                <div className="absolute bottom-2 right-2 flex gap-1">
                  {product.colors.map(c => (
                    <div key={c} className="w-3 h-3 rounded-full border border-wm-border/60" style={{ background: c }} />
                  ))}
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold text-wm-text leading-tight">{product.name}</h3>
                  <span className="text-sm font-black text-wm-gold shrink-0">${product.price}</span>
                </div>
                <p className="text-[11px] text-wm-text-muted leading-relaxed mb-2">{product.desc}</p>
                <div className="flex items-center gap-1 mb-3">
                  <Star size={10} className="text-wm-gold fill-wm-gold" />
                  <span className="text-[10px] font-semibold text-wm-gold">{product.stars}</span>
                  <span className="text-[10px] text-wm-text-dim">({product.reviews})</span>
                </div>
                <button onClick={e => { e.stopPropagation(); addToCart(product.id, product.name); }}
                  className="w-full py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${product.accent}33, ${product.accent}18)`, color: product.accent, border: `1px solid ${product.accent}40` }}>
                  Add to Cart
                </button>
              </div>
            </motion.div>
            );
            return showHdr
              ? [<h2 key={"h-" + product.category} className="col-span-3 text-[13px] font-black text-wm-gold uppercase tracking-widest mt-3">{product.category}</h2>, card]
              : [card];
          })}
        </div>
      </div>

      {/* ── Cart Panel ── */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-start justify-end"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={e => { if (e.target === e.currentTarget) { setCartOpen(false); setCheckoutDone(false); } }}>
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="h-full flex flex-col bg-wm-dark border-l border-wm-border shadow-2xl"
              style={{ width: 380 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-wm-border shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={15} className="text-wm-gold" />
                  <span className="font-black text-wm-text text-sm">Your Cart</span>
                  {cartCount > 0 && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-wm-gold/20 text-wm-gold">{cartCount} items</span>}
                </div>
                <button onClick={() => { setCartOpen(false); setCheckoutDone(false); }}
                  className="p-1.5 rounded-lg hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {checkoutDone ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <div className="text-5xl">🎉</div>
                    <div className="text-lg font-black text-wm-green">Thank You!</div>
                    <div className="text-sm text-wm-text-muted">Thank you! Our team will reach out to process your order. Questions? Email shop@wealthymindsets.com</div>
                    <button onClick={() => { setCartItems([]); setCartOpen(false); setCheckoutDone(false); }}
                      className="px-4 py-2 rounded-xl bg-wm-green/15 border border-wm-green/30 text-wm-green text-sm font-bold">
                      Done
                    </button>
                  </div>
                ) : cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-wm-text-muted">
                    <ShoppingCart size={36} className="opacity-20" />
                    <span className="text-sm">Your cart is empty</span>
                    <button onClick={() => setCartOpen(false)} className="text-xs text-wm-blue hover:underline">Continue shopping</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartItems.map(item => {
                      const product = PRODUCTS.find(p => p.id === item.id)!;
                      if (!product) return null;
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-wm-border bg-wm-surface/30">
                          <div className="text-3xl">{product.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-wm-text truncate">{product.name}</div>
                            <div className="text-xs text-wm-gold font-mono">${product.price}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => changeQty(item.id, -1)}
                              className="w-6 h-6 rounded border border-wm-border text-wm-text-muted hover:text-wm-text flex items-center justify-center">
                              <Minus size={10} />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-wm-text">{item.qty}</span>
                            <button onClick={() => changeQty(item.id, 1)}
                              className="w-6 h-6 rounded border border-wm-border text-wm-text-muted hover:text-wm-text flex items-center justify-center">
                              <Plus size={10} />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)}
                            className="text-wm-text-dim hover:text-wm-red transition-colors ml-1">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!checkoutDone && cartItems.length > 0 && (
                <div className="border-t border-wm-border px-5 py-4 shrink-0 space-y-3">
                  <div className="flex justify-between text-sm font-bold text-wm-text">
                    <span>Total</span>
                    <span className="text-wm-gold">${cartTotal.toFixed(2)}</span>
                  </div>
                  <button onClick={checkout}
                    className="w-full py-3 rounded-xl text-sm font-black text-wm-black hover:opacity-90 transition-all"
                    style={{ background: "linear-gradient(135deg, #F0B429, #FF8C00)" }}>
                    <Zap size={14} className="inline mr-1.5" />
                    Checkout — ${cartTotal.toFixed(2)}
                  </button>
                  <div className="text-center text-[10px] text-wm-text-dim">WealthyMindsets Official Merch</div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Product Detail Modal ── */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className="bg-wm-dark border border-wm-border rounded-2xl shadow-2xl overflow-hidden"
              style={{ width: 480 }}
              onClick={e => e.stopPropagation()}>
              <div className="relative h-52 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0D1117, #1C2128)" }}>
                <span className="text-8xl">{detail.emoji}</span>
                <button onClick={() => setDetail(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                  <X size={14} className="text-white" />
                </button>
                {detail.badge && (
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{ background: "rgba(240,180,41,0.25)", color: "#F0B429", border: "1px solid rgba(240,180,41,0.4)" }}>
                    {detail.badge}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-black text-wm-text">{detail.name}</h2>
                  <span className="text-xl font-black text-wm-gold">${detail.price}</span>
                </div>
                <p className="text-sm text-wm-text-muted mb-3">{detail.desc}</p>
                <div className="flex items-center gap-1 mb-3">
                  <Star size={11} className="text-wm-gold fill-wm-gold" />
                  <span className="text-xs font-semibold text-wm-gold">{detail.stars}</span>
                  <span className="text-xs text-wm-text-dim">({detail.reviews} reviews)</span>
                </div>
                <ul className="space-y-1 mb-4">
                  {detail.details.map(d => (
                    <li key={d} className="text-xs text-wm-text-muted flex items-center gap-2">
                      <span className="text-wm-green">✓</span> {d}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3">
                  <button onClick={() => { addToCart(detail.id, detail.name); setDetail(null); }}
                    className="flex-1 py-3 rounded-xl text-sm font-black text-wm-black hover:opacity-90 transition-all"
                    style={{ background: `linear-gradient(135deg, ${detail.accent}, ${detail.accent}bb)` }}>
                    Add to Cart
                  </button>
                  <button onClick={() => toggleWishlist(detail.id)}
                    className={clsx("w-12 rounded-xl border transition-all flex items-center justify-center",
                      wishlist.includes(detail.id) ? "bg-wm-red/15 border-wm-red/40 text-wm-red" : "border-wm-border text-wm-text-muted hover:text-wm-red")}>
                    <Heart size={16} className={wishlist.includes(detail.id) ? "fill-wm-red" : ""} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
