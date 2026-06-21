import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

export async function POST(request: Request) {
  const { room, identity } = await request.json() as { room: string; identity: string };
  if (!room || !identity) return NextResponse.json({ error: "room and identity required" }, { status: 400 });

  const apiKey    = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  const host      = (process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "").replace("wss://", "https://");

  const svc = new RoomServiceClient(host, apiKey, apiSecret);

  try {
    await svc.updateParticipant(room, identity, undefined, {
      canPublish:     true,
      canSubscribe:   true,
      canPublishData: true,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
