'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { API, authHeaders, getToken } from '../../../lib/auth';
import { toast } from '../../Toaster';

interface Draft {
  summary: string;
  motivation: string;
  plan: string;
  expectedOutcome: string;
  appeal: string;
}

const SECTIONS: { key: keyof Draft; label: string }[] = [
  { key: 'summary', label: '事業計画の要約' },
  { key: 'motivation', label: '申請動機・背景' },
  { key: 'plan', label: '取り組み内容・実施計画' },
  { key: 'expectedOutcome', label: '期待される効果・成果' },
  { key: 'appeal', label: '審査でのアピールポイント' },
];

const EMPTY = { companyName: '', industry: '', employees: '', businessSummary: '', projectPlan: '' };

export default function DraftGenerator({ subsidyId }: { subsidyId: string }) {
  const [hasToken, setHasToken] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => { setHasToken(!!getToken()); }, []);

  const onToggle = () => {
    if (!hasToken) {
      toast('AI申請書ドラフトの作成にはログインが必要です', 'info');
      setTimeout(() => { window.location.href = '/auth/login'; }, 800);
      return;
    }
    setOpen(o => !o);
  };

  const set = (k: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const allFilled = Object.values(form).every(v => v.trim().length > 0);

  const generate = async () => {
    if (!allFilled) { toast('すべての項目を入力してください', 'info'); return; }
    setLoading(true);
    setDraft(null);
    try {
      const res = await fetch(`${API}/api/subsidies/${subsidyId}/draft`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { toast(json.error || 'ドラフト生成に失敗しました', 'error'); return; }
      setDraft(json.data);
      toast('AI申請書ドラフトを作成しました', 'success');
    } catch {
      toast('通信に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast('コピーしました', 'success'),
      () => toast('コピーに失敗しました', 'error'),
    );
  };

  const copyAll = () => {
    if (!draft) return;
    const text = SECTIONS.map(s => `【${s.label}】\n${draft[s.key]}`).join('\n\n');
    copy(text);
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-bold text-navy">🤖 AI申請書ドラフトを作成</h2>
        <span className="badge bg-navy text-white text-xs">会員限定</span>
      </div>
      <p className="text-sm text-gray-500 mb-3">事業の情報を入力すると、この補助金向けの申請書（事業計画書）のたたき台をAIが作成します。</p>

      {!open && (
        <button onClick={onToggle} className="btn-outline text-sm">
          {hasToken ? '入力して作成する' : 'ログインして利用する'}
        </button>
      )}

      {open && hasToken && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">事業者名</label>
              <input className="input" value={form.companyName} onChange={set('companyName')} placeholder="株式会社○○" />
            </div>
            <div>
              <label className="label">業種</label>
              <input className="input" value={form.industry} onChange={set('industry')} placeholder="飲食業 / 製造業 など" />
            </div>
            <div>
              <label className="label">従業員規模</label>
              <input className="input" value={form.employees} onChange={set('employees')} placeholder="5名 / 10〜50名 など" />
            </div>
          </div>
          <div>
            <label className="label">事業概要</label>
            <textarea className="input" rows={2} maxLength={1000} value={form.businessSummary} onChange={set('businessSummary')}
              placeholder="例：地域密着型のカフェを2店舗運営。地元食材を使ったメニューが強み。" />
          </div>
          <div>
            <label className="label">今回申請したい取り組み</label>
            <textarea className="input" rows={2} maxLength={1000} value={form.projectPlan} onChange={set('projectPlan')}
              placeholder="例：ECサイトを構築し、テイクアウト・通販の販路を拡大したい。" />
          </div>
          <div className="flex gap-2">
            <button onClick={generate} disabled={loading || !allFilled} className="btn-primary text-sm disabled:opacity-50">
              {loading ? '作成中…（30秒程度）' : '✨ ドラフトを作成'}
            </button>
            <button onClick={() => setOpen(false)} className="btn-outline text-sm">閉じる</button>
          </div>
        </div>
      )}

      {draft && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-navy text-sm">生成された下書き</h3>
            <button onClick={copyAll} className="text-xs text-navy hover:underline">📋 全文コピー</button>
          </div>
          {SECTIONS.map(s => (
            <div key={s.key} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-bold text-navy text-sm">{s.label}</h4>
                <button onClick={() => copy(draft[s.key])} className="text-xs text-gray-400 hover:text-navy">コピー</button>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{draft[s.key]}</p>
            </div>
          ))}
          <p className="text-[11px] text-gray-400">※ AIが生成したたたき台です。事実関係・数値・要件適合は必ずご自身で確認・調整のうえご提出ください。</p>
        </div>
      )}
    </div>
  );
}
