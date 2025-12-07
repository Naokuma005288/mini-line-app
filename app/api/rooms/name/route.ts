// app/api/rooms/name/route.ts
import { NextRequest, NextResponse } from "next/server";
import { renameRoom, addSystemMessage } from "@/lib/roomStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // 無視
  }

  const rawCode = body?.roomCode;
  const rawName = body?.name;

  if (
    !rawCode ||
    typeof rawCode !== "string" ||
    !rawName ||
    typeof rawName !== "string"
  ) {
    return NextResponse.json(
      { error: "roomCode / name は必須です" },
      { status: 400 },
    );
  }

  const roomCode = rawCode.toUpperCase().trim();
  const name = rawName.trim().slice(0, 40);

  const room = await renameRoom(roomCode, name);
  if (!room) {
    return NextResponse.json(
      { error: "ルームが存在しません" },
      { status: 404 },
    );
  }

  await addSystemMessage(roomCode, `ルーム名が「${name}」に変更されました`);

  return NextResponse.json({ room }, { status: 200 });
}
