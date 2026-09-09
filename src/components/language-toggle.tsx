'use client';

import { Globe } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);

  return (
    <div className="flex items-center gap-2">
      <Globe className="size-4 text-muted-foreground" />
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          onClick={() => setLanguage('en')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            language === 'en'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground hover:bg-secondary'
          )}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('hi')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors',
            language === 'hi'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground hover:bg-secondary'
          )}
        >
          हि
        </button>
      </div>
    </div>
  );
}
