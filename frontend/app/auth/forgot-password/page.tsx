'use client';
import { useState } from 'react';
import Link from 'next/link';
import { API } from '../../../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch(`${API}/api/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    }).catch(() => {});
    setSent(true);
    setLoading(false);
  };

  if (sent) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">📬</div>
      <h1 className="text-2xl font-bold text-navy mb-3">メールを送信しました</h1>
      <p className="text-gray-600">登録済みのメールアドレスの場合、パスワードリセットリンクを送信しました。</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-navy text-center mb-8">パスワードを忘れた方</h1>
      <div className="card p-8">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">登録済みメールアドレス</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '送信中...' : 'リセットメールを送る'}
          </button>
        </form>
        <p className="text-center text-sm mt-4"><Link href="/auth/login" className="text-navy hover:underline">← ログインに戻る</Link></p>
      </div>
    </div>
  );
}
