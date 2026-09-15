'use client';

import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { buildKnowledgeHomeLine, buildKnowledgeIndex } from '@/lib/knowledge';

/**
 * One quiet line about the knowledge tree.
 *
 * It only appears when real nodes make the sentence true — no placeholders, no
 * invented percentages. Everything else in Home stays as it was.
 */
export function KnowledgeLine({ className }: { className?: string }) {
  const knowledgeNodes = useStore((s) => s.knowledgeNodes);
  const subjects = useStore((s) => s.subjects);
  const navigate = useStore((s) => s.navigate);

  const line = useMemo(() => {
    if (knowledgeNodes.length === 0) return null;
    return buildKnowledgeHomeLine(knowledgeNodes, buildKnowledgeIndex(knowledgeNodes), subjects);
  }, [knowledgeNodes, subjects]);

  if (!line) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('knowledge' as never)}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition-colors hover:bg-muted/40',
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-[var(--delulu-purple)]" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm">
        {line.title}
        {line.detail && <span className="text-muted-foreground"> · {line.detail}</span>}
      </span>
      <span className="shrink-0 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
        View Knowledge Tree
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
    </button>
  );
}
