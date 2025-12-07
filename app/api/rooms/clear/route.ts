// app/api/rooms/clear/route.ts
import { NextRequest, NextResponse } from "next/server";
import { clearRoom, addSystemMessage } from "@/lib/roomStore";

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

  const ok = clearRoom(roomCode);
  if (!ok) {
    return NextResponse.json(
      { error: "指定されたルームが見つかりません" },
      { status: 404 },
    );
  }

  // 全削除後にサーバーからお知らせメッセージを1つだけ追加
  addSystemMessage(
    roomCode,
    "このルームのメッセージは管理者によってすべて削除されました。",
  );

  return NextResponse.json({ ok: true });
}
