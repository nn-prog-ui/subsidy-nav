import Link from 'next/link';
import { notFound } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const LEVEL_COLORS: Record<string, string> = { '国': 'bg-red-100 text-red-700', '都道府県': 'bg-blue-100 text-blue-700', '市区町村': 'bg-green-100 text-green-700' };

async function getSubsidy(id: string) {
  try {
    const res = await fetch(`${API}/api/subsidies/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch { return null; }
}

export default async function SubsidyDetailPage({ params }: { params: { id: string } }) {
  const subsidy = await getSubsidy(params.id);
  if (!subsidy) notFound();

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('ja-JP') : '－';
  const money = (n: number | null) => n ? `¥${Number(n).toLocaleString()}` : '上限なし';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/subsidies" className="text-navy hover:underline text-sm mb-6 block">← 補助金一覧に戻る</Link>

      <div className="card p-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`badge ${LEVEL_COLORS[subsidy.level] || 'bg-gray-100 text-gray-700'}`}>{subsidy.level}</span>
          <span className="badge bg-orange-100 text-orange-700">{subsidy.category}</span>
          <span className="badge bg-gray-100 text-gray-600">{subsidy.prefecture}</span>
          {subsidy.municipalityName && <span className="badge bg-purple-100 text-purple-700">{subsidy.municipalityName}</span>}
        </div>

        <h1 className="text-2xl font-bold text-navy mb-6">{subsidy.title}</h1>

        <div className="grid sm:grid-cols-2 gap-4 mb-8 p-5 bg-gray-50 rounded-xl">
          <div>
            <div className="text-xs text-gray-500 mb-1">補助上限額</div>
            <div className="text-2xl font-bold text-navy">{money(subsidy.maxAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">補助率</div>
            <div className="text-xl font-bold text-navy">{subsidy.subsidyRate || '－'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">申請期間</div>
            <div className="font-medium">{fmt(subsidy.applicationStart)} 〜 {fmt(subsidy.applicationEnd)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">対象</div>
            <div className="font-medium">{subsidy.targetType}</div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-navy mb-3">概要</h2>
          <p className="text-gray-700 leading-relaxed">{subsidy.description}</p>
        </div>

        {subsidy.requirements && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-navy mb-3">申請要件</h2>
            <p className="text-gray-700 leading-relaxed">{subsidy.requirements}</p>
          </div>
        )}

        {subsidy.notes && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="font-bold text-yellow-800 mb-2">備考</h2>
            <p className="text-yellow-700 text-sm">{subsidy.notes}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          {subsidy.applicationUrl && (
            <a href={subsidy.applicationUrl} target="_blank" rel="noopener noreferrer"
              className="btn-primary text-center">申請・詳細ページへ →</a>
          )}
          <a href={`${API}/api/subsidies/${subsidy.id}/pdf`} target="_blank" rel="noopener noreferrer"
            className="btn-outline text-center">PDF でダウンロード</a>
          <Link href="/matching" className="btn-outline text-center">マッチング診断で他を探す</Link>
        </div>
      </div>

      <div className="mt-8 card p-6">
        <h2 className="font-bold text-navy mb-3">この補助金の申請にお困りですか？</h2>
        <p className="text-gray-600 text-sm mb-4">専門家が無料で申請サポートをいたします。お気軽にご相談ください。</p>
        <Link href="/consulting" className="btn-primary inline-block">無料相談はこちら</Link>
      </div>
    </div>
  );
}
