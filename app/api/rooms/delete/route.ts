// app/api/rooms/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteRoom } from "@/lib/roomStore";

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
  const roomCode =
    typeof rawRoomCode === "string"
      ? rawRoomCode.toUpperCase().trim()
      : "";

  if (!roomCode) {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const ok = deleteRoom(roomCode);
  if (!ok) {
    return NextResponse.json(
      { error: "指定されたルームが見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
