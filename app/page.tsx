// app/page.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type RoomSummary = {
  code: string;
  name?: string;
  suspended: boolean;
  messageCount: number;
  createdAt?: string;
};

const ADMIN_PASSWORD = "admin-pass-change-me";

export default function HomePage() {
  const router = useRouter();

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adminMode, setAdminMode] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  // 🔹 ルームコードから直接入る用
  const [joinCode, setJoinCode] = useState("");

  // ルーム一覧の読み込み（キャッシュ無効＋即時反映）
  const reloadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/rooms/list?ts=${Date.now()}`,
        {
          cache: "no-store",
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ルーム一覧の取得に失敗しました");
        return;
      }
      setRooms((data.rooms as RoomSummary[]) ?? []);
    } catch (e) {
      console.error(e);
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadRooms();
  }, [reloadRooms]);

  // ルーム入室（カードの「入室」ボタン用）
  const handleEnterRoom = (code: string) => {
    router.push(`/room/${code}`);
  };

  // 🔹 ルームコードから入室するボタン
  const handleJoinByCode = () => {
    const raw = joinCode.toUpperCase().trim();
    if (!raw) {
      setError("ルームコードを入力してください");
      return;
    }
    if (!/^[A-Z0-9]{4,10}$/.test(raw)) {
      setError("ルームコードの形式が正しくありません");
      return;
    }
    setError(null);
    router.push(`/room/${raw}`);
  };

  // 管理モード ON/OFF
  const handleToggleAdminMode = () => {
    if (!adminMode) {
      const pass =
        window.prompt("管理者パスワードを入力してください") ?? "";
      if (pass.trim() === ADMIN_PASSWORD) {
        setAdminMode(true);
        setAdminMessage("管理モードをオンにしました");
      } else {
        setAdminMessage("管理者パスワードが違います");
      }
    } else {
      setAdminMode(false);
      setAdminMessage("管理モードを終了しました");
    }
  };

  // 名前変更
  const handleRename = async (room: RoomSummary) => {
    if (!adminMode || busy) return;

    const current = room.name ?? "";
    const input =
      window.prompt(
        "新しいルーム名を入力してください（40文字まで）",
        current,
      ) ?? "";
    const trimmed = input.trim();
    if (!trimmed) return;
    if (trimmed.length > 40) {
      setAdminMessage("ルーム名は40文字までです");
      return;
    }

    setBusy(true);
    setError(null);
    setAdminMessage(null);

    try {
      const res = await fetch("/api/rooms/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: room.code,
          name: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ルーム名の変更に失敗しました");
        return;
      }
      await reloadRooms();
      setAdminMessage(`「${trimmed}」に名前を変更しました`);
    } catch (e) {
      console.error(e);
      setError("ネットワークエラーが発生しました");
    } finally {
      setBusy(false);
    }
  };

  // 一時停止/解除
  const handleToggleSuspend = async (room: RoomSummary) => {
    if (!adminMode || busy) return;

    const next = !room.suspended;
    const ok = window.confirm(
      next
        ? `ルーム「${room.name ?? room.code}」を一時停止しますか？`
        : `ルーム「${room.name ?? room.code}」の一時停止を解除しますか？`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setAdminMessage(null);

    try {
      const res = await fetch("/api/rooms/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: room.code,
          suspended: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error || "一時停止の切り替えに失敗しました",
        );
        return;
      }
      await reloadRooms();
      setAdminMessage(
        next
          ? "ルームを一時停止しました（サーバーから通知が送信されます）"
          : "ルームの一時停止を解除しました（サーバーから通知が送信されます）",
      );
    } catch (e) {
      console.error(e);
      setError("ネットワークエラーが発生しました");
    } finally {
      setBusy(false);
    }
  };

  // ルーム削除
  const handleDelete = async (room: RoomSummary) => {
    if (!adminMode || busy) return;

    const ok = window.confirm(
      `ルーム「${room.name ?? room.code}」を完全に削除しますか？\n（メッセージも含めて元に戻せません）`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setAdminMessage(null);

    try {
      const res = await fetch("/api/rooms/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: room.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ルームの削除に失敗しました");
        return;
      }
      await reloadRooms();
      setAdminMessage("ルームを削除しました");
    } catch (e) {
      console.error(e);
      setError("ネットワークエラーが発生しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen justify-center bg-gradient-to-b from-[#b4f0c9] to-[#e7f6ff] px-2 py-4">
      <div className="flex w-full max-w-md flex-col rounded-2xl bg-[#f7fbf8] shadow-xl ring-1 ring-[#d5e9dd]">
        {/* ヘッダー */}
        <header className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-[#00c96b] to-[#22c1c3] px-4 py-3 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              miniLINE
            </p>
            <h1 className="text-lg font-bold">ルーム一覧</h1>
            <p className="text-[10px] text-white/80">
              作成済みのルームが、プレイリストのように並びます
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => router.push("/create")}
              className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm hover:bg-white"
            >
              新しいルーム
            </button>
            <button
              type="button"
              onClick={handleToggleAdminMode}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${
                adminMode
                  ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                  : "bg-white/90 text-emerald-700 hover:bg-white"
              }`}
            >
              {adminMode ? "管理モード：ON" : "管理モード"}
            </button>
          </div>
        </header>

        {/* エラーやメッセージ */}
        {error && (
          <div className="bg-rose-50 px-4 py-1.5 text-xs text-rose-600">
            {error}
          </div>
        )}
        {adminMessage && (
          <div className="bg-emerald-50 px-4 py-1.5 text-xs text-emerald-700">
            {adminMessage}
          </div>
        )}

        {/* 🔹 ルームコードで入室するエリア */}
        <div className="border-b border-emerald-100 bg-[#eef9f1] px-4 py-2">
          <p className="mb-1 text-[11px] font-semibold text-slate-800">
            ルームコードから入る
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) =>
                setJoinCode(e.target.value.toUpperCase())
              }
              maxLength={10}
              placeholder="例：AB12CD"
              className="flex-1 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs tracking-[0.1em] outline-none ring-emerald-400/40 focus:border-emerald-400 focus:ring-2"
            />
            <button
              type="button"
              onClick={handleJoinByCode}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-600"
            >
              入る
            </button>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            友だちから共有されたルームコードをここに入れると、そのルームに参加できます。
          </p>
        </div>

        {/* 本体ルーム一覧 */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-[#e7f5ec] px-3 py-3">
          {loading ? (
            <p className="rounded-lg bg-white/70 px-3 py-2 text-center text-xs text-slate-500">
              ルーム一覧を読み込み中…
            </p>
          ) : rooms.length === 0 ? (
            <p className="rounded-lg bg-white/70 px-3 py-3 text-center text-xs text-slate-500">
              まだルームがありません。右上の「新しいルーム」から作成するか、
              上のルームコード入力から参加できます。
            </p>
          ) : (
            rooms.map((room) => (
              <div
                key={room.code}
                className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {room.name ? room.name : `ルーム：${room.code}`}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                    <span>
                      コード：
                      <span className="font-mono">
                        {room.code}
                      </span>
                    </span>
                    <span>
                      メッセージ：{room.messageCount} 件
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        room.suspended
                          ? "bg-rose-50 text-rose-600"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {room.suspended ? "一時停止中" : "通常"}
                    </span>
                    {room.createdAt && (
                      <span className="text-[10px] text-slate-400">
                        作成：
                        {new Date(
                          room.createdAt,
                        ).toLocaleString("ja-JP", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* 右側ボタン群 */}
                <div className="ml-2 flex flex-shrink-0 flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleEnterRoom(room.code)}
                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-600"
                  >
                    入室
                  </button>

                  {adminMode && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRename(room)}
                        className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-default disabled:bg-slate-100"
                      >
                        名前
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          handleToggleSuspend(room)
                        }
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold text-white shadow-sm disabled:cursor-default disabled:bg-slate-300 ${
                          room.suspended
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : "bg-amber-500 hover:bg-amber-600"
                        }`}
                      >
                        {room.suspended ? "解除" : "停止"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(room)}
                        className="rounded-full bg-rose-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-rose-600 disabled:cursor-default disabled:bg-rose-300"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
