'use client';
import { useEffect, useState } from 'react';
import { API, authHeaders, getToken } from '../../../lib/auth';
import { toast } from '../../Toaster';

const STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'considering', label: '検討中', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'preparing', label: '書類準備中', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'applied', label: '申請済み', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'approved', label: '採択', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'rejected', label: '不採択', color: 'bg-red-100 text-red-700 border-red-300' },
];

export default function ProgressTracker({ subsidyId }: { subsidyId: string }) {
  const [hasToken, setHasToken] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [memoSaved, setMemoSaved] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    setHasToken(!!token);
    if (!token) return;
    fetch(`${API}/api/progress/${subsidyId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => { setCurrent(j.data?.status || null); setMemo(j.data?.memo || ''); setMemoSaved(j.data?.memo || ''); })
      .catch(() => {});
  }, [subsidyId]);

  const setStatus = async (status: string) => {
    if (!hasToken) { toast('進捗管理にはログインが必要です', 'info'); setTimeout(() => { window.location.href = '/auth/login'; }, 800); return; }
    setLoading(true);
    try {
      // 同じステータスを再選択したら解除
      if (current === status) {
        await fetch(`${API}/api/progress/${subsidyId}`, { method: 'DELETE', headers: authHeaders() });
        setCurrent(null); setMemo(''); setMemoSaved('');
        toast('進捗をリセットしました', 'success');
      } else {
        const res = await fetch(`${API}/api/progress/${subsidyId}`, {
          method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
        setCurrent(status);
        toast('進捗を更新しました', 'success');
      }
    } catch {
      toast('更新に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveMemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/progress/${subsidyId}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ status: current || 'considering', memo: memo.trim() }),
      });
      if (!res.ok) throw new Error();
      if (!current) setCurrent('considering');
      setMemoSaved(memo.trim());
      toast('メモを保存しました', 'success');
    } catch {
      toast('メモの保存に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <h2 className="text-lg font-bold text-navy mb-1">申請進捗を管理</h2>
      <p className="text-sm text-gray-500 mb-3">この補助金の申請ステータスを記録できます（マイページで一覧表示）。</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="申請ステータス">
        {STATUSES.map(s => (
          <button
            key={s.value}
            disabled={loading}
            onClick={() => setStatus(s.value)}
            aria-pressed={current === s.value}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all disabled:opacity-60 ${current === s.value ? s.color : 'bg-white border-gray-200 text-gray-500 hover:border-navy'}`}
          >
            {current === s.value && '✓ '}{s.label}
          </button>
        ))}
      </div>

      {hasToken && (
        <div className="mt-4">
          <label className="label">メモ（申請の進捗・締切の備忘など）</label>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="例：4月末までに見積書を取得。商工会に相談予約済み。"
            className="input"
          />
          {memo.trim() !== memoSaved && (
            <button onClick={saveMemo} disabled={loading} className="mt-2 text-sm bg-navy text-white px-4 py-1.5 rounded-lg hover:bg-navy-light disabled:opacity-60">
              メモを保存
            </button>
          )}
        </div>
      )}
    </div>
  );
}
