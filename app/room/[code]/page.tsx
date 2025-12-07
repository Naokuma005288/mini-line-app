// app/room/[code]/page.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  FormEvent,
  KeyboardEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";

type ChatMessage = {
  id: string;
  nickname: string;
  text: string;
  createdAt: string;
};

const MAX_MESSAGE_LENGTH = 200;

// 仮の管理者パスワード（必要なら後で .env に逃がす）
const ADMIN_PASSWORD = "admin-pass-change-me";

export default function RoomPage() {
  const params = useParams<{ code?: string }>();
  const router = useRouter();

  const codeParam = params?.code ?? "";
  const roomCode = codeParam.toString().toUpperCase();

  const [nickname, setNickname] = useState("");
  const [nicknameLocked, setNicknameLocked] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSend, setLoadingSend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(
    null,
  );
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);

  const [roomName, setRoomName] = useState<string | null>(null);

  const pollingRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ===== ニックネーム復元 =====
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!roomCode) return;

    const saved = window.localStorage.getItem(
      `mini-line-nickname-${roomCode}`,
    );
    if (saved) {
      setNickname(saved);
      setNicknameLocked(true);
    }
  }, [roomCode]);

  // ===== 初回アクセスでルームを確実に作成 =====
  useEffect(() => {
    if (!roomCode) return;

    (async () => {
      try {
        await fetch("/api/rooms/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode }),
        });
        // 失敗しても致命的ではないので、ここでは画面エラーは出さない
      } catch (e) {
        console.error("ensure room error", e);
      }
    })();
  }, [roomCode]);

  // ===== ルーム情報（名前だけ）取得 =====
  useEffect(() => {
    if (!roomCode) return;

    let cancelled = false;

    async function fetchInfo() {
      try {
        const res = await fetch(
          `/api/rooms/info?roomCode=${encodeURIComponent(roomCode)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          console.error(data);
          return;
        }
        if (cancelled) return;

        if (data && typeof data.name === "string") {
          const trimmed = data.name.trim();
          if (trimmed) {
            setRoomName(trimmed);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    fetchInfo();

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  // ===== 初回メッセージ読み込み =====
  useEffect(() => {
    if (!roomCode) return;

    let cancelled = false;

    async function fetchInitial() {
      try {
        const res = await fetch(
          `/api/messages?roomCode=${encodeURIComponent(
            roomCode,
          )}&limit=30`,
        );
        const data = await res.json();
        if (!res.ok) {
          console.error(data);
          if (!cancelled) {
            setConnectionError("メッセージの取得中にエラーが発生しました");
          }
          return;
        }
        if (cancelled) return;

        const list = (data.messages as ChatMessage[]) ?? [];
        setMessages(list);

        if (list.length > 0) {
          setLastTimestamp(list[list.length - 1].createdAt);
        }
        setConnectionError(null);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setConnectionError("ネットワークに問題があるかもしれません");
        }
      }
    }

    fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  // ===== ポーリング =====
  useEffect(() => {
    if (!roomCode) return;

    function startPolling() {
      if (pollingRef.current !== null) return;

      pollingRef.current = window.setInterval(async () => {
        try {
          const params = new URLSearchParams({
            roomCode,
            limit: "30",
          });
          if (lastTimestamp) {
            params.set("after", lastTimestamp);
          }

          const res = await fetch(`/api/messages?${params.toString()}`);
          const data = await res.json();
          if (!res.ok) {
            console.error(data);
            setConnectionError("接続が不安定です（自動再接続中）");
            return;
          }

          const newMessages = (data.messages as ChatMessage[]) ?? [];
          if (newMessages.length > 0) {
            setMessages((prev) => [...prev, ...newMessages]);
            const last = newMessages[newMessages.length - 1];
            setLastTimestamp(last.createdAt);
          }

          setConnectionError(null);
        } catch (e) {
          console.error(e);
          setConnectionError("接続が不安定です（自動再接続中）");
        }
      }, 6000); // 6秒ごと
    }

    function stopPolling() {
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    if (document.visibilityState === "visible") {
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [roomCode, lastTimestamp]);

  // ===== メッセージ増えたら下までスクロール =====
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ===== 送信処理 =====
  const doSend = async () => {
    setError(null);

    const text = input.trim();
    if (!text) {
      setError("メッセージを入力してください");
      return;
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      setError(`メッセージは最大 ${MAX_MESSAGE_LENGTH} 文字までです`);
      return;
    }

    const nick = nickname.trim();
    if (!nick) {
      setError("ニックネームを入力してください");
      return;
    }

    // 最初の送信でニックネーム固定
    if (!nicknameLocked) {
      setNicknameLocked(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `mini-line-nickname-${roomCode}`,
          nick,
        );
      }
    }

    setLoadingSend(true);
    try {
      const payload = {
        roomCode,
        nickname: nick,
        text,
      };

      console.log("送信ペイロード:", payload);

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "メッセージを送信できませんでした");
        return;
      }

      const msg = data.message as ChatMessage;
      setMessages((prev) => [...prev, msg]);
      setLastTimestamp(msg.createdAt);
      setInput("");
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました");
      setConnectionError(
        "送信に失敗しました。ネットワークを確認してください",
      );
    } finally {
      setLoadingSend(false);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (loadingSend) return;
    await doSend();
  };

  // Enterで送信 / Shift+Enterで改行
  const handleKeyDown = async (
    e: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loadingSend) {
        await doSend();
      }
    }
  };

  // 管理者ボタン
  const handleAdminClick = () => {
    setError(null);

    const pass = window.prompt("管理者パスワードを入力") ?? "";
    const normalized = pass.trim();

    if (!normalized) return;

    if (normalized === ADMIN_PASSWORD) {
      router.push(`/room/${roomCode}/admin`);
    } else {
      setError("管理者パスワードが違います");
    }
  };

  // 🔹 ホームに戻るボタン
  const handleBackHome = () => {
    router.push("/");
  };

  // ルームコード自体が取れないときだけエラー表示
  if (!roomCode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#b4f0c9] to-[#e7f6ff] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-xl">
          <h1 className="mb-2 text-lg font-bold text-slate-900">
            ルームコードが取得できませんでした
          </h1>
          <p className="mb-4 text-sm text-slate-600">
            URL を確認して、もう一度アクセスしてみてください。
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
          >
            ホームに戻る
          </button>
        </div>
      </main>
    );
  }

  // ===== 通常のチャット画面 =====
  return (
    <main className="flex min-h-screen justify-center bg-gradient-to-b from-[#b4f0c9] to-[#e7f6ff] px-2 py-4">
      <div className="flex w-full max-w-md flex-col rounded-2xl bg-[#f7fbf8] shadow-xl ring-1 ring-[#d5e9dd]">
        {/* ヘッダー */}
        <header className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-[#00c96b] to-[#22c1c3] px-4 py-3 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              miniLINE
            </p>
            <h1 className="text-lg font-bold">
              {roomName ? (
                <>
                  {roomName}
                  <span className="ml-1 text-xs font-normal text-white/80">
                    ({roomCode})
                  </span>
                </>
              ) : (
                <>
                  ルーム：
                  <span className="font-mono">{roomCode}</span>
                </>
              )}
            </h1>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleBackHome}
                className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm hover:bg-white"
              >
                ホーム
              </button>
              <button
                type="button"
                onClick={handleAdminClick}
                className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm hover:bg白"
              >
                管理者
              </button>
            </div>
            <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-medium">
              近くの人だけチャット
            </span>
          </div>
        </header>

        {/* 接続エラーバナー */}
        {connectionError && (
          <div className="bg-amber-50 px-4 py-1 text-xs text-amber-700">
            {connectionError}
          </div>
        )}

        {/* ニックネーム入力 */}
        <div className="border-b border-emerald-100 bg-[#eef9f1] px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <label className="flex flex-1 items-center gap-2 text-xs text-slate-700">
              <span className="shrink-0">ニックネーム</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) =>
                  !nicknameLocked && setNickname(e.target.value)
                }
                placeholder="なまえ（最初の送信で固定されます）"
                disabled={nicknameLocked}
                className={`w-full rounded-full border bg白 px-3 py-1.5 text-xs outline-none ring-emerald-400/40 focus:border-emerald-400 focus:ring-2 ${
                  nicknameLocked
                    ? "cursor-not-allowed border-emerald-100 bg-emerald-50 text-slate-500"
                    : "border-emerald-200"
                }`}
              />
            </label>
            {nicknameLocked && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                固定済み
              </span>
            )}
          </div>
          {!nicknameLocked && (
            <p className="mt-1 text-[10px] text-emerald-700/80">
              ※ このルームでは、最初に送ったニックネームから変更できません
            </p>
          )}
        </div>

        {/* メッセージ一覧 */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-[#e7f5ec] px-3 py-3">
          {messages.length === 0 && (
            <p className="rounded-lg bg白/70 px-3 py-2 text-center text-xs text-slate-500">
              まだメッセージがありません。最初のひとことを送ってみよう ✨
            </p>
          )}

          {messages.map((m) => {
            const trimmedNick = nickname.trim();
            const isSystem = m.nickname === "サーバー";
            const isMe =
              !isSystem &&
              trimmedNick !== "" &&
              m.nickname === trimmedNick;

            if (isSystem) {
              // サーバー（システム）メッセージ
              return (
                <div key={m.id} className="flex w-full justify-center">
                  <div className="chat-system rounded-full bg-slate-200/80 px-3 py-1 text-[11px] text-slate-700">
                    {m.text}
                  </div>
                </div>
              );
            }

            // 通常メッセージ
            return (
              <div
                key={m.id}
                className={`flex w-full ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`chat-bubble max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    isMe
                      ? "rounded-br-sm bg-[#00c96b] text白"
                      : "rounded-bl-sm bg白 text-slate-900"
                  }`}
                >
                  <div
                    className={`mb-0.5 text-[10px] ${
                      isMe ? "text白/80" : "text-slate-500"
                    }`}
                  >
                    {m.nickname || "名無し"}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {m.text}
                  </div>
                  <div
                    className={`mt-1 text-right text-[9px] ${
                      isMe ? "text白/70" : "text-slate-400"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString(
                      "ja-JP",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* 入力系エラー */}
        {error && (
          <div className="bg-rose-50 px-4 py-1.5 text-xs text-rose-600">
            {error}
          </div>
        )}

        {/* 入力欄 */}
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 border-t border-emerald-100 bg白 px-3 py-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`メッセージを入力…（最大 ${MAX_MESSAGE_LENGTH} 文字）`}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-emerald-200 bg-[#f4fbf7] px-3 py-2 text-sm outline-none ring-emerald-400/40 focus:border-emerald-400 focus:bg白 focus:ring-2"
          />
          <button
            type="submit"
            disabled={loadingSend}
            className={`rounded-full px-4 py-2 text-sm font-semibold text白 transition ${
              loadingSend
                ? "cursor-default bg-slate-400"
                : "bg-[#00c96b] hover:bg-[#00b25e] active:bg-[#009650]"
            }`}
          >
            送信
          </button>
        </form>
      </div>
    </main>
  );
}
