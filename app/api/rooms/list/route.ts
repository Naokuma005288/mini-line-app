// app/api/rooms/list/route.ts
import { NextResponse } from "next/server";
import { listRooms } from "@/lib/roomStore";

// キャッシュされないように
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rooms = listRooms();
    return NextResponse.json({ rooms }, { status: 200 });
  } catch (e) {
    console.error("[api/rooms/list] error:", e);
    return NextResponse.json(
      { error: "サーバー側でエラーが発生しました" },
      { status: 500 },
    );
  }
}
