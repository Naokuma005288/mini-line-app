"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type RoomInfo = {
  exists: boolean;
  code: string;
  name?: string;
  suspended: boolean;
  createdAt?: string;
  lastMessageAt?: string;
  messageCount: number;
};

type ChatMessage = {
  id: string;
  roomCode: string;
  nickname: string;
  text: string;
  isSystem: boolean;
  createdAt: string;
};

type PageProps = {
  params: { code: string };
};

export default function RoomPage({ params }: PageProps) {
  const roomCode = (params.code || "").toUpperCase();
  const searchParams = useSearchParams();

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoError, setInfoError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [polling, setPolling] = useState(false);

  const [nickname, setNickname] = useState("");
  const [nicknameFixed, setNicknameFixed] = useState(false);

  const [text, setText] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 初期ニックネーム（URL→localStorage の順で）
  useEffect(() => {
    const fromUrl = searchParams.get("nickname");
    if (fromUrl && fromUrl.trim()) {
      setNickname(fromUrl.trim());
      setNicknameFixed(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mini-line-nickname", fromUrl.trim());
      }
      return;
    }

    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("mini-line-nickname");
      if (stored && stored.trim()) {
        setNickname(stored.trim());
        setNicknameFixed(true);
      }
    }
  }, [searchParams]);

  // ルーム情報取得
  useEffect(() => {
    let cancelled = false;

    const fetchInfo = async () => {
      try {
        setInfoLoading(true);
        setInfoError(null);
        const res = await fetch(
          `/api/rooms/info?roomCode=${encodeURIComponent(roomCode)}`,
          { cache: "no-store" },
        );
        const data: RoomInfo = await res.json();
        if (!res.ok) {
          throw new Error((data as any)?.error || "ルーム情報の取得に失敗しました");
        }
        if (!cancelled) {
          setRoomInfo(data);
        }
      } catch (err: any) {
        console.error("[room] info error:", err);
        if (!cancelled) {
          setInfoError(err.message || "ルーム情報の取得に失敗しました");
        }
      } finally {
        if (!cancelled) setInfoLoading(false);
      }
    };

    if (roomCode) {
      fetchInfo();
    }

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  // メッセージポーリング
  useEffect(() => {
    if (!roomInfo?.exists) return;

    let cancelled = false;
    let after: string | undefined = undefined;

    const loop = async () => {
      if (cancelled) return;
      try {
        setPolling(true);
        const url =
          `/api/messages?roomCode=${encodeURIComponent(roomCode)}` +
          (after ? `&after=${encodeURIComponent(after)}` : "");
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          const newMessages: ChatMessage[] = data.messages ?? [];
          if (newMessages.length > 0) {
            setMessages((prev) => [...prev, ...newMessages]);
            after =
              newMessages[newMessages.length - 1]?.createdAt ?? after;
          }
        } else {
          console.error("[room] poll error:", data.error);
        }
      } catch (err) {
        console.error("[room] poll exception:", err);
      } finally {
        setPolling(false);
        if (!cancelled) {
          setTimeout(loop, 1500);
        }
      }
    };

    loop();

    return () => {
      cancelled = true;
    };
  }, [roomCode, roomInfo?.exists]);

  // メッセージ追加時にスクロール
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleNicknameFix = (e: React.FormEvent) => {
    e.preventDefault();
    const n = nickname.trim();
    if (!n) {
      setSendError("ニックネームを入力してください");
      return;
    }
    setNickname(n);
    setNicknameFixed(true);
    setSendError(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mini-line-nickname", n);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);

    if (!nicknameFixed || !nickname.trim()) {
      setSendError("先にニックネームを決めてください");
      return;
    }
    if (!text.trim()) return;
    if (roomInfo?.suspended) {
      setSendError("このルームは一時停止中です");
      return;
    }

    try {
      setSendLoading(true);
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          nickname: nickname.trim(),
          text: text.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "メッセージ送信に失敗しました");
      }
      setText("");
    } catch (err: any) {
      console.error("[room] send error:", err);
      setSendError(err.message || "メッセージ送信に失敗しました");
    } finally {
      setSendLoading(false);
    }
  };

  const title = roomInfo?.name || `ルーム ${roomCode}`;

  if (infoLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-100 to-emerald-200">
        <p className="text-sm text-gray-600">ルーム情報を読み込み中…</p>
      </main>
    );
  }

  if (infoError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-100 to-emerald-200">
        <div className="bg-white rounded-3xl shadow-md p-6 space-y-3 text-sm">
          <p className="text-red-500">{infoError}</p>
          <Link
            href="/"
            className="text-emerald-600 text-xs hover:underline"
          >
            ホームに戻る
          </Link>
        </div>
      </main>
    );
  }

  if (roomInfo && !roomInfo.exists) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-100 to-emerald-200">
        <div className="bg-white rounded-3xl shadow-md p-6 space-y-3 text-sm">
          <p className="font-semibold text-emerald-700">
            このルームは存在しません。
          </p>
          <p className="text-xs text-gray-500">
            コード「{roomCode}」のルームは見つかりませんでした。管理者に確認してください。
          </p>
          <Link
            href="/"
            className="text-emerald-600 text-xs hover:underline"
          >
            ホームに戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-100 to-emerald-200 px-3 py-4">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-md flex flex-col h-[80vh] max-h-[720px]">
        {/* ヘッダー */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-emerald-100">
          <div className="min-w-0">
            <p className="text-[10px] text-emerald-500 font-semibold">
              miniLINE
            </p>
            <h1 className="text-sm font-bold text-emerald-700 truncate">
              {title}
            </h1>
            <p className="text-[10px] text-gray-400">
              コード: <span className="font-mono">{roomCode}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Link
              href={`/room/${roomCode}/admin`}
              className="text-[10px] text-emerald-500 hover:underline"
            >
              管理者ページ
            </Link>
            <Link
              href="/"
              className="text-[10px] text-emerald-400 hover:underline"
            >
              ホームへ
            </Link>
          </div>
        </header>

        {/* 本文 */}
        <div className="flex-1 flex flex-col px-3 py-2 gap-2 overflow-hidden">
          {/* ニックネーム設定（未設定なら） */}
          {!nicknameFixed && (
            <form
              onSubmit={handleNicknameFix}
              className="bg-emerald-50 rounded-2xl px-3 py-2 text-xs flex flex-col gap-2"
            >
              <p className="text-emerald-700 font-semibold">
                ニックネームを決めてからチャットを始めてね
              </p>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-2xl border border-emerald-200 px-3 py-2 chat-input-puni focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="ニックネーム"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-puni rounded-2xl bg-emerald-500 text-white px-3 py-2 text-[11px] font-semibold hover:bg-emerald-600"
                >
                  決定
                </button>
              </div>
            </form>
          )}

          {roomInfo?.suspended && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 text-[11px] text-amber-700">
              このルームは現在一時停止中です。新しいメッセージは送信できません。
            </div>
          )}

          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {messages.map((m) => {
              if (m.isSystem) {
                return (
                  <div
                    key={m.id}
                    className="chat-system text-[11px] text-gray-500 text-center"
                  >
                    <span className="inline-block rounded-full bg-gray-100 px-3 py-1">
                      {m.text}
                    </span>
                  </div>
                );
              }

              const isMe = nicknameFixed && m.nickname === nickname;
              return (
                <div
                  key={m.id}
                  className={`chat-bubble flex ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-3xl px-3 py-2 text-xs chat-bubble-puni ${
                      isMe
                        ? "bg-emerald-500 text-white rounded-br-sm"
                        : "bg-emerald-50 text-emerald-800 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-[9px] opacity-80 mb-0.5">
                      {m.nickname}
                    </p>
                    <p className="whitespace-pre-wrap break-words">
                      {m.text}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* 送信フォーム */}
          <form
            onSubmit={handleSend}
            className="mt-1 pt-2 border-t border-emerald-100 flex flex-col gap-1"
          >
            {sendError && (
              <p className="text-[11px] text-red-500">{sendError}</p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                className="flex-1 rounded-2xl border border-emerald-200 px-3 py-2 text-xs resize-none h-[52px] chat-input-puni focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder={
                  roomInfo?.suspended
                    ? "一時停止中のため送信できません"
                    : nicknameFixed
                      ? "メッセージを入力"
                      : "まずは上でニックネームを決めてね"
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={
                  !nicknameFixed || roomInfo?.suspended || sendLoading
                }
              />
              <button
                type="submit"
                disabled={
                  !nicknameFixed ||
                  roomInfo?.suspended ||
                  sendLoading ||
                  !text.trim()
                }
                className="btn-puni rounded-2xl bg-emerald-500 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60"
              >
                {sendLoading ? "送信中…" : "送信"}
              </button>
            </div>
            {polling && (
              <p className="text-[10px] text-gray-400 text-right">
                サーバーと同期中…
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
