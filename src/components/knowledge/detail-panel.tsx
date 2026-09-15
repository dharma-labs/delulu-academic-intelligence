'use client';

import React, { useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  ChevronRight,
  Copy,
  MoveRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { KnowledgeNode, KnowledgeStatus } from '@/lib/types';
import {
  KNOWLEDGE_STATUS_LABELS,
  KNOWLEDGE_TYPES,
  KNOWLEDGE_TYPE_LABELS,
  effectiveProgress,
  isArchived,
  isDerivedProgress,
  type KnowledgeIndex,
} from '@/lib/knowledge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { KnowledgeStatusDot } from './node-row';
import { LinkedItemsSection } from './linked-items';
import { WorkOnThisSection } from './work-on-this';

/**
 * Contextual detail for one node.
 *
 * Mount it with `key={node.id}` so every field starts from that node's own
 * values; nothing here keeps a stale draft of another node.
 */

/** Statuses offered in the picker (archiving is an action, not a status here). */
const PICKABLE_STATUSES: KnowledgeStatus[] = [
  'not_started',
  'learning',
  'understood',
  'needs_review',
  'mastered',
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="section-label">{label}</p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function KnowledgeDetailPanel({
  nodeId,
  index,
  onSelect,
  onRequestMove,
  onRequestDelete,
}: {
  nodeId: string;
  index: KnowledgeIndex;
  onSelect: (id: string) => void;
  onRequestMove: (id: string) => void;
  onRequestDelete: (id: string) => void;
}) {
  const subjects = useStore((s) => s.subjects);
  const profile = useStore((s) => s.profile);
  const knowledgeNodes = useStore((s) => s.knowledgeNodes);

  const updateKnowledgeNode = useStore((s) => s.updateKnowledgeNode);
  const duplicateKnowledgeNode = useStore((s) => s.duplicateKnowledgeNode);
  const archiveKnowledgeNode = useStore((s) => s.archiveKnowledgeNode);

  const [tagDraft, setTagDraft] = useState('');
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const node = index.byId.get(nodeId);
  if (!node) return null;

  // ── Values read straight from the tree and the node itself ──
  const children = index.childrenOf.get(node.id) ?? [];
  const progress = effectiveProgress(node, index);
  const derived = isDerivedProgress(node, index);
  const descendants = index.descendantCountById.get(node.id) ?? 0;
  const ancestors = index.ancestorsById.get(node.id) ?? [];
  const archived = isArchived(node);

  const semesterOptions = Array.from(
    new Set<number>([
      ...subjects.map((s) => s.semester),
      profile.currentSemester || profile.semester || 1,
      ...(node.semester ? [node.semester] : []),
    ])
  ).sort((a, b) => a - b);

  // ── Writes ──
  const commitTitle = (value: string) => {
    const title = value.trim();
    if (!title || title === node.title) return;
    updateKnowledgeNode(node.id, { title });
  };

  const commitDescription = (value: string) => {
    const description = value.trim();
    if (description === (node.description ?? '')) return;
    updateKnowledgeNode(node.id, { description: description || undefined });
  };

  const addTag = () => {
    const tag = tagDraft.trim().replace(/,$/, '');
    if (!tag || node.tags.includes(tag)) {
      setTagDraft('');
      return;
    }
    updateKnowledgeNode(node.id, { tags: [...node.tags, tag] });
    setTagDraft('');
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border/70 bg-card p-4">
      {/* Path */}
      {ancestors.length > 0 && (
        <nav aria-label="Path" className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {ancestors.map((ancestor) => (
            <React.Fragment key={ancestor.id}>
              <button
                type="button"
                onClick={() => onSelect(ancestor.id)}
                className="max-w-[140px] truncate transition-colors hover:text-foreground"
              >
                {ancestor.title}
              </button>
              <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden />
            </React.Fragment>
          ))}
          <span className="max-w-[160px] truncate text-foreground/80">{node.title}</span>
        </nav>
      )}

      {/* Title */}
      <div>
        <input
          key={`title-${node.title}`}
          defaultValue={node.title}
          onBlur={(event) => commitTitle(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              event.currentTarget.value = node.title;
              event.currentTarget.blur();
            }
          }}
          aria-label="Node title"
          className="w-full rounded-xl border border-transparent bg-transparent px-1.5 py-1 text-base font-medium outline-none transition-colors hover:border-border/60 focus:border-primary/50"
        />
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-1.5 text-[11px] text-muted-foreground">
          <span>
            {children.length} child{children.length === 1 ? '' : 'ren'} · {descendants} descendant
            {descendants === 1 ? '' : 's'}
          </span>
          <span aria-hidden>·</span>
          <span>Updated {format(parseISO(node.updatedAt), 'd MMM yyyy, HH:mm')}</span>
          {archived && (
            <>
              <span aria-hidden>·</span>
              <span className="uppercase tracking-wide">Archived</span>
            </>
          )}
        </p>
      </div>

      {/* Status */}
      <Field label="Status">
        <div className="flex flex-wrap gap-1.5">
          {PICKABLE_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => updateKnowledgeNode(node.id, { status })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
                node.status === status
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <KnowledgeStatusDot status={status} />
              {KNOWLEDGE_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </Field>

      {/* Progress */}
      <Field
        label="Progress"
        hint={
          children.length === 0 ? (
            <>No children yet, so this is the node&apos;s own progress.</>
          ) : derived ? (
            <>
              Derived from children: the average of its {children.length} child
              {children.length === 1 ? '' : 'ren'}, rounded.
            </>
          ) : (
            <>Set by hand. Turn on &ldquo;Derive from children&rdquo; to use the child average instead.</>
          )
        }
      >
        <div className="space-y-2">
          {children.length > 0 && (
            <label className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-2.5 py-1.5">
              <span className="text-xs">Derive from children</span>
              <input
                type="checkbox"
                role="switch"
                checked={derived}
                onChange={(event) =>
                  updateKnowledgeNode(node.id, { progressManual: !event.target.checked })
                }
                className="size-4 accent-[var(--primary)]"
                aria-label="Derive progress from children"
              />
            </label>
          )}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={derived ? progress : node.progress}
              disabled={derived}
              onChange={(event) =>
                updateKnowledgeNode(node.id, {
                  progress: Number(event.target.value),
                  progressManual: true,
                })
              }
              aria-label="Progress"
              className={cn(
                'h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--primary)]',
                derived && 'opacity-50'
              )}
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={derived}
                onClick={() =>
                  updateKnowledgeNode(node.id, {
                    progress: Math.max(0, node.progress - 5),
                    progressManual: true,
                  })
                }
                aria-label="Decrease progress"
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                −
              </button>
              <span className="w-10 text-right text-xs tabular-nums">
                {derived ? progress : node.progress}%
              </span>
              <button
                type="button"
                disabled={derived}
                onClick={() =>
                  updateKnowledgeNode(node.id, {
                    progress: Math.min(100, node.progress + 5),
                    progressManual: true,
                  })
                }
                aria-label="Increase progress"
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary/70 transition-all duration-300"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      </Field>

      {/* Type + priority */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select
            value={node.type}
            onValueChange={(value) =>
              updateKnowledgeNode(node.id, { type: value as KnowledgeNode['type'] })
            }
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KNOWLEDGE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {KNOWLEDGE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Priority">
          <Select
            value={node.priority ?? 'none'}
            onValueChange={(value) =>
              updateKnowledgeNode(node.id, {
                priority: value === 'none' ? undefined : (value as 'low' | 'medium' | 'high'),
              })
            }
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Description */}
      <Field label="Description">
        <textarea
          key={`description-${node.description ?? ''}`}
          defaultValue={node.description ?? ''}
          onBlur={(event) => commitDescription(event.currentTarget.value)}
          rows={3}
          placeholder="Why this matters, what you still need to check…"
          className="w-full resize-y rounded-xl border border-border/70 bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/50"
        />
      </Field>

      {/* Subjects */}
      <Field
        label="Subjects"
        hint={
          node.subjectIds.length === 0
            ? 'Knowledge can outlive a semester — subjects are optional.'
            : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {node.subjectIds.map((id) => {
            const subject = subjects.find((s) => s.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs"
              >
                {subject && (
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: subject.color }}
                    aria-hidden
                  />
                )}
                {subject ? subject.name : 'Removed subject'}
                <button
                  type="button"
                  aria-label={`Remove ${subject?.name ?? 'subject'}`}
                  onClick={() =>
                    updateKnowledgeNode(node.id, {
                      subjectIds: node.subjectIds.filter((sid) => sid !== id),
                    })
                  }
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
          {subjects.length > 0 && (
            <Popover open={subjectPickerOpen} onOpenChange={setSubjectPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="size-3" />
                  Add subject
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2">
                <div className="max-h-64 space-y-0.5 overflow-y-auto">
                  {subjects.map((subject) => {
                    const checked = node.subjectIds.includes(subject.id);
                    return (
                      <label
                        key={subject.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            updateKnowledgeNode(node.id, {
                              subjectIds: checked
                                ? node.subjectIds.filter((sid) => sid !== subject.id)
                                : [...node.subjectIds, subject.id],
                            })
                          }
                        />
                        <span className="min-w-0 flex-1 truncate">{subject.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          Sem {subject.semester}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </Field>

      {/* Semester */}
      <Field label="Semester" hint={<>Optional academic context. The tree is not bound to it.</>}>
        <Select
          value={node.semester ? String(node.semester) : 'none'}
          onValueChange={(value) =>
            updateKnowledgeNode(node.id, { semester: value === 'none' ? null : Number(value) })
          }
        >
          <SelectTrigger className="w-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            {semesterOptions.map((sem) => (
              <SelectItem key={sem} value={String(sem)}>
                Semester {sem}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Tags */}
      <Field label="Tags">
        <div className="flex flex-wrap items-center gap-1.5">
          {node.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() =>
                  updateKnowledgeNode(node.id, { tags: node.tags.filter((t) => t !== tag) })
                }
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addTag();
              }
            }}
            onBlur={() => {
              if (tagDraft.trim()) addTag();
            }}
            placeholder="Add tag…"
            aria-label="Add tag"
            className="w-24 rounded-full border border-dashed border-border/70 bg-transparent px-2 py-0.5 text-xs outline-none focus:border-primary/50"
          />
        </div>
      </Field>

      {/* Linked records — only shown when the records genuinely exist */}
      <LinkedItemsSection node={node} onUpdate={(data) => updateKnowledgeNode(node.id, data)} />

      {/* Hand the work over to Revision / Focus where the architecture allows it */}
      <WorkOnThisSection node={node} />

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('input[aria-label="Node title"]');
            input?.focus();
            input?.select();
          }}
        >
          <ArrowRight className="size-3.5" />
          Edit title
        </Button>
        <Button variant="outline" size="sm" onClick={() => onRequestMove(node.id)}>
          <MoveRight className="size-3.5" />
          Move
        </Button>
        <Button variant="outline" size="sm" onClick={() => duplicateKnowledgeNode(node.id)}>
          <Copy className="size-3.5" />
          Duplicate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => archiveKnowledgeNode(node.id, !node.archived)}
        >
          {node.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          {node.archived ? 'Unarchive' : 'Archive'}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onRequestDelete(node.id)}>
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>

      {knowledgeNodes.length > 0 && descendants > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Duplicating copies the whole branch ({descendants + 1} nodes). Deleting removes the branch
          too; linked notes and files always stay in your library.
        </p>
      )}
    </div>
  );
}
