import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import NavAuthLinks from './NavAuthLinks';
import AnnouncementBanner from './AnnouncementBanner';
import ServiceWorkerRegister from './ServiceWorkerRegister';
import { Toaster } from './Toaster';
import MobileMenu from './MobileMenu';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: '補助金ナビ | 日本全国の補助金・助成金情報',
    template: '%s | 補助金ナビ',
  },
  description: '国・都道府県・市区町村の補助金・助成金を一元検索。IT導入・設備投資・創業支援・雇用促進など全カテゴリ対応。あなたの事業に最適な支援制度を見つけよう。',
  keywords: ['補助金', '助成金', '中小企業', 'IT導入補助金', 'ものづくり補助金', '創業支援', '雇用助成金', '日本', '検索'],
  authors: [{ name: '補助金ナビ' }],
  creator: '補助金ナビ',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: BASE_URL,
    siteName: '補助金ナビ',
    title: '補助金ナビ | 日本全国の補助金・助成金情報',
    description: '国・都道府県・市区町村の補助金・助成金を一元検索。あなたの事業に最適な支援制度を見つけよう。',
  },
  twitter: {
    card: 'summary_large_image',
    title: '補助金ナビ | 日本全国の補助金・助成金情報',
    description: '国・都道府県・市区町村の補助金・助成金を一元検索。',
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: BASE_URL,
    types: { 'application/rss+xml': `${API_URL}/api/subsidies/feed` },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '補助金ナビ',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: '補助金ナビ',
              url: BASE_URL,
              description: '国・都道府県・市区町村の補助金・助成金を一元検索。',
              inLanguage: 'ja',
              potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/subsidies?keyword={search_term_string}` },
                'query-input': 'required name=search_term_string',
              },
              publisher: {
                '@type': 'Organization',
                name: '補助金ナビ',
                url: BASE_URL,
                logo: `${BASE_URL}/icon.svg`,
              },
            }),
          }}
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        <Toaster />
        <a href="#main-content" className="skip-link">本文へスキップ</a>
        <AnnouncementBanner />
        <header className="bg-navy text-white sticky top-0 z-50 shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-2xl">🏛</span>
              <span>補助金ナビ</span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/subsidies" className="hover:text-orange-300 transition-colors">補助金を探す</Link>
              <Link href="/categories" className="hover:text-orange-300 transition-colors">カテゴリ</Link>
              <Link href="/matching" className="hover:text-orange-300 transition-colors">マッチング診断</Link>
              <Link href="/calendar" className="hover:text-orange-300 transition-colors">カレンダー</Link>
              <Link href="/compare" className="hover:text-orange-300 transition-colors">比較</Link>
              <Link href="/alerts" className="hover:text-orange-300 transition-colors">アラート登録</Link>
              <Link href="/templates" className="hover:text-orange-300 transition-colors">テンプレート</Link>
              <Link href="/consulting" className="bg-accent text-white px-4 py-1.5 rounded-full hover:bg-orange-600 transition-colors">無料相談</Link>
              <NavAuthLinks />
            </div>
            <MobileMenu />
          </nav>
        </header>
        <main id="main-content" className="min-h-screen">{children}</main>
        <footer className="bg-navy text-white mt-16 py-12">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">補助金ナビ</h3>
              <p className="text-gray-400 text-sm">日本全国の補助金・助成金情報を一元提供するサービスです。</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-300">サービス</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/subsidies" className="hover:text-white">補助金検索</Link></li>
                <li><Link href="/categories" className="hover:text-white">カテゴリから探す</Link></li>
                <li><Link href="/matching" className="hover:text-white">マッチング診断</Link></li>
                <li><Link href="/calendar" className="hover:text-white">カレンダー</Link></li>
                <li><Link href="/compare" className="hover:text-white">補助金比較</Link></li>
                <li><Link href="/analytics" className="hover:text-white">データ分析</Link></li>
                <li><Link href="/alerts" className="hover:text-white">アラート登録</Link></li>
                <li><a href={`${API_URL}/api/subsidies/feed`} className="hover:text-white">新着RSS</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-300">サポート</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/templates" className="hover:text-white">テンプレート</Link></li>
                <li><Link href="/consulting" className="hover:text-white">無料相談</Link></li>
                <li><Link href="/faq" className="hover:text-white">よくある質問</Link></li>
                <li><Link href="/about" className="hover:text-white">このサイトについて</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-300">運営・規約</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/terms" className="hover:text-white">利用規約</Link></li>
                <li><Link href="/privacy" className="hover:text-white">プライバシーポリシー</Link></li>
                <li><Link href="/admin" className="hover:text-white">管理画面</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-white/10 text-center text-gray-500 text-sm space-y-2">
            <p className="text-xs text-gray-500 leading-relaxed">
              ⚠️ 掲載情報は変更される場合があります。申請の際は必ず各制度の公式情報をご確認ください。本サービスは補助金の採択を保証するものではありません。
            </p>
            <p>© 2024 補助金ナビ. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
