"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, Plus, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  type: "above" | "below" | "pct-up" | "pct-down";
  pct?: number;
  triggered: boolean;
  createdAt: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  onAlertsChange: (alerts: PriceAlert[]) => void;
}

interface ToastMsg {
  id: string;
  text: string;
}

let toastCallbacks: ((msg: ToastMsg) => void)[] = [];

export function showAlertToast(msg: ToastMsg) {
  toastCallbacks.forEach(cb => cb(msg));
}

function AlertToast({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            style={{
              background: "#1C2235",
              border: "1px solid #2F80ED",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              pointerEvents: "auto",
              boxShadow: "0 4px 24px rgba(47,128,237,0.3)",
              minWidth: 220,
            }}
          >
            <Bell size={14} color="#2F80ED" />
            <span style={{ fontSize: 12, color: "#E2E8FF", flex: 1 }}>{t.text}</span>
            <button onClick={() => onDismiss(t.id)} style={{ color: "#4A5580", background: "none", border: "none", cursor: "pointer" }}>
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const ALERTS_KEY = "wm_price_alerts";

export function AlertsPanel({ open, onClose, symbol, currentPrice, onAlertsChange }: Props) {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try { return JSON.parse(localStorage.getItem(ALERTS_KEY) ?? "[]"); } catch { return []; }
  });

  // Persist alerts
  useEffect(() => {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    onAlertsChange(alerts);
  }, [alerts]); // eslint-disable-line react-hooks/exhaustive-deps
  const [addPrice, setAddPrice] = useState("");
  const [addType, setAddType] = useState<PriceAlert["type"]>("above");
  const [addPct, setAddPct] = useState("1");
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const { ticker } = useWebSocket({ symbol, timeframe: "1m" });

  const livePrice = ticker.price > 0 ? ticker.price : currentPrice;

  // Register toast callback
  useEffect(() => {
    const cb = (msg: ToastMsg) => {
      setToasts(prev => [...prev, msg]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== msg.id)), 5000);
    };
    toastCallbacks.push(cb);
    return () => { toastCallbacks = toastCallbacks.filter(c => c !== cb); };
  }, []);

  // Check alert triggers
  useEffect(() => {
    if (!livePrice) return;
    setAlerts(prev => {
      let changed = false;
      const next = prev.map(a => {
        if (a.triggered || a.symbol !== symbol) return a;
        let hit = false;
        if (a.type === "above" && livePrice >= a.price) hit = true;
        if (a.type === "below" && livePrice <= a.price) hit = true;
        if (a.type === "pct-up" && livePrice >= a.price * (1 + (a.pct ?? 1) / 100)) hit = true;
        if (a.type === "pct-down" && livePrice <= a.price * (1 - (a.pct ?? 1) / 100)) hit = true;
        if (hit) {
          changed = true;
          const msg = { id: `toast-${Date.now()}`, text: `Alert: ${symbol} ${a.type === "above" ? "crossed above" : a.type === "below" ? "crossed below" : "moved"} ${a.price.toLocaleString()}` };
          showAlertToast(msg);
          return { ...a, triggered: true };
        }
        return a;
      });
      if (changed) {
        onAlertsChange(next);
        return next;
      }
      return prev;
    });
  }, [livePrice, symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const addAlert = () => {
    const price = parseFloat(addPrice) || livePrice;
    if (!price) return;
    const alert: PriceAlert = {
      id: `alert-${Date.now()}`,
      symbol,
      price,
      type: addType,
      pct: addType.includes("pct") ? parseFloat(addPct) : undefined,
      triggered: false,
      createdAt: Date.now(),
    };
    const next = [...alerts, alert];
    setAlerts(next);
    onAlertsChange(next);
    setAddPrice("");
  };

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id);
      onAlertsChange(next);
      return next;
    });
  }, [onAlertsChange]);

  const dp = livePrice > 100 ? 2 : livePrice > 10 ? 3 : 4;

  return (
    <>
      <AlertToast toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: 300,
              background: "#0B0E1A",
              borderLeft: "1px solid #263050",
              zIndex: 500,
              display: "flex", flexDirection: "column",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 14px", height: 44,
              borderBottom: "1px solid #263050", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={14} color="#2F80ED" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#E2E8FF" }}>Price Alerts</span>
                <span style={{ fontSize: 10, color: "#8896BE" }}>{symbol}</span>
              </div>
              <button onClick={onClose} style={{ color: "#8896BE", background: "none", border: "none", cursor: "pointer" }}>
                <X size={15} />
              </button>
            </div>

            {/* Current price */}
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid #263050",
              background: "#141824", flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, color: "#8896BE" }}>Current price</span>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#E2E8FF", fontFamily: "monospace", marginTop: 2 }}>
                {livePrice.toFixed(dp)}
              </div>
            </div>

            {/* Add alert form */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #263050", flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#8896BE", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                New Alert
              </span>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Type selector */}
                <div style={{ display: "flex", gap: 4 }}>
                  {(["above", "below", "pct-up", "pct-down"] as const).map(t => (
                    <button key={t} onClick={() => setAddType(t)} style={{
                      flex: 1, fontSize: 9, fontWeight: 700, padding: "4px 0", borderRadius: 4, cursor: "pointer",
                      background: addType === t ? "rgba(47,128,237,0.2)" : "#141824",
                      border: addType === t ? "1px solid rgba(47,128,237,0.5)" : "1px solid #263050",
                      color: addType === t ? "#2F80ED" : "#8896BE",
                    }}>
                      {t === "above" ? "↑ Above" : t === "below" ? "↓ Below" : t === "pct-up" ? "+% Up" : "-% Down"}
                    </button>
                  ))}
                </div>

                {/* Price input */}
                <input
                  type="number"
                  value={addPrice}
                  onChange={e => setAddPrice(e.target.value)}
                  placeholder={`Price (current: ${livePrice.toFixed(dp)})`}
                  onKeyDown={e => { if (e.key === "Enter") addAlert(); }}
                  style={{
                    background: "#141824", border: "1px solid #263050", borderRadius: 5,
                    color: "#E2E8FF", fontSize: 12, padding: "6px 10px", outline: "none",
                    caretColor: "#2F80ED", width: "100%", boxSizing: "border-box",
                  }}
                />

                {/* Pct input if pct mode */}
                {(addType === "pct-up" || addType === "pct-down") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      value={addPct}
                      onChange={e => setAddPct(e.target.value)}
                      style={{
                        flex: 1, background: "#141824", border: "1px solid #263050", borderRadius: 5,
                        color: "#E2E8FF", fontSize: 12, padding: "6px 10px", outline: "none",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#8896BE" }}>% change</span>
                  </div>
                )}

                <button onClick={addAlert} style={{
                  background: "rgba(47,128,237,0.15)",
                  border: "1px solid rgba(47,128,237,0.4)",
                  borderRadius: 5, color: "#2F80ED", fontSize: 12, fontWeight: 700,
                  padding: "7px 0", cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 5,
                }}>
                  <Plus size={12} /> Add Alert
                </button>
              </div>
            </div>

            {/* Alert list */}
            <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin" }}>
              {alerts.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <BellOff size={24} color="#4A5580" style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 12, color: "#8896BE" }}>No alerts set</div>
                  <div style={{ fontSize: 10, color: "#4A5580", marginTop: 4 }}>Create an alert above to get notified</div>
                </div>
              ) : alerts.map(alert => {
                const up = alert.type === "above" || alert.type === "pct-up";
                return (
                  <div key={alert.id} style={{
                    display: "flex", alignItems: "center", padding: "9px 14px",
                    borderBottom: "1px solid rgba(38,48,80,0.5)",
                    background: alert.triggered ? "rgba(255,77,103,0.05)" : "transparent",
                    opacity: alert.triggered ? 0.55 : 1,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {up ? <ChevronUp size={11} color="#00C076" /> : <ChevronDown size={11} color="#FF4D67" />}
                        <span style={{ fontSize: 12, fontWeight: 700, color: up ? "#00C076" : "#FF4D67", fontFamily: "monospace" }}>
                          {alert.price.toFixed(dp)}
                        </span>
                        {alert.triggered && (
                          <span style={{ fontSize: 9, background: "rgba(255,77,103,0.15)", border: "1px solid rgba(255,77,103,0.3)", borderRadius: 3, padding: "1px 4px", color: "#FF4D67", fontWeight: 700 }}>
                            TRIGGERED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "#8896BE", marginTop: 2 }}>
                        {alert.type === "above" ? "Price crosses above" :
                         alert.type === "below" ? "Price crosses below" :
                         alert.type === "pct-up" ? `+${alert.pct}% move up` : `-${alert.pct}% move down`}
                        {" · "}{alert.symbol}
                      </div>
                    </div>
                    <button onClick={() => removeAlert(alert.id)} style={{ color: "#4A5580", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: "8px 14px", borderTop: "1px solid #263050", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "#4A5580" }}>
                {alerts.filter(a => !a.triggered).length} active · {alerts.filter(a => a.triggered).length} triggered
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
