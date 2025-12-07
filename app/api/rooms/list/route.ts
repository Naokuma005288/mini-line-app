// app/api/rooms/list/route.ts
import { NextResponse } from "next/server";
import { listRooms } from "@/lib/roomStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const rooms = await listRooms();
  return NextResponse.json({ rooms }, { status: 200 });
}
