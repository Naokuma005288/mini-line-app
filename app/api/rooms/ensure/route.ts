// app/api/rooms/ensure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createRoom, getRoomInfo } from "@/lib/roomStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON の形式が不正です" },
      { status: 400 },
    );
  }

  const rawRoomCode = body?.roomCode;
  const rawName = body?.name;

  const roomCode =
    typeof rawRoomCode === "string"
      ? rawRoomCode.toUpperCase().trim()
      : "";
  const name =
    typeof rawName === "string" ? rawName.trim() : undefined;

  if (!roomCode) {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  // すでに存在していればそれを返す / なければ作る
  const room = createRoom(roomCode, name);
  const info = getRoomInfo(room.code);

  return NextResponse.json({ room: info });
}
