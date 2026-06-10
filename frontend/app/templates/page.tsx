'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Template { id: string; title: string; category: string; description: string; downloadCount: number; }

const CATEGORY_ICONS: Record<string, string> = { '申請書': '📋', '事業計画書': '📊', '財務書類': '💰', '報告書': '📝', 'チェックリスト': '✅' };

const WIZARD_STEPS = [
  { q: '補助金の種類を教えてください', options: ['IT・デジタル系', '設備投資・ものづくり系', '雇用・人材系', '創業・起業系', 'その他'] },
  { q: '必要な書類は何ですか？', options: ['申請書（基本）', '事業計画書', '収支計画書', '実績報告書', 'すべてのテンプレート'] },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardStep, setWizardStep] = useState<number | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetch(`${API}/api/templates`)
      .then(r => r.json())
      .then(j => setTemplates(j.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = category ? templates.filter(t => t.category === category) : templates;
  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">申請書類テンプレート</h1>
        <p className="text-gray-500 mt-2">補助金申請に必要な書類を7種類用意しました。PDFで即ダウンロードできます。</p>
      </div>

      {/* Wizard */}
      <div className="card p-6 mb-8 bg-gradient-to-r from-navy to-navy-light text-white">
        <h2 className="font-bold text-lg mb-2">📋 書類選択ウィザード</h2>
        <p className="text-gray-300 text-sm mb-4">質問に答えて必要なテンプレートを絞り込みましょう</p>
        {wizardStep === null ? (
          <button onClick={() => setWizardStep(0)} className="bg-white text-navy px-5 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            ウィザードを開始する →
          </button>
        ) : wizardStep < WIZARD_STEPS.length ? (
          <div>
            <p className="font-medium mb-3">{WIZARD_STEPS[wizardStep].q}</p>
            <div className="flex flex-wrap gap-2">
              {WIZARD_STEPS[wizardStep].options.map(opt => (
                <button key={opt} onClick={() => { setAnswers([...answers, opt]); setWizardStep(wizardStep + 1); }}
                  className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full text-sm transition-colors border border-white/30">
                  {opt}
                </button>
              ))}
            </div>
            <button onClick={() => { setWizardStep(null); setAnswers([]); }} className="text-gray-300 text-xs mt-3 hover:text-white">キャンセル</button>
          </div>
        ) : (
          <div>
            <p className="font-medium mb-2">✅ 以下のテンプレートをお勧めします</p>
            <p className="text-gray-300 text-sm">{answers.join(' → ')}</p>
            <button onClick={() => { setWizardStep(null); setAnswers([]); setCategory(''); }}
              className="mt-3 bg-white text-navy px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
              全テンプレートを表示
            </button>
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setCategory('')} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${!category ? 'bg-navy text-white border-navy' : 'border-gray-300 hover:border-navy'}`}>すべて</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${category === c ? 'bg-navy text-white border-navy' : 'border-gray-300 hover:border-navy'}`}>
            {CATEGORY_ICONS[c] || '📄'} {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">読み込み中...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="card p-5 flex flex-col">
              <div className="text-3xl mb-3">{CATEGORY_ICONS[t.category] || '📄'}</div>
              <span className="badge bg-gray-100 text-gray-600 self-start mb-2">{t.category}</span>
              <h3 className="font-bold text-navy mb-2 flex-1">{t.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{t.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">ダウンロード: {t.downloadCount}回</span>
                <a href={`${API}/api/templates/${t.id}/download`} target="_blank" rel="noopener noreferrer"
                  className="bg-navy text-white text-sm px-4 py-1.5 rounded-lg hover:bg-navy-light transition-colors">
                  PDFダウンロード
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
