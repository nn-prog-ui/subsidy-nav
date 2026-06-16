import Link from 'next/link';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';
export const metadata: Metadata = {
  title: 'このサイトについて',
  description: '補助金ナビは、国・都道府県・市区町村の補助金・助成金情報を一元的に検索・管理できるサービスです。',
  alternates: { canonical: `${BASE_URL}/about` },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-navy mb-6">このサイトについて</h1>
      <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <p>補助金ナビは、日本全国の国・都道府県・市区町村の補助金・助成金情報を一元的に検索・比較・管理できるサービスです。中小企業・個人事業主の皆さまが、自社に合った支援制度を効率よく見つけられることを目指しています。</p>
        <section>
          <h2 className="font-bold text-navy mb-2">主な機能</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>キーワード・地域・カテゴリ・金額・難易度による絞り込み検索</li>
            <li>3問で最適な制度を提案するマッチング診断</li>
            <li>お気に入り登録・申請進捗管理・締切リマインド</li>
            <li>新着・締切アラートのメール通知</li>
          </ul>
        </section>
        <section>
          <h2 className="font-bold text-navy mb-2">情報源について</h2>
          <p>当サービスの情報は各自治体・省庁の公開情報をもとに整備していますが、最新の公募状況は必ず公式サイトでご確認ください。誤りを見つけた場合は、各補助金ページの「情報の誤りを報告」からお知らせいただけます。</p>
        </section>
        <div className="flex gap-3 pt-2">
          <Link href="/subsidies" className="btn-primary text-sm">補助金を探す</Link>
          <Link href="/consulting" className="btn-outline text-sm">無料相談</Link>
        </div>
      </div>
    </div>
  );
}
