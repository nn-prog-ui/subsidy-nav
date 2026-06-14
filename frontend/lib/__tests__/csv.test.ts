import { describe, it, expect } from 'vitest';
import { escapeCsvCell, toCsv } from '../csv';

describe('escapeCsvCell', () => {
  it('通常の文字列はそのまま', () => {
    expect(escapeCsvCell('IT導入補助金')).toBe('IT導入補助金');
  });
  it('カンマを含む場合は引用符で囲む', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
  });
  it('引用符はエスケープ（二重化）する', () => {
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
  });
  it('改行を含む場合は引用符で囲む', () => {
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
  });
  it('null/undefinedは空文字', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('BOM付き・CRLF区切りで生成する', () => {
    const csv = toCsv(['名前', '金額'], [['IT導入', 1000000], ['創業, 支援', 500000]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    const body = csv.slice(1);
    expect(body.split('\r\n')[0]).toBe('名前,金額');
    expect(body.split('\r\n')[2]).toBe('"創業, 支援",500000');
  });
});
