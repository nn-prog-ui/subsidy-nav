// iCalendar (RFC 5545) の最小実装。補助金の申請締切を全日イベントとして出力する。

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
}

function fmtStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // YYYYMMDDTHHMMSSZ
}

/** TEXT値のエスケープ（バックスラッシュ・セミコロン・カンマ・改行）。 */
export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export interface IcsEventInput {
  uid: string;
  title: string;
  date: Date;          // 全日イベントの日付（申請締切日）
  url?: string | null;
  description?: string | null;
  now?: Date;
}

/** 単一イベントの VCALENDAR 文字列を生成する（CRLF 区切り）。 */
export function buildIcsEvent(input: IcsEventInput): string {
  const start = fmtDate(input.date);
  const end = fmtDate(new Date(input.date.getTime() + 24 * 60 * 60 * 1000)); // 終了は翌日（全日）
  const stamp = fmtStamp(input.now ?? new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//subsidy-nav//JP',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    ...(input.url ? [`URL:${escapeIcsText(input.url)}`] : []),
    ...(input.description ? [`DESCRIPTION:${escapeIcsText(input.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}
