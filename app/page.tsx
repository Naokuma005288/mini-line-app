"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ADMIN_PASSWORD } from "@/lib/adminConfig";

type RoomSummary = {
  code: string;
  name?: string;
  suspended: boolean;
  createdAt?: string;
  lastMessageAt?: string;
  messageCount: number;
};

export default function HomePage() {
  const router = useRouter();

  // 参加フォーム
  const [joinCode, setJoinCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  // 管理者モード
  const [adminInput, setAdminInput] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // ルーム一覧
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  // 新規ルーム作成
  const [newRoomCode, setNewRoomCode] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const fetchRooms = async () => {
    try {
      setRoomsLoading(true);
      setRoomsError(null);
      const res = await fetch("/api/rooms/list", { cache: "no-store" });
      if (!res.ok) throw new Error("ルーム一覧の取得に失敗しました");
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch (err: any) {
      console.error("[home] list error:", err);
      setRoomsError(err.message || "ルーム一覧の取得に失敗しました");
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    // 管理者じゃなくても一覧は見えていいならここで呼んでもOK
    // 「管理者だけ一覧表示したい」なら adminAuthed を見て呼ぶ
    fetchRooms();
  }, []);

  // 管理者ログイン
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminInput.trim() === ADMIN_PASSWORD) {
      setAdminAuthed(true);
      setAdminError(null);
    } else {
      setAdminError("管理者パスワードが違います");
      setAdminAuthed(false);
    }
  };

  // ルーム参加
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    const code = joinCode.toUpperCase().trim();
    const nickname = joinNickname.trim();

    if (!code || !nickname) {
      setJoinError("ルームコードとニックネームを入力してください");
      return;
    }

    try {
      setJoinLoading(true);
      const res = await fetch("/api/rooms/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: code }),
      });
      const data = await res.json();
      if (!data.exists) {
        setJoinError("そのルームは存在しません。管理者に確認してください。");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("mini-line-nickname", nickname);
      }

      router.push(
        `/room/${encodeURIComponent(code)}?nickname=${encodeURIComponent(
          nickname,
        )}`,
      );
    } catch (err: any) {
      console.error("[home] join error:", err);
      setJoinError(err.message || "ルーム参加中にエラーが発生しました");
    } finally {
      setJoinLoading(false);
    }
  };

  // 新規ルーム作成（管理者のみ）
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!adminAuthed) {
      setCreateError("管理者モードにログインしてください");
      return;
    }

    const code = newRoomCode.toUpperCase().trim();
    const name = newRoomName.trim();

    if (!code) {
      setCreateError("ルームコードを入力してください");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: code,
          name: name || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ルーム作成に失敗しました");
      }

      await fetchRooms();
      setCreateError(null);
      alert(`ルーム ${code} を作成しました`);
    } catch (err: any) {
      console.error("[home] create error:", err);
      setCreateError(err.message || "ルーム作成中にエラーが発生しました");
    } finally {
      setCreateLoading(false);
    }
  };

  // 管理者用アクション
  const handleAdminAction = async (
    action: "suspend" | "delete",
    room: RoomSummary,
  ) => {
    if (!adminAuthed) {
      alert("管理者モードにログインしてください");
      return;
    }

    if (action === "delete") {
      if (
        !confirm(
          `ルーム「${room.name || room.code}」を削除しますか？（元に戻せません）`,
        )
      ) {
        return;
      }
    }

    try {
      if (action === "suspend") {
        const res = await fetch("/api/rooms/suspend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode: room.code,
            suspended: !room.suspended,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "一時停止に失敗しました");
      } else if (action === "delete") {
        const res = await fetch("/api/rooms/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode: room.code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "削除に失敗しました");
      }
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || "操作中にエラーが発生しました");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-100 to-emerald-200 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-4xl space-y-6">
        {/* ヘッダー */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-emerald-500">
              miniLINE
            </p>
            <h1 className="text-xl font-bold text-emerald-700">
              クラス用ミニチャット
            </h1>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[2fr,1.5fr]">
          {/* 左：参加フォーム + ルーム一覧 */}
          <section className="space-y-4">
            {/* 参加フォーム */}
            <div className="bg-white rounded-3xl shadow-md p-4 space-y-3">
              <h2 className="text-sm font-semibold text-emerald-700">
                ルームに参加
              </h2>
              <form
                onSubmit={handleJoin}
                className="flex flex-col gap-2 text-sm"
              >
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-2xl border border-emerald-200 px-3 py-2 chat-input-puni focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="ルームコード（例: ABC123）"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                  <input
                    className="flex-1 rounded-2xl border border-emerald-200 px-3 py-2 chat-input-puni focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="ニックネーム"
                    value={joinNickname}
                    onChange={(e) => setJoinNickname(e.target.value)}
                  />
                </div>
                {joinError && (
                  <p className="text-xs text-red-500">{joinError}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={joinLoading}
                    className="btn-puni rounded-2xl bg-emerald-500 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {joinLoading ? "参加中…" : "ルームに入る"}
                  </button>
                </div>
              </form>
            </div>

            {/* ルーム一覧 */}
            <div className="bg-white rounded-3xl shadow-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-emerald-700">
                  ルーム一覧
                </h2>
                <button
                  type="button"
                  onClick={fetchRooms}
                  className="text-[11px] text-emerald-500 hover:underline"
                >
                  再読み込み
                </button>
              </div>
              {roomsLoading && (
                <p className="text-xs text-gray-500">読み込み中…</p>
              )}
              {roomsError && (
                <p className="text-xs text-red-500">{roomsError}</p>
              )}
              {!roomsLoading && rooms.length === 0 && (
                <p className="text-xs text-gray-400">
                  まだルームがありません。
                </p>
              )}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {rooms.map((room) => (
                  <div
                    key={room.code}
                    className="flex items-center justify-between rounded-2xl bg-emerald-50 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-emerald-700 truncate">
                        {room.name || `ルーム ${room.code}`}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        コード:{" "}
                        <span className="font-mono">{room.code}</span> /{" "}
                        {room.messageCount}件
                        {room.suspended && (
                          <span className="ml-1 inline-block rounded-full bg-amber-100 px-2 py-[1px] text-[9px] text-amber-700">
                            一時停止中
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/room/${room.code}`}
                        className="btn-puni rounded-2xl bg-emerald-500 text-white px-3 py-1 text-[11px] font-semibold hover:bg-emerald-600"
                      >
                        入る
                      </Link>
                      {adminAuthed && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleAdminAction("suspend", room)
                            }
                            className="rounded-2xl border border-emerald-300 px-2 py-1 text-[10px] text-emerald-600 hover:bg-emerald-50"
                          >
                            {room.suspended ? "解除" : "停止"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAdminAction("delete", room)
                            }
                            className="rounded-2xl border border-rose-300 px-2 py-1 text-[10px] text-rose-600 hover:bg-rose-50"
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 右：管理者モード & 新規ルーム作成 */}
          <section className="space-y-4">
            {/* 管理者ログイン */}
            <div className="bg-white rounded-3xl shadow-md p-4 space-y-3">
              <h2 className="text-sm font-semibold text-emerald-700">
                管理者モード
              </h2>
              {adminAuthed ? (
                <p className="text-xs text-emerald-600">
                  管理者モードが有効です。
                </p>
              ) : (
                <form
                  onSubmit={handleAdminLogin}
                  className="space-y-2 text-sm"
                >
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-emerald-200 px-3 py-2 chat-input-puni focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="管理者パスワード"
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                  />
                  {adminError && (
                    <p className="text-xs text-red-500">{adminError}</p>
                  )}
                  <button
                    type="submit"
                    className="btn-puni w-full rounded-2xl bg-emerald-500 text-white px-3 py-2 text-xs font-semibold hover:bg-emerald-600"
                  >
                    管理者としてログイン
                  </button>
                </form>
              )}
            </div>

            {/* 新規ルーム作成（管理者のみ） */}
            <div className="bg-white rounded-3xl shadow-md p-4 space-y-3">
              <h2 className="text-sm font-semibold text-emerald-700">
                新しいルームを作成
              </h2>
              {!adminAuthed ? (
                <p className="text-xs text-gray-400">
                  管理者モードにログインすると、ここから新しいルームを作成できます。
                </p>
              ) : (
                <form
                  onSubmit={handleCreateRoom}
                  className="space-y-2 text-sm"
                >
                  <input
                    className="w-full rounded-2xl border border-emerald-200 px-3 py-2 chat-input-puni focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="ルームコード（例: CLASS1）"
                    value={newRoomCode}
                    onChange={(e) => setNewRoomCode(e.target.value)}
                  />
                  <input
                    className="w-full rounded-2xl border border-emerald-200 px-3 py-2 chat-input-puni focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="ルーム名（任意）"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                  />
                  {createError && (
                    <p className="text-xs text-red-500">{createError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="btn-puni w-full rounded-2xl bg-emerald-500 text-white px-3 py-2 text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {createLoading ? "作成中…" : "ルームを作成"}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
