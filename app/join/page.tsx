// app/join/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function JoinRoomPage() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    setError(null);

    const trimmed = roomCode.trim().toUpperCase();
    if (!trimmed) {
      setError("ルームコードを入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: trimmed }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // JSONじゃなかった場合の保険
        setError("サーバーから不正な応答が返されました");
        return;
      }

      if (!res.ok) {
        setError(data.error || "ルームに参加できませんでした");
        return;
      }

      // OKなら /room/[code] に移動
      router.push(`/room/${trimmed}`);
    } catch (e) {
      console.error(e);
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "40px auto",
        padding: "16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px" }}>
        ルームに参加
      </h1>

      <p style={{ marginBottom: "16px" }}>
        友達から教えてもらったルームコードを入力してください。
      </p>

      <label style={{ display: "block", marginBottom: "8px" }}>
        ルームコード
      </label>
      <input
        type="text"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        placeholder="例：ABC123"
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: "16px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />

      <button
        type="button"
        onClick={handleJoin}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "4px",
          border: "none",
          background: loading ? "#9ca3af" : "#16a34a",
          color: "#fff",
          fontWeight: "bold",
          cursor: loading ? "default" : "pointer",
          marginBottom: "12px",
        }}
      >
        {loading ? "確認中..." : "このルームに入る"}
      </button>

      {error && (
        <p style={{ color: "red", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      <Link href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>
        ← トップに戻る
      </Link>
    </main>
  );
}
