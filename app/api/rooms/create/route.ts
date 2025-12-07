// app/api/rooms/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/roomStore";

function generateRoomCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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

  const adminSecret = body?.adminSecret as string | undefined;
  if (!adminSecret) {
    return NextResponse.json(
      { error: "管理用パスワードが送られていません" },
      { status: 401 }
    );
  }

  const expected = process.env.ROOM_ADMIN_SECRET;

  if (!expected || adminSecret !== expected) {
    return NextResponse.json(
      { error: "ルームを作成する権限がありません" },
      { status: 403 }
    );
  }

  // 新しいルームコードを生成
  const code = generateRoomCode();

  // 疑似DBにルームを登録
  const room = createRoom(code);
  console.log("新しいルームが作成されました:", room.code);

  return NextResponse.json({ code: room.code });
}
