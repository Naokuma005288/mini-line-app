// lib/roomStore.ts
// ルーム一覧・メッセージをサーバー側で管理するストア
// ローカルでは data/rooms.json に保存
// Vercel 本番ではファイル書き込みができないので「メモリのみ」で動く

import fs from "fs";
import path from "path";

export type StoredMessage = {
  id: string;
  roomCode: string;
  nickname: string;
  text: string;
  isSystem: boolean;
  createdAt: string;
};

export type StoredRoom = {
  code: string;
  name?: string;
  suspended: boolean;
  createdAt: string;
  lastMessageAt?: string;
  messageCount: number;
};

type Store = {
  rooms: Record<string, StoredRoom>;
  messages: Record<string, StoredMessage[]>;
};

const DATA_FILE = path.join(process.cwd(), "data", "rooms.json");
// Vercel 本番など、ファイルが read-only な環境
const IS_READ_ONLY_FS = process.env.VERCEL === "1";

let loaded = false;
let store: Store = {
  rooms: {},
  messages: {},
};

function createId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;

  if (IS_READ_ONLY_FS) {
    // 本番ではファイルロードを諦めてメモリのみ
    return;
  }

  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const text = fs.readFileSync(DATA_FILE, "utf8");
    if (!text) return;
    const json = JSON.parse(text);
    if (json && typeof json === "object") {
      store.rooms = json.rooms ?? {};
      store.messages = json.messages ?? {};
    }
  } catch (err) {
    console.error("[roomStore] loadFromDisk error:", err);
  }
}

function save() {
  if (IS_READ_ONLY_FS) return;

  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const json = JSON.stringify(store, null, 2);
    fs.writeFileSync(DATA_FILE, json, "utf8");
  } catch (err) {
    console.error("[roomStore] saveToDisk error:", err);
  }
}

// ------- ルーム関連 -------

export async function createRoom(
  code: string,
  name?: string,
): Promise<StoredRoom> {
  ensureLoaded();
  const c = code.toUpperCase();
  const now = new Date().toISOString();

  let room = store.rooms[c];
  if (!room) {
    room = {
      code: c,
      name: name?.trim().slice(0, 40),
      suspended: false,
      createdAt: now,
      lastMessageAt: undefined,
      messageCount: 0,
    };
  } else {
    if (name && name.trim()) {
      room.name = name.trim().slice(0, 40);
    }
  }

  store.rooms[c] = room;
  save();
  return room;
}

export async function roomExists(code: string): Promise<boolean> {
  ensureLoaded();
  const c = code.toUpperCase();
  return !!store.rooms[c];
}

export async function listRooms(): Promise<StoredRoom[]> {
  ensureLoaded();
  const rooms = Object.values(store.rooms);
  // 最後のメッセージ or 作成日時で新しい順にソート
  return rooms.sort((a, b) => {
    const at = a.lastMessageAt ?? a.createdAt;
    const bt = b.lastMessageAt ?? b.createdAt;
    return bt.localeCompare(at);
  });
}

export async function getRoomInfo(code: string): Promise<{
  exists: boolean;
  code: string;
  name?: string;
  suspended: boolean;
  createdAt?: string;
  lastMessageAt?: string;
  messageCount: number;
}> {
  ensureLoaded();
  const c = code.toUpperCase();
  const room = store.rooms[c];
  if (!room) {
    return {
      exists: false,
      code: c,
      name: undefined,
      suspended: false,
      createdAt: undefined,
      lastMessageAt: undefined,
      messageCount: 0,
    };
  }

  return {
    exists: true,
    code: room.code,
    name: room.name,
    suspended: room.suspended,
    createdAt: room.createdAt,
    lastMessageAt: room.lastMessageAt,
    messageCount: room.messageCount,
  };
}

export async function renameRoom(
  code: string,
  name: string,
): Promise<StoredRoom | null> {
  ensureLoaded();
  const c = code.toUpperCase();
  const room = store.rooms[c];
  if (!room) return null;
  room.name = name.trim().slice(0, 40);
  save();
  return room;
}

export async function setRoomSuspended(
  code: string,
  suspended: boolean,
): Promise<StoredRoom | null> {
  ensureLoaded();
  const c = code.toUpperCase();
  const room = store.rooms[c];
  if (!room) return null;
  room.suspended = suspended;
  save();
  return room;
}

export async function deleteRoom(code: string): Promise<boolean> {
  ensureLoaded();
  const c = code.toUpperCase();
  const existed = !!store.rooms[c];
  delete store.rooms[c];
  delete store.messages[c];
  if (existed) save();
  return existed;
}

export async function clearRoomMessages(code: string): Promise<void> {
  ensureLoaded();
  const c = code.toUpperCase();
  store.messages[c] = [];
  const room = store.rooms[c];
  if (room) {
    room.messageCount = 0;
    room.lastMessageAt = undefined;
  }
  save();
}

// ------- メッセージ関連 -------

export async function addUserMessage(
  code: string,
  nickname: string,
  text: string,
  isSystem = false,
): Promise<StoredMessage> {
  ensureLoaded();
  const c = code.toUpperCase();
  const room = store.rooms[c];
  if (!room) {
    throw new Error("ROOM_NOT_FOUND");
  }

  const now = new Date().toISOString();
  const msg: StoredMessage = {
    id: createId(),
    roomCode: c,
    nickname: nickname.slice(0, 20),
    text,
    isSystem,
    createdAt: now,
  };

  if (!store.messages[c]) {
    store.messages[c] = [];
  }
  store.messages[c].push(msg);

  room.messageCount = (room.messageCount ?? 0) + 1;
  room.lastMessageAt = now;
  save();

  return msg;
}

export async function addSystemMessage(
  code: string,
  text: string,
): Promise<StoredMessage> {
  return addUserMessage(code, "サーバー", text, true);
}

export async function getMessages(
  code: string,
  after?: string,
): Promise<StoredMessage[]> {
  ensureLoaded();
  const c = code.toUpperCase();
  const arr = store.messages[c] ?? [];
  const sorted = [...arr].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  if (!after) return sorted;
  return sorted.filter((m) => m.createdAt > after);
}
