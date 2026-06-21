'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API, authHeaders, getToken } from '../../lib/auth';

interface Rec {
  id: string;
  title: string;
  category: string;
  prefecture: string;
  level: string;
  maxAmount: number | null;
  targetType: string;
  reason: string;
}

const LEVEL_COLORS: Record<string, string> = {
  '国': 'bg-red-100 text-red-700',
  '都道府県': 'bg-blue-100 text-blue-700',
  '市区町村': 'bg-green-100 text-green-700',
};

export default function ConciergePage() {
  const [hasToken, setHasToken] = useState(false);
  const [situation, setSituation] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Rec[] | null>(null);

  useEffect(() => { setHasToken(!!getToken()); }, []);

  const submit = async () => {
    if (situation.trim().length < 5) { setError('事業内容・ご希望を5文字以上で入力してください'); return; }
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch(`${API}/api/subsidies/ai-recommend`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ situation: situation.trim(), prefecture: prefecture.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'AI提案に失敗しました'); return; }
      setResults(json.data || []);
    } catch {
      setError('通信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-bold text-navy">🤖 AI補助金コンシェルジュ</h1>
        <span className="badge bg-navy text-white text-xs">会員限定</span>
      </div>
      <p className="text-gray-600 text-sm mb-6">事業の状況とやりたいことを文章で入力すると、AIがあなたに合う補助金を理由つきで提案します。</p>

      {!hasToken ? (
        <div className="card p-6 text-center">
          <p className="text-gray-600 mb-4">この機能のご利用には会員ログインが必要です。</p>
          <Link href="/auth/login" className="btn-primary inline-block">ログイン / 新規登録</Link>
        </div>
      ) : (
        <div className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="pref">地域（任意）</label>
            <input id="pref" className="input" value={prefecture} onChange={e => setPrefecture(e.target.value)} placeholder="例：東京都" />
          </div>
          <div>
            <label className="label" htmlFor="situation">事業内容・やりたいこと</label>
            <textarea id="situation" className="input" rows={4} maxLength={2000} value={situation} onChange={e => setSituation(e.target.value)}
              placeholder="例：従業員5名のカフェを経営しています。ECサイトを構築してテイクアウト・通販の販路を広げたいと考えています。" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={submit} disabled={loading || situation.trim().length < 5} className="btn-primary disabled:opacity-50">
            {loading ? 'AIが探しています…（30秒程度）' : '✨ AIに提案してもらう'}
          </button>
        </div>
      )}

      {results && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-navy mb-3">提案された補助金（{results.length}件）</h2>
          {results.length === 0 ? (
            <p className="text-gray-500 text-sm">条件に合う補助金が見つかりませんでした。表現を変えるか、<Link href="/subsidies" className="text-navy underline">補助金一覧</Link>からお探しください。</p>
          ) : (
            <div className="space-y-4">
              {results.map(r => (
                <div key={r.id} className="card p-5">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className={`badge text-xs ${LEVEL_COLORS[r.level] || 'bg-gray-100 text-gray-700'}`}>{r.level}</span>
                    <span className="badge text-xs bg-orange-100 text-orange-700">{r.category}</span>
                    <span className="badge text-xs bg-gray-100 text-gray-600">{r.prefecture}</span>
                  </div>
                  <Link href={`/subsidies/${r.id}`} className="font-bold text-navy hover:underline">{r.title}</Link>
                  <div className="text-xs text-gray-500 mt-1">
                    対象: {r.targetType}{r.maxAmount ? ` ・上限 ¥${r.maxAmount.toLocaleString()}` : ''}
                  </div>
                  <div className="mt-2 p-3 bg-navy/5 rounded-lg text-sm text-gray-700">
                    <span className="font-bold text-navy">なぜ合うか: </span>{r.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-4">※ AIによる提案です。申請可否・要件は各制度の公式情報を必ずご確認ください。</p>
        </div>
      )}
    </div>
  );
}
