'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KnowledgeNode } from '@/lib/types';
import type { KnowledgeIndex } from '@/lib/knowledge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * "Move into…" — the keyboard-accessible counterpart to dragging.
 * Lists every legal destination except the node itself and its descendants.
 */
export function MoveNodeDialog({
  open,
  onOpenChange,
  index,
  nodeId,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: KnowledgeIndex;
  nodeId: string | null;
  onMove: (nodeId: string, parentId: string | null, order: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<'last' | 'first'>('last');
  const node = nodeId ? index.byId.get(nodeId) : null;

  const options = useMemo(() => {
    if (!node) return [];
    const blocked = new Set<string>([node.id]);
    // Walking the index keeps this correct even for deep subtrees.
    const stack = [node.id];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      for (const child of index.childrenOf.get(current) ?? []) {
        blocked.add(child.id);
        stack.push(child.id);
      }
    }
    return Array.from(index.byId.values())
      .filter((candidate) => !blocked.has(candidate.id))
      .map((candidate) => ({
        id: candidate.id,
        depth: index.depthById.get(candidate.id) ?? 0,
        title: candidate.title,
        path: (index.ancestorsById.get(candidate.id) ?? []).map((a) => a.title).join(' / '),
      }))
      .sort((a, b) => `${a.path}/${a.title}`.localeCompare(`${b.path}/${b.title}`));
  }, [index, node]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      `${option.title} ${option.path}`.toLowerCase().includes(term)
    );
  }, [options, query]);

  const moveTo = (parentId: string | null) => {
    if (!node) return;
    const destinationSiblings = (index.childrenOf.get(parentId) ?? []).filter((s) => s.id !== node.id);
    const order = position === 'first' ? 0 : destinationSiblings.length;
    onMove(node.id, parentId, order);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Move {node ? `“${node.title}”` : 'node'}</DialogTitle>
          <DialogDescription>
            Choose a new parent. A node can never be moved inside itself.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 px-2 py-1.5 focus-within:border-primary/50">
            <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search destinations…"
              aria-label="Search destinations"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Place at</span>
            <div className="flex rounded-lg bg-secondary p-0.5">
              {(['first', 'last'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPosition(option)}
                  className={cn(
                    'rounded-md px-2 py-0.5 font-medium transition-colors',
                    position === option ? 'bg-background text-foreground' : 'hover:text-foreground'
                  )}
                >
                  {option === 'first' ? 'Start' : 'End'}
                </button>
              ))}
            </div>
            <span>of the destination’s children</span>
          </div>

          <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => moveTo(null)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
            >
              <span className="text-muted-foreground">Top level</span>
            </button>
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">No other destinations.</p>
            )}
            {filtered.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => moveTo(option.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                style={{ paddingLeft: 8 + option.depth * 14 }}
              >
                <span className="min-w-0 flex-1 truncate">{option.title}</span>
                {option.path && (
                  <span className="hidden max-w-[45%] shrink-0 truncate text-[11px] text-muted-foreground min-[900px]:inline">
                    {option.path}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
