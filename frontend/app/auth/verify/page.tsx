'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API, setToken } from '../../../lib/auth';

function VerifyContent() {
  const sp = useSearchParams();
  const token = sp.get('token');
  const [status, setStatus] = useState<'loading'|'ok'|'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    fetch(`${API}/api/auth/verify/${token}`)
      .then(async r => {
        const json = await r.json();
        if (r.ok && json.token) { setToken(json.token); setStatus('ok'); }
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      {status === 'ok' ? (
        <>
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-navy mb-3">メール認証が完了しました</h1>
          <p className="text-gray-600 mb-6">補助金ナビへようこそ！マイページで補助金をお気に入り登録できます。</p>
          <Link href="/mypage" className="btn-primary inline-block">マイページへ →</Link>
        </>
      ) : (
        <>
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-3">認証に失敗しました</h1>
          <Link href="/auth/register" className="btn-primary inline-block">再登録する</Link>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<div className="text-center py-20">確認中...</div>}><VerifyContent /></Suspense>;
}
