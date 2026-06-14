'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API, AuthUser, fetchMe, authHeaders, clearToken } from '../../lib/auth';
import { toast } from '../Toaster';
import { toCsv, downloadCsv } from '../../lib/csv';

interface FavoriteItem {
  id: string; subsidyId: string; note: string | null; createdAt: string;
  subsidy: { id: string; title: string; prefecture: string; category: string; level: string; maxAmount: number | null; status: string; } | null;
}

interface Reco { id: string; title: string; prefecture: string; category: string; level: string; maxAmount: number | null; }

interface ProgressItem {
  id: string; subsidyId: string; status: string; updatedAt: string;
  subsidy: { id: string; title: string; prefecture: string; category: string; level: string } | null;
}

const PROGRESS_STATUS: Record<string, { label: string; color: string }> = {
  considering: { label: '検討中', color: 'bg-gray-100 text-gray-700' },
  preparing: { label: '書類準備中', color: 'bg-blue-100 text-blue-700' },
  applied: { label: '申請済み', color: 'bg-indigo-100 text-indigo-700' },
  approved: { label: '採択', color: 'bg-green-100 text-green-700' },
  rejected: { label: '不採択', color: 'bg-red-100 text-red-700' },
};

function FavoriteNoteEditor({ subsidyId, initialNote, onSave }: { subsidyId: string; initialNote: string | null; onSave: (id: string, note: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNote || '');
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return initialNote ? (
      <p className="text-xs text-gray-500 mt-2 italic">
        メモ: {initialNote}
        <button onClick={() => { setValue(initialNote); setEditing(true); }} className="ml-2 not-italic text-navy hover:underline">編集</button>
      </p>
    ) : (
      <button onClick={() => setEditing(true)} className="text-xs text-navy hover:underline mt-2">＋ メモを追加</button>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="申請メモ・締切のリマインドなど"
        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/40"
      />
      <div className="flex gap-2 mt-1">
        <button
          disabled={saving}
          onClick={async () => { setSaving(true); await onSave(subsidyId, value.trim()); setSaving(false); setEditing(false); }}
          className="text-xs bg-navy text-white px-3 py-1 rounded hover:bg-navy-light disabled:opacity-60">保存</button>
        <button onClick={() => { setEditing(false); setValue(initialNote || ''); }} className="text-xs text-gray-400 hover:text-gray-600 px-2">キャンセル</button>
      </div>
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = { '国': 'bg-red-100 text-red-700', '都道府県': 'bg-blue-100 text-blue-700', '市区町村': 'bg-green-100 text-green-700' };

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recos, setRecos] = useState<Reco[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRecos = () => {
    fetch(`${API}/api/favorites/recommendations`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => setRecos(j.data || []))
      .catch(() => setRecos([]));
  };

  useEffect(() => {
    fetchMe().then(u => {
      if (!u) { router.push('/auth/login'); return; }
      setUser(u);
      fetch(`${API}/api/favorites`, { headers: authHeaders() })
        .then(r => r.json())
        .then(j => setFavorites(j.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
      loadRecos();
      fetch(`${API}/api/progress`, { headers: authHeaders() })
        .then(r => r.json())
        .then(j => setProgress(j.data || []))
        .catch(() => {});
      fetch(`${API}/api/favorites/share`, { headers: authHeaders() })
        .then(r => r.json())
        .then(j => setShareToken(j.token || null))
        .catch(() => {});
    });
  }, [router]);

  const enableShare = async () => {
    const res = await fetch(`${API}/api/favorites/share`, { method: 'POST', headers: authHeaders() });
    const j = await res.json();
    setShareToken(j.token || null);
    toast('共有リンクを作成しました', 'success');
  };

  const disableShare = async () => {
    await fetch(`${API}/api/favorites/share`, { method: 'DELETE', headers: authHeaders() });
    setShareToken(null);
    toast('共有を停止しました', 'success');
  };

  const toggleNotify = async (value: boolean) => {
    const res = await fetch(`${API}/api/auth/me`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ notifyProgress: value }),
    });
    if (res.ok) {
      const j = await res.json();
      setUser(u => u ? { ...u, notifyProgress: j.data.notifyProgress } : u);
      toast(value ? 'リマインドをオンにしました' : 'リマインドをオフにしました', 'success');
    }
  };

  const shareUrl = shareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/collections/${shareToken}` : '';

  const exportFavoritesCsv = () => {
    const rows = favorites.filter(f => f.subsidy).map(f => [
      f.subsidy!.title, f.subsidy!.level, f.subsidy!.category, f.subsidy!.prefecture,
      f.subsidy!.maxAmount ?? '', f.note ?? '',
    ]);
    downloadCsv('favorites.csv', toCsv(['補助金名', '区分', 'カテゴリ', '地域', '上限額', 'メモ'], rows));
  };

  const exportProgressCsv = () => {
    const rows = progress.map(p => [
      p.subsidy?.title ?? '', PROGRESS_STATUS[p.status]?.label ?? p.status,
      new Date(p.updatedAt).toLocaleDateString('ja-JP'),
    ]);
    downloadCsv('progress.csv', toCsv(['補助金名', 'ステータス', '更新日'], rows));
  };

  const removeFavorite = async (subsidyId: string) => {
    await fetch(`${API}/api/favorites/${subsidyId}`, { method: 'DELETE', headers: authHeaders() });
    setFavorites(prev => prev.filter(f => f.subsidyId !== subsidyId));
    loadRecos();
  };

  const saveNote = async (subsidyId: string, note: string) => {
    const res = await fetch(`${API}/api/favorites`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ subsidyId, note }),
    });
    if (res.ok) {
      setFavorites(prev => prev.map(f => f.subsidyId === subsidyId ? { ...f, note: note || null } : f));
      toast('メモを保存しました', 'success');
    } else {
      toast('メモの保存に失敗しました', 'error');
    }
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-navy">{favorites.length}</div>
          <div className="text-xs text-gray-500 mt-1">お気に入り</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-navy">{progress.length}</div>
          <div className="text-xs text-gray-500 mt-1">申請進捗</div>
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

      {/* 申請進捗 */}
      {progress.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-navy">申請進捗</h2>
            <button onClick={exportProgressCsv} className="text-sm text-navy hover:underline">📥 CSVエクスポート</button>
          </div>
          <div className="space-y-2">
            {progress.map(p => (
              <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {p.subsidy ? (
                    <Link href={`/subsidies/${p.subsidyId}`} className="font-medium text-navy hover:underline line-clamp-1">{p.subsidy.title}</Link>
                  ) : <span className="text-gray-400 text-sm">補助金情報なし</span>}
                  <div className="text-xs text-gray-400 mt-0.5">更新: {new Date(p.updatedAt).toLocaleDateString('ja-JP')}</div>
                </div>
                <span className={`badge text-xs flex-shrink-0 ${PROGRESS_STATUS[p.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                  {PROGRESS_STATUS[p.status]?.label || p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorites */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-navy">お気に入り補助金</h2>
        {favorites.length > 0 && (
          <button onClick={exportFavoritesCsv} className="text-sm text-navy hover:underline">📥 CSVエクスポート</button>
        )}
      </div>
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
                    <FavoriteNoteEditor subsidyId={f.subsidyId} initialNote={f.note} onSave={saveNote} />
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

      {/* 通知設定 */}
      <div className="mt-8 card p-5">
        <h2 className="text-lg font-bold text-navy mb-1">通知設定</h2>
        <label className="flex items-center justify-between gap-3 mt-2">
          <span className="text-sm text-gray-700">申請準備中の補助金の締切リマインドをメールで受け取る</span>
          <input
            type="checkbox"
            checked={user?.notifyProgress !== false}
            onChange={e => toggleNotify(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 accent-navy"
          />
        </label>
      </div>

      {/* 共有コレクション */}
      <div className="mt-8 card p-5">
        <h2 className="text-lg font-bold text-navy mb-1">お気に入りを共有</h2>
        <p className="text-sm text-gray-500 mb-3">公開リンクを発行すると、ログイン不要でお気に入り一覧を共有できます。</p>
        {shareToken ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="input text-sm flex-1" onFocus={e => e.currentTarget.select()} />
              <button onClick={() => { navigator.clipboard?.writeText(shareUrl); toast('リンクをコピーしました', 'success'); }}
                className="text-sm bg-navy text-white px-4 rounded-lg hover:bg-navy-light whitespace-nowrap">コピー</button>
            </div>
            <div className="flex gap-3 text-sm">
              <a href={shareUrl} target="_blank" rel="noreferrer" className="text-navy hover:underline">プレビュー →</a>
              <button onClick={disableShare} className="text-gray-400 hover:text-red-500">共有を停止</button>
            </div>
          </div>
        ) : (
          <button onClick={enableShare} className="btn-primary text-sm">🔗 共有リンクを作成</button>
        )}
      </div>

      {/* Favorites-based recommendations */}
      {recos.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-navy mb-1">お気に入りに基づくおすすめ</h2>
          <p className="text-sm text-gray-500 mb-4">よく見ているカテゴリ・地域から関連する補助金を提案します</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recos.map(s => (
              <Link key={s.id} href={`/subsidies/${s.id}`} className="card p-4 group block">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className={`badge text-xs ${LEVEL_COLORS[s.level] || 'bg-gray-100 text-gray-700'}`}>{s.level}</span>
                  <span className="badge text-xs bg-orange-100 text-orange-700">{s.category}</span>
                </div>
                <h3 className="font-bold text-navy text-sm group-hover:text-navy-light leading-tight mb-1 line-clamp-2">{s.title}</h3>
                {s.maxAmount ? (
                  <p className="text-xs text-gray-500">上限 <span className="font-semibold text-navy">¥{Number(s.maxAmount).toLocaleString()}</span></p>
                ) : <p className="text-xs text-gray-400">上限なし</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
