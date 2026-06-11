'use client';
import { useEffect, useState } from 'react';
import { API, authHeaders, getToken } from '../../../lib/auth';
import { toast } from '../../Toaster';

export default function FavoriteButton({ subsidyId }: { subsidyId: string }) {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = getToken();
    setHasToken(!!token);
    if (!token) return;
    fetch(`${API}/api/favorites/check/${subsidyId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => setIsFav(j.isFavorite))
      .catch(() => {});
  }, [subsidyId]);

  const toggle = async () => {
    if (!hasToken) {
      toast('お気に入り登録にはログインが必要です', 'info');
      setTimeout(() => { window.location.href = '/auth/login'; }, 800);
      return;
    }
    setLoading(true);
    try {
      if (isFav) {
        const res = await fetch(`${API}/api/favorites/${subsidyId}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) throw new Error();
        setIsFav(false);
        toast('お気に入りから削除しました', 'success');
      } else {
        const res = await fetch(`${API}/api/favorites`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify({ subsidyId }),
        });
        if (!res.ok) throw new Error();
        setIsFav(true);
        toast('お気に入りに追加しました', 'success');
      }
    } catch {
      toast('操作に失敗しました。時間をおいて再試行してください', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={toggle} disabled={loading}
      aria-pressed={isFav}
      aria-label={isFav ? 'お気に入りから削除' : 'お気に入りに追加'}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all disabled:opacity-60 ${isFav ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-yellow-600'}`}>
      <span className="text-lg" aria-hidden="true">{isFav ? '★' : '☆'}</span>
      {isFav ? 'お気に入り済み' : 'お気に入りに追加'}
    </button>
  );
}
