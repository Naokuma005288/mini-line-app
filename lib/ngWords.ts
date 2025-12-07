// lib/ngWords.ts

// ここに伏字にしたい単語を追加していく
export const NG_WORDS: string[] = [
  "死ね",
  "殺す",
  // 必要に応じて追加
];

// 正規表現用にエスケープ
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// NGワードを ***** に置き換える
export function maskNgWords(text: string): string {
  let result = text;

  for (const word of NG_WORDS) {
    if (!word) continue;
    const re = new RegExp(escapeRegExp(word), "gi");
    result = result.replace(re, "*".repeat(word.length));
  }

  return result;
}
