'use client';

import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from 'react';

// ─── Types ──────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastItem extends Required<ToastOptions> {
  id: string;
  dismissing: boolean;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within a <ToastProvider>');
  }
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────

export function ToastProviderInner({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Clear any pending auto-dismiss timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    // Animate out then remove
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t))
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 260);
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${++idCounter}`;
      const duration = options.duration ?? 4000;

      const item: ToastItem = {
        id,
        title: options.title,
        description: options.description ?? '',
        variant: options.variant ?? 'default',
        duration,
        dismissing: false,
      };

      setToasts((prev) => {
        // Stack up to 3; dismiss oldest if exceeded
        const next = [...prev, item];
        if (next.length > 3) {
          const evicted = next[0];
          const timer = timersRef.current.get(evicted.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(evicted.id);
          }
          return next.slice(-3);
        }
        return next;
      });

      // Auto-dismiss timer
      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}
