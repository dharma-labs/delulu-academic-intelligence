'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  CircleSlash,
  Keyboard,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { KnowledgeNode } from '@/lib/types';
import {
  KNOWLEDGE_FILTERS,
  buildKnowledgeIndex,
  effectiveProgress,
  filterCounts,
  isArchived,
  isDerivedProgress,
  knowledgeNodeDraft,
  matchesFilter,
  nextSiblingOrder,
  searchKnowledgeNodes,
  type KnowledgeFilter,
  type KnowledgeIndex,
} from '@/lib/knowledge';
import { KnowledgeNodeRow, type KnowledgeDropZone, type KnowledgeRowActions } from './node-row';
import { AddNodeInput } from './add-node-input';

/**
 * The tree pane.
 *
 * Rendering model: the tree is flattened into the list of rows that are
 * actually visible (collapsed branches, filtered nodes and search misses are
 * never built), then each row is memoised. Nothing is auto-arranged — `order`
 * is owned by the user.
 */

export interface VisibleRow {
  node: KnowledgeNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  childCount: number;
  progress: number;
  derived: boolean;
  match: boolean;
  context: boolean;
  path: string[];
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

function buildVisibleRows(
  index: KnowledgeIndex,
  options: {
    filter: KnowledgeFilter;
    subjectFilter: string;
    query: string;
    expanded: ReadonlySet<string>;
  }
): { rows: VisibleRow[]; narrowed: boolean; matchCount: number; shownCount: number } {
  const search = searchKnowledgeNodes(Array.from(index.byId.values()), index, options.query);
  const narrowed = options.filter !== 'all' || options.subjectFilter !== 'all' || search !== null;

  // A node is a "target" when it satisfies the filter, subject and query itself.
  const targets = new Set<string>();
  for (const node of index.byId.values()) {
    if (!matchesFilter(node, options.filter)) continue;
    if (search && !search.matches.has(node.id)) continue;
    targets.add(node.id);
  }

  // Subject filter: a node inherits the subject set of its ancestors, so a whole
  // branch stays visible when its root is tagged with that subject.
  const subjectAllowed = new Set<string>();
  if (options.subjectFilter === 'all') {
    for (const id of index.byId.keys()) subjectAllowed.add(id);
  } else {
    const walk = (ids: string[], inherited: boolean) => {
      for (const id of ids) {
        const node = index.byId.get(id);
        if (!node) continue;
        const allowed = inherited || node.subjectIds.includes(options.subjectFilter);
        if (allowed) subjectAllowed.add(id);
        walk((index.childrenOf.get(id) ?? []).map((c) => c.id), allowed);
      }
    };
    walk(index.rootIds, false);
  }

  const own = new Set<string>();
  for (const id of targets) if (subjectAllowed.has(id)) own.add(id);

  // Keep a node when it or anything below it matches, so no match is orphaned.
  const keep = new Set<string>();
  const order: string[] = [];
  const visited = new Set<string>();
  const stack = [...index.rootIds].reverse();
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (visited.has(id)) continue;
    visited.add(id);
    order.push(id);
    for (const child of index.childrenOf.get(id) ?? []) stack.push(child.id);
  }
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const id = order[i];
    if (!own.has(id)) continue;
    keep.add(id);
    for (const ancestor of index.ancestorsById.get(id) ?? []) keep.add(ancestor.id);
  }

  const forceExpand = narrowed ? keep : EMPTY_SET;

  const rows: VisibleRow[] = [];
  if (keep.size > 0) {
    const queue = [...index.rootIds].reverse().map((id) => ({ id, depth: 0, path: [] as string[] }));
    while (queue.length > 0) {
      const { id, depth, path } = queue.pop() as { id: string; depth: number; path: string[] };
      if (!keep.has(id)) continue;
      const node = index.byId.get(id) as KnowledgeNode;
      const children = index.childrenOf.get(id) ?? [];
      const expanded = options.expanded.has(id) || forceExpand.has(id);
      rows.push({
        node,
        depth,
        hasChildren: children.length > 0,
        expanded,
        childCount: children.length,
        progress: effectiveProgress(node, index),
        derived: isDerivedProgress(node, index),
        match: own.has(id),
        context: narrowed && !own.has(id),
        path: search && depth > 0 ? path : [],
      });
      if (expanded) {
        const nextPath = [...path, node.title];
        for (let i = children.length - 1; i >= 0; i -= 1) {
          queue.push({ id: children[i].id, depth: depth + 1, path: nextPath });
        }
      }
    }
  }

  return { rows, narrowed, matchCount: own.size, shownCount: rows.length };
}

export function KnowledgeTree({
  selectedId,
  onSelect,
  onRequestDelete,
  onRequestMove,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRequestDelete: (id: string) => void;
  onRequestMove: (id: string) => void;
}) {
  const nodes = useStore((s) => s.knowledgeNodes);
  const subjects = useStore((s) => s.subjects);
  const addKnowledgeNode = useStore((s) => s.addKnowledgeNode);
  const updateKnowledgeNode = useStore((s) => s.updateKnowledgeNode);
  const deleteKnowledgeNode = useStore((s) => s.deleteKnowledgeNode);
  const moveKnowledgeNode = useStore((s) => s.moveKnowledgeNode);
  const reorderKnowledgeNode = useStore((s) => s.reorderKnowledgeNode);
  const duplicateKnowledgeNode = useStore((s) => s.duplicateKnowledgeNode);
  const archiveKnowledgeNode = useStore((s) => s.archiveKnowledgeNode);

  const index = useMemo(() => buildKnowledgeIndex(nodes), [nodes]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [collapsedAll, setCollapsedAll] = useState(false);
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<KnowledgeFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [composerFor, setComposerFor] = useState<{ id: string; mode: 'child' | 'sibling' } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dropRef = useRef<{ id: string; zone: KnowledgeDropZone } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; zone: KnowledgeDropZone } | null>(null);
  const [rootDropActive, setRootDropActive] = useState(false);

  const rootInputRef = useRef<HTMLDivElement>(null);

  // Roots are open until the user takes over the expand state (derived, not an effect).
  const effectiveExpanded = useMemo(() => {
    if (collapsedAll) return EMPTY_SET;
    if (hasUserToggled) return expanded;
    return new Set<string>([...expanded, ...index.rootIds]);
  }, [collapsedAll, expanded, hasUserToggled, index.rootIds]);

  const { rows, narrowed, matchCount, shownCount } = useMemo(
    () =>
      buildVisibleRows(index, {
        filter,
        subjectFilter,
        query,
        expanded: effectiveExpanded,
      }),
    [index, filter, subjectFilter, query, effectiveExpanded]
  );

  const counts = useMemo(() => filterCounts(nodes), [nodes]);
  const allIds = useMemo(() => nodes.map((n) => n.id), [nodes]);
  const hasNestedNodes = useMemo(() => nodes.some((n) => n.parentId !== null), [nodes]);

  // Keep the selected row in view (keyboard / panel driven selection).
  useEffect(() => {
    if (!selectedId) return;
    const element = document.querySelector(`[data-knowledge-row="${selectedId}"]`);
    element?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, rows]);

  const toggleExpand = useCallback((id: string) => {
    setHasUserToggled(true);
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setHasUserToggled(true);
    setCollapsedAll(false);
    setExpanded(new Set(allIds));
  }, [allIds]);

  const collapseAll = useCallback(() => {
    setHasUserToggled(true);
    setCollapsedAll(true);
    setExpanded(new Set());
  }, []);

  // ── Node mutations ───────────────────────────────────────────────
  const addRoot = useCallback(
    (title: string) => {
      addKnowledgeNode(
        knowledgeNodeDraft({ title, parentId: null, order: nextSiblingOrder(nodes, null) })
      );
    },
    [addKnowledgeNode, nodes]
  );

  const addChildOf = useCallback(
    (parentId: string) => {
      setComposerFor({ id: parentId, mode: 'child' });
      setExpanded((previous) => new Set(previous).add(parentId));
    },
    []
  );

  const addSiblingOf = useCallback((id: string) => {
    setComposerFor({ id, mode: 'sibling' });
  }, []);

  const commitComposer = useCallback(
    (title: string) => {
      if (!composerFor) return;
      const sibling = index.byId.get(composerFor.id);
      if (!sibling) return;
      if (composerFor.mode === 'child') {
        addKnowledgeNode(
          knowledgeNodeDraft({
            title,
            parentId: sibling.id,
            order: nextSiblingOrder(nodes, sibling.id),
          })
        );
      } else {
        addKnowledgeNode(
          knowledgeNodeDraft({
            title,
            parentId: sibling.parentId,
            order: nextSiblingOrder(nodes, sibling.parentId),
          })
        );
      }
    },
    [addKnowledgeNode, composerFor, index, nodes]
  );

  const moveSibling = useCallback(
    (id: string, direction: -1 | 1) => {
      const node = index.byId.get(id);
      if (!node) return;
      const siblings = index.childrenOf.get(node.parentId) ?? [];
      const position = siblings.findIndex((s) => s.id === id);
      const target = position + direction;
      if (position < 0 || target < 0 || target > siblings.length - 1) return;
      reorderKnowledgeNode(id, target);
    },
    [index, reorderKnowledgeNode]
  );

  const indentNode = useCallback(
    (id: string) => {
      const node = index.byId.get(id);
      if (!node) return;
      const siblings = index.childrenOf.get(node.parentId) ?? [];
      const position = siblings.findIndex((s) => s.id === id);
      if (position <= 0) return;
      const previousSibling = siblings[position - 1];
      moveKnowledgeNode(id, previousSibling.id, nextSiblingOrder(nodes, previousSibling.id));
      setExpanded((previous) => new Set(previous).add(previousSibling.id));
    },
    [index, moveKnowledgeNode, nodes]
  );

  const outdentNode = useCallback(
    (id: string) => {
      const node = index.byId.get(id);
      if (!node || node.parentId === null) return;
      const parent = index.byId.get(node.parentId);
      if (!parent) return;
      const parentSiblings = index.childrenOf.get(parent.parentId) ?? [];
      const parentPosition = parentSiblings.findIndex((s) => s.id === parent.id);
      moveKnowledgeNode(id, parent.parentId, parentPosition + 1);
    },
    [index, moveKnowledgeNode]
  );

  const handleArchive = useCallback(
    (id: string, archived: boolean) => archiveKnowledgeNode(id, archived),
    [archiveKnowledgeNode]
  );

  // ── Drag and drop ────────────────────────────────────────────────
  // The ref is the authoritative drag source: a drop must never depend on a
  // re-render having committed since dragstart.
  const sourceId = () => dragIdRef.current;

  const isIllegalTarget = useCallback(
    (targetId: string) => {
      const from = sourceId();
      if (!from) return true;
      if (from === targetId) return true;
      // A node can never be dropped inside its own subtree.
      let cursor: string | null = targetId;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor)) {
        if (cursor === from) return true;
        seen.add(cursor);
        cursor = index.byId.get(cursor)?.parentId ?? null;
      }
      return false;
    },
    [index]
  );

  const dropIndexFor = useCallback(
    (targetNode: KnowledgeNode, zone: KnowledgeDropZone) => {
      const from = sourceId();
      const siblings = (index.childrenOf.get(targetNode.parentId) ?? []).filter(
        (s) => s.id !== from
      );
      const position = siblings.findIndex((s) => s.id === targetNode.id);
      if (position < 0) return siblings.length;
      return zone === 'after' ? position + 1 : position;
    },
    [index]
  );

  const handleDragOverRow = useCallback(
    (event: React.DragEvent<HTMLDivElement>, id: string) => {
      if (!sourceId()) return;
      if (isIllegalTarget(id)) {
        setDropTarget(null);
        dropRef.current = null;
        event.dataTransfer.dropEffect = 'none';
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
      const zone: KnowledgeDropZone = ratio < 0.28 ? 'before' : ratio > 0.72 ? 'after' : 'into';
      const previous = dropRef.current;
      if (previous && previous.id === id && previous.zone === zone) return;
      dropRef.current = { id, zone };
      // Only the rows whose indicator changes re-render.
      setDropTarget({ id, zone });
    },
    [isIllegalTarget]
  );

  const handleDropRow = useCallback(
    (event: React.DragEvent<HTMLDivElement>, id: string) => {
      event.preventDefault();
      event.stopPropagation();
      const from = sourceId();
      const current = dropRef.current;
      const zone = current && current.id === id ? current.zone : 'into';
      const targetNode = index.byId.get(id);
      dropRef.current = null;
      setDropTarget(null);
      setRootDropActive(false);
      if (!from || !targetNode || isIllegalTarget(id)) return;
      if (zone === 'into') moveKnowledgeNode(from, id);
      else moveKnowledgeNode(from, targetNode.parentId, dropIndexFor(targetNode, zone));
    },
    [dropIndexFor, index, isIllegalTarget, moveKnowledgeNode]
  );

  const handleRootDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const from = sourceId();
      if (!from) return;
      moveKnowledgeNode(from, null, nextSiblingOrder(nodes, null));
      dropRef.current = null;
      dragIdRef.current = null;
      setDropTarget(null);
      setRootDropActive(false);
      setDragId(null);
    },
    [moveKnowledgeNode, nodes]
  );

  const rowActions: KnowledgeRowActions = useMemo(
    () => ({
      onToggle: toggleExpand,
      onSelect: (id: string) => onSelect(id),
      onDeselect: () => onSelect(null),
      onCommitRename: (id, title) => {
        updateKnowledgeNode(id, { title });
        setRenameId(null);
      },
      onCancelRename: () => setRenameId(null),
      onStartRename: (id: string) => setRenameId(id),
      onAddChild: addChildOf,
      onAddSibling: addSiblingOf,
      onDuplicate: (id: string) => duplicateKnowledgeNode(id),
      onArchive: handleArchive,
      onDelete: (id: string) => onRequestDelete(id),
      onMoveInto: (id: string) => onRequestMove(id),
      onMoveSibling: moveSibling,
      onIndent: indentNode,
      onOutdent: outdentNode,
      onDragStart: (id: string) => {
        dragIdRef.current = id;
        setDragId(id);
      },
      onDragOverRow: handleDragOverRow,
      onDragLeaveRow: (id: string) => {
        if (dropRef.current?.id === id) dropRef.current = null;
        setDropTarget((previous) => (previous && previous.id === id ? null : previous));
      },
      onDropRow: handleDropRow,
      onDragEnd: () => {
        dragIdRef.current = null;
        dropRef.current = null;
        setDragId(null);
        setDropTarget(null);
        setRootDropActive(false);
      },
    }),
    [
      addChildOf,
      addSiblingOf,
      duplicateKnowledgeNode,
      handleArchive,
      handleDragOverRow,
      handleDropRow,
      indentNode,
      moveSibling,
      onRequestDelete,
      onRequestMove,
      onSelect,
      outdentNode,
      toggleExpand,
      updateKnowledgeNode,
    ]
  );

  const clearNarrowing = () => {
    setQuery('');
    setFilter('all');
    setSubjectFilter('all');
  };

  const subjectsInUse = useMemo(() => {
    const ids = new Set<string>();
    for (const node of nodes) for (const id of node.subjectIds) ids.add(id);
    return subjects.filter((s) => ids.has(s.id));
  }, [nodes, subjects]);

  const showEmptyState = nodes.length === 0;
  const showNoResults = !showEmptyState && rows.length === 0;

  return (
    <div className="space-y-3">
      {/* Quick add */}
      <div ref={rootInputRef}>
        <AddNodeInput
          placeholder={selectedId ? 'Add another root node…' : 'Add a concept…'}
          onAdd={addRoot}
          submitLabel="Add root"
          keepOpen
          className="bg-card"
        />
      </div>

      {/* Search + filters */}
      {!showEmptyState && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-border/70 bg-card px-2 py-1.5 focus-within:border-primary/50">
              <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, descriptions, tags…"
                aria-label="Search the knowledge tree"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={expandAll}
                title="Expand all"
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <ChevronsUpDown className="size-3.5" />
                <span className="hidden min-[1100px]:inline">Expand all</span>
              </button>
              <button
                type="button"
                onClick={collapseAll}
                disabled={!hasNestedNodes}
                title="Collapse all"
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronsDownUp className="size-3.5" />
                <span className="hidden min-[1100px]:inline">Collapse all</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {KNOWLEDGE_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  filter === option.id
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
                <span className="ml-1 tabular-nums text-muted-foreground/70">
                  {counts[option.id]}
                </span>
              </button>
            ))}

            {subjectsInUse.length > 0 && (
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                aria-label="Filter by subject"
                className="ml-auto rounded-lg border border-border/70 bg-card px-2 py-1 text-xs text-muted-foreground outline-none focus:border-primary/50"
              >
                <option value="all">All subjects</option>
                {subjectsInUse.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {narrowed && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              Showing {shownCount} of {nodes.length} nodes
              {matchCount !== shownCount && (
                <span className="text-muted-foreground/70">
                  · {matchCount} match{matchCount === 1 ? '' : 'es'} (ancestors kept for context)
                </span>
              )}
              <button
                type="button"
                onClick={clearNarrowing}
                className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                <CircleSlash className="size-3" />
                Clear
              </button>
            </p>
          )}
        </div>
      )}

      {/* Tree */}
      {showEmptyState ? (
        <KnowledgeEmptyState
          onFocusInput={() => rootInputRef.current?.querySelector<HTMLInputElement>('input')?.focus()}
        />
      ) : showNoResults ? (
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-8 text-center">
          <p className="text-sm">No nodes match this view.</p>
          <button
            type="button"
            onClick={clearNarrowing}
            className="mt-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <div
          role="tree"
          aria-label="Knowledge tree"
          className="rounded-2xl border border-border/70 bg-card p-1.5"
        >
          {rows.map((row) => {
            const composerMode =
              composerFor && composerFor.id === row.node.id ? composerFor.mode : null;
            return (
              <React.Fragment key={row.node.id}>
                <KnowledgeNodeRow
                  node={row.node}
                  depth={row.depth}
                  hasChildren={row.hasChildren}
                  expanded={row.expanded}
                  selected={selectedId === row.node.id}
                  childCount={row.childCount}
                  progress={row.progress}
                  derivedProgress={row.derived}
                  renaming={renameId === row.node.id}
                  dropZone={dropTarget?.id === row.node.id ? dropTarget.zone : null}
                  dragging={dragId === row.node.id}
                  match={row.match}
                  context={row.context}
                  path={row.path}
                  actions={rowActions}
                />
                {composerMode === 'child' && (
                  <div className="py-1" style={{ paddingLeft: 4 + (row.depth + 1) * 18 }}>
                    <AddNodeInput
                      placeholder={`New child of ${row.node.title}…`}
                      onAdd={commitComposer}
                      autoFocus
                      keepOpen
                      onClose={() => setComposerFor(null)}
                    />
                  </div>
                )}
                {composerMode === 'sibling' && (
                  <div className="py-1" style={{ paddingLeft: 4 + row.depth * 18 }}>
                    <AddNodeInput
                      placeholder={`New sibling of ${row.node.title}…`}
                      onAdd={commitComposer}
                      autoFocus
                      keepOpen
                      onClose={() => setComposerFor(null)}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Drop to top level — also the keyboard-free escape hatch while dragging */}
          <div
            onDragOver={(event) => {
              if (!dragId) return;
              event.preventDefault();
              event.stopPropagation();
              setDropTarget(null);
              setRootDropActive(true);
            }}
            onDragLeave={() => setRootDropActive(false)}
            onDrop={handleRootDrop}
            className={cn(
              'mt-1 rounded-xl border border-dashed px-3 py-2 text-center text-xs transition-colors',
              rootDropActive && dragId
                ? 'border-primary/60 bg-primary/5 text-foreground'
                : 'border-transparent text-muted-foreground'
            )}
          >
            {dragId ? 'Drop here to move to the top level' : 'Drag a node to reorder, nest or promote it'}
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      {!showEmptyState && nodes.length > 2 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Keyboard className="size-3" />
            F2 renames
          </span>
          <span>Alt + ↑ ↓ reorder</span>
          <span>Alt + → indent</span>
          <span>Alt + ← outdent</span>
          <span>Alt + Delete deletes</span>
        </p>
      )}
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────

function KnowledgeEmptyState({ onFocusInput }: { onFocusInput: () => void }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-8">
      <h2 className="text-base font-medium">Build your knowledge.</h2>
      <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
        This tree is yours: any shape, any depth, no rules about what belongs where. Subjects from
        your syllabus can be linked, but nothing is forced into a university structure.
      </p>
      <button
        type="button"
        onClick={onFocusInput}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus className="size-3.5" />
        Create your first node
      </button>

      <div className="mt-6 rounded-xl border border-dashed border-border/70 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Example shape (a placeholder, nothing here is saved)
        </p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground/80">
          <li>Organic Chemistry</li>
          <li className="pl-4">Stereochemistry</li>
          <li className="pl-8">Chirality</li>
          <li className="pl-8">R / S configuration — needs review</li>
          <li className="pl-4">Reaction mechanisms</li>
        </ul>
      </div>
    </div>
  );
}
