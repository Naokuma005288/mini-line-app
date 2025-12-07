// app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/roomStore";

// メッセージ一覧取得API
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const roomCodeParam = searchParams.get("roomCode") ?? "";
  const roomCode = roomCodeParam.toUpperCase().trim();

  if (!roomCode) {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const limitParam = searchParams.get("limit");
  const afterParam = searchParams.get("after");

  let limit: number | undefined = undefined;
  if (limitParam) {
    const n = Number(limitParam);
    if (!Number.isNaN(n) && n > 0) {
      limit = n;
    }
  }

  const messages = getMessages(roomCode, {
    limit,
    after: afterParam ?? undefined,
  });

  return NextResponse.json({ messages });
}
