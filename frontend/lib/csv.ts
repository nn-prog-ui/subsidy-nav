// CSV生成ユーティリティ（RFC4180準拠のエスケープ・Excel用BOM付与）

/** 1セルをCSV用にエスケープする。 */
export function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** ヘッダーと行データからCSV文字列を生成する（BOM付きUTF-8）。 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) lines.push(row.map(escapeCsvCell).join(','));
  return '﻿' + lines.join('\r\n');
}

/** CSV文字列をブラウザでダウンロードさせる。 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
