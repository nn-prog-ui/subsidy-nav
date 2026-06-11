'use client';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'banner_dismissed_v1';

const ANNOUNCEMENTS = [
  { id: 'cal-2024', text: '📅 新機能：申請期限カレンダーで補助金の締切を一覧管理できるようになりました！', href: '/calendar' },
  { id: 'cmp-2024', text: '⚖️ 新機能：最大3件の補助金を並べて比較できる「比較ページ」が登場！', href: '/compare' },
];

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState<typeof ANNOUNCEMENTS[0] | null>(null);

  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
      const next = ANNOUNCEMENTS.find(a => !dismissed.includes(a.id));
      setVisible(next || null);
    } catch { setVisible(null); }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed, visible.id]));
    } catch {}
    setVisible(null);
  };

  return (
    <div className="bg-navy/95 text-white text-sm px-4 py-2.5 flex items-center justify-between gap-4">
      <a href={visible.href} className="hover:underline flex-1 text-center">{visible.text}</a>
      <button onClick={dismiss} className="text-white/60 hover:text-white shrink-0 text-lg leading-none" aria-label="閉じる">×</button>
    </div>
  );
}
