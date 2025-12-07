// app/api/rooms/join/route.ts
import { NextRequest, NextResponse } from "next/server";

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

  // ここでは「そのコードの部屋に行っていいよ」とだけ返す
  return NextResponse.json({ ok: true, roomCode });
}
