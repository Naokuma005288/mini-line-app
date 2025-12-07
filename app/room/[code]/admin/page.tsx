"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ADMIN_PASSWORD } from "@/lib/adminConfig";

type PageProps = {
  params: { code: string };
};

type RoomInfo = {
  exists: boolean;
  code: string;
  name?: string;
  suspended: boolean;
  createdAt?: string;
  lastMessageAt?: string;
  messageCount: number;
};

export default function RoomAdminPage({ params }: PageProps) {
  const roomCode = (params.code || "").toUpperCase();

  const [passInput, setPassInput] = useState("");
  const [authed, setAuthed] = useState(false);

  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput.trim() === ADMIN_PASSWORD) {
      setAuthed(true);
      setError(null);
    } else {
      setError("パスワードが違います");
      setAuthed(false);
    }
  };

  // ルーム情報取得
  useEffect(() => {
    if (!authed || !roomCode) return;

    let cancelled = false;

    const fetchInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/rooms/info?roomCode=${encodeURIComponent(roomCode)}`,
          { cache: "no-store" },
        );
        const data: RoomInfo = await res.json();
        if (!res.ok) {
          throw new Error((data as any)?.error || "ルーム情報の取得に失敗しました");
        }
        if (!cancelled) {
          setInfo(data);
          if (data.name) setNewName(data.name);
        }
      } catch (err: any) {
        console.error("[admin] info error:", err);
        if (!cancelled) {
          setError(err.message || "ルーム情報の取得に失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInfo();

    return () => {
      cancelled = true;
    };
  }, [authed, roomCode]);

  // 共通 POST helper
  const postJson = async (url: string, body: any) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "サーバーエラー");
    }
    return data;
  };

  const handleSuspendToggle = async () => {
    if (!info) return;
    try {
      setActionLoading(true);
      setError(null);
      const data = await postJson("/api/rooms/suspend", {
        roomCode,
        suspended: !info.suspended,
      });
      setInfo((prev) =>
        prev ? { ...prev, suspended: data.suspended } : prev,
      );
    } catch (err: any) {
      console.error("[admin] suspend error:", err);
      setError(err.message || "一時停止の変更に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearMessages = async () => {
    if (!info) return;
    if (!confirm("このルームのメッセージを全て削除します。よろしいですか？")) {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      const data = await postJson("/api/rooms/clear", { roomCode });
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              messageCount: data.messageCount ?? 0,
              lastMessageAt: data.lastMessageAt,
            }
          : prev,
      );
    } catch (err: any) {
      console.error("[admin] clear error:", err);
      setError(err.message || "メッセージ削除に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!info) return;
    if (
      !confirm(
        "このルームを完全に削除します。本当に削除しますか？（元には戻せません）",
      )
    ) {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      await postJson("/api/rooms/delete", { roomCode });
      alert("ルームを削除しました。ホームに戻ります。");
      window.location.href = "/";
    } catch (err: any) {
      console.error("[admin] delete error:", err);
      setError(err.message || "ルームの削除に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRename = async () => {
    if (!info) return;
    const name = newName.trim();
    if (!name) {
      setError("ルーム名を入力してください");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      const data = await postJson("/api/rooms/name", {
        roomCode,
        name,
      });
      setInfo((prev) =>
        prev ? { ...prev, name: data.room?.name ?? name } : prev,
      );
    } catch (err: any) {
      console.error("[admin] rename error:", err);
      setError(err.message || "ルーム名の変更に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  // 認証前
  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-100 to-emerald-200">
        <div className="w-full max-w-md bg-white shadow-lg rounded-3xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-emerald-700 text-center">
            管理者ログイン
          </h1>
          <p className="text-xs text-gray-500 text-center">
            ルーム <span className="font-mono">{roomCode}</span> の管理画面に入るには、
            管理者パスワードを入力してください。
          </p>
          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="password"
              className="w-full rounded-2xl border border-emerald-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="管理者パスワード"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
            />
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-2xl bg-emerald-500 text-white text-sm font-semibold py-2 hover:bg-emerald-600 active:scale-[0.98] transition"
            >
              管理画面に入る
            </button>
          </form>
          <div className="text-center mt-2 space-x-2">
            <Link
              href={`/room/${roomCode}`}
              className="text-xs text-emerald-600 hover:underline"
            >
              ルームに戻る
            </Link>
            <span className="text-[10px] text-gray-400">/</span>
            <Link
              href="/"
              className="text-xs text-emerald-400 hover:underline"
            >
              ホームへ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 管理画面本体
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-100 to-emerald-200">
      <div className="w-full max-w-md bg-white shadow-lg rounded-3xl p-5 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-emerald-500 font-semibold">
              miniLINE
            </p>
            <h1 className="text-lg font-bold text-emerald-700">
              管理者パネル
            </h1>
            <p className="text-[10px] text-gray-400">
              コード: <span className="font-mono">{roomCode}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Link
              href={`/room/${roomCode}`}
              className="text-[11px] text-emerald-600 hover:underline"
            >
              ルームへ戻る
            </Link>
            <Link
              href="/"
              className="text-[11px] text-emerald-400 hover:underline"
            >
              ホームへ
            </Link>
          </div>
        </header>

        {loading && (
          <p className="text-xs text-gray-500 text-center">
            ルーム情報を読み込み中…
          </p>
        )}

        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}

        {info && (
          <>
            <section className="bg-emerald-50 rounded-2xl p-3 space-y-1">
              <p className="text-[11px] text-gray-500">ルーム名</p>
              <p className="text-sm font-semibold text-emerald-700">
                {info.name || "(未設定)"}
              </p>
              {info.createdAt && (
                <p className="text-[10px] text-gray-400">
                  作成: {new Date(info.createdAt).toLocaleString()}
                </p>
              )}
              <p className="text-[10px] text-gray-500">
                メッセージ数:{" "}
                <span className="font-semibold">{info.messageCount}</span>
              </p>
            </section>

            {/* 名前変更 */}
            <section className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ルーム名を変更</span>
                <span className="text-[11px] text-gray-400">
                  （40文字まで）
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-2xl border border-emerald-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ルーム名を入力"
                />
                <button
                  onClick={handleRename}
                  disabled={actionLoading}
                  className="px-3 py-2 rounded-2xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60"
                >
                  保存
                </button>
              </div>
            </section>

            {/* ボタン群 */}
            <section className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleSuspendToggle}
                disabled={actionLoading}
                className={`rounded-2xl px-3 py-3 text-xs font-semibold border transition ${
                  info.suspended
                    ? "bg-white text-emerald-600 border-emerald-300"
                    : "bg-amber-50 text-amber-700 border-amber-300"
                }`}
              >
                {info.suspended ? "一時停止を解除" : "ルームを一時停止"}
              </button>

              <button
                onClick={handleClearMessages}
                disabled={actionLoading}
                className="rounded-2xl px-3 py-3 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 disabled:opacity-60"
              >
                メッセージを全削除
              </button>

              <button
                onClick={handleDeleteRoom}
                disabled={actionLoading}
                className="col-span-2 rounded-2xl px-3 py-3 text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 disabled:opacity-60"
              >
                ルームを削除
              </button>
            </section>

            {actionLoading && (
              <p className="text-[11px] text-gray-400 text-center">
                サーバーと通信中…
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
