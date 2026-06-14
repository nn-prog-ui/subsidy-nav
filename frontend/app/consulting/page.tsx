'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const INDUSTRIES = ['IT・ソフトウェア','製造業','飲食業','小売業','農業・林業・漁業','建設業','医療・福祉','観光・宿泊','その他サービス業'];

export default function ConsultingPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', prefecture: '', industry: '', employees: '', budget: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/consulting`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('送信に失敗しました');
      setSubmitted(true);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  if (submitted) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-2xl font-bold text-navy mb-3">ご相談を受け付けました</h1>
      <p className="text-gray-600">2営業日以内に担当者よりご連絡いたします。</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">無料コンサルティング相談</h1>
        <p className="text-gray-500 mt-2">補助金申請の専門家が、最適な補助金の選定から申請書作成まで無料でサポートします。</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          { icon: '🎯', title: '最適補助金の選定', desc: '事業内容に合った補助金を専門家が選定' },
          { icon: '📝', title: '申請書作成支援', desc: '採択率を高める申請書の書き方をアドバイス' },
          { icon: '🔄', title: 'アフターフォロー', desc: '採択後の実績報告書まで一貫サポート' },
        ].map(s => (
          <div key={s.title} className="card p-4 text-center">
            <div className="text-3xl mb-2">{s.icon}</div>
            <h3 className="font-bold text-navy text-sm mb-1">{s.title}</h3>
            <p className="text-gray-500 text-xs">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="card p-8">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="c-name">お名前 <span className="text-red-500">*</span></label>
              <input id="c-name" className="input" aria-label="お名前" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="山田 太郎" />
            </div>
            <div>
              <label className="label" htmlFor="c-email">メールアドレス <span className="text-red-500">*</span></label>
              <input id="c-email" type="email" className="input" aria-label="メールアドレス" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="your@email.com" />
            </div>
            <div>
              <label className="label" htmlFor="c-company">会社名・屋号</label>
              <input id="c-company" className="input" aria-label="会社名・屋号" value={form.company} onChange={e => set('company', e.target.value)} placeholder="株式会社○○" />
            </div>
            <div>
              <label className="label" htmlFor="c-phone">電話番号</label>
              <input id="c-phone" type="tel" className="input" aria-label="電話番号" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="03-xxxx-xxxx" />
            </div>
            <div>
              <label className="label" htmlFor="c-prefecture">都道府県</label>
              <select id="c-prefecture" className="input" aria-label="都道府県" value={form.prefecture} onChange={e => set('prefecture', e.target.value)}>
                <option value="">選択してください</option>
                {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="c-industry">業種</label>
              <select id="c-industry" className="input" aria-label="業種" value={form.industry} onChange={e => set('industry', e.target.value)}>
                <option value="">選択してください</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="c-employees">従業員数</label>
              <select id="c-employees" className="input" aria-label="従業員数" value={form.employees} onChange={e => set('employees', e.target.value)}>
                <option value="">選択してください</option>
                {['1〜5名','6〜20名','21〜50名','51〜100名','101〜300名','301名以上'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="c-budget">希望する補助金の予算規模</label>
              <select id="c-budget" className="input" aria-label="希望する補助金の予算規模" value={form.budget} onChange={e => set('budget', e.target.value)}>
                <option value="">選択してください</option>
                {['100万円未満','100〜500万円','500〜1000万円','1000万円以上','未定'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="c-message">ご相談内容 <span className="text-red-500">*</span></label>
            <textarea id="c-message" className="input h-32 resize-none" aria-label="ご相談内容" value={form.message} onChange={e => set('message', e.target.value)} required
              placeholder="事業内容、課題、取り組みたいこと等をご記入ください" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '送信中...' : '無料相談を申し込む'}
          </button>
        </form>
      </div>
    </div>
  );
}
