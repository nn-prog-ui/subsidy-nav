'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '../lib/auth';
import { getHistory, getPreferences, clearHistory, type ViewedSubsidy } from '../lib/history';

interface Reco {
  id: string; title: string; category: string; level: string; prefecture: string; maxAmount: number | null;
}

const LEVEL_COLORS: Record<string, string> = {
  '国': 'bg-red-100 text-red-700',
  '都道府県': 'bg-blue-100 text-blue-700',
  '市区町村': 'bg-green-100 text-green-700',
};

function Card({ s }: { s: Reco | ViewedSubsidy }) {
  return (
    <Link href={`/subsidies/${s.id}`} className="card p-4 group block">
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className={`badge text-xs ${LEVEL_COLORS[s.level] || 'bg-gray-100 text-gray-700'}`}>{s.level}</span>
        <span className="badge text-xs bg-orange-100 text-orange-700">{s.category}</span>
      </div>
      <h3 className="font-bold text-navy text-sm group-hover:text-navy-light leading-tight mb-1 line-clamp-2">{s.title}</h3>
      {s.maxAmount ? (
        <p className="text-xs text-gray-500">上限 <span className="font-semibold text-navy">¥{Number(s.maxAmount).toLocaleString()}</span></p>
      ) : <p className="text-xs text-gray-400">上限なし</p>}
    </Link>
  );
}

export default function Recommendations() {
  const [history, setHistory] = useState<ViewedSubsidy[]>([]);
  const [recos, setRecos] = useState<Reco[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = getHistory();
    setHistory(h);
    const { categories, prefectures, recentIds } = getPreferences();
    const params = new URLSearchParams();
    if (categories.length) params.set('categories', categories.join(','));
    if (prefectures.length) params.set('prefectures', prefectures.join(','));
    if (recentIds.length) params.set('exclude', recentIds.join(','));
    params.set('limit', '6');

    fetch(`${API}/api/subsidies/reco/personalized?${params}`)
      .then(r => r.json())
      .then(j => setRecos(j.data || []))
      .catch(() => setRecos([]))
      .finally(() => setLoading(false));
  }, []);

  // 履歴ゼロかつレコメンドも無ければ何も表示しない（初訪問者向けにノイズを避ける）
  if (!loading && history.length === 0 && recos.length === 0) return null;

  return (
    <section className="py-12 px-4 max-w-7xl mx-auto">
      {recos.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-navy mb-1">
            {history.length > 0 ? 'あなたへのおすすめ' : '注目の補助金'}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            {history.length > 0 ? '閲覧履歴をもとに選定しています' : '新着の補助金をピックアップ'}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recos.map(s => <Card key={s.id} s={s} />)}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-navy">最近見た補助金</h2>
            <button onClick={() => { clearHistory(); setHistory([]); }}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors">履歴を消去</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.slice(0, 6).map(s => <Card key={s.id} s={s} />)}
          </div>
        </div>
      )}
    </section>
  );
}
