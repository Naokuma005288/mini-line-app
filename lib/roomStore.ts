// lib/roomStore.ts
import { supabase } from "./supabaseClient";

export type ChatMessage = {
  id: string;
  nickname: string;
  text: string;
  createdAt: string;
};

export type Room = {
  code: string;
  name?: string;
  createdAt?: string;
  suspended: boolean;
};

function normalizeRoomCode(code: string): string {
  return code.toUpperCase().trim();
}

// DB の rows をアプリ用の型に変換
type RoomRow = {
  code: string;
  name: string | null;
  created_at: string | null;
  suspended: boolean | null;
};

type MessageRow = {
  id: number; // bigserial
  room_code: string;
  nickname: string;
  text: string;
  created_at: string | null;
};

function mapRoomRow(row: RoomRow): Room {
  return {
    code: row.code,
    name: row.name ?? undefined,
    createdAt: row.created_at ?? undefined,
    suspended: row.suspended ?? false,
  };
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: String(row.id),
    nickname: row.nickname,
    text: row.text,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

// ==============================
//  ルーム操作
// ==============================

export async function createRoom(
  code: string,
  name?: string,
): Promise<Room> {
  const norm = normalizeRoomCode(code);
  const trimmedName = name?.trim() || null;

  const { data, error } = await supabase
    .from("rooms")
    .upsert(
      {
        code: norm,
        name: trimmedName,
      },
      { onConflict: "code" },
    )
    .select()
    .single();

  if (error || !data) {
    console.error("[roomStore] createRoom error", error);
    throw new Error("ルームの作成に失敗しました");
  }

  return mapRoomRow(data as RoomRow);
}

export async function getRoom(
  roomCode: string,
): Promise<Room | null> {
  const norm = normalizeRoomCode(roomCode);

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", norm)
    .maybeSingle();

  if (error) {
    console.error("[roomStore] getRoom error", error);
    return null;
  }
  if (!data) return null;

  return mapRoomRow(data as RoomRow);
}

// ==============================
//  メッセージ
// ==============================

export async function addMessage(
  roomCode: string,
  nickname: string,
  text: string,
): Promise<ChatMessage | null> {
  const norm = normalizeRoomCode(roomCode);

  // ルームが無ければ自動作成
  await createRoom(norm);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      room_code: norm,
      nickname,
      text,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[roomStore] addMessage error", error);
    return null;
  }

  return mapMessageRow(data as MessageRow);
}

export async function addSystemMessage(
  roomCode: string,
  text: string,
): Promise<ChatMessage | null> {
  return addMessage(roomCode, "サーバー", text);
}

export async function getMessages(
  roomCode: string,
  opts?: { limit?: number; after?: string },
): Promise<ChatMessage[]> {
  const norm = normalizeRoomCode(roomCode);

  let query = supabase
    .from("messages")
    .select("*")
    .eq("room_code", norm)
    .order("created_at", { ascending: true });

  if (opts?.after) {
    query = query.gt("created_at", opts.after);
  }
  if (opts?.limit && opts.limit > 0) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    if (error) {
      console.error("[roomStore] getMessages error", error);
    }
    return [];
  }

  return (data as MessageRow[]).map(mapMessageRow);
}

export async function clearRoom(
  roomCode: string,
): Promise<boolean> {
  const norm = normalizeRoomCode(roomCode);

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("room_code", norm);

  if (error) {
    console.error("[roomStore] clearRoom error", error);
    return false;
  }
  return true;
}

// ==============================
//  ルーム状態（停止・名前）
// ==============================

export async function setRoomSuspended(
  roomCode: string,
  suspended: boolean,
): Promise<boolean> {
  const norm = normalizeRoomCode(roomCode);

  const { error } = await supabase
    .from("rooms")
    .update({ suspended })
    .eq("code", norm);

  if (error) {
    console.error("[roomStore] setRoomSuspended error", error);
    return false;
  }
  return true;
}

export async function isRoomSuspended(
  roomCode: string,
): Promise<boolean> {
  const norm = normalizeRoomCode(roomCode);

  const { data, error } = await supabase
    .from("rooms")
    .select("suspended")
    .eq("code", norm)
    .maybeSingle();

  if (error) {
    console.error("[roomStore] isRoomSuspended error", error);
    return false;
  }

  return Boolean((data as { suspended?: boolean } | null)?.suspended);
}

export async function setRoomName(
  roomCode: string,
  name: string,
): Promise<boolean> {
  const norm = normalizeRoomCode(roomCode);
  const trimmed = name.trim();

  const { error } = await supabase
    .from("rooms")
    .update({ name: trimmed || null })
    .eq("code", norm);

  if (error) {
    console.error("[roomStore] setRoomName error", error);
    return false;
  }
  return true;
}

// ==============================
//  ルーム情報・一覧
// ==============================

export async function getRoomInfo(roomCode: string): Promise<{
  exists: boolean;
  name?: string;
  suspended: boolean;
  messageCount: number;
  createdAt?: string;
}> {
  const norm = normalizeRoomCode(roomCode);

  const { data: roomData, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", norm)
    .maybeSingle();

  if (error) {
    console.error("[roomStore] getRoomInfo error", error);
    return {
      exists: false,
      suspended: false,
      messageCount: 0,
    };
  }

  if (!roomData) {
    return {
      exists: false,
      suspended: false,
      messageCount: 0,
    };
  }

  const room = mapRoomRow(roomData as RoomRow);

  const { count, error: countError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("room_code", norm);

  if (countError) {
    console.error("[roomStore] getRoomInfo count error", countError);
  }

  return {
    exists: true,
    name: room.name,
    suspended: room.suspended,
    messageCount: count ?? 0,
    createdAt: room.createdAt,
  };
}

export async function listRooms(): Promise<
  {
    code: string;
    name?: string;
    suspended: boolean;
    messageCount: number;
    createdAt?: string;
  }[]
> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) {
      console.error("[roomStore] listRooms error", error);
    }
    return [];
  }

  const rows = data as RoomRow[];

  // メッセージ数は部屋ごとに数える（ルーム数少ない想定なのでOK）
  const result = await Promise.all(
    rows.map(async (r) => {
      const { count, error: countError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("room_code", r.code);

      if (countError) {
        console.error(
          "[roomStore] listRooms count error",
          countError,
        );
      }

      return {
        code: r.code,
        name: r.name ?? undefined,
        suspended: r.suspended ?? false,
        messageCount: count ?? 0,
        createdAt: r.created_at ?? undefined,
      };
    }),
  );

  return result;
}

export async function deleteRoom(
  roomCode: string,
): Promise<boolean> {
  const norm = normalizeRoomCode(roomCode);

  // 先にメッセージ削除
  const { error: msgErr } = await supabase
    .from("messages")
    .delete()
    .eq("room_code", norm);
  if (msgErr) {
    console.error("[roomStore] deleteRoom messages error", msgErr);
  }

  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("code", norm);

  if (error) {
    console.error("[roomStore] deleteRoom error", error);
    return false;
  }
  return true;
}
