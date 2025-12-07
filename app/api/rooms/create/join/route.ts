// app/api/rooms/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { hasRoom } from "@/lib/roomStore";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const roomCode = (body?.roomCode as string | undefined)?.toUpperCase();

  if (!roomCode) {
    return NextResponse.json(
      { error: "ルームコードが送られていません" },
      { status: 400 }
    );
  }

  if (!hasRoom(roomCode)) {
    return NextResponse.json(
      { error: "そのルームは存在しません" },
      { status: 404 }
    );
  }

  // あとでここに「参加者管理」とかを入れてもいい
  return NextResponse.json({ ok: true, roomCode });
}
