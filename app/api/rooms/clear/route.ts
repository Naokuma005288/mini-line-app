// app/api/rooms/clear/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  clearRoomMessages,
  addSystemMessage,
  getRoomInfo,
} from "@/lib/roomStore";

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

  await clearRoomMessages(roomCode);
  await addSystemMessage(
    roomCode,
    "メッセージがすべて削除されました",
  );

  const info = await getRoomInfo(roomCode);
  return NextResponse.json(info, { status: 200 });
}
