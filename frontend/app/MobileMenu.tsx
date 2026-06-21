'use client';
import { useState } from 'react';
import Link from 'next/link';

const LINKS = [
  { href: '/subsidies', label: '補助金を探す' },
  { href: '/categories', label: 'カテゴリ' },
  { href: '/matching', label: 'マッチング診断' },
  { href: '/concierge', label: 'AI相談' },
  { href: '/calendar', label: 'カレンダー' },
  { href: '/compare', label: '比較' },
  { href: '/alerts', label: 'アラート登録' },
  { href: '/templates', label: 'テンプレート' },
  { href: '/faq', label: 'よくある質問' },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
        aria-expanded={open}
        className="p-2 -mr-2 text-white"
      >
        <span className="block w-6 text-2xl leading-none">{open ? '✕' : '☰'}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 top-16 bg-black/40 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav className="fixed top-16 left-0 right-0 bg-navy z-50 shadow-lg border-t border-white/10 max-h-[calc(100vh-4rem)] overflow-auto">
            <ul className="py-2">
              {LINKS.map(l => (
                <li key={l.href}>
                  <Link href={l.href} onClick={() => setOpen(false)}
                    className="block px-6 py-3 text-white hover:bg-white/10 text-sm">{l.label}</Link>
                </li>
              ))}
              <li className="px-6 py-3 border-t border-white/10">
                <Link href="/consulting" onClick={() => setOpen(false)}
                  className="block bg-accent text-white text-center py-2 rounded-full text-sm font-medium">無料相談</Link>
              </li>
              <li className="px-6 py-2 flex gap-3">
                <Link href="/auth/login" onClick={() => setOpen(false)} className="text-orange-300 text-sm">ログイン</Link>
                <Link href="/mypage" onClick={() => setOpen(false)} className="text-orange-300 text-sm">マイページ</Link>
              </li>
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
