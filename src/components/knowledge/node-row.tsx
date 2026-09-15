'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  Copy,
  CornerDownRight,
  IndentDecrease,
  IndentIncrease,
  MoreHorizontal,
  MoveDown,
  MoveRight,
  MoveUp,
  Pencil,
  Plus,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KnowledgeNode, KnowledgeStatus } from '@/lib/types';
import { isArchived } from '@/lib/knowledge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Status dot ─────────────────────────────────────────────────────
// Status is encoded by shape and fill, not colour alone.

const STATUS_DOT_CLASS: Record<KnowledgeStatus, string> = {
  not_started: 'text-muted-foreground',
  learning: 'text-[var(--delulu-info)]',
  understood: 'text-[var(--delulu-success)]',
  needs_review: 'text-[var(--delulu-warning)]',
  mastered: 'text-[var(--delulu-purple)]',
  archived: 'text-muted-foreground',
};

export function KnowledgeStatusDot({
  status,
  archived,
  className,
}: {
  status: KnowledgeStatus;
  archived?: boolean;
  className?: string;
}) {
  const effective: KnowledgeStatus = archived ? 'archived' : status;
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex size-2.5 shrink-0 items-center justify-center rounded-full border border-current',
        STATUS_DOT_CLASS[effective],
        (effective === 'not_started' || effective === 'archived') && 'opacity-45',
        effective === 'needs_review' && 'border-dashed',
        effective === 'mastered' && 'ring-1 ring-current/40 ring-offset-1 ring-offset-background',
        className
      )}
    >
      {effective === 'learning' && (
        <span className="absolute inset-x-0 bottom-0 h-[45%] rounded-b-full bg-current" />
      )}
      {effective === 'understood' && <span className="absolute inset-0 rounded-full bg-current" />}
      {effective === 'mastered' && <span className="absolute inset-0 rounded-full bg-current" />}
      {effective === 'needs_review' && <span className="size-1 rounded-full bg-current" />}
      {effective === 'archived' && <span className="h-px w-2 rotate-45 rounded-full bg-current" />}
    </span>
  );
}

// ─── Row actions ────────────────────────────────────────────────────

export interface KnowledgeRowActions {
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onCommitRename: (id: string, title: string) => void;
  onCancelRename: () => void;
  onStartRename: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
  onMoveInto: (id: string) => void;
  onMoveSibling: (id: string, direction: -1 | 1) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOverRow: (event: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragLeaveRow: (id: string) => void;
  onDropRow: (event: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd: () => void;
}

export type KnowledgeDropZone = 'before' | 'after' | 'into';

export interface KnowledgeRowProps {
  node: KnowledgeNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  selected: boolean;
  childCount: number;
  progress: number;
  derivedProgress: boolean;
  renaming: boolean;
  dropZone: KnowledgeDropZone | null;
  dragging: boolean;
  match: boolean;
  context: boolean;
  path: string[];
  actions: KnowledgeRowActions;
}

// ─── Inline rename ──────────────────────────────────────────────────
// Mounted only while renaming, so it always starts from the node's title.

function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);

  const commit = () => {
    const title = draft.trim();
    if (!title || title === initial) onCancel();
    else onCommit(title);
  };

  return (
    <input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      aria-label="Rename node"
      className="w-full rounded-md border border-primary/50 bg-background px-1.5 py-0.5 text-sm outline-none"
    />
  );
}

// ─── Row ────────────────────────────────────────────────────────────

function KnowledgeNodeRowInner({
  node,
  depth,
  hasChildren,
  expanded,
  selected,
  childCount,
  progress,
  derivedProgress,
  renaming,
  dropZone,
  dragging,
  match,
  context,
  path,
  actions,
}: KnowledgeRowProps) {
  const archived = isArchived(node);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (renaming) return;
    const withAlt = event.altKey;
    if (event.key === 'F2') {
      event.preventDefault();
      actions.onStartRename(node.id);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      actions.onSelect(node.id);
      return;
    }
    if (event.key === 'Escape') {
      actions.onDeselect();
      return;
    }
    if (event.key === 'ArrowRight' && !withAlt) {
      if (hasChildren && !expanded) {
        event.preventDefault();
        actions.onToggle(node.id);
      }
      return;
    }
    if (event.key === 'ArrowLeft' && !withAlt) {
      if (hasChildren && expanded) {
        event.preventDefault();
        actions.onToggle(node.id);
      }
      return;
    }
    if (!withAlt) return;
    // Keyboard-accessible alternative to dragging.
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      actions.onMoveSibling(node.id, -1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      actions.onMoveSibling(node.id, 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      actions.onIndent(node.id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      actions.onOutdent(node.id);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      actions.onDelete(node.id);
    }
  };

  return (
    <div
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      tabIndex={0}
      data-knowledge-row={node.id}
      draggable={!renaming}
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', node.id);
        actions.onDragStart(node.id);
      }}
      onDragOver={(event) => actions.onDragOverRow(event, node.id)}
      onDragLeave={() => actions.onDragLeaveRow(node.id)}
      onDrop={(event) => actions.onDropRow(event, node.id)}
      onDragEnd={actions.onDragEnd}
      onClick={() => actions.onSelect(node.id)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        actions.onStartRename(node.id);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex items-center gap-1.5 rounded-xl py-1 pr-1.5 outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-primary/40',
        selected ? 'bg-secondary' : 'hover:bg-muted/50',
        context && 'opacity-70',
        archived && !context && 'opacity-60',
        dragging && 'opacity-30',
        dropZone === 'into' && 'bg-primary/5 ring-1 ring-primary/50'
      )}
      style={{ paddingLeft: 4 + depth * 18 }}
    >
      {dropZone === 'before' && (
        <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded-full bg-primary" aria-hidden />
      )}
      {dropZone === 'after' && (
        <span className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden />
      )}

      {/* Chevron */}
      {hasChildren ? (
        <button
          type="button"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={(event) => {
            event.stopPropagation();
            actions.onToggle(node.id);
          }}
          className="-ml-0.5 flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>
      ) : (
        <span className="size-4 shrink-0" aria-hidden />
      )}

      <KnowledgeStatusDot status={node.status} archived={node.archived} />

      {/* Title / inline rename */}
      <div className="min-w-0 flex-1">
        {renaming ? (
          <RenameInput
            initial={node.title}
            onCommit={(title) => actions.onCommitRename(node.id, title)}
            onCancel={actions.onCancelRename}
          />
        ) : (
          <>
            <span className={cn('block truncate text-sm', archived && 'text-muted-foreground')}>
              {node.title}
              {archived && <span className="ml-2 text-[10px] uppercase tracking-wide">Archived</span>}
            </span>
            {path.length > 0 && (
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {path.join(' / ')}
              </span>
            )}
          </>
        )}
      </div>

      {/* Match marker when searching */}
      {match && path.length > 0 && !renaming && (
        <span className="hidden shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground min-[1200px]:inline">
          match
        </span>
      )}

      {/* Meta: child count + progress */}
      {!renaming && (
        <span
          className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
          title={derivedProgress ? 'Derived from children' : 'This node’s own progress'}
        >
          {childCount > 0 && <span className="mr-1.5 text-muted-foreground/70">{childCount}</span>}
          {progress}%
        </span>
      )}

      {/* Hover actions */}
      {!renaming && (
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            aria-label="Add child node"
            title="Add child"
            onClick={(event) => {
              event.stopPropagation();
              actions.onAddChild(node.id);
            }}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${node.title}`}
                onClick={(event) => event.stopPropagation()}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => actions.onAddChild(node.id)}>
                <Plus className="size-3.5" />
                Add child
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onAddSibling(node.id)}>
                <CornerDownRight className="size-3.5" />
                Add sibling
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onStartRename(node.id)}>
                <Pencil className="size-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => actions.onMoveSibling(node.id, -1)}>
                <MoveUp className="size-3.5" />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onMoveSibling(node.id, 1)}>
                <MoveDown className="size-3.5" />
                Move down
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onIndent(node.id)}>
                <IndentIncrease className="size-3.5" />
                Indent under previous
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onOutdent(node.id)}>
                <IndentDecrease className="size-3.5" />
                Outdent one level
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onMoveInto(node.id)}>
                <MoveRight className="size-3.5" />
                Move into…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => actions.onDuplicate(node.id)}>
                <Copy className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onArchive(node.id, !node.archived)}>
                {node.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                {node.archived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(node.id)}>
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      )}
    </div>
  );
}

export const KnowledgeNodeRow = React.memo(KnowledgeNodeRowInner);
KnowledgeNodeRow.displayName = 'KnowledgeNodeRow';
