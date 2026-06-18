'use client';
import { useState, useEffect, useCallback, useRef, Suspense, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { trackEvent } from '../../lib/events';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '../../lib/recentSearches';
import { buildSearchQuery, summarizeFilters } from '../../lib/searchQuery';
import { getToken, authHeaders } from '../../lib/auth';
import { toast } from '../Toaster';

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
  const [suggest, setSuggest] = useState<{ titles: string[]; keywords: string[] }>({ titles: [], keywords: [] });
  const [recent, setRecent] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const suggestBoxRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    prefecture: sp.get('prefecture') || '',
    category: sp.get('category') || '',
    level: sp.get('level') || '',
    keyword: sp.get('keyword') || '',
    amountMin: sp.get('amountMin') || '',
    amountMax: sp.get('amountMax') || '',
    closingSoon: sp.get('closingSoon') === 'true',
    difficulty: sp.get('difficulty') || '',
    sort: sp.get('sort') || 'newest',
    page: 1,
  });

  const fetchSubsidies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.prefecture) params.set('prefecture', filters.prefecture);
    if (filters.category) params.set('category', filters.category);
    if (filters.level) params.set('level', filters.level);
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.amountMin) params.set('amountMin', filters.amountMin);
    if (filters.amountMax) params.set('amountMax', filters.amountMax);
    if (filters.closingSoon) params.set('closingSoon', 'true');
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
    params.set('page', String(filters.page));
    params.set('limit', '15');
    try {
      const res = await fetch(`${API}/api/subsidies?${params}`);
      const json = await res.json();
      setSubsidies(json.data || []);
      setMeta(json.meta || { total: 0, page: 1, pages: 1 });
      if (filters.keyword.trim()) {
        trackEvent('search', { keyword: filters.keyword.trim() });
        addRecentSearch(filters.keyword.trim());
        setRecent(getRecentSearches());
      }
    } catch {}
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchSubsidies(); }, [fetchSubsidies]);

  // 最近の検索を初期ロード
  useEffect(() => { setRecent(getRecentSearches()); }, []);

  // フィルタをURLに反映（共有・ブックマーク・戻る操作に対応）
  const queryStr = buildSearchQuery(filters);
  useEffect(() => {
    router.replace(queryStr ? `/subsidies?${queryStr}` : '/subsidies', { scroll: false });
  }, [queryStr, router]);

  // キーワード入力に応じてサジェストを取得（デバウンス）
  useEffect(() => {
    setActiveIdx(-1);
    const q = filters.keyword.trim();
    if (q.length < 1) { setSuggest({ titles: [], keywords: [] }); return; }
    const t = setTimeout(() => {
      fetch(`${API}/api/subsidies/suggest?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(j => setSuggest({ titles: j.titles || [], keywords: j.keywords || [] }))
        .catch(() => setSuggest({ titles: [], keywords: [] }));
    }, 250);
    return () => clearTimeout(t);
  }, [filters.keyword]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (suggestBoxRef.current && !suggestBoxRef.current.contains(e.target as Node)) setShowSuggest(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const update = (key: string, value: string) => setFilters(f => ({ ...f, [key]: value, page: 1 }));

  const applyKeyword = (kw: string) => {
    setFilters(f => ({ ...f, keyword: kw, page: 1 }));
    setShowSuggest(false);
    setActiveIdx(-1);
  };

  // サジェスト候補（キーワード未入力時は最近の検索、入力時はタイトル+人気語）
  const suggestOptions = filters.keyword.trim() === '' ? recent : [...suggest.titles, ...suggest.keywords];

  const onKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggest || suggestOptions.length === 0) {
      if (e.key === 'Enter') { setShowSuggest(false); fetchSubsidies(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestOptions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') {
      if (activeIdx >= 0 && suggestOptions[activeIdx]) { e.preventDefault(); applyKeyword(suggestOptions[activeIdx]); }
      else { setShowSuggest(false); fetchSubsidies(); }
    } else if (e.key === 'Escape') { setShowSuggest(false); setActiveIdx(-1); }
  };

  const saveSearch = async () => {
    if (!getToken()) { toast('検索条件の保存にはログインが必要です', 'info'); setTimeout(() => { window.location.href = '/auth/login'; }, 800); return; }
    const query = buildSearchQuery(filters);
    const name = summarizeFilters(filters);
    const res = await fetch(`${API}/api/saved-searches`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ name, query }),
    });
    if (res.ok) toast('検索条件を保存しました（マイページで確認）', 'success');
    else { const j = await res.json().catch(() => ({})); toast(j.error || '保存に失敗しました', 'error'); }
  };

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
            <div className="relative" ref={suggestBoxRef}>
              <label className="label" htmlFor="f-keyword">キーワード</label>
              <input id="f-keyword" className="input" placeholder="例：IT導入 創業" value={filters.keyword}
                onChange={e => update('keyword', e.target.value)}
                onFocus={() => setShowSuggest(true)}
                onKeyDown={onKeywordKeyDown}
                role="combobox" aria-expanded={showSuggest} aria-controls="suggest-listbox" aria-autocomplete="list"
                aria-activedescendant={activeIdx >= 0 ? `suggest-opt-${activeIdx}` : undefined} aria-label="キーワード検索" />
              {showSuggest && suggestOptions.length > 0 && (
                <ul id="suggest-listbox" role="listbox" aria-label="検索候補"
                  className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto text-sm">
                  {filters.keyword.trim() === '' && (
                    <li className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-400 border-b border-gray-50">
                      <span>最近の検索</span>
                      <button onClick={() => { clearRecentSearches(); setRecent([]); }} className="hover:text-red-500">消去</button>
                    </li>
                  )}
                  {suggestOptions.map((opt, i) => {
                    const isKeyword = filters.keyword.trim() !== '' && i >= suggest.titles.length;
                    const isRecent = filters.keyword.trim() === '';
                    return (
                      <li key={`${i}-${opt}`} id={`suggest-opt-${i}`} role="option" aria-selected={activeIdx === i}>
                        <button onClick={() => applyKeyword(opt)} onMouseEnter={() => setActiveIdx(i)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 ${activeIdx === i ? 'bg-navy/10' : 'hover:bg-gray-50'} ${isKeyword ? 'text-gray-600' : ''}`}>
                          {isRecent && <span className="text-gray-300">🕘</span>}
                          {isKeyword && <span className="text-gray-300">🔍</span>}
                          <span className="line-clamp-1">{opt}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <label className="label" htmlFor="f-prefecture">地域</label>
              <select id="f-prefecture" className="input" value={filters.prefecture} onChange={e => update('prefecture', e.target.value)}>
                <option value="">すべての地域</option>
                {PREFECTURES.map(p => <option key={p} value={p === '全国' ? '' : p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-category">カテゴリ</label>
              <select id="f-category" className="input" value={filters.category} onChange={e => update('category', e.target.value)}>
                <option value="">すべてのカテゴリ</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-level">支援レベル</label>
              <select id="f-level" className="input" value={filters.level} onChange={e => update('level', e.target.value)}>
                <option value="">すべて</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" id="f-amount-label">補助上限額（円）</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" className="input" placeholder="下限" value={filters.amountMin}
                  aria-label="補助上限額の下限" onChange={e => update('amountMin', e.target.value)} />
                <span className="text-gray-400">〜</span>
                <input type="number" min="0" className="input" placeholder="上限" value={filters.amountMax}
                  aria-label="補助上限額の上限" onChange={e => update('amountMax', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="f-difficulty">申請難易度</label>
              <select id="f-difficulty" className="input" value={filters.difficulty} onChange={e => update('difficulty', e.target.value)}>
                <option value="">すべて</option>
                <option value="easy">易しい</option>
                <option value="medium">普通</option>
                <option value="hard">難しい</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={filters.closingSoon}
                onChange={e => setFilters(f => ({ ...f, closingSoon: e.target.checked, page: 1 }))}
                className="rounded border-gray-300" />
              締切30日以内のみ
            </label>
            <button onClick={() => setFilters({ prefecture: '', category: '', level: '', keyword: '', amountMin: '', amountMax: '', closingSoon: false, difficulty: '', sort: 'newest', page: 1 })}
              className="w-full text-sm text-gray-500 hover:text-gray-700 underline text-left">
              フィルターをリセット
            </button>
            {(() => {
              const ep = new URLSearchParams();
              if (filters.prefecture) ep.set('prefecture', filters.prefecture);
              if (filters.category) ep.set('category', filters.category);
              if (filters.level) ep.set('level', filters.level);
              if (filters.keyword) ep.set('keyword', filters.keyword);
              if (filters.difficulty) ep.set('difficulty', filters.difficulty);
              return (
                <a href={`${API}/api/subsidies/export?${ep}`}
                  className="block w-full text-center text-sm border border-navy text-navy rounded-lg py-2 hover:bg-navy hover:text-white transition-colors">
                  📥 CSVでダウンロード
                </a>
              );
            })()}
            <button onClick={saveSearch}
              className="block w-full text-center text-sm border border-gray-300 text-gray-600 rounded-lg py-2 hover:border-navy hover:text-navy transition-colors">
              🔖 この条件を保存
            </button>
          </div>
        </aside>

        {/* List */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4 gap-3">
            <p className="text-sm text-gray-500">{meta.total}件中 {subsidies.length}件を表示</p>
            <div className="flex items-center gap-3">
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('検索結果のリンクをコピーしました', 'success'); }}
                className="text-sm text-gray-500 hover:text-navy" title="この検索結果を共有">🔗 共有</button>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">並び替え</span>
                <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/40"
                  value={filters.sort} onChange={e => update('sort', e.target.value)}>
                  <option value="newest">新着順</option>
                  <option value="amount_desc">補助額が高い順</option>
                  <option value="amount_asc">補助額が低い順</option>
                  <option value="deadline">締切が近い順</option>
                </select>
              </label>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-16 text-gray-400">読み込み中...</div>
          ) : subsidies.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-gray-500 mb-1">条件に合う補助金が見つかりませんでした</p>
              <p className="text-sm text-gray-400 mb-6">条件を変える、または人気カテゴリから探してみてください。</p>
              <button onClick={() => setFilters({ prefecture: '', category: '', level: '', keyword: '', amountMin: '', amountMax: '', closingSoon: false, difficulty: '', sort: 'newest', page: 1 })}
                className="btn-primary text-sm mb-6">条件をリセットして全件表示</button>
              <div className="flex flex-wrap gap-2 justify-center">
                {CATEGORIES.slice(0, 8).map(c => (
                  <button key={c} onClick={() => setFilters({ prefecture: '', category: c, level: '', keyword: '', amountMin: '', amountMax: '', closingSoon: false, difficulty: '', sort: 'newest', page: 1 })}
                    className="bg-gray-100 hover:bg-navy hover:text-white px-3 py-1.5 rounded-full text-xs transition-colors">{c}</button>
                ))}
              </div>
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
