// app/api/rooms/create/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createRoom, getRoomInfo } from "@/lib/roomStore";

export const dynamic = "force-dynamic";

/**
 * 指定された roomCode のルームに「入る or 作る」API
 * - すでに存在していればそのルーム情報を返す
 * - 無ければ新しく作って、情報を返す
 *
 * POST /api/rooms/create/join
 * body: { roomCode: string, name?: string }
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // body なしでも一応動くように
  }

  const rawCode = body?.roomCode;
  const rawName = body?.name;

  const roomCode =
    typeof rawCode === "string"
      ? rawCode.toUpperCase().trim()
      : "";
  const name =
    typeof rawName === "string" ? rawName.trim() : undefined;

  if (!roomCode) {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  // Supabase 側に upsert（無ければ作る・あればそのまま）
  await createRoom(roomCode, name);

  const info = await getRoomInfo(roomCode);

  return NextResponse.json(
    {
      room: info,
    },
    { status: 200 },
  );
}
