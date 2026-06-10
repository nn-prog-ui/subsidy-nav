import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '補助金ナビ | 日本全国の補助金・助成金情報',
  description: '国・都道府県・市区町村の補助金・助成金を一元検索。あなたの事業に最適な支援制度を見つけよう。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="bg-navy text-white sticky top-0 z-50 shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-2xl">🏛</span>
              <span>補助金ナビ</span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/subsidies" className="hover:text-orange-300 transition-colors">補助金を探す</Link>
              <Link href="/matching" className="hover:text-orange-300 transition-colors">マッチング診断</Link>
              <Link href="/alerts" className="hover:text-orange-300 transition-colors">アラート登録</Link>
              <Link href="/templates" className="hover:text-orange-300 transition-colors">テンプレート</Link>
              <Link href="/consulting" className="bg-accent text-white px-4 py-1.5 rounded-full hover:bg-orange-600 transition-colors">無料相談</Link>
            </div>
            <div className="md:hidden">
              <Link href="/subsidies" className="text-sm bg-accent px-3 py-1.5 rounded-full">補助金を探す</Link>
            </div>
          </nav>
        </header>
        <main className="min-h-screen">{children}</main>
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
                <li><Link href="/matching" className="hover:text-white">マッチング診断</Link></li>
                <li><Link href="/alerts" className="hover:text-white">アラート登録</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-300">サポート</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/templates" className="hover:text-white">テンプレート</Link></li>
                <li><Link href="/consulting" className="hover:text-white">無料相談</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-300">管理</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/admin" className="hover:text-white">管理画面</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
            © 2024 補助金ナビ. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
