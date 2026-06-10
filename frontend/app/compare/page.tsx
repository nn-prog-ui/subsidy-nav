'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Subsidy {
  id: string; title: string; category: string; level: string; prefecture: string;
  targetType: string; maxAmount: number | null; subsidyRate: string | null;
  applicationStart: string | null; applicationEnd: string | null;
  requirements: string | null; municipalityName: string | null;
}

const MAX = 3;

export default function ComparePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Subsidy[]>([]);
  const [selected, setSelected] = useState<Subsidy[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`${API}/api/subsidies?keyword=${encodeURIComponent(query)}&limit=10`)
        .then(r => r.json())
        .then(j => setResults(j.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const add = (s: Subsidy) => {
    if (selected.length >= MAX || selected.find(x => x.id === s.id)) return;
    setSelected(prev => [...prev, s]);
  };
  const remove = (id: string) => setSelected(prev => prev.filter(x => x.id !== id));

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('ja-JP') : '－';
  const money = (n: number | null) => n ? `¥${Number(n).toLocaleString()}` : '上限なし';

  const fields: { label: string; render: (s: Subsidy) => React.ReactNode }[] = [
    { label: 'カテゴリ', render: s => <span className="text-sm">{s.category}</span> },
    { label: '区分', render: s => <span className="text-sm">{s.level}</span> },
    { label: '都道府県', render: s => <span className="text-sm">{s.prefecture}{s.municipalityName ? ` / ${s.municipalityName}` : ''}</span> },
    { label: '対象', render: s => <span className="text-sm">{s.targetType}</span> },
    {
      label: '補助上限額',
      render: s => <span className={`font-bold text-base ${s.maxAmount ? 'text-navy' : 'text-gray-400'}`}>{money(s.maxAmount)}</span>
    },
    { label: '補助率', render: s => <span className="font-medium">{s.subsidyRate || '－'}</span> },
    { label: '申請開始', render: s => <span className="text-sm">{fmt(s.applicationStart)}</span> },
    { label: '申請締切', render: s => <span className={`text-sm font-medium ${s.applicationEnd && new Date(s.applicationEnd) < new Date() ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{fmt(s.applicationEnd)}</span> },
    { label: '申請要件', render: s => <span className="text-xs text-gray-600 line-clamp-3">{s.requirements || '－'}</span> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">補助金比較</h1>
        <p className="text-gray-500">最大{MAX}件の補助金を並べて比較できます。</p>
      </div>

      {/* Search */}
      <div className="card p-5 mb-6">
        <div className="relative mb-4">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="補助金名・キーワードで検索して追加..."
            className="input w-full pr-10"
          />
          {searching && <div className="absolute right-3 top-3 text-gray-400 text-sm">検索中...</div>}
        </div>
        {results.length > 0 && (
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            {results.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-navy">{s.title}</div>
                  <div className="text-xs text-gray-400">{s.level} · {s.prefecture} · {s.category}</div>
                </div>
                <button
                  onClick={() => add(s)}
                  disabled={selected.length >= MAX || !!selected.find(x => x.id === s.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-navy text-white hover:bg-navy-light disabled:opacity-40 disabled:cursor-not-allowed ml-4 shrink-0"
                >
                  {selected.find(x => x.id === s.id) ? '追加済み' : '比較に追加'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selected.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 bg-navy/10 text-navy px-3 py-1.5 rounded-full text-sm">
              <span className="font-medium line-clamp-1 max-w-xs">{s.title}</span>
              <button onClick={() => remove(s.id)} className="text-navy/60 hover:text-red-500 font-bold">×</button>
            </div>
          ))}
          {selected.length < MAX && (
            <div className="flex items-center text-gray-400 text-sm px-3 py-1.5 border-2 border-dashed border-gray-200 rounded-full">+ あと{MAX - selected.length}件追加可能</div>
          )}
        </div>
      )}

      {/* Comparison table */}
      {selected.length >= 2 ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-sm w-32">項目</th>
                {selected.map(s => (
                  <th key={s.id} className="px-4 py-3 text-left w-1/3">
                    <Link href={`/subsidies/${s.id}`} className="font-bold text-navy text-sm hover:underline leading-tight block line-clamp-2">{s.title}</Link>
                    <button onClick={() => remove(s.id)} className="text-xs text-gray-400 hover:text-red-500 mt-1">削除</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fields.map(field => (
                <tr key={field.label} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/50 align-top">{field.label}</td>
                  {selected.map(s => (
                    <td key={s.id} className="px-4 py-3 align-top">{field.render(s)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50/50">詳細</td>
                {selected.map(s => (
                  <td key={s.id} className="px-4 py-3">
                    <Link href={`/subsidies/${s.id}`} className="text-xs text-navy hover:underline">詳細ページを見る →</Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">⚖️</div>
          <p className="font-medium mb-1">2件以上の補助金を追加すると比較表が表示されます</p>
          <p className="text-sm">上の検索から補助金を探して追加してください</p>
        </div>
      )}
    </div>
  );
}
