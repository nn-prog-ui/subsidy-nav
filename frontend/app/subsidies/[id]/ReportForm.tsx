'use client';
import { useState } from 'react';
import { API } from '../../../lib/auth';
import { toast } from '../../Toaster';

const REASONS: { value: string; label: string }[] = [
  { value: 'outdated', label: '情報が古い・募集終了' },
  { value: 'broken_link', label: 'リンク切れ' },
  { value: 'wrong_info', label: '内容に誤りがある' },
  { value: 'other', label: 'その他' },
];

export default function ReportForm({ subsidyId }: { subsidyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('outdated');
  const [detail, setDetail] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/api/reports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subsidyId, reason, detail, email }),
      });
      if (!res.ok) throw new Error();
      toast('ご報告ありがとうございます', 'success');
      setOpen(false); setDetail(''); setEmail('');
    } catch {
      toast('送信に失敗しました', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-gray-400 hover:text-gray-600 underline">
        この情報の誤りを報告
      </button>
    );
  }

  return (
    <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-sm font-bold text-navy mb-2">情報の誤りを報告</h3>
      <div className="space-y-2">
        <div>
          <label className="label" htmlFor="report-reason">理由</label>
          <select id="report-reason" className="input" value={reason} onChange={e => setReason(e.target.value)} aria-label="報告理由">
            {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="report-detail">詳細（任意）</label>
          <textarea id="report-detail" className="input h-20 resize-none" value={detail} maxLength={1000}
            onChange={e => setDetail(e.target.value)} placeholder="具体的な内容をご記入ください" aria-label="報告の詳細" />
        </div>
        <div>
          <label className="label" htmlFor="report-email">メールアドレス（任意・返信用）</label>
          <input id="report-email" type="email" className="input" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="your@email.com" aria-label="返信用メールアドレス" />
        </div>
        <div className="flex gap-2">
          <button onClick={submit} disabled={sending} className="btn-primary text-sm disabled:opacity-60">送信</button>
          <button onClick={() => setOpen(false)} className="text-sm text-gray-500 px-3">キャンセル</button>
        </div>
      </div>
    </div>
  );
}
