'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CornerDownLeft, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * One input used for every "add a node" flow: the root composer at the top of
 * the tree and the inline "+ child" / "+ sibling" composers.
 *
 * Enter or Ctrl/Cmd+Enter commits. Escape clears, then closes.
 */
export function AddNodeInput({
  placeholder,
  onAdd,
  indent = 0,
  autoFocus = false,
  onClose,
  keepOpen = false,
  submitLabel = 'Add',
  className,
}: {
  placeholder: string;
  onAdd: (title: string) => void;
  indent?: number;
  autoFocus?: boolean;
  onClose?: () => void;
  keepOpen?: boolean;
  submitLabel?: string;
  className?: string;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const commit = () => {
    const title = value.trim();
    if (!title) return;
    onAdd(title);
    setValue('');
    if (!keepOpen) onClose?.();
    else inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border border-border/70 bg-background px-2 py-1.5 transition-colors focus-within:border-primary/50',
        className
      )}
      style={{ marginLeft: indent }}
    >
      <Plus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            if (value) setValue('');
            else onClose?.();
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        onClick={commit}
        disabled={!value.trim()}
        className={cn(
          'shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors',
          value.trim() ? 'hover:bg-muted hover:text-foreground' : 'opacity-40'
        )}
      >
        <span className="hidden items-center gap-1 min-[1200px]:inline-flex">
          {submitLabel}
          <CornerDownLeft className="size-3" />
        </span>
        <span className="min-[1200px]:hidden">Add</span>
      </button>
      {onClose && (
        <button
          type="button"
          aria-label="Close input"
          onClick={onClose}
          className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
