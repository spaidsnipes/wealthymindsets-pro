/**
 * /api/youtube-live?channels=ID1,ID2,...
 *
 * For each YouTube channel ID, fetches the channel's /live page,
 * follows the redirect, and extracts the current live video ID.
 * Returns { channelId: videoId } for all channels that are live.
 * Caches for 5 minutes server-side.
 */

import { NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CACHE = new Map<string, { videoId: string | null; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 min

async function getLiveVideoId(channelId: string): Promise<string | null> {
  const hit = CACHE.get(channelId);
  if (hit && Date.now() - hit.ts < TTL) return hit.videoId;

  try {
    // Fetch the channel's live page — YouTube redirects to the live video URL
    const res = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const html = await res.text();
    // A channel /live page can contain IDs for recent/recommended recordings even
    // when the channel is offline. Never label one of those videos "LIVE".
    const isLiveNow =
      /"isLiveNow"\s*:\s*true/.test(html) ||
      /"isLive"\s*:\s*true/.test(html);
    if (!isLiveNow) {
      CACHE.set(channelId, { videoId: null, ts: Date.now() });
      return null;
    }

    // Method 1: extract from canonical URL in <head>
    const canonicalMatch = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/);
    if (canonicalMatch) {
      CACHE.set(channelId, { videoId: canonicalMatch[1], ts: Date.now() });
      return canonicalMatch[1];
    }

    // Method 2: extract from og:url meta tag
    const ogMatch = html.match(/<meta property="og:url" content="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/);
    if (ogMatch) {
      CACHE.set(channelId, { videoId: ogMatch[1], ts: Date.now() });
      return ogMatch[1];
    }

    // Method 3: extract from the final redirect URL
    const urlMatch = res.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (urlMatch) {
      CACHE.set(channelId, { videoId: urlMatch[1], ts: Date.now() });
      return urlMatch[1];
    }

    // Method 4: look for "videoId":"XXXXXXXXXXX" in the page JSON
    const jsonMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (jsonMatch) {
      CACHE.set(channelId, { videoId: jsonMatch[1], ts: Date.now() });
      return jsonMatch[1];
    }

    CACHE.set(channelId, { videoId: null, ts: Date.now() });
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelIds = (searchParams.get("channels") ?? "").split(",").map(s => s.trim()).filter(Boolean);

  if (channelIds.length === 0) return NextResponse.json({ error: "No channels" }, { status: 400 });

  const results: Record<string, string | null> = {};
  await Promise.all(channelIds.map(async id => {
    results[id] = await getLiveVideoId(id);
  }));

  return NextResponse.json(results, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}
