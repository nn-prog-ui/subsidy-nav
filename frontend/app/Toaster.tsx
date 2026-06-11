'use client';
import { useEffect, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType; }

const EVENT = 'app:toast';

/** どこからでも呼べるトースト表示ヘルパー */
export function toast(message: string, type: ToastType = 'info') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, type } }));
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-navy',
};
const ICONS: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail as { message: string; type: ToastType };
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), 3500);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [remove]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2" role="region" aria-label="通知" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id}
          className={`${STYLES[t.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm max-w-xs animate-[slideIn_0.2s_ease-out]`}
          role="status">
          <span className="font-bold" aria-hidden="true">{ICONS[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="text-white/70 hover:text-white" aria-label="通知を閉じる">×</button>
        </div>
      ))}
    </div>
  );
}
