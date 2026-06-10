import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
      <h2 className="text-2xl font-bold text-navy mb-3">ページが見つかりません</h2>
      <p className="text-gray-500 mb-8">お探しのページは存在しないか、移動した可能性があります。</p>
      <div className="flex gap-3 justify-center">
        <Link href="/" className="btn-primary">トップに戻る</Link>
        <Link href="/subsidies" className="btn-outline">補助金を探す</Link>
      </div>
    </div>
  );
}
