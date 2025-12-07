// lib/ngWords.ts

// よくある悪口系ワード（軽め）
const BASIC_NG_WORDS = [
  "ばか",
  "バカ",
  "あほ",
  "アホ",
  "くそ",
  "クソ",
];

// 危険寄りワード（暴力・脅し系）
// ※ここに「これは流れたくないな」という強めの言葉を追加していく想定
const DANGEROUS_NG_WORDS = [
  "殺す",
  "殺して",
  "死ね",
  "死ねよ",
  "殺すぞ",
  "おっぱい",
  "ちんこ",
  "まんこ",
  "ちんぽ",
  "にが",
  "ニガ",
  "クンニ",
  "オナニー",
  "エロ",
  "えろ",
  "ピンクローター",
  "コキ",
  "エッチ",
  "ロリ",
  "ろり",

  // 例）暴力・犯罪・自傷を強く連想させる単語など
  // "○○○", "△△△" みたいに自分で追加してOK
];

export const NG_WORDS = [
  ...BASIC_NG_WORDS,
  ...DANGEROUS_NG_WORDS,
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// テキスト中のNGワードを ***** で伏字にする
export function maskNgWords(text: string): string {
  let result = text;

  for (const word of NG_WORDS) {
    if (!word) continue;
    const escaped = escapeRegExp(word);
    const regex = new RegExp(escaped, "gi");

    result = result.replace(regex, (match) => {
      return "*".repeat(match.length); // 文字数分の * を並べる
    });
  }

  return result;
}
