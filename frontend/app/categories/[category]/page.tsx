import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';

const LEVEL_COLORS: Record<string, string> = {
  '国': 'bg-red-100 text-red-700', '都道府県': 'bg-blue-100 text-blue-700', '市区町村': 'bg-green-100 text-green-700',
};

interface Subsidy {
  id: string; title: string; description: string; category: string; level: string;
  prefecture: string; maxAmount: number | null; subsidyRate: string | null;
}

async function getByCategory(category: string): Promise<{ data: Subsidy[]; total: number } | null> {
  try {
    const res = await fetch(`${API}/api/subsidies?category=${encodeURIComponent(category)}&limit=30`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return { data: json.data || [], total: json.meta?.total || 0 };
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const cat = decodeURIComponent(category);
  return {
    title: `${cat}の補助金・助成金一覧`,
    description: `${cat}に関する国・都道府県・市区町村の補助金・助成金をまとめて掲載。最新の公募情報を確認できます。`,
    alternates: { canonical: `${BASE_URL}/categories/${encodeURIComponent(cat)}` },
    openGraph: { title: `${cat}の補助金・助成金一覧 | 補助金ナビ`, url: `${BASE_URL}/categories/${encodeURIComponent(cat)}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = decodeURIComponent(category);
  const result = await getByCategory(cat);
  if (!result) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${cat}の補助金・助成金一覧`,
    url: `${BASE_URL}/categories/${encodeURIComponent(cat)}`,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-sm text-gray-400 mb-4">
        <Link href="/categories" className="hover:underline">カテゴリ一覧</Link> ＞ {cat}
      </nav>
      <h1 className="text-3xl font-bold text-navy mb-2">{cat}の補助金・助成金</h1>
      <p className="text-gray-500 mb-8">全{result.total}件のうち最新{result.data.length}件を表示しています。</p>

      {result.data.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="mb-4">このカテゴリの補助金は見つかりませんでした</p>
          <Link href="/subsidies" className="btn-primary inline-block text-sm">すべての補助金を見る</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {result.data.map(s => (
            <Link key={s.id} href={`/subsidies/${s.id}`} className="card p-5 block group">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`badge ${LEVEL_COLORS[s.level] || 'bg-gray-100 text-gray-700'}`}>{s.level}</span>
                <span className="badge bg-gray-100 text-gray-600">{s.prefecture}</span>
              </div>
              <h2 className="font-bold text-navy group-hover:text-navy-light text-lg leading-tight mb-1">{s.title}</h2>
              <p className="text-gray-600 text-sm line-clamp-2">{s.description}</p>
              {s.maxAmount && <p className="text-sm text-navy font-semibold mt-2">上限 ¥{Number(s.maxAmount).toLocaleString()}</p>}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href={`/subsidies?category=${encodeURIComponent(cat)}`} className="btn-outline inline-block">
          {cat}をさらに絞り込んで検索 →
        </Link>
      </div>
    </div>
  );
}
