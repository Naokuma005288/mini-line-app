// app/api/rooms/suspend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { setRoomSuspended, addSystemMessage } from "@/lib/roomStore";

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
  const rawSuspended = body?.suspended;

  const roomCode =
    typeof rawRoomCode === "string"
      ? rawRoomCode.toUpperCase().trim()
      : "";

  const suspended = Boolean(rawSuspended);

  if (!roomCode) {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const ok = setRoomSuspended(roomCode, suspended);
  if (!ok) {
    return NextResponse.json(
      { error: "指定されたルームが見つかりません" },
      { status: 404 },
    );
  }

  const text = suspended
    ? "このルームは管理者によって一時停止されました。新しいメッセージは送信できません。"
    : "このルームの一時停止が解除されました。メッセージ送信が再開されます。";

  addSystemMessage(roomCode, text);

  return NextResponse.json({ ok: true, suspended });
}
