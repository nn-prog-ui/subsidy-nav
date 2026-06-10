'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API, AuthUser, fetchMe, authHeaders, clearToken } from '../../lib/auth';

interface FavoriteItem {
  id: string; subsidyId: string; note: string | null; createdAt: string;
  subsidy: { id: string; title: string; prefecture: string; category: string; level: string; maxAmount: number | null; status: string; } | null;
}

const LEVEL_COLORS: Record<string, string> = { '国': 'bg-red-100 text-red-700', '都道府県': 'bg-blue-100 text-blue-700', '市区町村': 'bg-green-100 text-green-700' };

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then(u => {
      if (!u) { router.push('/auth/login'); return; }
      setUser(u);
      fetch(`${API}/api/favorites`, { headers: authHeaders() })
        .then(r => r.json())
        .then(j => setFavorites(j.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [router]);

  const removeFavorite = async (subsidyId: string) => {
    await fetch(`${API}/api/favorites/${subsidyId}`, { method: 'DELETE', headers: authHeaders() });
    setFavorites(prev => prev.filter(f => f.subsidyId !== subsidyId));
  };

  const logout = () => { clearToken(); router.push('/'); };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">マイページ</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
        </div>
        <div className="flex gap-3">
          {!user?.emailVerified && (
            <span className="badge bg-yellow-100 text-yellow-700 text-xs px-3 py-1.5">メール未認証</span>
          )}
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500">ログアウト</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-navy">{favorites.length}</div>
          <div className="text-xs text-gray-500 mt-1">お気に入り</div>
        </div>
        <div className="card p-4 text-center">
          <Link href="/alerts" className="block hover:opacity-80">
            <div className="text-2xl font-bold text-navy">→</div>
            <div className="text-xs text-gray-500 mt-1">アラート設定</div>
          </Link>
        </div>
        <div className="card p-4 text-center">
          <Link href="/matching" className="block hover:opacity-80">
            <div className="text-2xl font-bold text-navy">🎯</div>
            <div className="text-xs text-gray-500 mt-1">診断する</div>
          </Link>
        </div>
      </div>

      {/* Favorites */}
      <h2 className="text-xl font-bold text-navy mb-4">お気に入り補助金</h2>
      {favorites.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🔖</div>
          <p className="mb-4">まだお気に入りがありません</p>
          <Link href="/subsidies" className="btn-primary inline-block text-sm">補助金を探す</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map(f => (
            <div key={f.id} className="card p-4">
              {f.subsidy ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      <span className={`badge text-xs ${LEVEL_COLORS[f.subsidy.level] || 'bg-gray-100'}`}>{f.subsidy.level}</span>
                      <span className="badge text-xs bg-orange-100 text-orange-700">{f.subsidy.category}</span>
                      <span className="badge text-xs bg-gray-100 text-gray-600">{f.subsidy.prefecture}</span>
                    </div>
                    <Link href={`/subsidies/${f.subsidyId}`} className="font-bold text-navy hover:underline">
                      {f.subsidy.title}
                    </Link>
                    {f.subsidy.maxAmount && (
                      <p className="text-sm text-gray-500 mt-1">上限 ¥{Number(f.subsidy.maxAmount).toLocaleString()}</p>
                    )}
                    {f.note && <p className="text-xs text-gray-400 mt-1 italic">メモ: {f.note}</p>}
                  </div>
                  <button onClick={() => removeFavorite(f.subsidyId)} className="text-gray-300 hover:text-red-400 text-lg flex-shrink-0" title="お気に入りを解除">★</button>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">補助金情報を取得できませんでした</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
