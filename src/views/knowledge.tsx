'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Network, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { KnowledgeNode } from '@/lib/types';
import {
  buildKnowledgeIndex,
  buildKnowledgeOverview,
  collectDescendantIds,
  parseKnowledgeTree,
  serializeKnowledgeTree,
} from '@/lib/knowledge';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/components/toast';
import { KnowledgeTree } from '@/components/knowledge/tree';
import { KnowledgeDetailPanel } from '@/components/knowledge/detail-panel';
import { MoveNodeDialog } from '@/components/knowledge/move-dialog';

/**
 * Knowledge Tree — the student's own hierarchy.
 *
 * Two panes on wide windows (tree + detail), one column on narrow ones with the
 * detail in a sheet. Everything shown is either read from a node or derived from
 * the nodes the user actually created.
 */

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

interface PendingImport {
  nodes: KnowledgeNode[];
  rootCount: number;
  skipped: number;
}

export default function KnowledgeView() {
  const knowledgeNodes = useStore((s) => s.knowledgeNodes);
  const deleteKnowledgeNode = useStore((s) => s.deleteKnowledgeNode);
  const moveKnowledgeNode = useStore((s) => s.moveKnowledgeNode);
  const { toast } = useToast();

  const isWide = useMediaQuery('(min-width: 1100px)');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => buildKnowledgeIndex(knowledgeNodes), [knowledgeNodes]);
  const overview = useMemo(() => buildKnowledgeOverview(knowledgeNodes, index), [knowledgeNodes, index]);

  // A deleted node simply stops resolving, so nothing stale can be shown.
  const selectedNode = selectedId ? index.byId.get(selectedId) : undefined;

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setDetailOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((id: string) => setDeleteTargetId(id), []);
  const handleMoveRequest = useCallback((id: string) => setMoveTargetId(id), []);

  const deleteTarget = deleteTargetId ? index.byId.get(deleteTargetId) : undefined;
  const deleteDescendants = useMemo(() => {
    if (!deleteTargetId) return [] as string[];
    return collectDescendantIds(knowledgeNodes, deleteTargetId);
  }, [knowledgeNodes, deleteTargetId]);
  const directChildCount = deleteTargetId ? (index.childrenOf.get(deleteTargetId) ?? []).length : 0;
  const linkedCount = deleteTarget
    ? (deleteTarget.linkedNoteIds?.length ?? 0) + (deleteTarget.linkedFileIds?.length ?? 0)
    : 0;

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    const title = deleteTarget?.title ?? 'this node';
    deleteKnowledgeNode(deleteTargetId);
    setDeleteTargetId(null);
    toast({
      title:
        deleteDescendants.length > 0
          ? `Deleted “${title}” and ${deleteDescendants.length} descendant${deleteDescendants.length === 1 ? '' : 's'}`
          : `Deleted “${title}”`,
      description:
        linkedCount > 0
          ? 'Linked notes and files were kept — only the links were removed.'
          : undefined,
      variant: 'default',
    });
  };

  // ── Export / import (plain JSON via a Blob, no filesystem IPC) ────
  const handleExport = () => {
    if (knowledgeNodes.length === 0) return;
    const blob = new Blob([serializeKnowledgeTree(knowledgeNodes)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `delulu-knowledge-tree-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast({
      title: 'Knowledge tree exported',
      description: `${knowledgeNodes.length} node${knowledgeNodes.length === 1 ? '' : 's'} written to a JSON file.`,
      variant: 'success',
    });
  };

  const handleFileChosen = async (file: File) => {
    const text = await file.text();
    const parsed = parseKnowledgeTree(text, () => crypto.randomUUID());
    if ('error' in parsed) {
      toast({ title: 'Import failed', description: parsed.error, variant: 'error' });
      return;
    }
    setPendingImport(parsed);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    // Imported top-level nodes join as new roots; internal structure is kept.
    const base = knowledgeNodes.filter((n) => n.parentId === null).length;
    let rootIndex = 0;
    const existingIds = new Set(knowledgeNodes.map((n) => n.id));
    const incoming = pendingImport.nodes
      .filter((n) => !existingIds.has(n.id))
      .sort((a, b) => a.order - b.order)
      .map((node) => (node.parentId === null ? { ...node, order: base + rootIndex++ } : node));
    useStore.setState({ knowledgeNodes: [...knowledgeNodes, ...incoming] });
    toast({
      title: `Imported ${incoming.length} node${incoming.length === 1 ? '' : 's'}`,
      description: `${pendingImport.rootCount} new root${pendingImport.rootCount === 1 ? '' : 's'} added. Existing nodes were left untouched.`,
      variant: 'success',
    });
    setPendingImport(null);
  };

  const detail = selectedNode ? (
    <KnowledgeDetailPanel
      key={selectedNode.id}
      nodeId={selectedNode.id}
      index={index}
      onSelect={handleSelect}
      onRequestMove={handleMoveRequest}
      onRequestDelete={handleDeleteRequest}
    />
  ) : null;

  return (
    <>
      <PageHeader
        title="Knowledge tree"
        subtitle="Your own structure for what you know — any shape, any depth."
        badge={
          overview.total > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              <Network className="size-3" />
              {overview.total} node{overview.total === 1 ? '' : 's'}
              {overview.needsReview > 0 && (
                <span className="text-foreground/70">· {overview.needsReview} need review</span>
              )}
            </span>
          ) : undefined
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-3.5" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={knowledgeNodes.length === 0}
            >
              <Download className="size-3.5" />
              Export
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void handleFileChosen(file);
              }}
            />
          </>
        }
      />

      <div
        className={cn(
          'grid gap-6',
          isWide && selectedNode ? 'grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start' : 'grid-cols-1'
        )}
      >
        <div className="min-w-0">
          <KnowledgeTree
            selectedId={selectedNode?.id ?? null}
            onSelect={handleSelect}
            onRequestDelete={handleDeleteRequest}
            onRequestMove={handleMoveRequest}
          />
        </div>

        {isWide && selectedNode && <div className="min-w-0">{detail}</div>}
      </div>

      {/* Narrow windows: the detail opens as a sheet instead of a second pane */}
      {!isWide && (
        <Sheet open={detailOpen && Boolean(selectedNode)} onOpenChange={setDetailOpen}>
          <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-md">
            <SheetHeader className="px-0">
              <SheetTitle className="text-sm font-medium">Node detail</SheetTitle>
            </SheetHeader>
            <div className="mt-3">{detail}</div>
          </SheetContent>
        </Sheet>
      )}

      {/* Delete confirmation — states the exact number of descendants */}
      <AlertDialog
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{deleteTarget?.title ?? 'this node'}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDescendants.length === 0 ? (
                <>This node has no children, so only it will be removed.</>
              ) : (
                <>
                  This will remove {deleteDescendants.length} descendant
                  {deleteDescendants.length === 1 ? '' : 's'}
                  {directChildCount > 0 &&
                    ` (${directChildCount} direct child${directChildCount === 1 ? '' : 'ren'})`}
                  . The whole branch goes with it.
                </>
              )}
              {linkedCount > 0 && (
                <>
                  {' '}
                  {linkedCount} linked item{linkedCount === 1 ? '' : 's'} will stay in your
                  library — only the link is removed.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Keyboard-accessible move (never drag-only) */}
      <MoveNodeDialog
        open={Boolean(moveTargetId)}
        onOpenChange={(open) => !open && setMoveTargetId(null)}
        index={index}
        nodeId={moveTargetId}
        onMove={(id, parentId, order) => {
          moveKnowledgeNode(id, parentId, order);
          toast({ title: 'Node moved', variant: 'default' });
        }}
      />

      {/* Import confirmation */}
      <Dialog open={Boolean(pendingImport)} onOpenChange={(open) => !open && setPendingImport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import knowledge tree</DialogTitle>
            <DialogDescription>
              {pendingImport && (
                <>
                  Found {pendingImport.nodes.length} node
                  {pendingImport.nodes.length === 1 ? '' : 's'}
                  {pendingImport.rootCount > 0 &&
                    `, ${pendingImport.rootCount} of them at the top level`}
                  .
                  {pendingImport.skipped > 0 &&
                    ` ${pendingImport.skipped} entr${pendingImport.skipped === 1 ? 'y was' : 'ies were'} skipped because they had no title.`}{' '}
                  They will be added as new roots; your existing nodes stay exactly as they are.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button onClick={confirmImport}>Add to my tree</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
