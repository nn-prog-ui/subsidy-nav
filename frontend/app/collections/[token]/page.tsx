import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const LEVEL_COLORS: Record<string, string> = {
  '国': 'bg-red-100 text-red-700', '都道府県': 'bg-blue-100 text-blue-700', '市区町村': 'bg-green-100 text-green-700',
};

interface Collection {
  owner: string; count: number;
  subsidies: { id: string; title: string; category: string; level: string; prefecture: string; maxAmount: number | null }[];
}

async function getCollection(token: string): Promise<Collection | null> {
  try {
    const res = await fetch(`${API}/api/collections/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).data;
  } catch { return null; }
}

export const metadata: Metadata = {
  title: '共有された補助金コレクション',
  robots: { index: false, follow: false }, // 個人の共有リストはインデックスしない
};

export default async function CollectionPage({ params }: { params: { token: string } }) {
  const data = await getCollection(params.token);
  if (!data) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <span className="text-sm text-gray-400">共有コレクション</span>
        <h1 className="text-2xl font-bold text-navy mt-1">{data.owner}さんのお気に入り補助金</h1>
        <p className="text-gray-500 text-sm mt-1">{data.count}件の補助金</p>
      </div>

      {data.subsidies.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">このコレクションは空です。</div>
      ) : (
        <div className="space-y-4">
          {data.subsidies.map(s => (
            <Link key={s.id} href={`/subsidies/${s.id}`} className="card p-5 block group">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`badge ${LEVEL_COLORS[s.level] || 'bg-gray-100 text-gray-700'}`}>{s.level}</span>
                <span className="badge bg-orange-100 text-orange-700">{s.category}</span>
                <span className="badge bg-gray-100 text-gray-600">{s.prefecture}</span>
              </div>
              <h2 className="font-bold text-navy group-hover:text-navy-light leading-tight">{s.title}</h2>
              {s.maxAmount && <p className="text-sm text-navy font-semibold mt-1">上限 ¥{Number(s.maxAmount).toLocaleString()}</p>}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/subsidies" className="btn-primary inline-block">自分でも補助金を探す →</Link>
      </div>
    </div>
  );
}
