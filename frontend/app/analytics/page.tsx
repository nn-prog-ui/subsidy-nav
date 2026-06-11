'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Bucket { label: string; count: number; }
interface Analytics {
  total: number;
  byLevel: Bucket[];
  byCategory: Bucket[];
  byPrefecture: Bucket[];
  amount: { avg: number; max: number; min: number };
  deadlineSoon: number;
}

const LEVEL_COLOR: Record<string, string> = {
  '国': 'bg-red-400',
  '都道府県': 'bg-blue-400',
  '市区町村': 'bg-green-400',
};

function BarChart({ data, colorClass }: { data: Bucket[]; colorClass?: (label: string) => string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-2.5">
      {data.map(d => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 font-medium">{d.label}</span>
            <span className="text-gray-400">{d.count}件</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colorClass ? colorClass(d.label) : 'bg-navy'}`}
              style={{ width: `${(d.count / max) * 100}%` }}
              role="img"
              aria-label={`${d.label}: ${d.count}件`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/subsidies/analytics`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(j => setData(j.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const money = (n: number) => n ? `¥${Math.round(n).toLocaleString()}` : '－';

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[0,1,2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  );

  if (error || !data) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">
      <div className="text-4xl mb-3">📊</div>
      <p>統計データを取得できませんでした</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">補助金データ分析</h1>
        <p className="text-gray-500">登録されている補助金{data.total}件の統計情報をリアルタイムで可視化します。</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-5 text-center">
          <div className="text-3xl font-bold text-navy">{data.total}</div>
          <div className="text-xs text-gray-500 mt-1">登録補助金数</div>
        </div>
        <div className="card p-5 text-center bg-red-50">
          <div className="text-3xl font-bold text-red-600">{data.deadlineSoon}</div>
          <div className="text-xs text-gray-500 mt-1">締切30日以内</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-xl font-bold text-navy">{money(data.amount.avg)}</div>
          <div className="text-xs text-gray-500 mt-1">平均上限額</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-xl font-bold text-navy">{money(data.amount.max)}</div>
          <div className="text-xs text-gray-500 mt-1">最高上限額</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Level */}
        <div className="card p-6">
          <h2 className="font-bold text-navy mb-4">区分別の内訳</h2>
          <BarChart data={data.byLevel} colorClass={l => LEVEL_COLOR[l] || 'bg-navy'} />
        </div>

        {/* Category */}
        <div className="card p-6">
          <h2 className="font-bold text-navy mb-4">カテゴリ別の件数</h2>
          <BarChart data={data.byCategory.slice(0, 10)} colorClass={() => 'bg-accent'} />
        </div>

        {/* Prefecture */}
        <div className="card p-6 md:col-span-2">
          <h2 className="font-bold text-navy mb-4">地域別の件数（上位12）</h2>
          <BarChart data={data.byPrefecture} colorClass={() => 'bg-navy-light'} />
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link href="/subsidies" className="btn-primary inline-block">補助金を検索する →</Link>
      </div>
    </div>
  );
}
