import Link from 'next/link';

export const metadata = { title: 'オフライン' };

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-4">📡</div>
      <h1 className="text-2xl font-bold text-navy mb-2">オフラインです</h1>
      <p className="text-gray-500 mb-6">インターネット接続を確認してください。一度表示したページはオフラインでも閲覧できます。</p>
      <Link href="/" className="btn-primary inline-block">トップへ戻る</Link>
    </div>
  );
}
