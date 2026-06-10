'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const PREFECTURES = ['全国','北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const CATEGORIES = ['IT・デジタル','設備投資','創業支援','雇用促進','環境・エネルギー','販路拡大','農業・林業','事業再構築','経営支援','地方創生','海外展開','伝統産業','各種補助金'];
const LEVELS = ['国','都道府県','市区町村'];

const LEVEL_COLORS: Record<string, string> = { '国': 'bg-red-100 text-red-700', '都道府県': 'bg-blue-100 text-blue-700', '市区町村': 'bg-green-100 text-green-700' };

interface Subsidy {
  id: string; title: string; description: string; category: string; targetType: string;
  prefecture: string; level: string; maxAmount: number | null; subsidyRate: string | null;
  applicationEnd: string | null; status: string; municipalityName: string | null;
}

function SubsidiesContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    prefecture: sp.get('prefecture') || '',
    category: sp.get('category') || '',
    level: '',
    keyword: sp.get('keyword') || '',
    page: 1,
  });

  const fetchSubsidies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.prefecture) params.set('prefecture', filters.prefecture);
    if (filters.category) params.set('category', filters.category);
    if (filters.level) params.set('level', filters.level);
    if (filters.keyword) params.set('keyword', filters.keyword);
    params.set('page', String(filters.page));
    params.set('limit', '15');
    try {
      const res = await fetch(`${API}/api/subsidies?${params}`);
      const json = await res.json();
      setSubsidies(json.data || []);
      setMeta(json.meta || { total: 0, page: 1, pages: 1 });
    } catch {}
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchSubsidies(); }, [fetchSubsidies]);

  const update = (key: string, value: string) => setFilters(f => ({ ...f, [key]: value, page: 1 }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">補助金・助成金を探す</h1>
        <p className="text-gray-500 mt-1">全 {meta.total} 件</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters */}
        <aside className="lg:col-span-1">
          <div className="card p-4 space-y-4 sticky top-20">
            <h2 className="font-bold text-navy">絞り込み</h2>
            <div>
              <label className="label">キーワード</label>
              <input className="input" placeholder="例：IT導入 創業" value={filters.keyword}
                onChange={e => update('keyword', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchSubsidies()} />
            </div>
            <div>
              <label className="label">地域</label>
              <select className="input" value={filters.prefecture} onChange={e => update('prefecture', e.target.value)}>
                <option value="">すべての地域</option>
                {PREFECTURES.map(p => <option key={p} value={p === '全国' ? '' : p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">カテゴリ</label>
              <select className="input" value={filters.category} onChange={e => update('category', e.target.value)}>
                <option value="">すべてのカテゴリ</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">支援レベル</label>
              <select className="input" value={filters.level} onChange={e => update('level', e.target.value)}>
                <option value="">すべて</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <button onClick={() => setFilters({ prefecture: '', category: '', level: '', keyword: '', page: 1 })}
              className="w-full text-sm text-gray-500 hover:text-gray-700 underline text-left">
              フィルターをリセット
            </button>
          </div>
        </aside>

        {/* List */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-16 text-gray-400">読み込み中...</div>
          ) : subsidies.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">🔍</div>
              <p>条件に合う補助金が見つかりませんでした</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {subsidies.map(s => (
                  <Link key={s.id} href={`/subsidies/${s.id}`} className="card p-5 block group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`badge ${LEVEL_COLORS[s.level] || 'bg-gray-100 text-gray-700'}`}>{s.level}</span>
                          <span className="badge bg-orange-100 text-orange-700">{s.category}</span>
                          <span className="badge bg-gray-100 text-gray-600">{s.prefecture}</span>
                        </div>
                        <h3 className="font-bold text-navy group-hover:text-navy-light text-lg leading-tight mb-1">{s.title}</h3>
                        <p className="text-gray-600 text-sm line-clamp-2">{s.description}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                          {s.maxAmount && <span>上限: <strong className="text-navy">¥{Number(s.maxAmount).toLocaleString()}</strong></span>}
                          {s.subsidyRate && <span>補助率: <strong>{s.subsidyRate}</strong></span>}
                          {s.applicationEnd && <span>締切: {new Date(s.applicationEnd).toLocaleDateString('ja-JP')}</span>}
                        </div>
                      </div>
                      <div className="text-navy text-xl group-hover:translate-x-1 transition-transform">→</div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {meta.pages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    className="px-4 py-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50">← 前</button>
                  <span className="px-4 py-2 bg-navy text-white rounded-lg">{filters.page} / {meta.pages}</span>
                  <button disabled={filters.page >= meta.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                    className="px-4 py-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50">次 →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SubsidiesPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-400">読み込み中...</div>}>
      <SubsidiesContent />
    </Suspense>
  );
}
