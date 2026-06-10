'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API, setToken } from '../../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ログインに失敗しました');
      setToken(json.token);
      router.push('/mypage');
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-navy">ログイン</h1>
      </div>
      <div className="card p-8">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">メールアドレス</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="your@email.com" />
          </div>
          <div>
            <label className="label">パスワード</label>
            <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        <div className="flex justify-between text-sm text-gray-500 mt-4">
          <Link href="/auth/forgot-password" className="hover:text-navy hover:underline">パスワードを忘れた方</Link>
          <Link href="/auth/register" className="hover:text-navy hover:underline">新規登録</Link>
        </div>
      </div>
    </div>
  );
}
