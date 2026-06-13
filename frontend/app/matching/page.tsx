'use client';
import { useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const INDUSTRIES = ['IT・ソフトウェア','製造業','飲食業','小売業','農業・林業・漁業','建設業','医療・福祉','観光・宿泊','その他サービス業'];
const EMPLOYEES = ['1〜5名','6〜20名','21〜50名','51〜100名','101〜300名','301名以上'];

const LEVEL_COLORS: Record<string, string> = { '国': 'bg-red-100 text-red-700', '都道府県': 'bg-blue-100 text-blue-700', '市区町村': 'bg-green-100 text-green-700' };

interface Subsidy { id: string; title: string; description: string; category: string; level: string; prefecture: string; maxAmount: number | null; subsidyRate: string | null; score: number; matchScore: number; reasons: string[]; }

const STEPS = ['都道府県を選択', '業種を選択', '従業員数を選択'];

export default function MatchingPage() {
  const [step, setStep] = useState(0);
  const [prefecture, setPrefecture] = useState('');
  const [industry, setIndustry] = useState('');
  const [employees, setEmployees] = useState('');
  const [results, setResults] = useState<Subsidy[] | null>(null);
  const [loading, setLoading] = useState(false);

  const runMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/matching`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefecture, industry, employees }),
      });
      const json = await res.json();
      setResults(json.data || []);
    } catch { setResults([]); }
    setLoading(false);
  };

  const downloadPdf = async () => {
    const res = await fetch(`${API}/api/matching/pdf`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefecture, industry, employees }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'matching_result.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  if (results !== null) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">マッチング結果</h1>
          <p className="text-gray-500 mt-1">{prefecture} / {industry} / {employees} — {results.length}件マッチ</p>
        </div>
        <div className="flex gap-2">
          {results.length > 0 && (
            <button onClick={downloadPdf} className="btn-outline text-sm">📄 PDFで保存</button>
          )}
          <button onClick={() => { setResults(null); setStep(0); setPrefecture(''); setIndustry(''); setEmployees(''); }}
            className="btn-outline text-sm">再診断する</button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-5xl mb-4">😔</div>
          <p>条件に合う補助金が見つかりませんでした。条件を変えて再診断してください。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((s, i) => (
            <Link key={s.id} href={`/subsidies/${s.id}`} className="card p-5 block group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`badge ${LEVEL_COLORS[s.level] || 'bg-gray-100'}`}>{s.level}</span>
                    <span className="badge bg-orange-100 text-orange-700">{s.category}</span>
                    <span className="badge bg-gray-100 text-gray-600">{s.prefecture}</span>
                    {typeof s.matchScore === 'number' && (
                      <span className="badge bg-green-100 text-green-700 ml-auto">マッチ度 {s.matchScore}%</span>
                    )}
                  </div>
                  <h3 className="font-bold text-navy group-hover:text-navy-light">{s.title}</h3>
                  {s.reasons && s.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.reasons.map(r => (
                        <span key={r} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">✓ {r}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2">{s.description}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    {s.maxAmount && <span>上限 <strong className="text-navy">¥{Number(s.maxAmount).toLocaleString()}</strong></span>}
                    {s.subsidyRate && <span>補助率 <strong>{s.subsidyRate}</strong></span>}
                  </div>
                </div>
                <div className="text-navy text-xl group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 card p-6 bg-navy text-white">
        <h2 className="font-bold text-lg mb-2">申請を迷っていませんか？</h2>
        <p className="text-gray-300 text-sm mb-4">専門家が無料で申請をサポートします。</p>
        <Link href="/consulting" className="bg-accent hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium inline-block transition-colors">
          無料相談を申し込む
        </Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-navy">補助金マッチング診断</h1>
        <p className="text-gray-500 mt-2">3つの質問に答えるだけで最適な補助金を診断します</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-navy text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`w-12 h-0.5 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-8">
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold text-navy mb-6 text-center">事業所のある都道府県は？</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {PREFECTURES.map(p => (
                <button key={p} onClick={() => { setPrefecture(p); setStep(1); }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors hover:bg-navy hover:text-white hover:border-navy ${prefecture === p ? 'bg-navy text-white border-navy' : 'bg-white border-gray-200'}`}>
                  {p.replace('県','').replace('府','').replace('都','').replace('道','')}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-navy mb-6 text-center">業種は？</h2>
            <div className="grid gap-3">
              {INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => { setIndustry(ind); setStep(2); }}
                  className={`py-3 px-5 rounded-xl text-sm font-medium border-2 text-left transition-all hover:border-navy hover:bg-blue-50 ${industry === ind ? 'border-navy bg-blue-50' : 'border-gray-200'}`}>
                  {ind}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(0)} className="mt-4 text-sm text-gray-400 hover:text-gray-600">← 戻る</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-navy mb-6 text-center">従業員数は？</h2>
            <div className="grid gap-3">
              {EMPLOYEES.map(emp => (
                <button key={emp} onClick={() => { setEmployees(emp); runMatch(); }}
                  className="py-3 px-5 rounded-xl text-sm font-medium border-2 border-gray-200 text-left hover:border-navy hover:bg-blue-50 transition-all">
                  {emp}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-4 text-sm text-gray-400 hover:text-gray-600">← 戻る</button>
            {loading && <div className="text-center mt-6 text-gray-400">診断中...</div>}
          </div>
        )}
      </div>
    </div>
  );
}
