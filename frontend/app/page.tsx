import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const FEATURES = [
  { icon: '🔍', title: '全国補助金検索', desc: '国・都道府県・市区町村の補助金をキーワード・カテゴリ・地域で絞り込み検索。' },
  { icon: '🎯', title: 'マッチング診断', desc: '3つの質問に答えるだけで、あなたの事業に最適な補助金を自動診断。' },
  { icon: '🔔', title: 'アラート登録', desc: '新着補助金・締切前通知をメールでお届け。見逃しゼロを実現。' },
  { icon: '📄', title: '申請テンプレート', desc: '申請書・事業計画書など7種類の書類テンプレートをPDFで即ダウンロード。' },
  { icon: '💬', title: '無料コンサルティング', desc: '補助金申請の専門家が、選定から申請書作成まで無料でサポート。' },
  { icon: '🏛', title: '54自治体スクレイピング', desc: '全国54の自治体サイトから毎週自動収集。常に最新情報を提供。' },
];

const CATEGORIES = ['IT・デジタル', '設備投資', '創業支援', '雇用促進', '環境・エネルギー', '販路拡大', '農業・林業', '事業再構築'];

async function getStats() {
  try {
    const res = await fetch(`${API}/api/subsidies/stats`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch { return null; }
}

async function getFeaturedSubsidies() {
  try {
    const res = await fetch(`${API}/api/subsidies?limit=6&page=1`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch { return []; }
}

const LEVEL_COLORS: Record<string, string> = {
  '国': 'bg-red-100 text-red-700',
  '都道府県': 'bg-blue-100 text-blue-700',
  '市区町村': 'bg-green-100 text-green-700',
};

export default async function Home() {
  const [stats, featured] = await Promise.all([getStats(), getFeaturedSubsidies()]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy to-navy-light text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            毎週月曜 AM2:00 自動更新中
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            日本全国の補助金・助成金を<br className="hidden md:block"/>一括検索
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            国・都道府県・市区町村の補助金情報を網羅。<br/>
            あなたの事業に最適な支援制度を今すぐ見つけよう。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/subsidies" className="bg-accent hover:bg-orange-600 text-white px-8 py-3 rounded-full font-bold text-lg transition-colors">
              補助金を探す →
            </Link>
            <Link href="/matching" className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-bold text-lg transition-colors border border-white/30">
              マッチング診断（無料）
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
            <div>
              <div className="text-3xl font-bold text-accent">{stats?.total || '45'}件+</div>
              <div className="text-sm text-gray-400 mt-1">掲載補助金数</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">54</div>
              <div className="text-sm text-gray-400 mt-1">スクレイプ自治体</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">7種</div>
              <div className="text-sm text-gray-400 mt-1">申請テンプレート</div>
            </div>
          </div>
        </div>
      </section>

      {/* Category quick links */}
      <section className="py-10 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {CATEGORIES.map(cat => (
              <Link key={cat} href={`/subsidies?category=${encodeURIComponent(cat)}`}
                className="bg-gray-100 hover:bg-navy hover:text-white px-5 py-2 rounded-full text-sm font-medium transition-colors">
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats by level */}
      {stats?.byLevel && (
        <section className="py-8 bg-gray-50 border-b">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-3 gap-4">
              {(stats.byLevel as { level: string; _count: { id: number } }[]).map(l => (
                <Link key={l.level} href={`/subsidies?level=${encodeURIComponent(l.level)}`}
                  className="card p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-2xl font-bold text-navy">{l._count.id}</div>
                  <div className="text-sm text-gray-500 mt-1">{l.level}の補助金</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured subsidies */}
      {featured.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-navy">新着・注目の補助金</h2>
              <Link href="/subsidies" className="text-navy hover:underline text-sm">すべて見る →</Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((s: any) => (
                <Link key={s.id} href={`/subsidies/${s.id}`} className="card p-5 group block">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`badge text-xs ${LEVEL_COLORS[s.level] || 'bg-gray-100 text-gray-700'}`}>{s.level}</span>
                    <span className="badge text-xs bg-orange-100 text-orange-700">{s.category}</span>
                  </div>
                  <h3 className="font-bold text-navy text-sm group-hover:text-navy-light leading-tight mb-2 line-clamp-2">{s.title}</h3>
                  <p className="text-gray-500 text-xs line-clamp-2 mb-3">{s.description}</p>
                  {s.maxAmount && (
                    <div className="text-sm font-semibold text-navy">上限 ¥{Number(s.maxAmount).toLocaleString()}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-navy mb-2">補助金ナビの特徴</h2>
          <p className="text-center text-gray-500 mb-12">補助金申請をトータルサポート</p>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-navy text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-navy mb-12">ご利用の流れ</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: '診断・検索', desc: 'マッチング診断か検索フォームで補助金を探す' },
              { step: '02', title: 'テンプレート取得', desc: '申請書類テンプレートをダウンロード' },
              { step: '03', title: '申請・採択', desc: '専門家サポートで申請書を仕上げ申請へ' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 bg-navy text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">{s.step}</div>
                <h3 className="font-bold text-navy text-lg mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-navy text-white text-center">
        <h2 className="text-3xl font-bold mb-4">今すぐ使える補助金を見つけよう</h2>
        <p className="text-gray-300 mb-8">メールアドレス不要・完全無料で補助金情報を検索できます</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/subsidies" className="bg-accent hover:bg-orange-600 text-white px-8 py-3 rounded-full font-bold transition-colors">
            補助金を検索する
          </Link>
          <Link href="/alerts" className="border border-white text-white hover:bg-white hover:text-navy px-8 py-3 rounded-full font-bold transition-colors">
            新着アラートを登録
          </Link>
        </div>
      </section>
    </div>
  );
}
