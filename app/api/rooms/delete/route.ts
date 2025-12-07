// app/api/rooms/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteRoom } from "@/lib/roomStore";

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
  const ok = await deleteRoom(roomCode);

  if (!ok) {
    return NextResponse.json(
      { error: "ルームが存在しません" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
