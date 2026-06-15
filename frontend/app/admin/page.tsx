'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Stats { subsidies: number; alerts: number; consulting: number; users: number; recentScrapes: ScrapeLog[]; }
interface ScrapeLog { id: string; targetName: string; status: string; subsidiesFound: number; createdAt: string; }
interface ConsultingItem { id: string; name: string; email: string; company: string | null; prefecture: string | null; message: string; status: string; createdAt: string; }
interface SubsidyItem { id: string; title: string; prefecture: string; category: string; level: string; maxAmount: number | null; status: string; createdAt: string; }
interface AlertItem { id: string; email: string; prefectures: string[]; categories: string[]; verified: boolean; active: boolean; createdAt: string; }
interface UserItem { id: string; email: string; name: string | null; emailVerified: boolean; provider: string; createdAt: string; _count: { favorites: number }; }
interface Bucket { label: string; count: number; }
interface AnalyticsData { total: number; byLevel: Bucket[]; byCategory: Bucket[]; byPrefecture: Bucket[]; amount: { avg: number; max: number; min: number }; deadlineSoon: number; }
interface AuditItem { id: string; adminEmail: string; action: string; target: string; targetId: string | null; detail: string | null; createdAt: string; }
interface RevisionItem { id: string; subsidyId: string; title: string; adminEmail: string | null; changes: Record<string, { from: unknown; to: unknown }>; createdAt: string; }
interface ReportItem { id: string; subsidyId: string; title: string; reason: string; detail: string | null; email: string | null; status: string; createdAt: string; }
interface EventStats {
  byType: { type: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  topViewed: { subsidyId: string; title: string; count: number }[];
}

const CATEGORIES = ['IT・デジタル','設備投資','創業支援','雇用促進','環境・エネルギー','販路拡大','農業・林業','事業再構築','経営支援','地方創生','海外展開','伝統産業','各種補助金'];
const PREFECTURES = ['全国','北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];

type Tab = 'stats' | 'analytics' | 'ranking' | 'subsidies' | 'consulting' | 'alerts' | 'users' | 'reports' | 'audit' | 'scrape';

function AdminBar({ data, color }: { data: Bucket[]; color: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-600">{d.label}</span>
            <span className="text-gray-400">{d.count}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [loginForm, setLoginForm] = useState({ email: 'admin@subsidy-nav.jp', password: '' });
  const [stats, setStats] = useState<Stats | null>(null);
  const [consulting, setConsulting] = useState<ConsultingItem[]>([]);
  const [subsidies, setSubsidies] = useState<SubsidyItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [tab, setTab] = useState<Tab>('stats');
  const [loginError, setLoginError] = useState('');
  const [scrapeMsg, setScrapeMsg] = useState('');
  const [showAddSubsidy, setShowAddSubsidy] = useState(false);
  const [dups, setDups] = useState<{ id: string; title: string; prefecture: string; level: string; status: string }[][] | null>(null);
  const [dupsLoading, setDupsLoading] = useState(false);
  const [subPage, setSubPage] = useState(1);
  const [subKeyword, setSubKeyword] = useState('');
  const [subMeta, setSubMeta] = useState({ total: 0, pages: 1 });
  const [addForm, setAddForm] = useState({ title: '', description: '', category: 'IT・デジタル', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: '', subsidyRate: '', applicationUrl: '', requirements: '', difficulty: '', estimatedDays: '' });

  const headers = useCallback(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  const sessionExpired = useCallback(() => {
    localStorage.removeItem('admin_token');
    setToken('');
    setLoginError('セッションの有効期限が切れました。再度ログインしてください。');
  }, []);

  const fetchData = useCallback(async (t: string) => {
    const h = { Authorization: `Bearer ${t}` };
    // 認証付きの代表エンドポイントで先にトークンの有効性を確認
    const statsRes = await fetch(`${API}/api/admin/stats`, { headers: h });
    if (statsRes.status === 401) { sessionExpired(); return; }
    setStats((await statsRes.json()).data);

    const [c, sub, al, us] = await Promise.allSettled([
      fetch(`${API}/api/admin/consulting`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/admin/subsidies?limit=20`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/admin/alerts`, { headers: h }).then(r => r.json()),
      fetch(`${API}/api/admin/users`, { headers: h }).then(r => r.json()),
    ]);
    if (c.status === 'fulfilled') setConsulting(c.value.data || []);
    if (sub.status === 'fulfilled') { setSubsidies(sub.value.data || []); setSubMeta(sub.value.meta || { total: 0, pages: 1 }); }
    if (al.status === 'fulfilled') setAlerts(al.value.data || []);
    if (us.status === 'fulfilled') setUsers(us.value.data || []);
    fetch(`${API}/api/subsidies/analytics`).then(r => r.json()).then(j => setAnalytics(j.data)).catch(() => {});
    fetch(`${API}/api/admin/audit-logs`, { headers: h }).then(r => r.json()).then(j => setAuditLogs(j.data || [])).catch(() => {});
    fetch(`${API}/api/admin/event-stats`, { headers: h }).then(r => r.json()).then(j => setEventStats(j.data)).catch(() => {});
    fetch(`${API}/api/admin/revisions`, { headers: h }).then(r => r.json()).then(j => setRevisions(j.data || [])).catch(() => {});
    fetch(`${API}/api/admin/reports`, { headers: h }).then(r => r.json()).then(j => setReports(j.data || [])).catch(() => {});
  }, [sessionExpired]);

  const updateReportStatus = async (id: string, status: string) => {
    const res = await fetch(`${API}/api/admin/reports/${id}`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify({ status }),
    });
    if (res.ok) setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const loadSubsidies = useCallback(async (page: number, keyword: string) => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (keyword) params.set('keyword', keyword);
    const r = await fetch(`${API}/api/admin/subsidies?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401) { sessionExpired(); return; }
    const j = await r.json();
    setSubsidies(j.data || []);
    setSubMeta(j.meta || { total: 0, pages: 1 });
    setSubPage(page);
  }, [token, sessionExpired]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) { setToken(saved); fetchData(saved); }
  }, [fetchData]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = await fetch(`${API}/api/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm),
    });
    if (!res.ok) { setLoginError('認証に失敗しました'); return; }
    const { token: t } = await res.json();
    localStorage.setItem('admin_token', t);
    setToken(t);
    fetchData(t);
  };

  const triggerScrape = async () => {
    const res = await fetch(`${API}/api/admin/scrape`, { method: 'POST', headers: headers() });
    const json = await res.json();
    setScrapeMsg(json.message);
    setTimeout(() => setScrapeMsg(''), 6000);
  };

  const triggerReport = async () => {
    const res = await fetch(`${API}/api/admin/report/send`, { method: 'POST', headers: headers() });
    const json = await res.json();
    setScrapeMsg(json.message);
    setTimeout(() => setScrapeMsg(''), 6000);
  };

  const triggerRefreshStatus = async () => {
    const res = await fetch(`${API}/api/admin/subsidies/refresh-status`, { method: 'POST', headers: headers() });
    const json = await res.json();
    setScrapeMsg(json.message);
    fetchData(token);
    setTimeout(() => setScrapeMsg(''), 6000);
  };

  const updateConsultingStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/admin/consulting/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status }) });
    setConsulting(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const updateSubsidyStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/admin/subsidies/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status }) });
    setSubsidies(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const deleteSubsidy = async (id: string) => {
    if (!confirm('この補助金を削除しますか？')) return;
    const res = await fetch(`${API}/api/admin/subsidies/${id}`, { method: 'DELETE', headers: headers() });
    if (res.ok) setSubsidies(prev => prev.filter(s => s.id !== id));
  };

  const addSubsidy = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API}/api/admin/subsidies`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ ...addForm, maxAmount: addForm.maxAmount ? parseInt(addForm.maxAmount) : null }),
    });
    if (res.ok) {
      const json = await res.json();
      setSubsidies(prev => [json.data, ...prev]);
      setShowAddSubsidy(false);
      setAddForm({ title: '', description: '', category: 'IT・デジタル', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: '', subsidyRate: '', applicationUrl: '', requirements: '', difficulty: '', estimatedDays: '' });
    }
  };

  if (!token) return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-2xl font-bold text-navy">管理者ログイン</h1>
        </div>
        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="label">メールアドレス</label>
            <input type="email" className="input" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">パスワード</label>
            <input type="password" className="input" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} required placeholder="admin1234" />
          </div>
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <button type="submit" className="btn-primary w-full">ログイン</button>
        </form>
        <p className="text-xs text-gray-400 mt-4 text-center">初期パスワード: admin1234</p>
      </div>
    </div>
  );

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'stats', label: 'ダッシュボード' },
    { key: 'analytics', label: '分析' },
    { key: 'subsidies', label: '補助金管理', count: subsidies.length },
    { key: 'consulting', label: '相談管理', count: consulting.filter(c => c.status === 'pending').length },
    { key: 'alerts', label: 'アラート', count: alerts.length },
    { key: 'ranking', label: 'ランキング' },
    { key: 'users', label: 'ユーザー管理', count: users.length },
    { key: 'reports', label: '報告', count: reports.filter(r => r.status === 'open').length },
    { key: 'audit', label: '監査ログ' },
    { key: 'scrape', label: 'スクレイピング' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">管理ダッシュボード</h1>
        <div className="flex gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← サイトへ戻る</Link>
          <button onClick={() => { localStorage.removeItem('admin_token'); setToken(''); setStats(null); }}
            className="text-sm text-red-500 hover:text-red-700">ログアウト</button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '補助金総数', value: stats.subsidies, icon: '🏛', color: 'bg-blue-50' },
            { label: '登録ユーザー', value: stats.users ?? 0, icon: '👤', color: 'bg-teal-50' },
            { label: 'アクティブアラート', value: stats.alerts, icon: '🔔', color: 'bg-green-50' },
            { label: '相談件数', value: stats.consulting, icon: '💬', color: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 text-center ${s.color}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-navy">{s.value}</div>
              <div className="text-gray-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === t.key ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-navy text-white' : 'bg-gray-300 text-gray-600'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && stats && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b font-medium text-sm text-gray-600">最近のスクレイプログ</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['自治体', 'ステータス', '取得件数', '日時'].map(h => <th key={h} className="px-4 py-2.5 text-left text-gray-500 font-medium text-xs">{h}</th>)}</tr>
            </thead>
            <tbody>
              {stats.recentScrapes.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">スクレイプ履歴なし。「スクレイピング」タブから実行できます。</td></tr>
              ) : stats.recentScrapes.map((s: ScrapeLog) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5">{s.targetName}</td>
                  <td className="px-4 py-2.5"><span className={`badge text-xs ${s.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span></td>
                  <td className="px-4 py-2.5 text-gray-600">{s.subsidiesFound}件</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{new Date(s.createdAt).toLocaleString('ja-JP')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        analytics ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card p-4 text-center"><div className="text-2xl font-bold text-navy">{analytics.total}</div><div className="text-xs text-gray-500 mt-1">掲載中</div></div>
              <div className="card p-4 text-center bg-red-50"><div className="text-2xl font-bold text-red-600">{analytics.deadlineSoon}</div><div className="text-xs text-gray-500 mt-1">締切30日以内</div></div>
              <div className="card p-4 text-center"><div className="text-lg font-bold text-navy">¥{Math.round(analytics.amount.avg).toLocaleString()}</div><div className="text-xs text-gray-500 mt-1">平均上限額</div></div>
              <div className="card p-4 text-center"><div className="text-lg font-bold text-navy">¥{Math.round(analytics.amount.max).toLocaleString()}</div><div className="text-xs text-gray-500 mt-1">最高上限額</div></div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-5"><h3 className="font-bold text-navy mb-3 text-sm">区分別</h3><AdminBar data={analytics.byLevel} color="bg-navy" /></div>
              <div className="card p-5"><h3 className="font-bold text-navy mb-3 text-sm">カテゴリ別（上位10）</h3><AdminBar data={analytics.byCategory.slice(0, 10)} color="bg-accent" /></div>
              <div className="card p-5 md:col-span-2"><h3 className="font-bold text-navy mb-3 text-sm">地域別（上位12）</h3><AdminBar data={analytics.byPrefecture} color="bg-navy-light" /></div>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center text-gray-400">分析データを読み込み中...</div>
        )
      )}

      {/* Subsidies Tab */}
      {tab === 'subsidies' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <input
                value={subKeyword}
                onChange={e => setSubKeyword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadSubsidies(1, subKeyword); }}
                placeholder="タイトル・説明で検索"
                aria-label="補助金を検索"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56" />
              <button onClick={() => loadSubsidies(1, subKeyword)} className="text-sm text-navy hover:underline">検索</button>
              <span className="text-sm text-gray-400">全{subMeta.total}件</span>
            </div>
            <div className="flex gap-2">
              <a href={`${API}/api/admin/subsidies/export/csv`}
                onClick={e => { const el = e.currentTarget; el.href = el.href; const h = { Authorization: `Bearer ${token}` }; void fetch(`${API}/api/admin/subsidies/export/csv`, { headers: h }).then(r => r.blob()).then(b => { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'subsidies.csv'; a.click(); }); e.preventDefault(); }}
                className="btn-outline text-sm">📥 CSVエクスポート</a>
              <button
                onClick={async () => { setDupsLoading(true); try { const r = await fetch(`${API}/api/admin/subsidies/duplicates`, { headers: { Authorization: `Bearer ${token}` } }); const j = await r.json(); setDups(j.data || []); } catch { setDups([]); } setDupsLoading(false); }}
                className="btn-outline text-sm">🔎 重複を検出</button>
              <button onClick={() => setShowAddSubsidy(!showAddSubsidy)} className="btn-primary text-sm">
                {showAddSubsidy ? 'キャンセル' : '+ 補助金を追加'}
              </button>
            </div>
          </div>

          {dupsLoading && <p className="text-sm text-gray-400 mb-4">重複を検出中...</p>}
          {dups !== null && !dupsLoading && (
            <div className="card p-4 mb-6 bg-amber-50 border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-navy text-sm">重複の可能性: {dups.length}グループ</h3>
                <button onClick={() => setDups(null)} className="text-xs text-gray-400 hover:text-gray-600">閉じる</button>
              </div>
              {dups.length === 0 ? (
                <p className="text-sm text-gray-500">重複候補は見つかりませんでした。</p>
              ) : (
                <div className="space-y-3">
                  {dups.map((group, gi) => (
                    <div key={gi} className="bg-white rounded-lg p-3 border border-amber-100">
                      {group.map(s => (
                        <div key={s.id} className="flex items-center justify-between gap-2 text-sm py-0.5">
                          <Link href={`/subsidies/${s.id}`} className="text-navy hover:underline truncate">{s.title}</Link>
                          <span className="text-xs text-gray-400 flex-shrink-0">{s.level}・{s.prefecture}・{s.status}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showAddSubsidy && (
            <div className="card p-6 mb-6 bg-blue-50">
              <h3 className="font-bold text-navy mb-4">新規補助金追加</h3>
              <form onSubmit={addSubsidy} className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">タイトル *</label>
                  <input className="input" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} required placeholder="補助金名称" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">説明 *</label>
                  <textarea className="input h-20 resize-none" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">カテゴリ</label>
                  <select className="input" value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">対象</label>
                  <input className="input" value={addForm.targetType} onChange={e => setAddForm(f => ({ ...f, targetType: e.target.value }))} placeholder="中小企業" />
                </div>
                <div>
                  <label className="label">レベル</label>
                  <select className="input" value={addForm.level} onChange={e => setAddForm(f => ({ ...f, level: e.target.value }))}>
                    {['国','都道府県','市区町村'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">都道府県</label>
                  <select className="input" value={addForm.prefecture} onChange={e => setAddForm(f => ({ ...f, prefecture: e.target.value }))}>
                    {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">上限額（円）</label>
                  <input type="number" className="input" value={addForm.maxAmount} onChange={e => setAddForm(f => ({ ...f, maxAmount: e.target.value }))} placeholder="1000000" />
                </div>
                <div>
                  <label className="label">補助率</label>
                  <input className="input" value={addForm.subsidyRate} onChange={e => setAddForm(f => ({ ...f, subsidyRate: e.target.value }))} placeholder="1/2" />
                </div>
                <div>
                  <label className="label">申請URL</label>
                  <input type="url" className="input" value={addForm.applicationUrl} onChange={e => setAddForm(f => ({ ...f, applicationUrl: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <label className="label">申請要件</label>
                  <input className="input" value={addForm.requirements} onChange={e => setAddForm(f => ({ ...f, requirements: e.target.value }))} />
                </div>
                <div>
                  <label className="label">申請難易度</label>
                  <select className="input" value={addForm.difficulty} onChange={e => setAddForm(f => ({ ...f, difficulty: e.target.value }))}>
                    <option value="">未設定</option>
                    <option value="easy">易しい</option>
                    <option value="medium">普通</option>
                    <option value="hard">難しい</option>
                  </select>
                </div>
                <div>
                  <label className="label">所要日数の目安</label>
                  <input type="number" min="0" className="input" value={addForm.estimatedDays} onChange={e => setAddForm(f => ({ ...f, estimatedDays: e.target.value }))} placeholder="30" />
                </div>
                <div className="sm:col-span-2">
                  <button type="submit" className="btn-primary">追加する</button>
                </div>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['タイトル', 'レベル', 'カテゴリ', '地域', '上限額', 'ステータス', '操作'].map(h => <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs">{h}</th>)}</tr>
              </thead>
              <tbody>
                {subsidies.map(s => (
                  <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <Link href={`/subsidies/${s.id}`} target="_blank" className="font-medium text-navy hover:underline line-clamp-1 max-w-xs block">
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{s.level}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{s.category}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{s.prefecture}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{s.maxAmount ? `¥${Number(s.maxAmount).toLocaleString()}` : '－'}</td>
                    <td className="px-3 py-2.5">
                      <select value={s.status} onChange={e => updateSubsidyStatus(s.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5">
                        <option value="active">active</option>
                        <option value="closed">closed</option>
                        <option value="upcoming">upcoming</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => deleteSubsidy(s.id)} className="text-xs text-red-500 hover:text-red-700">削除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {subMeta.pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button disabled={subPage <= 1} onClick={() => loadSubsidies(subPage - 1, subKeyword)}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">← 前</button>
              <span className="px-3 py-1.5 bg-navy text-white rounded-lg text-sm">{subPage} / {subMeta.pages}</span>
              <button disabled={subPage >= subMeta.pages} onClick={() => loadSubsidies(subPage + 1, subKeyword)}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">次 →</button>
            </div>
          )}
        </div>
      )}

      {/* Consulting Tab */}
      {tab === 'consulting' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['名前', 'メール', '業種', '都道府県', 'ステータス', '日時', '操作'].map(h => <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs">{h}</th>)}</tr>
            </thead>
            <tbody>
              {consulting.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">相談なし</td></tr>
              ) : consulting.map(c => (
                <tr key={c.id} className={`border-t border-gray-100 hover:bg-gray-50 ${c.status === 'pending' ? 'bg-yellow-50/50' : ''}`}>
                  <td className="px-3 py-2.5 font-medium">{c.name}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{c.email}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{(c as any).industry || '－'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{c.prefecture || '－'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`badge text-xs ${c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : c.status === 'contacted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('ja-JP')}</td>
                  <td className="px-3 py-2.5">
                    <select value={c.status} onChange={e => updateConsultingStatus(c.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5">
                      <option value="pending">pending</option>
                      <option value="contacted">contacted</option>
                      <option value="closed">closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['メール', '都道府県', 'カテゴリ', '認証済み', 'アクティブ', '登録日'].map(h => <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs">{h}</th>)}</tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">アラート登録なし</td></tr>
              ) : alerts.map(a => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium">{a.email}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{a.prefectures.slice(0, 2).join('・') || '全国'}{a.prefectures.length > 2 ? `他${a.prefectures.length - 2}` : ''}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{a.categories.slice(0, 2).join('・') || '全て'}</td>
                  <td className="px-3 py-2.5"><span className={`badge text-xs ${a.verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{a.verified ? '✓' : '未'}</span></td>
                  <td className="px-3 py-2.5"><span className={`badge text-xs ${a.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{a.active ? 'ON' : 'OFF'}</span></td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString('ja-JP')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['メール', '名前', 'お気に入り', '認証', 'プロバイダ', '登録日', '操作'].map(h => <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">ユーザーなし</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-sm">{u.email}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{u.name || '－'}</td>
                  <td className="px-3 py-2.5 text-center text-sm text-gray-500">{u._count.favorites}</td>
                  <td className="px-3 py-2.5"><span className={`badge text-xs ${u.emailVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{u.emailVerified ? '✓' : '未'}</span></td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{u.provider}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString('ja-JP')}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={async () => {
                      if (!confirm(`${u.email} を削除しますか？`)) return;
                      const res = await fetch(`${API}/api/admin/users/${u.id}`, { method: 'DELETE', headers: headers() });
                      if (res.ok) setUsers(prev => prev.filter(x => x.id !== u.id));
                    }} className="text-xs text-red-500 hover:text-red-700">削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ranking Tab */}
      {tab === 'ranking' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">直近30日間のユーザー行動を集計しています。</p>
          {eventStats?.byType && (
            <div className="grid grid-cols-3 gap-4">
              {[{ k: 'view', label: '閲覧' }, { k: 'search', label: '検索' }, { k: 'match', label: '診断' }].map(t => (
                <div key={t.k} className="card p-4 text-center">
                  <div className="text-2xl font-bold text-navy">{eventStats.byType.find(b => b.type === t.k)?.count || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{t.label}イベント</div>
                </div>
              ))}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-3">人気の検索キーワード</h3>
              {eventStats?.topKeywords?.length ? (
                <ol className="space-y-1.5">
                  {eventStats.topKeywords.map((k, i) => (
                    <li key={k.keyword} className="flex justify-between text-sm">
                      <span className="text-gray-700"><span className="text-gray-400 mr-2">{i + 1}.</span>{k.keyword}</span>
                      <span className="text-gray-400">{k.count}回</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-gray-400 text-sm">データなし</p>}
            </div>
            <div className="card p-5">
              <h3 className="font-bold text-navy mb-3">よく見られている補助金</h3>
              {eventStats?.topViewed?.length ? (
                <ol className="space-y-1.5">
                  {eventStats.topViewed.map((v, i) => (
                    <li key={v.subsidyId} className="flex justify-between text-sm gap-2">
                      <Link href={`/subsidies/${v.subsidyId}`} className="text-navy hover:underline truncate"><span className="text-gray-400 mr-2">{i + 1}.</span>{v.title}</Link>
                      <span className="text-gray-400 flex-shrink-0">{v.count}回</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-gray-400 text-sm">データなし</p>}
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['日時', '補助金', '理由', '詳細', '連絡先', 'ステータス'].map(h => <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs">{h}</th>)}</tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">報告なし</td></tr>
              ) : reports.map(r => (
                <tr key={r.id} className={`border-t border-gray-100 hover:bg-gray-50 ${r.status === 'open' ? 'bg-yellow-50/50' : ''}`}>
                  <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('ja-JP')}</td>
                  <td className="px-3 py-2.5"><Link href={`/subsidies/${r.subsidyId}`} target="_blank" className="text-navy hover:underline line-clamp-1 max-w-[12rem] block">{r.title}</Link></td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{({ outdated: '情報が古い', broken_link: 'リンク切れ', wrong_info: '内容に誤り', other: 'その他' } as Record<string, string>)[r.reason] || r.reason}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 max-w-xs truncate">{r.detail || '－'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">{r.email || '－'}</td>
                  <td className="px-3 py-2.5">
                    <select value={r.status} onChange={e => updateReportStatus(r.id, e.target.value)} aria-label="報告ステータス"
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5">
                      <option value="open">未対応</option>
                      <option value="resolved">対応済</option>
                      <option value="dismissed">却下</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === 'audit' && (
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-bold text-navy text-sm">操作ログ</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['日時', '管理者', '操作', '対象', '詳細'].map(h => <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs">{h}</th>)}</tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">監査ログなし</td></tr>
                ) : auditLogs.map(a => (
                  <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleString('ja-JP')}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{a.adminEmail}</td>
                    <td className="px-3 py-2.5">
                      <span className={`badge text-xs ${a.action === 'delete' ? 'bg-red-100 text-red-700' : a.action === 'create' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{a.action}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{a.target}{a.targetId ? ` (${a.targetId.slice(0, 8)})` : ''}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 max-w-xs truncate">{a.detail || '－'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 補助金変更履歴 */}
          <div className="card p-5">
            <h3 className="font-bold text-navy mb-3 text-sm">補助金の変更履歴（直近50件）</h3>
            {revisions.length === 0 ? (
              <p className="text-gray-400 text-sm">変更履歴なし</p>
            ) : (
              <div className="space-y-3">
                {revisions.map(r => (
                  <div key={r.id} className="border-b border-gray-50 pb-3 last:border-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Link href={`/subsidies/${r.subsidyId}`} className="text-navy font-medium text-sm hover:underline truncate">{r.title}</Link>
                      <span className="text-xs text-gray-400 flex-shrink-0">{new Date(r.createdAt).toLocaleString('ja-JP')}</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {Object.entries(r.changes).map(([field, c]) => (
                        <div key={field}>
                          <span className="font-medium text-gray-600">{field}</span>: <span className="text-red-500 line-through">{String(c.from ?? '－')}</span> → <span className="text-green-600">{String(c.to ?? '－')}</span>
                        </div>
                      ))}
                    </div>
                    {r.adminEmail && <div className="text-xs text-gray-300 mt-1">by {r.adminEmail}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrape Tab */}
      {tab === 'scrape' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="font-bold text-navy text-lg mb-3">手動実行</h2>
            <p className="text-gray-600 text-sm mb-4">54の自治体サイトから補助金情報を取得します。完了まで数分かかります。</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={triggerScrape} className="btn-primary">🔄 スクレイピングを開始</button>
              <button onClick={triggerReport} className="btn-outline">📊 分析レポートを送信</button>
              <button onClick={triggerRefreshStatus} className="btn-outline">♻️ ステータスを更新</button>
            </div>
            {scrapeMsg && <p className="mt-3 text-green-600 font-medium text-sm">{scrapeMsg}</p>}
          </div>
          <div className="card p-6 bg-gray-50">
            <h2 className="font-bold text-navy text-lg mb-3">自動スケジュール</h2>
            <div className="space-y-3 text-sm">
              {[
                { time: '毎週月曜 AM2:00 JST', desc: '全54自治体の自動スクレイピング', color: 'bg-blue-100 text-blue-700' },
                { time: '毎週月曜 AM8:00 JST', desc: '週次ダイジェストメール（ADMIN_EMAIL宛）', color: 'bg-green-100 text-green-700' },
                { time: '毎週月曜 AM8:10 JST', desc: '週次分析レポートメール（ADMIN_EMAIL宛）', color: 'bg-teal-100 text-teal-700' },
                { time: '毎日 AM6:00 JST', desc: 'ステータス自動更新（締切超過→closed / 開始→active）', color: 'bg-purple-100 text-purple-700' },
                { time: '毎日 AM9:00 JST', desc: '締切3日前アラートメール（登録ユーザー宛）', color: 'bg-orange-100 text-orange-700' },
              ].map(s => (
                <div key={s.time} className="flex gap-3 items-start">
                  <span className={`badge text-xs mt-0.5 flex-shrink-0 ${s.color}`}>{s.time}</span>
                  <span className="text-gray-600">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
