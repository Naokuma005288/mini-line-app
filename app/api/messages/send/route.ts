// app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addUserMessage, getRoomInfo } from "@/lib/roomStore";
import { maskNgWords } from "@/lib/ngWords";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // 無視
  }

  const rawCode = body?.roomCode;
  const rawNickname = body?.nickname;
  const rawText = body?.text;

  if (
    !rawCode ||
    typeof rawCode !== "string" ||
    !rawNickname ||
    typeof rawNickname !== "string" ||
    !rawText ||
    typeof rawText !== "string"
  ) {
    return NextResponse.json(
      { error: "roomCode / nickname / text は必須です" },
      { status: 400 },
    );
  }

  const roomCode = rawCode.toUpperCase().trim();
  const nickname = rawNickname.trim().slice(0, 20);
  const text = rawText.trim();

  if (!roomCode || !nickname || !text) {
    return NextResponse.json(
      { error: "roomCode / nickname / text は必須です" },
      { status: 400 },
    );
  }

  // ルームの一時停止チェック
  const info = await getRoomInfo(roomCode);
  if (!info.exists) {
    return NextResponse.json(
      { error: "このルームは存在しません" },
      { status: 404 },
    );
  }
  if (info.suspended) {
    return NextResponse.json(
      { error: "このルームは一時停止中です" },
      { status: 403 },
    );
  }

  const safeText = maskNgWords(text);

  try {
    const msg = await addUserMessage(roomCode, nickname, safeText);
    return NextResponse.json({ ok: true, message: msg }, { status: 200 });
  } catch (err: any) {
    if (String(err?.message) === "ROOM_NOT_FOUND") {
      return NextResponse.json(
        { error: "このルームは存在しません" },
        { status: 404 },
      );
    }
    console.error("[messages/send] error:", err);
    return NextResponse.json(
      { error: "メッセージ送信中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
