// app/api/rooms/ensure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRoomInfo } from "@/lib/roomStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // 無視
  }

  const rawCode = body?.roomCode;

  if (!rawCode || typeof rawCode !== "string") {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const roomCode = rawCode.toUpperCase().trim();
  const info = await getRoomInfo(roomCode);

  return NextResponse.json(info, { status: 200 });
}
