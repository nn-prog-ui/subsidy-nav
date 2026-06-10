'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Stats { subsidies: number; alerts: number; consulting: number; recentScrapes: any[]; }
interface ConsultingItem { id: string; name: string; email: string; company: string | null; prefecture: string | null; message: string; status: string; createdAt: string; }

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [loginForm, setLoginForm] = useState({ email: 'admin@subsidy-nav.jp', password: '' });
  const [stats, setStats] = useState<Stats | null>(null);
  const [consulting, setConsulting] = useState<ConsultingItem[]>([]);
  const [tab, setTab] = useState<'stats'|'consulting'|'scrape'>('stats');
  const [loginError, setLoginError] = useState('');
  const [scrapeMsg, setScrapeMsg] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) { setToken(saved); fetchData(saved); }
  }, []);

  const fetchData = async (t: string) => {
    const headers = { Authorization: `Bearer ${t}` };
    const [statsRes, consultRes] = await Promise.all([
      fetch(`${API}/api/admin/stats`, { headers }),
      fetch(`${API}/api/admin/consulting`, { headers }),
    ]);
    if (statsRes.ok) setStats((await statsRes.json()).data);
    if (consultRes.ok) setConsulting((await consultRes.json()).data);
  };

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
    const res = await fetch(`${API}/api/admin/scrape`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    setScrapeMsg(json.message);
    setTimeout(() => setScrapeMsg(''), 5000);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/admin/consulting/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setConsulting(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  if (!token) return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-navy mb-6 text-center">管理者ログイン</h1>
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-navy">管理ダッシュボード</h1>
        <button onClick={() => { localStorage.removeItem('admin_token'); setToken(''); setStats(null); }}
          className="text-sm text-gray-500 hover:text-gray-700">ログアウト</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: '補助金総数', value: stats.subsidies, icon: '🏛' },
            { label: 'アクティブアラート', value: stats.alerts, icon: '🔔' },
            { label: '相談件数', value: stats.consulting, icon: '💬' },
          ].map(s => (
            <div key={s.label} className="card p-5 text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-3xl font-bold text-navy">{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['stats', 'consulting', 'scrape'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'stats' ? 'スクレイプログ' : t === 'consulting' ? '相談管理' : 'スクレイピング'}
          </button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['自治体', 'ステータス', '取得件数', '日時'].map(h => <th key={h} className="px-4 py-3 text-left text-gray-600 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {stats.recentScrapes.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">スクレイプ履歴なし</td></tr>
              ) : stats.recentScrapes.map((s: any) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{s.targetName}</td>
                  <td className="px-4 py-3"><span className={`badge ${s.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span></td>
                  <td className="px-4 py-3">{s.subsidiesFound}件</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(s.createdAt).toLocaleString('ja-JP')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'consulting' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['名前', 'メール', '会社', '都道府県', 'ステータス', '操作'].map(h => <th key={h} className="px-4 py-3 text-left text-gray-600 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {consulting.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">相談なし</td></tr>
              ) : consulting.map(c => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email}</td>
                  <td className="px-4 py-3">{c.company || '－'}</td>
                  <td className="px-4 py-3">{c.prefecture || '－'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : c.status === 'contacted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1">
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

      {tab === 'scrape' && (
        <div className="card p-6">
          <h2 className="font-bold text-navy text-lg mb-3">手動スクレイピング</h2>
          <p className="text-gray-600 text-sm mb-4">54の自治体サイトから補助金情報を手動で取得します。完了まで数分かかります。</p>
          <button onClick={triggerScrape} className="btn-primary">スクレイピングを開始</button>
          {scrapeMsg && <p className="mt-3 text-green-600 font-medium">{scrapeMsg}</p>}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            <strong>自動スケジュール:</strong><br/>
            毎週月曜 AM2:00 JST — 自動スクレイピング<br/>
            毎週月曜 AM8:00 JST — 週次ダイジェストメール送信<br/>
            毎日 AM9:00 JST — 締切アラートメール送信
          </div>
        </div>
      )}
    </div>
  );
}
