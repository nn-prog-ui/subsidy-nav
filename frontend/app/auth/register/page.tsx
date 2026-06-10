'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API, setToken } from '../../../lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('パスワードが一致しません'); return; }
    if (form.password.length < 8) { setError('パスワードは8文字以上必要です'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '登録に失敗しました');
      setDone(true);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  if (done) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">📬</div>
      <h1 className="text-2xl font-bold text-navy mb-3">確認メールを送信しました</h1>
      <p className="text-gray-600">{form.email} に届いたリンクをクリックして登録を完了してください。</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-navy">無料会員登録</h1>
        <p className="text-gray-500 mt-2 text-sm">お気に入り保存・アラート管理ができます</p>
      </div>
      <div className="card p-8">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">お名前</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="山田 太郎" />
          </div>
          <div>
            <label className="label">メールアドレス <span className="text-red-500">*</span></label>
            <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="your@email.com" />
          </div>
          <div>
            <label className="label">パスワード（8文字以上）<span className="text-red-500">*</span></label>
            <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
          </div>
          <div>
            <label className="label">パスワード確認 <span className="text-red-500">*</span></label>
            <input type="password" className="input" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '送信中...' : '登録する（確認メール送信）'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          すでにアカウントをお持ちの方は <Link href="/auth/login" className="text-navy hover:underline">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
