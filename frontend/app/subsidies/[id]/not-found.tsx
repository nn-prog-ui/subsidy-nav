import Link from 'next/link';
export default function SubsidyNotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h2 className="text-2xl font-bold text-navy mb-3">補助金が見つかりません</h2>
      <p className="text-gray-500 mb-6">この補助金は終了したか、URLが間違っている可能性があります。</p>
      <Link href="/subsidies" className="btn-primary inline-block">補助金一覧へ</Link>
    </div>
  );
}
