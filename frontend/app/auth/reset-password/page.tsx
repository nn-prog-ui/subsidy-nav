'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { API } from '../../../lib/auth';

function ResetContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('パスワードが一致しません'); return; }
    setLoading(true);
    const res = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: form.password }),
    });
    if (res.ok) router.push('/auth/login?reset=1');
    else { const j = await res.json(); setError(j.error || '失敗しました'); }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-navy text-center mb-8">新しいパスワードを設定</h1>
      <div className="card p-8">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">新しいパスワード（8文字以上）</label>
            <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
          </div>
          <div>
            <label className="label">パスワード確認</label>
            <input type="password" className="input" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? '設定中...' : 'パスワードを変更する'}</button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="text-center py-20">読み込み中...</div>}><ResetContent /></Suspense>;
}
