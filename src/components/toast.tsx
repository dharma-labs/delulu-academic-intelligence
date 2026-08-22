'use client';

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ToastProviderInner, useToastContext, type ToastOptions, type ToastVariant } from '@/lib/toast-store';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// ─── Variant config ─────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: typeof Info; borderClass: string; iconClass: string; titleClass: string; progressClass: string }
> = {
  default: {
    icon: Info,
    borderClass: 'metric-card-accent-primary',
    iconClass: 'text-primary',
    titleClass: 'text-foreground',
    progressClass: 'bg-primary',
  },
  success: {
    icon: CheckCircle2,
    borderClass: 'metric-card-accent-success',
    iconClass: 'text-emerald-500 dark:text-emerald-400',
    titleClass: 'text-foreground',
    progressClass: 'bg-emerald-500 dark:bg-emerald-400',
  },
  warning: {
    icon: AlertTriangle,
    borderClass: 'metric-card-accent-warning',
    iconClass: 'text-amber-500 dark:text-amber-400',
    titleClass: 'text-foreground',
    progressClass: 'bg-amber-500 dark:bg-amber-400',
  },
  error: {
    icon: XCircle,
    borderClass: 'metric-card-accent-danger',
    iconClass: 'text-red-500 dark:text-red-400',
    titleClass: 'text-foreground',
    progressClass: 'bg-red-500 dark:bg-red-400',
  },
  info: {
    icon: Info,
    borderClass: 'metric-card-accent-info',
    iconClass: 'text-blue-500 dark:text-blue-400',
    titleClass: 'text-foreground',
    progressClass: 'bg-blue-500 dark:bg-blue-400',
  },
};

// ─── Single Toast ───────────────────────────────────────────────

const MAX_TOASTS = 3;

function ToastItem({
  toast: t,
  onDismiss,
  stackIndex,
}: {
  toast: import('@/lib/toast-store').ToastItem;
  onDismiss: (id: string) => void;
  stackIndex: number;
}) {
  const config = VARIANT_CONFIG[t.variant];
  const Icon = config.icon;
  const progressRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  // Progress bar animation
  useEffect(() => {
    if (t.dismissing) return;

    startTimeRef.current = Date.now();

    const tick = () => {
      if (progressRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, 1 - elapsed / t.duration);
        progressRef.current.style.transform = `scaleX(${remaining})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [t.duration, t.dismissing]);

  return (
    <div
      className={cn(
        'metric-card w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-0 overflow-hidden shadow-lg',
        config.borderClass,
        t.dismissing ? 'toast-exit' : 'toast-enter'
      )}
      role="alert"
      aria-live="assertive"
      style={{
        // Stack offset: newest at top, older below
        transformOrigin: 'bottom center',
      }}
    >
      <div className="flex items-start gap-3 p-3.5 pb-3">
        <Icon className={cn('size-4.5 mt-0.5 shrink-0', config.iconClass)} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium leading-snug', config.titleClass)}>{t.title}</p>
          {t.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(t.id)}
          className="shrink-0 flex items-center justify-center h-5 w-5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-[2px] w-full bg-secondary overflow-hidden">
        <div
          ref={progressRef}
          className={cn('h-full origin-left', config.progressClass, 'transition-none')}
          style={{
            transform: 'scaleX(1)',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  );
}

// ─── Toast Container ────────────────────────────────────────────

function ToastContainer() {
  const { toasts, dismiss } = useToastContext();

  // Reverse so newest renders at bottom (closest to user on mobile)
  const visibleToasts = useMemo(
    () => [...toasts].reverse(),
    [toasts]
  );

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className={cn(
        'fixed z-[100] flex flex-col gap-2 p-4 pointer-events-none',
        // Desktop: bottom-right; Mobile: bottom-center
        'bottom-[76px] md:bottom-4',
        'left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0',
        'md:right-4'
      )}
    >
      {visibleToasts.map((t, i) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={dismiss} stackIndex={toasts.length - 1 - i} />
        </div>
      ))}
    </div>
  );
}

// ─── Public Provider ─────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProviderInner>
      {children}
      <ToastContainer />
    </ToastProviderInner>
  );
}

// ─── Public Hook ─────────────────────────────────────────────────

export function useToast() {
  const { toast } = useToastContext();
  return { toast };
}
