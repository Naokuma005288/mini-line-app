// app/api/rooms/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/roomStore";

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

  if (!rawCode || typeof rawCode !== "string") {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const roomCode = rawCode.toUpperCase().trim();
  const name =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim().slice(0, 40)
      : undefined;

  if (!roomCode) {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const room = await createRoom(roomCode, name);
  return NextResponse.json({ room }, { status: 200 });
}
