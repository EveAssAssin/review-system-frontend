// 安全渲染星等字串：防止 star_count 為 null/異常/超過 5 時
// String.prototype.repeat(負數) 丟 RangeError 導致整頁白屏。
// 一律先夾到 0~5 的整數再 repeat。
export function starStr(
  n: number | null | undefined,
  filled: string = '★',
  empty: string = '☆',
): string {
  const c = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return filled.repeat(c) + empty.repeat(5 - c);
}
