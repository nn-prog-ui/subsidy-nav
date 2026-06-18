import { buildIcsEvent, escapeIcsText } from '../utils/ics';

describe('escapeIcsText', () => {
  it('特殊文字をエスケープする', () => {
    expect(escapeIcsText('A, B; C')).toBe('A\\, B\\; C');
    expect(escapeIcsText('line1\nline2')).toBe('line1\\nline2');
  });
});

describe('buildIcsEvent', () => {
  const ics = buildIcsEvent({
    uid: 'abc@subsidy-nav',
    title: 'IT導入補助金 申請締切',
    date: new Date('2026-07-31T00:00:00Z'),
    url: 'https://example.com',
    now: new Date('2026-06-18T00:00:00Z'),
  });

  it('VCALENDAR/VEVENTで囲まれCRLF区切り', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('\r\nBEGIN:VEVENT\r\n');
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('全日イベントの開始/終了日（終了は翌日）', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20260731');
    expect(ics).toContain('DTEND;VALUE=DATE:20260801');
  });

  it('SUMMARY/UID/URLを含む', () => {
    expect(ics).toContain('UID:abc@subsidy-nav');
    expect(ics).toContain('SUMMARY:IT導入補助金 申請締切');
    expect(ics).toContain('URL:https://example.com');
  });

  it('URL未指定なら省略される', () => {
    const noUrl = buildIcsEvent({ uid: 'x', title: 'T', date: new Date('2026-07-31T00:00:00Z') });
    expect(noUrl).not.toContain('URL:');
  });
});
