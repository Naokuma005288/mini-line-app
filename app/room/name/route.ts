// app/api/rooms/name/route.ts
import { NextRequest, NextResponse } from "next/server";
import { setRoomName } from "@/lib/roomStore";

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
    typeof rawName === "string" ? rawName.trim() : "";

  if (!roomCode || !name) {
    return NextResponse.json(
      { error: "roomCode と name は必須です" },
      { status: 400 },
    );
  }

  if (name.length > 40) {
    return NextResponse.json(
      { error: "ルーム名は40文字までです" },
      { status: 400 },
    );
  }

  const ok = setRoomName(roomCode, name);
  if (!ok) {
    return NextResponse.json(
      { error: "指定されたルームが見つかりません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, name });
}
