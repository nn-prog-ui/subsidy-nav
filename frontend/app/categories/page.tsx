import Link from 'next/link';
import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';

export const metadata: Metadata = {
  title: 'カテゴリ一覧 | 補助金をジャンルから探す',
  description: 'IT・デジタル、設備投資、創業支援、雇用促進など、補助金・助成金をカテゴリ別に探せます。',
  alternates: { canonical: `${BASE_URL}/categories` },
};

const ICONS: Record<string, string> = {
  'IT・デジタル': '💻', '設備投資': '🏭', '創業支援': '🚀', '雇用促進': '👥',
  '環境・エネルギー': '🌱', '販路拡大': '📈', '農業・林業': '🌾', '事業再構築': '🔄',
  '経営支援': '📊', '地方創生': '🏘', '海外展開': '🌏', '伝統産業': '🎴',
  '観光・まちづくり': '🗼', '研究開発': '🔬', '医療・介護': '🏥', '子育て・教育': '🎓',
  '防災・安全': '🛡', '文化・芸術': '🎨', '社会福祉': '🤝', '産業振興': '⚙️',
};

interface Bucket { label: string; count: number; }

async function getCategories(): Promise<Bucket[]> {
  try {
    const res = await fetch(`${API}/api/subsidies/analytics`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()).data?.byCategory || [];
  } catch { return []; }
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-navy mb-2">カテゴリから補助金を探す</h1>
      <p className="text-gray-500 mb-8">事業のジャンル・目的に合わせて補助金・助成金を探せます。</p>

      {categories.length === 0 ? (
        <p className="text-gray-400">カテゴリ情報を取得できませんでした。</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(c => (
            <Link key={c.label} href={`/categories/${encodeURIComponent(c.label)}`}
              className="card p-5 flex items-center gap-4 group">
              <span className="text-3xl">{ICONS[c.label] || '📋'}</span>
              <div>
                <div className="font-bold text-navy group-hover:text-navy-light">{c.label}</div>
                <div className="text-xs text-gray-500">{c.count}件の補助金</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
