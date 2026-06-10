'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getToken, clearToken, fetchMe } from '../lib/auth';

export default function NavAuthLinks() {
  const [name, setName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!getToken()) { setLoaded(true); return; }
    fetchMe().then(u => { setName(u?.name || u?.email || null); setLoaded(true); });
  }, []);

  if (!loaded) return null;

  if (name) return (
    <div className="flex items-center gap-4">
      <Link href="/mypage" className="hover:text-orange-300 transition-colors">マイページ</Link>
      <button onClick={() => { clearToken(); location.href = '/'; }}
        className="text-sm text-gray-400 hover:text-white transition-colors">ログアウト</button>
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      <Link href="/auth/login" className="hover:text-orange-300 transition-colors text-sm">ログイン</Link>
      <Link href="/auth/register" className="bg-accent text-white px-3 py-1.5 rounded-full hover:bg-orange-600 transition-colors text-sm">新規登録</Link>
    </div>
  );
}
