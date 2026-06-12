import { ImageResponse } from 'next/og';

export const alt = '補助金ナビ';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// 必要な文字だけGoogle Fontsから動的サブセット取得（日本語レンダリング用）
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

async function getSubsidy(id: string) {
  try {
    const res = await fetch(`${API}/api/subsidies/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).data;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSubsidy(id);
  const title = (s?.title || '補助金ナビ').slice(0, 60);
  const category = s?.category || '';
  const prefecture = s?.prefecture || '';
  const amount = s?.maxAmount ? `上限 ¥${Number(s.maxAmount).toLocaleString()}` : '';

  const fontText = `補助金ナビ${title}${category}${prefecture}${amount}上限助成金日本全国`;
  const fontData = await loadJpFont(fontText);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5580 100%)',
          color: 'white', padding: '64px', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 32, opacity: 0.9 }}>
          <span style={{ fontSize: 44 }}>🏛</span>
          <span>補助金ナビ</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: 26 }}>
            {category && <span style={{ background: '#e8954a', padding: '6px 18px', borderRadius: 999 }}>{category}</span>}
            {prefecture && <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 18px', borderRadius: 999 }}>{prefecture}</span>}
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.25, display: 'flex' }}>{title}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 30 }}>
          <span style={{ color: '#ffd9a8' }}>{amount}</span>
          <span style={{ opacity: 0.7, fontSize: 24 }}>subsidy-nav.jp</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ? [{ name: 'Noto Sans JP', data: fontData, weight: 700, style: 'normal' }] : undefined,
    }
  );
}
