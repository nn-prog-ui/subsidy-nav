'use client';
import { useEffect, useState } from 'react';
import { API, authHeaders, getToken } from '../../../lib/auth';

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
    if (!hasToken) { window.location.href = '/auth/login'; return; }
    setLoading(true);
    if (isFav) {
      await fetch(`${API}/api/favorites/${subsidyId}`, { method: 'DELETE', headers: authHeaders() });
      setIsFav(false);
    } else {
      await fetch(`${API}/api/favorites`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ subsidyId }),
      });
      setIsFav(true);
    }
    setLoading(false);
  };

  return (
    <button onClick={toggle} disabled={loading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${isFav ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-yellow-600'}`}>
      <span className="text-lg">{isFav ? '★' : '☆'}</span>
      {isFav ? 'お気に入り済み' : 'お気に入りに追加'}
    </button>
  );
}
