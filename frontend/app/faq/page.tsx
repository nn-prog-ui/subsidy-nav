import Link from 'next/link';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';
export const metadata: Metadata = {
  title: 'よくある質問（FAQ）',
  description: '補助金ナビの使い方・料金・アラート・データ更新などのよくある質問。',
  alternates: { canonical: `${BASE_URL}/faq` },
};

const FAQS = [
  { q: '利用は無料ですか？', a: 'はい、補助金の検索・診断・アラート登録・お気に入り管理など、主要な機能はすべて無料でご利用いただけます。' },
  { q: '情報はどのくらいの頻度で更新されますか？', a: '自動収集を毎週実施し、新着・締切情報を反映しています。ただし最新の公募状況は各制度の公式サイトでご確認ください。' },
  { q: 'アラートメールを止めたいです。', a: 'アラートメール内の「配信停止」リンク、またはマイページの通知設定からいつでも停止できます。' },
  { q: '会員登録は必要ですか？', a: '検索・診断は登録不要です。お気に入り・申請進捗管理・共有機能を使う場合のみ無料の会員登録が必要です。' },
  { q: '補助金の採択は保証されますか？', a: 'いいえ。当サービスは情報提供を目的としており、採択を保証するものではありません。申請は各制度の要領に従ってください。' },
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-2xl font-bold text-navy mb-6">よくある質問</h1>
      <div className="space-y-4">
        {FAQS.map(f => (
          <details key={f.q} className="card p-4 group">
            <summary className="font-bold text-navy cursor-pointer list-none flex justify-between items-center">
              {f.q}<span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <p className="text-gray-700 text-sm mt-3 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/consulting" className="btn-outline inline-block text-sm">解決しない場合は無料相談へ</Link>
      </div>
    </div>
  );
}
