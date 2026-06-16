import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';
export const metadata: Metadata = {
  title: '利用規約',
  description: '補助金ナビの利用規約。',
  alternates: { canonical: `${BASE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 prose-sm">
      <h1 className="text-2xl font-bold text-navy mb-6">利用規約</h1>
      <p className="text-gray-500 text-sm mb-8">最終更新日: 2024年1月1日</p>
      <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold text-navy mb-2">第1条（適用）</h2>
          <p>本規約は、補助金ナビ（以下「当サービス」）の提供条件および当サービスと利用者の間の権利義務関係を定めるものです。利用者は本規約に同意のうえ当サービスを利用するものとします。</p>
        </section>
        <section>
          <h2 className="font-bold text-navy mb-2">第2条（情報の正確性）</h2>
          <p>当サービスは補助金・助成金に関する情報を可能な限り正確に提供するよう努めますが、その完全性・正確性・最新性を保証するものではありません。実際の申請にあたっては、必ず各制度の公式情報（公募要領・公式サイト）をご確認ください。</p>
        </section>
        <section>
          <h2 className="font-bold text-navy mb-2">第3条（禁止事項）</h2>
          <p>利用者は、法令違反、当サービスの運営妨害、他の利用者または第三者への迷惑行為、不正アクセス、過度な自動アクセス等を行ってはなりません。</p>
        </section>
        <section>
          <h2 className="font-bold text-navy mb-2">第4条（免責）</h2>
          <p>当サービスの情報に基づいて利用者が行った判断・行動によって生じた損害について、当サービスは一切の責任を負いません。補助金の採択・不採択を保証するものではありません。</p>
        </section>
        <section>
          <h2 className="font-bold text-navy mb-2">第5条（規約の変更）</h2>
          <p>当サービスは必要に応じて本規約を変更できるものとします。変更後の規約は当ページに掲示した時点で効力を生じます。</p>
        </section>
      </div>
    </div>
  );
}
