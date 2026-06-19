import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FavoriteButton from './FavoriteButton';
import RecordView from './RecordView';
import ProgressTracker from './ProgressTracker';
import ReportForm from './ReportForm';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';

const LEVEL_COLORS: Record<string, string> = {
  '国': 'bg-red-100 text-red-700',
  '都道府県': 'bg-blue-100 text-blue-700',
  '市区町村': 'bg-green-100 text-green-700',
};

interface SubsidyDetail {
  id: string; title: string; description: string; category: string; targetType: string;
  prefecture: string; level: string; maxAmount: number | null; subsidyRate: string | null;
  applicationStart: string | null; applicationEnd: string | null; applicationUrl: string | null;
  requirements: string | null; notes: string | null; municipalityName: string | null; status: string;
  difficulty: string | null; estimatedDays: number | null;
  applicationSteps: string[]; requiredDocuments: string[];
  source: string | null;
  applicationGuide?: {
    overview: string;
    writingTips: string[];
    preparation: string[];
    schedule: string[];
    disbursementDays: number | null;
    pitfalls: string[];
    generatedAt: string;
  } | null;
}

const DIFFICULTY: Record<string, { label: string; color: string }> = {
  easy: { label: '易しい', color: 'bg-green-100 text-green-700' },
  medium: { label: '普通', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: '難しい', color: 'bg-red-100 text-red-700' },
};

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = params;
  const result = await getSubsidy(id);
  if (!result) return { title: '補助金が見つかりません' };
  const s = result.data;
  const desc = `${s.prefecture}・${s.level}の補助金。対象: ${s.targetType}。${s.maxAmount ? `上限¥${Number(s.maxAmount).toLocaleString()}。` : ''}${s.description.slice(0, 100)}`;
  return {
    title: s.title,
    description: desc,
    openGraph: {
      title: `${s.title} | 補助金ナビ`,
      description: desc,
      url: `${BASE_URL}/subsidies/${s.id}`,
    },
    alternates: { canonical: `${BASE_URL}/subsidies/${s.id}` },
  };
}

async function getSubsidy(id: string): Promise<{ data: SubsidyDetail; related: SubsidyDetail[] } | null> {
  try {
    const res = await fetch(`${API}/api/subsidies/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export default async function SubsidyDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const result = await getSubsidy(id);
  if (!result) notFound();

  const { data: subsidy, related } = result;
  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('ja-JP') : '－';
  const money = (n: number | null) => n ? `¥${Number(n).toLocaleString()}` : '上限なし';

  // schema.org 構造化データ（GovernmentService として表現）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: subsidy.title,
    description: subsidy.description.slice(0, 300),
    serviceType: subsidy.category,
    url: `${BASE_URL}/subsidies/${subsidy.id}`,
    areaServed: { '@type': 'AdministrativeArea', name: subsidy.prefecture },
    audience: { '@type': 'Audience', audienceType: subsidy.targetType },
    provider: {
      '@type': 'GovernmentOrganization',
      name: subsidy.municipalityName || subsidy.prefecture || '日本',
    },
    ...(subsidy.applicationUrl ? {
      availableChannel: { '@type': 'ServiceChannel', serviceUrl: subsidy.applicationUrl },
    } : {}),
    ...(subsidy.maxAmount ? {
      offers: {
        '@type': 'Offer',
        priceCurrency: 'JPY',
        price: Number(subsidy.maxAmount),
        ...(subsidy.applicationStart ? { validFrom: new Date(subsidy.applicationStart).toISOString().slice(0, 10) } : {}),
        ...(subsidy.applicationEnd ? { validThrough: new Date(subsidy.applicationEnd).toISOString().slice(0, 10) } : {}),
      },
    } : {}),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: '補助金一覧', item: `${BASE_URL}/subsidies` },
      { '@type': 'ListItem', position: 3, name: subsidy.title, item: `${BASE_URL}/subsidies/${subsidy.id}` },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <RecordView id={subsidy.id} title={subsidy.title} category={subsidy.category}
        prefecture={subsidy.prefecture} level={subsidy.level} maxAmount={subsidy.maxAmount} />
      <Link href="/subsidies" className="text-navy hover:underline text-sm mb-6 block">← 補助金一覧に戻る</Link>

      <div className="card p-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`badge ${LEVEL_COLORS[subsidy.level] || 'bg-gray-100 text-gray-700'}`}>{subsidy.level}</span>
          <span className="badge bg-orange-100 text-orange-700">{subsidy.category}</span>
          <span className="badge bg-gray-100 text-gray-600">{subsidy.prefecture}</span>
          {subsidy.municipalityName && <span className="badge bg-purple-100 text-purple-700">{subsidy.municipalityName}</span>}
          {subsidy.difficulty && DIFFICULTY[subsidy.difficulty] && (
            <span className={`badge ${DIFFICULTY[subsidy.difficulty].color}`}>申請難易度: {DIFFICULTY[subsidy.difficulty].label}</span>
          )}
          {subsidy.estimatedDays && (
            <span className="badge bg-indigo-100 text-indigo-700">目安 約{subsidy.estimatedDays}日</span>
          )}
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
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{subsidy.description}</p>
        </div>

        {subsidy.requirements && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-navy mb-3">申請要件</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{subsidy.requirements}</p>
          </div>
        )}

        {subsidy.applicationSteps && subsidy.applicationSteps.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-navy mb-3">申請の流れ</h2>
            <ol className="space-y-2">
              {subsidy.applicationSteps.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-navy text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-gray-700 text-sm leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {subsidy.requiredDocuments && subsidy.requiredDocuments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-navy mb-3">必要書類</h2>
            <ul className="space-y-1.5">
              {subsidy.requiredDocuments.map((doc, i) => (
                <li key={i} className="flex gap-2 items-start text-sm text-gray-700">
                  <span className="text-green-600 mt-0.5">☑</span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {subsidy.applicationGuide && (
          <div className="mb-6 p-5 bg-gradient-to-br from-navy/5 to-accent/5 border border-navy/15 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="badge bg-navy text-white">🤖 AI申請ガイド</span>
              <span className="text-xs text-gray-500">補助金コンサルによる申請の手引き</span>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">{subsidy.applicationGuide.overview}</p>

            {subsidy.applicationGuide.disbursementDays != null && (
              <div className="inline-block mb-4 px-4 py-2 bg-white rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500">入金までの想定日数</span>
                <span className="ml-2 text-lg font-bold text-navy">約{subsidy.applicationGuide.disbursementDays}日</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              {subsidy.applicationGuide.writingTips.length > 0 && (
                <div>
                  <h3 className="font-bold text-navy text-sm mb-2">✍️ 申請書の書き方</h3>
                  <ul className="space-y-1.5">
                    {subsidy.applicationGuide.writingTips.map((t, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-accent mt-0.5">›</span><span>{t}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {subsidy.applicationGuide.preparation.length > 0 && (
                <div>
                  <h3 className="font-bold text-navy text-sm mb-2">📋 準備するもの</h3>
                  <ul className="space-y-1.5">
                    {subsidy.applicationGuide.preparation.map((t, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-600 mt-0.5">☑</span><span>{t}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {subsidy.applicationGuide.schedule.length > 0 && (
                <div>
                  <h3 className="font-bold text-navy text-sm mb-2">🗓 想定スケジュール</h3>
                  <ol className="space-y-1.5">
                    {subsidy.applicationGuide.schedule.map((t, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-navy font-semibold">{i + 1}.</span><span>{t}</span></li>
                    ))}
                  </ol>
                </div>
              )}
              {subsidy.applicationGuide.pitfalls.length > 0 && (
                <div>
                  <h3 className="font-bold text-navy text-sm mb-2">⚠️ よくある注意点</h3>
                  <ul className="space-y-1.5">
                    {subsidy.applicationGuide.pitfalls.map((t, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-500 mt-0.5">•</span><span>{t}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-4">※ AIが補助金情報をもとに生成した参考情報です。最新の公式要領を必ずご確認ください。</p>
          </div>
        )}

        {subsidy.notes && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="font-bold text-yellow-800 mb-2">備考・注意事項</h2>
            <p className="text-yellow-700 text-sm">{subsidy.notes}</p>
          </div>
        )}

        {/* 申請進捗トラッカー */}
        <ProgressTracker subsidyId={subsidy.id} />

        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-100">
          {subsidy.applicationUrl && (
            <a href={subsidy.applicationUrl} target="_blank" rel="noopener noreferrer"
              className="btn-primary text-center">申請・詳細ページへ →</a>
          )}
          <a href={`${API}/api/subsidies/${subsidy.id}/pdf`} target="_blank" rel="noopener noreferrer"
            className="btn-outline text-center">📄 PDF でダウンロード</a>
          {subsidy.applicationEnd && (
            <a href={`${API}/api/subsidies/${subsidy.id}/ics`}
              className="btn-outline text-center">📅 締切をカレンダーに追加</a>
          )}
          <Link href="/matching" className="btn-outline text-center">🎯 診断で類似を探す</Link>
          <FavoriteButton subsidyId={subsidy.id} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <ReportForm subsidyId={subsidy.id} />
          {subsidy.source === 'jgrants' && (
            <span className="text-xs text-gray-400">出典: Jグランツ（経済産業省）</span>
          )}
        </div>
      </div>

      {/* Related subsidies */}
      {related && related.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-navy mb-4">関連する補助金</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map(s => (
              <Link key={s.id} href={`/subsidies/${s.id}`} className="card p-4 group block">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className={`badge text-xs ${LEVEL_COLORS[s.level] || 'bg-gray-100 text-gray-700'}`}>{s.level}</span>
                  <span className="badge text-xs bg-orange-100 text-orange-700">{s.category}</span>
                </div>
                <h3 className="font-bold text-navy text-sm group-hover:text-navy-light leading-tight mb-1 line-clamp-2">{s.title}</h3>
                {s.maxAmount && (
                  <p className="text-xs text-gray-500">上限 <span className="font-semibold text-navy">¥{Number(s.maxAmount).toLocaleString()}</span></p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 card p-6 bg-gradient-to-r from-navy to-navy-light text-white">
        <h2 className="font-bold text-lg mb-2">申請にお困りですか？</h2>
        <p className="text-gray-300 text-sm mb-4">専門家が無料で申請をサポートします。お気軽にご相談ください。</p>
        <Link href="/consulting" className="bg-accent hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-medium inline-block transition-colors text-sm">
          無料相談はこちら
        </Link>
      </div>
    </div>
  );
}
