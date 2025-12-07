// app/api/rooms/info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRoomInfo } from "@/lib/roomStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const rawCode = search.get("roomCode") ?? "";

  if (!rawCode) {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const roomCode = rawCode.toUpperCase().trim();
  const info = await getRoomInfo(roomCode);

  return NextResponse.json(info, { status: 200 });
}
