'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const CATEGORY_COLORS: Record<string, string> = {
  'IT・デジタル': 'bg-blue-100 text-blue-700 border-blue-300',
  '設備投資': 'bg-green-100 text-green-700 border-green-300',
  '創業支援': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  '雇用促進': 'bg-purple-100 text-purple-700 border-purple-300',
  '環境・エネルギー': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  '事業再構築': 'bg-red-100 text-red-700 border-red-300',
  '農業・林業': 'bg-lime-100 text-lime-700 border-lime-300',
  '海外展開': 'bg-sky-100 text-sky-700 border-sky-300',
  '経営支援': 'bg-orange-100 text-orange-700 border-orange-300',
};

interface CalEvent {
  id: string; title: string; category: string; level: string;
  applicationStart: string | null; applicationEnd: string | null;
  maxAmount: number | null; prefecture: string;
}

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/subsidies/calendar/events?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(j => setEvents(j.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '－';
  const fmtFull = (d: string | null) => d ? new Date(d).toLocaleDateString('ja-JP') : '－';
  const money = (n: number | null) => n ? `¥${Number(n).toLocaleString()}` : '-';

  const deadlineSoon = (end: string | null) => {
    if (!end) return false;
    const diff = new Date(end).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };
  const isEnded = (end: string | null) => end ? new Date(end) < new Date() : false;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">申請期限カレンダー</h1>
        <p className="text-gray-500">補助金・助成金の申請開始・締切日を月別で確認できます。</p>
      </div>

      {/* Month navigation */}
      <div className="card p-4 mb-6 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-navy font-bold text-xl">‹</button>
        <div className="text-center">
          <div className="text-2xl font-bold text-navy">{year}年 {MONTHS[month - 1]}</div>
          <div className="text-sm text-gray-400">{events.length}件の補助金</div>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-navy font-bold text-xl">›</button>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setView('list')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${view === 'list' ? 'bg-navy text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>リスト表示</button>
        <button onClick={() => setView('grid')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${view === 'grid' ? 'bg-navy text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>カード表示</button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">読み込み中...</div>
      ) : events.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📅</div>
          <p>この月の補助金情報はありません</p>
        </div>
      ) : view === 'list' ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">補助金名</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">カテゴリ</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">申請開始</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">申請締切</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden lg:table-cell">上限額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map(e => (
                <tr key={e.id} className={`hover:bg-gray-50 ${isEnded(e.applicationEnd) ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/subsidies/${e.id}`} className="font-medium text-navy hover:underline leading-tight block">
                      {e.title}
                    </Link>
                    <div className="flex gap-1 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{e.level}</span>
                      <span className="text-xs text-gray-400">{e.prefecture}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{e.category}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{fmt(e.applicationStart)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isEnded(e.applicationEnd) ? 'text-gray-400 line-through' : deadlineSoon(e.applicationEnd) ? 'text-red-600' : 'text-gray-700'}`}>
                      {fmtFull(e.applicationEnd)}
                    </span>
                    {deadlineSoon(e.applicationEnd) && !isEnded(e.applicationEnd) && (
                      <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded animate-pulse">締切間近</span>
                    )}
                    {isEnded(e.applicationEnd) && <span className="ml-1.5 text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">終了</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-navy font-medium">{money(e.maxAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(e => (
            <Link key={e.id} href={`/subsidies/${e.id}`}
              className={`card p-4 block group hover:border-navy transition-colors ${isEnded(e.applicationEnd) ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{e.category}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{e.level}</span>
              </div>
              <h3 className="font-bold text-navy text-sm group-hover:underline line-clamp-2 mb-3 leading-snug">{e.title}</h3>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>申請締切</span>
                  <span className={`font-medium ${isEnded(e.applicationEnd) ? 'line-through text-gray-400' : deadlineSoon(e.applicationEnd) ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                    {fmtFull(e.applicationEnd)}
                    {deadlineSoon(e.applicationEnd) && !isEnded(e.applicationEnd) && ' ⚠️'}
                  </span>
                </div>
                {e.maxAmount && (
                  <div className="flex justify-between">
                    <span>上限額</span>
                    <span className="font-semibold text-navy">{money(e.maxAmount)}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      {events.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-navy">{events.filter(e => !isEnded(e.applicationEnd)).length}</div>
            <div className="text-xs text-gray-500 mt-1">申請受付中</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{events.filter(e => deadlineSoon(e.applicationEnd) && !isEnded(e.applicationEnd)).length}</div>
            <div className="text-xs text-gray-500 mt-1">締切30日以内</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">{events.filter(e => isEnded(e.applicationEnd)).length}</div>
            <div className="text-xs text-gray-500 mt-1">受付終了</div>
          </div>
        </div>
      )}
    </div>
  );
}
