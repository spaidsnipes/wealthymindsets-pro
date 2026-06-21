"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  LiveKitRoom,
  useParticipants,
  useTracks,
  VideoTrack,
  useLocalParticipant,
  RoomAudioRenderer,
  AudioTrack,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Users, Hand, Check, X, Eye, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Data message types sent over LiveKit data channel ─── */
type DataMsg =
  | { type: "JOIN_REQUEST"; identity: string; name: string }
  | { type: "JOIN_APPROVED"; identity: string }
  | { type: "JOIN_DENIED";   identity: string }
  | { type: "REQUEST_CANCEL"; identity: string };

const MAX_SPEAKERS = 4;

/* ══════════════════════════════════════════════════════════════
   VIDEO TILE
══════════════════════════════════════════════════════════════ */
function VideoTile({ identity, isSpeaking, videoTrack, isLocal }: {
  identity: string;
  isSpeaking: boolean;
  videoTrack?: React.ComponentProps<typeof VideoTrack>["trackRef"];
  isLocal?: boolean;
}) {
  return (
    <div className={`relative rounded-xl overflow-hidden transition-all border-2 ${
      isSpeaking ? "border-wm-green/70 shadow-lg shadow-wm-green/20" : "border-wm-border/20"
    }`} style={{ background: "#0D1117", aspectRatio: "16/9" }}>
      {videoTrack ? (
        <VideoTrack trackRef={videoTrack} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-wm-surface flex items-center justify-center font-black text-wm-text text-xl"
            style={{ border: isSpeaking ? "2px solid #00D4AA" : "2px solid #333" }}>
            {identity[0]?.toUpperCase()}
          </div>
        </div>
      )}
      {/* Name tag */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="text-[10px] text-white font-semibold bg-black/60 rounded-full px-2 py-0.5">
          {identity}{isLocal ? " (you)" : ""}
        </span>
        {isSpeaking && <span className="w-1.5 h-1.5 rounded-full bg-wm-green animate-pulse" />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOM INNER — inside LiveKitRoom context
══════════════════════════════════════════════════════════════ */
function RoomInner({ roomName, isHost, onLeave, userName }: {
  roomName: string;
  isHost: boolean;
  onLeave: () => void;
  userName: string;
}) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();

  const [screenSharing, setScreenSharing]   = useState(false);
  const [requests, setRequests]             = useState<{ identity: string; name: string }[]>([]);
  const [myRequestState, setMyRequestState] = useState<"idle" | "pending" | "approved" | "denied">("idle");
  const [canPublishNow, setCanPublishNow]   = useState(isHost);

  /* All tracks */
  const allTracks = useTracks([
    Track.Source.Camera,
    Track.Source.ScreenShare,
    Track.Source.Microphone,
  ]);

  /* Video tracks from remote participants */
  const remoteVideoTracks = allTracks.filter(t =>
    (t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare) &&
    !t.participant.isLocal
  );

  /* Local camera track */
  const localVideoTracks = allTracks.filter(t =>
    t.source === Track.Source.Camera && t.participant.isLocal
  );
  const localVideoTrack = localVideoTracks[0];

  /* Remote audio tracks */
  const remoteAudioTracks = allTracks.filter(t =>
    t.source === Track.Source.Microphone && !t.participant.isLocal
  );

  /* Active video speakers: local (if camera on) + remotes */
  const localInGrid = isCameraEnabled && canPublishNow;
  const activeSpeakerCount = (localInGrid ? 1 : 0) + remoteVideoTracks.length;

  /* ── Listen for data messages ── */
  useEffect(() => {
    const decoder = new TextDecoder();
    const handler = (payload: Uint8Array, participant: { identity: string } | undefined) => {
      try {
        const msg = JSON.parse(decoder.decode(payload)) as DataMsg;
        if (msg.type === "JOIN_REQUEST" && isHost) {
          setRequests(prev => prev.some(r => r.identity === msg.identity) ? prev : [...prev, { identity: msg.identity, name: msg.name }]);
        }
        if (msg.type === "JOIN_APPROVED" && msg.identity === localParticipant.identity) {
          setMyRequestState("approved");
          setCanPublishNow(true);
        }
        if (msg.type === "JOIN_DENIED" && msg.identity === localParticipant.identity) {
          setMyRequestState("denied");
        }
        if (msg.type === "REQUEST_CANCEL") {
          setRequests(prev => prev.filter(r => r.identity !== msg.identity));
        }
      } catch { /* ignore */ }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => { room.off(RoomEvent.DataReceived, handler); };
  }, [room, isHost, localParticipant.identity]);

  /* ── Send a data message to everyone ── */
  const sendMsg = useCallback((msg: DataMsg) => {
    const encoder = new TextEncoder();
    localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true });
  }, [localParticipant]);

  /* ── Host: approve a request ── */
  const approveRequest = useCallback(async (identity: string) => {
    // Server grants publish permission
    await fetch("/api/livekit/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomName, identity }),
    });
    // Notify everyone (especially the approved participant)
    sendMsg({ type: "JOIN_APPROVED", identity });
    setRequests(prev => prev.filter(r => r.identity !== identity));
  }, [roomName, sendMsg]);

  /* ── Host: deny a request ── */
  const denyRequest = useCallback((identity: string) => {
    sendMsg({ type: "JOIN_DENIED", identity });
    setRequests(prev => prev.filter(r => r.identity !== identity));
  }, [sendMsg]);

  /* ── Viewer: request to join ── */
  const requestToJoin = useCallback(() => {
    setMyRequestState("pending");
    sendMsg({ type: "JOIN_REQUEST", identity: localParticipant.identity, name: userName });
  }, [sendMsg, localParticipant.identity, userName]);

  /* ── Viewer: cancel request ── */
  const cancelRequest = useCallback(() => {
    setMyRequestState("idle");
    sendMsg({ type: "REQUEST_CANCEL", identity: localParticipant.identity });
  }, [sendMsg, localParticipant.identity]);

  const [camError, setCamError] = useState<string | null>(null);

  /* ── Controls ── */
  const toggleMic = async () => {
    try { await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled); } catch { /* ignore */ }
  };
  const toggleCamera = async () => {
    setCamError(null);
    // First verify a camera device is available
    if (!isCameraEnabled) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(d => d.kind === "videoinput");
        if (!hasCamera) {
          setCamError("No camera detected. Connect a camera or check your browser permissions.");
          return;
        }
        // Quick permission check
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach(t => t.stop()); // release immediately
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const ml = msg.toLowerCase();
        if (ml.includes("notfound") || ml.includes("not found") || ml.includes("devicenotfound")) {
          setCamError("Camera not found. Make sure your camera is connected and not used by another app.");
        } else if (ml.includes("permission") || ml.includes("denied") || ml.includes("notallowed")) {
          setCamError("Camera permission denied. Click the camera icon in your browser address bar to allow access.");
        } else {
          setCamError("Camera unavailable: " + msg);
        }
        return;
      }
    }
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setCamError("Camera failed: " + msg);
    }
  };
  const toggleScreen = async () => {
    if (screenSharing) { await localParticipant.setScreenShareEnabled(false); setScreenSharing(false); }
    else { const ok = await localParticipant.setScreenShareEnabled(true); if (ok) setScreenSharing(true); }
  };

  /* ── Video grid: up to 4 tiles ── */
  const gridTiles: React.ReactNode[] = [];
  if (localInGrid && localVideoTrack) {
    gridTiles.push(
      <VideoTile key="local" identity={localParticipant.identity}
        isSpeaking={localParticipant.isSpeaking} videoTrack={localVideoTrack} isLocal />
    );
  } else if (localInGrid) {
    /* Camera on but track not yet published — show avatar */
    gridTiles.push(
      <VideoTile key="local" identity={localParticipant.identity}
        isSpeaking={localParticipant.isSpeaking} isLocal />
    );
  }
  remoteVideoTracks.slice(0, MAX_SPEAKERS - (localInGrid ? 1 : 0)).forEach(t => {
    gridTiles.push(
      <VideoTile key={t.publication.trackSid} identity={t.participant.identity}
        isSpeaking={t.participant.isSpeaking} videoTrack={t} />
    );
  });

  /* Grid layout class */
  const gridClass = gridTiles.length === 1 ? "grid-cols-1"
    : gridTiles.length === 2 ? "grid-cols-2"
    : "grid-cols-2";

  /* Viewers (no video track) */
  const viewers = participants.filter(p => {
    const hasVideo = remoteVideoTracks.some(t => t.participant.identity === p.identity);
    const isLocalSpeaker = p.isLocal && localInGrid;
    return !hasVideo && !isLocalSpeaker;
  });

  return (
    <div className="flex flex-col gap-3">
      <RoomAudioRenderer />
      {remoteAudioTracks.map(t => <AudioTrack key={t.publication.trackSid} trackRef={t} />)}

      {/* ── Video grid ── */}
      {gridTiles.length > 0 ? (
        <div className={`grid gap-1.5 ${gridClass}`}>
          {gridTiles}
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 rounded-xl border border-wm-border/20 bg-wm-surface/30">
          <span className="text-[10px] text-wm-text-dim">No video yet</span>
        </div>
      )}

      {/* ── Host join requests ── */}
      <AnimatePresence>
        {requests.map(req => (
          <motion.div key={req.identity}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-wm-green/10 border border-wm-green/25">
            <Hand size={11} className="text-wm-green shrink-0" />
            <span className="text-[10px] text-wm-text flex-1 truncate">
              <span className="font-bold">{req.name}</span> wants to join video
            </span>
            {activeSpeakerCount < MAX_SPEAKERS ? (
              <button onClick={() => approveRequest(req.identity)}
                className="p-1 rounded-md bg-wm-green/20 text-wm-green hover:bg-wm-green/30 transition-all">
                <Check size={10} />
              </button>
            ) : (
              <span className="text-[8px] text-wm-text-dim">Room full</span>
            )}
            <button onClick={() => denyRequest(req.identity)}
              className="p-1 rounded-md bg-wm-red/20 text-wm-red hover:bg-wm-red/30 transition-all">
              <X size={10} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Viewer: request to join / status ── */}
      {!isHost && !canPublishNow && (
        <div className="flex items-center gap-2">
          {myRequestState === "idle" && (
            <button onClick={requestToJoin} disabled={activeSpeakerCount >= MAX_SPEAKERS}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-wm-purple/15 text-wm-purple border border-wm-purple/30 hover:bg-wm-purple/25 transition-all disabled:opacity-40">
              <Hand size={10} /> {activeSpeakerCount >= MAX_SPEAKERS ? "Room Full (4/4)" : "Request to Join Video"}
            </button>
          )}
          {myRequestState === "pending" && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-wm-surface border border-wm-border/40">
              <span className="w-1.5 h-1.5 rounded-full bg-wm-yellow animate-pulse" />
              <span className="text-[10px] text-wm-text-dim">Waiting for host…</span>
              <button onClick={cancelRequest} className="text-[9px] text-wm-red underline ml-1">Cancel</button>
            </div>
          )}
          {myRequestState === "denied" && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-wm-red/10 border border-wm-red/20">
              <X size={10} className="text-wm-red" />
              <span className="text-[10px] text-wm-red">Request declined</span>
              <button onClick={() => setMyRequestState("idle")} className="text-[9px] text-wm-text-dim underline ml-1">Retry</button>
            </div>
          )}
        </div>
      )}

      {/* ── Viewers list ── */}
      {viewers.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <Eye size={9} className="text-wm-text-dim shrink-0" />
          <span className="text-[9px] text-wm-text-dim">{viewers.length} watching:</span>
          {viewers.slice(0, 6).map(p => (
            <span key={p.identity} className="text-[9px] text-wm-text-dim bg-wm-surface rounded-full px-1.5 py-0.5">
              {p.identity}
            </span>
          ))}
          {viewers.length > 6 && <span className="text-[9px] text-wm-text-dim">+{viewers.length - 6}</span>}
        </div>
      )}

      {/* ── Controls bar ── */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-wm-border/40 flex-wrap">
        {/* Mic — everyone can mute/unmute themselves */}
        <button onClick={toggleMic}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
            isMicrophoneEnabled
              ? "bg-wm-green/15 text-wm-green border-wm-green/30"
              : "bg-wm-red/15 text-wm-red border-wm-red/30"
          }`}>
          {isMicrophoneEnabled ? <Mic size={11} /> : <MicOff size={11} />}
          {isMicrophoneEnabled ? "Mic On" : "Muted"}
        </button>

        {/* Camera — only speakers */}
        {canPublishNow && (
          <button onClick={toggleCamera}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
              isCameraEnabled
                ? "bg-wm-blue/15 text-wm-blue border-wm-blue/30"
                : "bg-wm-surface text-wm-text-dim border-wm-border/40"
            }`}>
            {isCameraEnabled ? <Video size={11} /> : <VideoOff size={11} />}
            Cam
          </button>
        )}

        {/* Screen share — only speakers */}
        {canPublishNow && (
          <button onClick={toggleScreen}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
              screenSharing
                ? "bg-wm-purple/15 text-wm-purple border-wm-purple/30"
                : "bg-wm-surface text-wm-text-dim border-wm-border/40"
            }`}>
            <Monitor size={11} />
            {screenSharing ? "Stop Share" : "Share"}
          </button>
        )}

        {/* Camera permission error */}
        {camError && (
          <div className="w-full text-[9px] text-wm-red bg-wm-red/10 rounded px-2 py-1 mt-1">
            {camError}
          </div>
        )}

        {/* Participants count */}
        <div className="flex items-center gap-1 px-2 py-1.5 text-[10px] text-wm-text-dim">
          <Users size={10} /> {participants.length}
        </div>

        <button onClick={onLeave}
          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-wm-red/15 text-wm-red border border-wm-red/30 hover:bg-wm-red/25 transition-all">
          <PhoneOff size={11} /> Leave
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN LiveRoom COMPONENT
══════════════════════════════════════════════════════════════ */
interface LiveRoomProps {
  roomName:  string;
  roomLabel: string;
  color:     string;
  userName:  string;
  isHost:    boolean;
  onClose:   () => void;
}

export default function LiveRoom({ roomName, roomLabel, color, userName, isHost, onClose }: LiveRoomProps) {
  const [token,      setToken]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [joined,     setJoined]     = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const join = async () => {
    setLoading(true);
    setError(null);
    try {
      const role = isHost ? "host" : "viewer";
      const res  = await fetch(
        `/api/livekit?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(userName || "Guest")}&role=${role}`
      );
      const json = await res.json() as { token?: string; error?: string };
      if (json.error) throw new Error(json.error);
      setToken(json.token!);
      setJoined(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
    }
    setLoading(false);
  };

  const leave = () => {
    setToken(null);
    setJoined(false);
    onClose();
  };

  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";

  const roomContent = (
    <div className={fullscreen ? "flex flex-col h-full" : ""}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        <span className="text-xs font-black text-wm-text">{roomLabel}</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold text-wm-red bg-wm-red/15 border border-wm-red/30">LIVE</span>
        {isHost && (
          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold text-wm-yellow bg-wm-yellow/15 border border-wm-yellow/30">HOST</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setFullscreen(f => !f)}
            className="text-wm-text-dim hover:text-wm-text transition-colors p-1 rounded hover:bg-wm-surface"
            title={fullscreen ? "Minimize" : "Full Screen"}>
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button onClick={onClose} className="text-wm-text-dim hover:text-wm-text transition-colors">✕</button>
        </div>
      </div>

      {!joined ? (
        <div className="space-y-2">
          <p className="text-[10px] text-wm-text-dim">
            {isHost
              ? "You'll go live with camera & mic. Viewers can request to join (max 4 on video)."
              : "You'll watch the live. You can request to join video — host must approve."}
          </p>
          {error && <p className="text-[10px] text-wm-red bg-wm-red/10 rounded px-2 py-1">{error}</p>}
          <button onClick={join} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border disabled:opacity-50"
            style={{ background:`${color}15`, color, borderColor:`${color}40` }}>
            {isHost ? <Video size={11} /> : <Eye size={11} />}
            {loading ? "Joining…" : isHost ? "Go Live" : "Watch"}
          </button>
        </div>
      ) : token ? (
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          audio={true}
          video={isHost}
          onDisconnected={leave}
          style={{ background: "transparent" }}
        >
          <RoomInner roomName={roomName} isHost={isHost} onLeave={leave} userName={userName} />
        </LiveKitRoom>
      ) : null}
    </div>
  );

  if (fullscreen) {
    return (
      <AnimatePresence>
        <motion.div
          key="fullscreen-room"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col p-6 overflow-y-auto"
          style={{ background: "rgba(7,8,12,0.97)", backdropFilter: "blur(20px)" }}
        >
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col">
            <div className="rounded-2xl border flex-1 p-5"
              style={{ borderColor: `${color}40`, background: "#0D1117" }}>
              {roomContent}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl border bg-wm-dark p-3"
      style={{ borderColor: `${color}40` }}
    >
      {roomContent}
    </motion.div>
  );
}
