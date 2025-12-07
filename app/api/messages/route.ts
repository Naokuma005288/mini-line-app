// app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/roomStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const rawCode = search.get("roomCode") ?? "";
  const after = search.get("after") ?? undefined;

  if (!rawCode) {
    return NextResponse.json(
      { error: "roomCode は必須です" },
      { status: 400 },
    );
  }

  const roomCode = rawCode.toUpperCase().trim();
  const messages = await getMessages(roomCode, after);

  return NextResponse.json({ messages }, { status: 200 });
}
