// app/api/rooms/info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRoomInfo } from "@/lib/roomStore";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const roomCodeParam = url.searchParams.get("roomCode") ?? "";
  const roomCode = roomCodeParam.toUpperCase().trim();

  if (!roomCode) {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const info = getRoomInfo(roomCode);
  return NextResponse.json(info);
}
