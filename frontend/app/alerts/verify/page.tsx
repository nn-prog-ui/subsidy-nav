'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AlertVerifyPage() {
  const sp = useSearchParams();
  const token = sp.get('token');
  const [status, setStatus] = useState<'loading'|'ok'|'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    fetch(`${API}/api/alerts/verify/${token}`)
      .then(r => r.ok ? setStatus('ok') : setStatus('error'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') return <div className="text-center py-20">確認中...</div>;

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      {status === 'ok' ? (
        <>
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-navy mb-3">アラートが有効化されました</h1>
          <p className="text-gray-600 mb-6">新着補助金情報をメールでお届けします。</p>
          <Link href="/subsidies" className="btn-primary inline-block">補助金を探す</Link>
        </>
      ) : (
        <>
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-3">認証に失敗しました</h1>
          <p className="text-gray-600 mb-6">リンクが無効か期限切れです。再度アラートを登録してください。</p>
          <Link href="/alerts" className="btn-primary inline-block">再登録する</Link>
        </>
      )}
    </div>
  );
}
