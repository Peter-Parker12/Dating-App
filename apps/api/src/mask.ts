const KEYWORDS = [
  "zalo", "telegram", "tele", "whatsapp", "viber", "messenger", "facebook", "instagram",
  "momo", "zalopay", "chuyển khoản", "chuyen khoan", "banking", "stk", "số tài khoản", "so tai khoan",
];

const PHONE = /(?:\+?84|0)(?:[\s.\-]?\d){9,10}/g;
const LONG_DIGITS = /\d(?:[\s.\-]?\d){8,}/g;
const URL_RE = /(?:https?:\/\/|www\.)\S+/gi;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

export interface MaskResult {
  text: string;
  flagged: boolean;
}

export function maskContacts(input: string): MaskResult {
  let text = input;
  let flagged = false;
  const sub = (re: RegExp) => {
    text = text.replace(re, () => {
      flagged = true;
      return "***";
    });
  };
  sub(URL_RE);
  sub(EMAIL);
  sub(PHONE);
  sub(LONG_DIGITS);
  for (const kw of KEYWORDS) {
    const re = new RegExp(`(^|[^\\p{L}])${kw}(?![\\p{L}])`, "giu");
    text = text.replace(re, (_m, pre: string) => {
      flagged = true;
      return `${pre}***`;
    });
  }
  return { text, flagged };
}
