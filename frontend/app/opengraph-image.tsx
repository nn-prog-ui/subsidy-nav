import { ImageResponse } from 'next/og';

export const alt = '補助金ナビ | 日本全国の補助金・助成金情報';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadJpFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
    const m = css.match(/src:\s*url\((.+?)\)\s*format/);
    if (!m) return null;
    const res = await fetch(m[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function Image() {
  const text = '補助金ナビ日本全国の補助金助成金を一括検索国都道府県市区町村';
  const fontData = await loadJpFont(text);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5580 100%)',
          color: 'white', padding: '72px', justifyContent: 'center', gap: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: 48 }}>
          <span style={{ fontSize: 72 }}>🏛</span>
          <span style={{ fontWeight: 700 }}>補助金ナビ</span>
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.35, display: 'flex' }}>
          日本全国の補助金・助成金を一括検索
        </div>
        <div style={{ fontSize: 28, opacity: 0.8, display: 'flex' }}>
          国・都道府県・市区町村の支援制度をまとめて検索
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ? [{ name: 'Noto Sans JP', data: fontData, weight: 700, style: 'normal' }] : undefined,
    }
  );
}
