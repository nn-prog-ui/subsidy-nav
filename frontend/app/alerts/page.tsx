'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const CATEGORIES = ['IT・デジタル','設備投資','創業支援','雇用促進','環境・エネルギー','販路拡大','農業・林業','事業再構築','経営支援'];

export default function AlertsPage() {
  const [email, setEmail] = useState('');
  const [prefectures, setPrefectures] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [keywords, setKeywords] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = <T extends string>(arr: T[], val: T, setter: (v: T[]) => void) =>
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, prefectures, categories, keywords: keywords.split(/[\s,]+/).filter(Boolean) }),
      });
      if (!res.ok) throw new Error('登録に失敗しました');
      setSubmitted(true);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  if (submitted) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-6">📬</div>
      <h1 className="text-2xl font-bold text-navy mb-3">確認メールを送信しました</h1>
      <p className="text-gray-600">{email} に確認メールを送信しました。メール内のリンクをクリックしてアラートを有効化してください。</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">補助金アラート登録</h1>
        <p className="text-gray-500 mt-2">新着補助金・締切アラートをメールでお届けします。メール認証後に有効化されます。</p>
      </div>

      <div className="card p-8">
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="label" htmlFor="alert-email">メールアドレス <span className="text-red-500">*</span></label>
            <input id="alert-email" type="email" className="input" placeholder="your@email.com" aria-label="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="label">通知する都道府県（複数選択可）</label>
            <div className="flex flex-wrap gap-2 mt-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {PREFECTURES.map(p => (
                <button key={p} type="button" onClick={() => toggle(prefectures, p, setPrefectures)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${prefectures.includes(p) ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-300 hover:border-navy'}`}>
                  {p}
                </button>
              ))}
            </div>
            {prefectures.length === 0 && <p className="text-xs text-gray-400 mt-1">未選択の場合は全国の補助金を通知</p>}
          </div>

          <div>
            <label className="label">カテゴリ（複数選択可）</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => toggle(categories, c, setCategories)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categories.includes(c) ? 'bg-accent text-white border-accent' : 'bg-white text-gray-600 border-gray-300 hover:border-accent'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="alert-keywords">キーワード（スペース区切り）</label>
            <input id="alert-keywords" className="input" placeholder="例：IT導入 省エネ 創業" aria-label="通知キーワード" value={keywords} onChange={e => setKeywords(e.target.value)} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full text-center">
            {loading ? '送信中...' : 'アラートを登録する（確認メール送信）'}
          </button>
        </form>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <strong>🔒 プライバシーについて</strong><br/>
        登録されたメールアドレスは補助金アラートの送信のみに使用します。第三者への提供は行いません。
      </div>
    </div>
  );
}
