// app/create/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreateRoomPage() {
  const [adminSecret, setAdminSecret] = useState("NAOKI-NEW-ADMIN-2828");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setError(null);
    setRoomCode(null);

    if (!adminSecret) {
      setError("管理用パスワードを入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "ルーム作成に失敗しました");
        return;
      }

      setRoomCode(data.code);
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
        ルーム作成（管理者用）
      </h1>

      <p style={{ marginBottom: "16px" }}>
        正しい管理用パスワードを入力した人だけ、ルームコードを発行できます。
      </p>

      <label style={{ display: "block", marginBottom: "8px" }}>
        管理用パスワード
      </label>
      <input
        type="password"
        value={adminSecret}
        onChange={(e) => setAdminSecret(e.target.value)}
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
        onClick={handleCreate}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "4px",
          border: "none",
          background: loading ? "#93c5fd" : "#2563eb",
          color: "#fff",
          fontWeight: "bold",
          cursor: loading ? "default" : "pointer",
          marginBottom: "16px",
        }}
      >
        {loading ? "作成中..." : "ルームを作成する"}
      </button>

      {error && (
        <p style={{ color: "red", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      {roomCode && (
        <div
          style={{
            marginTop: "8px",
            padding: "12px",
            borderRadius: "4px",
            border: "1px solid #d1d5db",
            background: "#f9fafb",
          }}
        >
          <p style={{ marginBottom: "4px" }}>ルームコードが発行されました：</p>
          <p
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              letterSpacing: "0.2em",
              textAlign: "center",
            }}
          >
            {roomCode}
          </p>
          <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            このコードを友達に教えると、このルームに参加できます。
          </p>
        </div>
      )}

      <div style={{ marginTop: "24px" }}>
        <Link href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>
          ← トップに戻る
        </Link>
      </div>
    </main>
  );
}
