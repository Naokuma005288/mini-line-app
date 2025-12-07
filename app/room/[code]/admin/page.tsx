// app/room/[code]/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type RoomInfo = {
  exists: boolean;
  suspended: boolean;
  messageCount: number;
  name?: string;
  createdAt?: string;
};

export default function RoomAdminPage() {
  const params = useParams<{ code?: string }>();
  const router = useRouter();

  const roomCodeRaw = params?.code ?? "";
  const roomCode = roomCodeRaw.toString().toUpperCase();

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (!roomCode) return;

    let cancelled = false;

    async function fetchInfo() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const res = await fetch(
          `/api/rooms/info?roomCode=${encodeURIComponent(roomCode)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError(data.error || "ルーム情報の取得に失敗しました");
          }
          return;
        }
        if (!cancelled) {
          setRoomInfo(data as RoomInfo);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("ネットワークエラーが発生しました");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchInfo();

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  // roomInfo が更新されたら、ルーム名入力欄も同期
  useEffect(() => {
    if (roomInfo?.exists) {
      setNameInput(roomInfo.name ?? "");
    }
  }, [roomInfo]);

  const handleBack = () => {
    router.push(`/room/${roomCode}`);
  };

  // ルーム名保存
  const handleSaveName = async () => {
    if (!roomCode) return;
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError("ルーム名を入力してください");
      return;
    }
    if (trimmed.length > 40) {
      setError("ルーム名は40文字までです");
      return;
    }

    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/rooms/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ルーム名の保存に失敗しました");
        return;
      }

      setRoomInfo((prev) =>
        prev
          ? {
              ...prev,
              name: trimmed,
            }
          : prev,
      );
      setMessage("ルーム名を保存しました");
    } catch (e) {
      console.error(e);
      setError("ネットワークエラーが発生しました");
    } finally {
      setActionLoading(false);
    }
  };

  // メッセージ全削除
  const handleClearMessages = async () => {
    if (!roomCode) return;
    if (
      !window.confirm(
        "本当にこのルームのメッセージを全て削除しますか？",
      )
    ) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/rooms/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "メッセージの削除に失敗しました");
        return;
      }

      setMessage(
        "メッセージを全て削除しました（サーバーから通知が送信されました）",
      );

      // サーバー通知が1件入るので 1 件にする
      setRoomInfo((prev) =>
        prev
          ? {
              ...prev,
              messageCount: 1,
            }
          : prev,
      );
    } catch (e) {
      console.error(e);
      setError("ネットワークエラーが発生しました");
    } finally {
      setActionLoading(false);
    }
  };

  // ルーム一時停止オン／オフ
  const handleToggleSuspend = async () => {
    if (!roomCode || !roomInfo) return;

    const next = !roomInfo.suspended;

    if (
      !window.confirm(
        next
          ? "このルームを一時停止しますか？（参加者は送信できなくなります）"
          : "このルームの一時停止を解除しますか？",
      )
    ) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/rooms/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, suspended: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "一時停止の切り替えに失敗しました");
        return;
      }

      setRoomInfo((prev) =>
        prev
          ? {
              ...prev,
              suspended: next,
              messageCount: prev.messageCount + 1, // サーバー通知1件分
            }
          : prev,
      );
      setMessage(
        next
          ? "ルームを一時停止しました（サーバーから通知が送信されました）"
          : "ルームの一時停止を解除しました（サーバーから通知が送信されました）",
      );
    } catch (e) {
      console.error(e);
      setError("ネットワークエラーが発生しました");
    } finally {
      setActionLoading(false);
    }
  };

  if (!roomCode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#b4f0c9] to-[#e7f6ff] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-xl">
          <h1 className="mb-2 text-lg font-bold text-slate-900">
            ルームコードが取得できませんでした
          </h1>
          <p className="text-sm text-slate-600">
            URL を確認して、もう一度アクセスしてみてください。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen justify-center bg-gradient-to-b from-[#b4f0c9] to-[#e7f6ff] px-2 py-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-[#f7fbf8] p-4 shadow-xl ring-1 ring-[#d5e9dd]">
        <header className="flex items-center justify-between border-b border-emerald-100 pb-2">
          <div>
            <p className="text-xs font-semibold text-emerald-600">
              管理者設定
            </p>
            <h1 className="text-lg font-bold text-slate-900">
              ルーム：
              <span className="font-mono">{roomCode}</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
          >
            戻る
          </button>
        </header>

        {loading && (
          <p className="text-xs text-slate-500">ルーム情報を読み込み中…</p>
        )}

        {!loading && roomInfo && !roomInfo.exists && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
            このルームは現在存在しないか、サーバーが再起動されています。
          </p>
        )}

        {!loading && roomInfo && roomInfo.exists && (
          <section className="space-y-3 text-sm text-slate-700">
            {/* ルーム状態 */}
            <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <h2 className="mb-1 text-xs font-semibold text-emerald-700">
                ルームの状態
              </h2>
              <p className="text-xs">
                状態：
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    roomInfo.suspended
                      ? "bg-rose-50 text-rose-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {roomInfo.suspended ? "一時停止中" : "通常"}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                メッセージ数：{roomInfo.messageCount} 件
              </p>
              {roomInfo.createdAt && (
                <p className="text-[11px] text-slate-400">
                  作成日時：{" "}
                  {new Date(roomInfo.createdAt).toLocaleString("ja-JP")}
                </p>
              )}
            </div>

            {/* ルーム名編集 */}
            <div className="space-y-1.5 rounded-xl bg-white px-3 py-2 shadow-sm">
              <h2 className="text-xs font-semibold text-emerald-700">
                ルーム名
              </h2>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={40}
                placeholder="例：体育館前メンバー / 3年A組とか"
                className="w-full rounded-full border border-emerald-200 px-3 py-1.5 text-xs outline-none ring-emerald-400/40 focus:border-emerald-400 focus:ring-2"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  ※ ルーム名は参加者全員の画面に表示されます
                </p>
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={actionLoading}
                  className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-default disabled:bg-slate-300"
                >
                  保存
                </button>
              </div>
            </div>

            {/* 操作 */}
            <div className="space-y-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <h2 className="text-xs font-semibold text-emerald-700">
                操作
              </h2>

              <button
                type="button"
                onClick={handleClearMessages}
                disabled={actionLoading}
                className="w-full rounded-full bg-rose-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-600 disabled:cursor-default disabled:bg-rose-300"
              >
                メッセージを全て削除
              </button>

              <button
                type="button"
                onClick={handleToggleSuspend}
                disabled={actionLoading}
                className={`w-full rounded-full px-3 py-2 text-xs font-semibold text-white shadow-sm ${
                  roomInfo.suspended
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-amber-500 hover:bg-amber-600"
                } disabled:cursor-default disabled:bg-slate-300`}
              >
                {roomInfo.suspended
                  ? "一時停止を解除する"
                  : "ルームを一時停止する"}
              </button>

              <p className="mt-1 text-[11px] text-slate-500">
                ※ 一時停止中は、参加者は新しいメッセージを送信できません。
              </p>
            </div>
          </section>
        )}

        {error && (
          <div className="bg-rose-50 px-3 py-1.5 text-xs text-rose-600">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
