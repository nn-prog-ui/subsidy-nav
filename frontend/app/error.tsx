'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-6">⚠️</div>
      <h2 className="text-2xl font-bold text-navy mb-3">エラーが発生しました</h2>
      <p className="text-gray-500 mb-6 text-sm">{error.message || '予期しないエラーが発生しました'}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={reset} className="btn-primary">再試行</button>
        <Link href="/" className="btn-outline">トップに戻る</Link>
      </div>
    </div>
  );
}
