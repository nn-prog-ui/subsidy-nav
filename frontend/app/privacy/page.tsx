import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';
export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: '補助金ナビのプライバシーポリシー（個人情報の取り扱い）。',
  alternates: { canonical: `${BASE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-navy mb-6">プライバシーポリシー</h1>
      <p className="text-gray-500 text-sm mb-8">最終更新日: 2024年1月1日</p>
      <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold text-navy mb-2">取得する情報</h2>
          <p>当サービスは、アラート登録・相談フォーム・会員登録の際にメールアドレス等の情報を取得します。また、サービス改善のために閲覧・検索などの匿名の利用状況を記録します。</p>
        </section>
        <section>
          <h2 className="font-bold text-navy mb-2">利用目的</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>補助金アラート・締切リマインド等のメール送信</li>
            <li>お問い合わせ・相談への対応</li>
            <li>サービスの品質向上・統計分析</li>
          </ul>
        </section>
        <section>
          <h2 className="font-bold text-navy mb-2">第三者提供</h2>
          <p>法令に基づく場合を除き、取得した個人情報を本人の同意なく第三者に提供することはありません。</p>
        </section>
        <section>
          <h2 className="font-bold text-navy mb-2">メール配信の停止</h2>
          <p>アラートメール内のリンク、またはマイページからいつでも配信を停止できます。</p>
        </section>
        <section>
          <h2 className="font-bold text-navy mb-2">お問い合わせ</h2>
          <p>個人情報の開示・訂正・削除等のご請求は、相談フォームよりご連絡ください。</p>
        </section>
      </div>
    </div>
  );
}
