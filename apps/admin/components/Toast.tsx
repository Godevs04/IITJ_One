'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  push: (kind: ToastKind, title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, kind, title, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-fadeIn rounded-xl border px-4 py-3 shadow-elevated ${
              toast.kind === 'success'
                ? 'border-sage/30 bg-white'
                : toast.kind === 'error'
                  ? 'border-non-veg/30 bg-white'
                  : 'border-border bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={`text-sm font-semibold ${
                    toast.kind === 'success'
                      ? 'text-sage'
                      : toast.kind === 'error'
                        ? 'text-non-veg'
                        : 'text-indigo'
                  }`}
                >
                  {toast.title}
                </p>
                {toast.message ? (
                  <p className="mt-0.5 text-sm text-muted">{toast.message}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-muted transition hover:text-ink"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function useToastSafe() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ctx = useContext(ToastContext);
  if (!mounted || !ctx) {
    return {
      push: () => undefined,
      dismiss: () => undefined,
      toasts: [] as ToastItem[],
    };
  }
  return ctx;
}
