// lib/roomStore.ts
import fs from "node:fs";
import path from "node:path";

export type ChatMessage = {
  id: string;
  nickname: string;
  text: string;
  createdAt: string;
};

export type Room = {
  code: string;
  name?: string;
  createdAt: string;
  messages: ChatMessage[];
  suspended: boolean;
};

const rooms = new Map<string, Room>();

// JSONを保存する場所
const DATA_FILE = path.join(process.cwd(), "data", "rooms.json");

function normalizeRoomCode(code: string): string {
  return code.toUpperCase().trim();
}

// ===== ディスクから読み込み =====
function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    if (!raw) return;

    const arr = JSON.parse(raw) as any[];
    rooms.clear();

    for (const r of arr) {
      if (!r || typeof r.code !== "string") continue;
      const norm = normalizeRoomCode(r.code);

      const messages: ChatMessage[] = Array.isArray(r.messages)
        ? r.messages
        : [];

      rooms.set(norm, {
        code: norm,
        name:
          typeof r.name === "string" && r.name.trim() !== ""
            ? r.name
            : undefined,
        createdAt:
          typeof r.createdAt === "string"
            ? r.createdAt
            : new Date().toISOString(),
        suspended: Boolean(r.suspended),
        messages,
      });
    }

    console.log(
      `[roomStore] loaded ${rooms.size} rooms from ${DATA_FILE}`,
    );
  } catch (err) {
    console.error("[roomStore] loadFromDisk error:", err);
  }
}

// ===== ディスクに保存 =====
function saveToDisk() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const arr = Array.from(rooms.values());
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(arr, null, 2),
      "utf8",
    );
  } catch (err) {
    console.error("[roomStore] saveToDisk error:", err);
  }
}

// 起動時に一度ロード
loadFromDisk();

// ==============================
// 公開 API
// ==============================

// ルーム作成（createページやAPI用）
export function createRoom(code: string, name?: string): Room {
  const norm = normalizeRoomCode(code);
  let room = rooms.get(norm);

  const trimmedName = name?.trim();

  if (room) {
    // すでに存在していて、名前だけ更新するパターン
    if (trimmedName && room.name !== trimmedName) {
      room.name = trimmedName;
      saveToDisk();
    }
    return room;
  }

  room = {
    code: norm,
    name: trimmedName || undefined,
    createdAt: new Date().toISOString(),
    messages: [],
    suspended: false,
  };
  rooms.set(norm, room);
  saveToDisk();
  return room;
}

export function getRoom(roomCode: string): Room | undefined {
  const norm = normalizeRoomCode(roomCode);
  return rooms.get(norm);
}

// メッセージ追加
export function addMessage(
  roomCode: string,
  nickname: string,
  text: string,
): ChatMessage | null {
  const norm = normalizeRoomCode(roomCode);

  let room = rooms.get(norm);
  if (!room) {
    // ルームがまだない場合でも、初メッセージで自動作成する
    room = {
      code: norm,
      createdAt: new Date().toISOString(),
      messages: [],
      suspended: false,
    };
    rooms.set(norm, room);
  }

  const msg: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nickname,
    text,
    createdAt: new Date().toISOString(),
  };

  room.messages.push(msg);
  saveToDisk();
  return msg;
}

// システム（サーバー）メッセージ
export function addSystemMessage(
  roomCode: string,
  text: string,
): ChatMessage | null {
  return addMessage(roomCode, "サーバー", text);
}

// メッセージ取得
export function getMessages(
  roomCode: string,
  opts?: { limit?: number; after?: string },
): ChatMessage[] {
  const norm = normalizeRoomCode(roomCode);
  const room = rooms.get(norm);
  if (!room) return [];

  let list = room.messages;

  if (opts?.after) {
    list = list.filter((m) => m.createdAt > opts.after!);
  }

  if (opts?.limit && opts.limit > 0) {
    list = list.slice(-opts.limit);
  }

  return list;
}

// メッセージ全削除
export function clearRoom(roomCode: string): boolean {
  const norm = normalizeRoomCode(roomCode);
  const room = rooms.get(norm);
  if (!room) return false;

  room.messages = [];
  saveToDisk();
  return true;
}

// 一時停止フラグ
export function setRoomSuspended(
  roomCode: string,
  suspended: boolean,
): boolean {
  const norm = normalizeRoomCode(roomCode);
  const room = rooms.get(norm);
  if (!room) return false;

  room.suspended = suspended;
  saveToDisk();
  return true;
}

export function isRoomSuspended(roomCode: string): boolean {
  const norm = normalizeRoomCode(roomCode);
  const room = rooms.get(norm);
  if (!room) return false;
  return room.suspended;
}

// ルーム名
export function setRoomName(
  roomCode: string,
  name: string,
): boolean {
  const norm = normalizeRoomCode(roomCode);
  const room = rooms.get(norm);
  if (!room) return false;

  const trimmed = name.trim();
  room.name = trimmed || undefined;
  saveToDisk();
  return true;
}

// 管理画面・情報取得
export function getRoomInfo(roomCode: string): {
  exists: boolean;
  name?: string;
  suspended: boolean;
  messageCount: number;
  createdAt?: string;
} {
  const norm = normalizeRoomCode(roomCode);
  const room = rooms.get(norm);
  if (!room) {
    return {
      exists: false,
      suspended: false,
      messageCount: 0,
    };
  }

  return {
    exists: true,
    name: room.name,
    suspended: room.suspended,
    messageCount: room.messages.length,
    createdAt: room.createdAt,
  };
}

// ルーム一覧（トップ画面用）
export function listRooms(): {
  code: string;
  name?: string;
  suspended: boolean;
  messageCount: number;
  createdAt?: string;
}[] {
  return Array.from(rooms.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => ({
      code: r.code,
      name: r.name,
      suspended: r.suspended,
      messageCount: r.messages.length,
      createdAt: r.createdAt,
    }));
}

// ルーム削除（トップ画面などから使う）
export function deleteRoom(roomCode: string): boolean {
  const norm = normalizeRoomCode(roomCode);
  const existed = rooms.delete(norm);
  if (existed) {
    saveToDisk();
  }
  return existed;
}
