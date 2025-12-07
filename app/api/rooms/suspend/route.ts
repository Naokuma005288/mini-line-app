// app/api/rooms/suspend/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  setRoomSuspended,
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
  const suspended = Boolean(body?.suspended);

  if (!rawCode || typeof rawCode !== "string") {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const roomCode = rawCode.toUpperCase().trim();
  const room = await setRoomSuspended(roomCode, suspended);

  if (!room) {
    return NextResponse.json(
      { error: "ルームが存在しません" },
      { status: 404 },
    );
  }

  await addSystemMessage(
    roomCode,
    suspended
      ? "このルームは一時停止されました"
      : "このルームは再開されました",
  );

  const info = await getRoomInfo(roomCode);
  return NextResponse.json(info, { status: 200 });
}
