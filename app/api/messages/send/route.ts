// app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addMessage, isRoomSuspended } from "@/lib/roomStore";
import { maskNgWords } from "@/lib/ngWords";

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
  const rawNickname = body?.nickname;
  const rawText = body?.text;

  const roomCode =
    typeof rawRoomCode === "string"
      ? rawRoomCode.toUpperCase().trim()
      : "";
  const nickname =
    typeof rawNickname === "string" ? rawNickname.trim() : "";
  const text =
    typeof rawText === "string" ? rawText.trim() : "";

  if (!roomCode || !nickname || !text) {
    return NextResponse.json(
      { error: "roomCode / nickname / text は必須です" },
      { status: 400 },
    );
  }

  if (text.length > 200) {
    return NextResponse.json(
      { error: "メッセージは最大 200 文字までです" },
      { status: 400 },
    );
  }

  // 一時停止中なら送信不可
  if (isRoomSuspended(roomCode)) {
    return NextResponse.json(
      { error: "このルームは一時停止中です" },
      { status: 403 },
    );
  }

  // ★ NGワードを ***** で伏字にする
  const safeText = maskNgWords(text);

  // addMessage 内で room がなければ自動作成される＆rooms.json に保存される
  const msg = addMessage(roomCode, nickname, safeText);
  if (!msg) {
    return NextResponse.json(
      { error: "メッセージを保存できませんでした" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: msg });
}
