'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function UnsubscribeContent() {
  const token = useSearchParams().get('token');
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); return; }
    fetch(`${API}/api/alerts/unsubscribe/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(j => { setEmail(j.email || ''); setState('done'); })
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      {state === 'loading' && <p className="text-gray-400">処理中...</p>}
      {state === 'done' && (
        <>
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-navy mb-2">配信を停止しました</h1>
          <p className="text-gray-500 mb-6">{email && `${email} 宛の`}メール配信を停止しました。再度受け取りたい場合はアラートを登録し直してください。</p>
          <Link href="/" className="btn-primary inline-block">トップへ戻る</Link>
        </>
      )}
      {state === 'error' && (
        <>
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-navy mb-2">処理できませんでした</h1>
          <p className="text-gray-500 mb-6">リンクが無効か、既に停止済みの可能性があります。</p>
          <Link href="/" className="btn-outline inline-block">トップへ戻る</Link>
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="text-center py-24 text-gray-400">読み込み中...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
