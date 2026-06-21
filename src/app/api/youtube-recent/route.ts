/**
 * /api/youtube-recent?channelId=CHANNEL_ID&days=5
 * Uses YouTube's public RSS feed (no API key needed).
 * Returns recent video IDs from the past N days.
 */
import { NextResponse } from "next/server";

const CACHE = new Map<string, { videos: VideoItem[]; ts: number }>();
const TTL = 15 * 60 * 1000; // 15 min

interface VideoItem { videoId: string; title: string; published: string; thumbnail: string; }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId") ?? "";
  const days = parseInt(searchParams.get("days") ?? "5", 10);

  if (!channelId) return NextResponse.json({ error: "No channelId" }, { status: 400 });

  const hit = CACHE.get(channelId);
  if (hit && Date.now() - hit.ts < TTL) return NextResponse.json(hit.videos);

  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const xml = await res.text();

    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const videos: VideoItem[] = [];
    for (const [, entry] of entries) {
      const videoIdMatch   = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch     = entry.match(/<title>([^<]+)<\/title>/);
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
      if (!videoIdMatch || !publishedMatch) continue;
      const published = publishedMatch[1];
      if (new Date(published).getTime() < cutoff) continue;
      videos.push({
        videoId:   videoIdMatch[1],
        title:     titleMatch ? titleMatch[1].replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">") : "",
        published,
        thumbnail: `https://img.youtube.com/vi/${videoIdMatch[1]}/mqdefault.jpg`,
      });
    }

    CACHE.set(channelId, { videos, ts: Date.now() });
    return NextResponse.json(videos, {
      headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
