import { NextResponse } from "next/server";
import { getAuthToken, verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
  const token = getAuthToken(req);
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const payload = verifyJWT(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({
    user: {
      id:              payload.sub,
      email:           payload.email,
      displayName:     payload.displayName,
      handle:          payload.handle,
      avatar:          payload.avatar,
      bio:             payload.bio,
      profileComplete: payload.profileComplete,
    },
  });
}
