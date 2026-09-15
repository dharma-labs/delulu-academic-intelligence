import type {
  KnowledgeNode,
  KnowledgeNodeType,
  KnowledgeStatus,
  SyllabusUnit,
  Subject,
} from './types';

/**
 * Pure helpers for the Knowledge Tree.
 *
 * Nothing here invents data: every number is either read from a node field or
 * derived from the nodes the user actually created.
 */

// ─── Vocabulary ─────────────────────────────────────────────────────

export const KNOWLEDGE_TYPES: KnowledgeNodeType[] = [
  'subject',
  'unit',
  'topic',
  'concept',
  'subtopic',
  'question',
  'resource',
  'note',
  'project',
  'custom',
];

export const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeNodeType, string> = {
  subject: 'Subject',
  unit: 'Unit',
  topic: 'Topic',
  concept: 'Concept',
  subtopic: 'Subtopic',
  question: 'Question',
  resource: 'Resource',
  note: 'Note',
  project: 'Project',
  custom: 'Custom',
};

export const KNOWLEDGE_STATUSES: KnowledgeStatus[] = [
  'not_started',
  'learning',
  'understood',
  'needs_review',
  'mastered',
  'archived',
];

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeStatus, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  understood: 'Understood',
  needs_review: 'Needs review',
  mastered: 'Mastered',
  archived: 'Archived',
};

export type KnowledgeFilter = 'all' | 'learning' | 'needs_review' | 'mastered' | 'archived';

export const KNOWLEDGE_FILTERS: { id: KnowledgeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'learning', label: 'Learning' },
  { id: 'needs_review', label: 'Needs review' },
  { id: 'mastered', label: 'Mastered' },
  { id: 'archived', label: 'Archived' },
];

/** A node counts as archived through either the flag or the status. */
export function isArchived(node: KnowledgeNode): boolean {
  return node.archived || node.status === 'archived';
}

export function matchesFilter(node: KnowledgeNode, filter: KnowledgeFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'learning':
      return node.status === 'learning' || node.status === 'understood';
    case 'needs_review':
      return node.status === 'needs_review';
    case 'mastered':
      return node.status === 'mastered';
    case 'archived':
      return isArchived(node);
  }
}

export function filterCounts(nodes: KnowledgeNode[]): Record<KnowledgeFilter, number> {
  const counts: Record<KnowledgeFilter, number> = {
    all: nodes.length,
    learning: 0,
    needs_review: 0,
    mastered: 0,
    archived: 0,
  };
  for (const node of nodes) {
    if (matchesFilter(node, 'learning')) counts.learning += 1;
    if (matchesFilter(node, 'needs_review')) counts.needs_review += 1;
    if (matchesFilter(node, 'mastered')) counts.mastered += 1;
    if (matchesFilter(node, 'archived')) counts.archived += 1;
  }
  return counts;
}

// ─── Tree index ─────────────────────────────────────────────────────

export interface KnowledgeIndex {
  byId: Map<string, KnowledgeNode>;
  /** Siblings (including the implicit root level, keyed by null) sorted by `order`. */
  childrenOf: Map<string | null, KnowledgeNode[]>;
  rootIds: string[];
  progressById: Map<string, number>;
  descendantCountById: Map<string, number>;
  /** Root-first ancestor chain (excluding the node itself). */
  ancestorsById: Map<string, KnowledgeNode[]>;
  depthById: Map<string, number>;
}

export function compareKnowledgeOrder(a: KnowledgeNode, b: KnowledgeNode): number {
  if (a.order !== b.order) return a.order - b.order;
  return a.createdAt.localeCompare(b.createdAt);
}

function clampProgress(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Build one index per render pass. Collapsed branches are never walked for
 * rendering, and progress is computed in a single post-order sweep.
 */
export function buildKnowledgeIndex(nodes: KnowledgeNode[]): KnowledgeIndex {
  const byId = new Map<string, KnowledgeNode>();
  for (const node of nodes) byId.set(node.id, node);

  const childrenOf = new Map<string | null, KnowledgeNode[]>();
  for (const node of nodes) {
    // A node whose parent is missing is shown at root level rather than lost.
    const parentId = node.parentId && byId.has(node.parentId) ? node.parentId : null;
    const siblings = childrenOf.get(parentId);
    if (siblings) siblings.push(node);
    else childrenOf.set(parentId, [node]);
  }
  for (const siblings of Array.from(childrenOf.values())) siblings.sort(compareKnowledgeOrder);

  const rootIds = (childrenOf.get(null) ?? []).map((n) => n.id);

  // Iterative pre-order sweep (cycle-safe), then reverse for post-order.
  const visited = new Set<string>();
  const preOrder: string[] = [];
  const stack = [...rootIds];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (visited.has(id)) continue;
    visited.add(id);
    preOrder.push(id);
    const children = childrenOf.get(id);
    if (children) for (const child of children) stack.push(child.id);
  }

  const progressById = new Map<string, number>();
  for (let i = preOrder.length - 1; i >= 0; i -= 1) {
    const id = preOrder[i];
    const node = byId.get(id) as KnowledgeNode;
    const children = childrenOf.get(id) ?? [];
    if (children.length > 0 && !node.progressManual) {
      let sum = 0;
      for (const child of children) sum += progressById.get(child.id) ?? clampProgress(child.progress);
      progressById.set(id, Math.round(sum / children.length));
    } else {
      progressById.set(id, clampProgress(node.progress));
    }
  }
  // Nodes unreachable from a root (corrupt/cyclic data) fall back to their own value.
  for (const node of nodes) {
    if (!progressById.has(node.id)) progressById.set(node.id, clampProgress(node.progress));
  }

  const descendantCountById = new Map<string, number>();
  for (let i = preOrder.length - 1; i >= 0; i -= 1) {
    const id = preOrder[i];
    const children = childrenOf.get(id) ?? [];
    let total = 0;
    for (const child of children) total += 1 + (descendantCountById.get(child.id) ?? 0);
    descendantCountById.set(id, total);
  }

  const ancestorsById = new Map<string, KnowledgeNode[]>();
  const depthById = new Map<string, number>();
  for (const node of nodes) {
    const chain: KnowledgeNode[] = [];
    const seen = new Set<string>([node.id]);
    let cursor = node.parentId;
    while (cursor && byId.has(cursor) && !seen.has(cursor)) {
      seen.add(cursor);
      const parent = byId.get(cursor) as KnowledgeNode;
      chain.unshift(parent);
      cursor = parent.parentId;
    }
    ancestorsById.set(node.id, chain);
    depthById.set(node.id, chain.length);
  }

  return { byId, childrenOf, rootIds, progressById, descendantCountById, ancestorsById, depthById };
}

/** Progress actually shown in the UI (derived from children when applicable). */
export function effectiveProgress(node: KnowledgeNode, index: KnowledgeIndex): number {
  return index.progressById.get(node.id) ?? clampProgress(node.progress);
}

/** True when the displayed progress comes from children, not from the node itself. */
export function isDerivedProgress(node: KnowledgeNode, index: KnowledgeIndex): boolean {
  return !node.progressManual && (index.childrenOf.get(node.id)?.length ?? 0) > 0;
}

export function childIdsOf(nodes: KnowledgeNode[], parentId: string | null): string[] {
  return nodes.filter((n) => n.parentId === parentId).sort(compareKnowledgeOrder).map((n) => n.id);
}

/** Every id below `id` (children, grandchildren, ...). Cycle-safe. */
export function collectDescendantIds(nodes: KnowledgeNode[], id: string): string[] {
  const childrenByParent = new Map<string | null, string[]>();
  for (const node of nodes) {
    const list = childrenByParent.get(node.parentId);
    if (list) list.push(node.id);
    else childrenByParent.set(node.parentId, [node.id]);
  }
  const result: string[] = [];
  const seen = new Set<string>([id]);
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (seen.has(childId)) continue;
      seen.add(childId);
      result.push(childId);
      stack.push(childId);
    }
  }
  return result;
}

export function nextSiblingOrder(nodes: KnowledgeNode[], parentId: string | null): number {
  const siblings = nodes.filter((n) => n.parentId === parentId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((n) => n.order)) + 1;
}

/** Fill in every field the store expects, so callers only pass what they know. */
export function knowledgeNodeDraft(
  partial: Partial<KnowledgeNode> & { title: string; parentId: string | null }
): Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    parentId: partial.parentId,
    title: partial.title.trim() || 'Untitled',
    type: partial.type ?? 'concept',
    status: partial.status ?? 'not_started',
    progress: clampProgress(partial.progress ?? 0),
    description: partial.description,
    subjectIds: partial.subjectIds ?? [],
    semester: partial.semester ?? null,
    tags: partial.tags ?? [],
    priority: partial.priority,
    order: partial.order ?? 0,
    archived: partial.archived ?? false,
    progressManual: partial.progressManual,
    linkedNoteIds: partial.linkedNoteIds ?? [],
    linkedFileIds: partial.linkedFileIds ?? [],
    linkedSyllabusTopicId: partial.linkedSyllabusTopicId ?? null,
  };
}

// ─── Move / reorder / duplicate maths ───────────────────────────────

/**
 * Move `id` under `newParentId` at position `newOrder` and re-index the
 * affected sibling groups. Returns null when the move is not allowed
 * (moving a node into itself or into its own descendant).
 */
export function applyKnowledgeMove(
  nodes: KnowledgeNode[],
  id: string,
  newParentId: string | null,
  newOrder?: number
): KnowledgeNode[] | null {
  const node = nodes.find((n) => n.id === id);
  if (!node) return null;
  if (newParentId === id) return null;
  if (newParentId && collectDescendantIds(nodes, id).includes(newParentId)) return null;

  const now = new Date().toISOString();
  const previousParentId = node.parentId;
  const targetSiblings = nodes
    .filter((n) => n.id !== id && n.parentId === newParentId)
    .sort(compareKnowledgeOrder);

  const insertAt =
    typeof newOrder === 'number'
      ? Math.max(0, Math.min(Math.round(newOrder), targetSiblings.length))
      : targetSiblings.length;

  const ordered = [...targetSiblings.slice(0, insertAt), node, ...targetSiblings.slice(insertAt)];
  const nextOrderById = new Map<string, number>();
  ordered.forEach((n, i) => nextOrderById.set(n.id, i));

  if (previousParentId !== newParentId) {
    nodes
      .filter((n) => n.id !== id && n.parentId === previousParentId)
      .sort(compareKnowledgeOrder)
      .forEach((n, i) => nextOrderById.set(n.id, i));
  }

  return nodes.map((n) => {
    const nextOrder = nextOrderById.get(n.id);
    if (nextOrder === undefined) return n;
    if (n.id === id) {
      return {
        ...n,
        parentId: newParentId,
        order: nextOrder,
        updatedAt: now,
      };
    }
    return n.order === nextOrder ? n : { ...n, order: nextOrder };
  });
}

/** Deep copy of a subtree; the copy lands directly after the original. */
export function applyKnowledgeDuplicate(
  nodes: KnowledgeNode[],
  id: string,
  newId: () => string
): KnowledgeNode[] | null {
  const source = nodes.find((n) => n.id === id);
  if (!source) return null;
  const now = new Date().toISOString();

  const subtreeIds = [id, ...collectDescendantIds(nodes, id)];
  const idMap = new Map<string, string>();
  for (const oldId of subtreeIds) idMap.set(oldId, newId());

  const copies: KnowledgeNode[] = subtreeIds.map((oldId) => {
    const original = nodes.find((n) => n.id === oldId) as KnowledgeNode;
    const isRoot = oldId === id;
    return {
      ...original,
      id: idMap.get(oldId) as string,
      parentId: isRoot ? original.parentId : (idMap.get(original.parentId as string) as string),
      title: isRoot ? `${original.title} (copy)` : original.title,
      order: isRoot ? original.order + 1 : original.order,
      createdAt: now,
      updatedAt: now,
      tags: [...original.tags],
      subjectIds: [...original.subjectIds],
      linkedNoteIds: [...(original.linkedNoteIds ?? [])],
      linkedFileIds: [...(original.linkedFileIds ?? [])],
    };
  });

  // Make room for the copy right below the original.
  const shifted = nodes.map((n) =>
    n.parentId === source.parentId && n.order > source.order ? { ...n, order: n.order + 1 } : n
  );

  return [...shifted, ...copies];
}

// ─── Search ─────────────────────────────────────────────────────────

export interface KnowledgeSearchResult {
  /** Ids that match the query themselves. */
  matches: Set<string>;
  /** Ids that must be rendered: matches plus the ancestors that lead to them. */
  visible: Set<string>;
  /** Ancestors kept only as context (rendered muted). */
  context: Set<string>;
}

export function searchKnowledgeNodes(
  nodes: KnowledgeNode[],
  index: KnowledgeIndex,
  query: string
): KnowledgeSearchResult | null {
  const term = query.trim().toLowerCase();
  if (!term) return null;

  const matches = new Set<string>();
  for (const node of nodes) {
    const haystack = [node.title, node.description ?? '', ...node.tags].join('\n').toLowerCase();
    if (haystack.includes(term)) matches.add(node.id);
  }

  const visible = new Set<string>(matches);
  for (const id of Array.from(matches)) {
    for (const ancestor of index.ancestorsById.get(id) ?? []) visible.add(ancestor.id);
  }

  const context = new Set<string>();
  for (const id of Array.from(visible)) if (!matches.has(id)) context.add(id);

  return { matches, visible, context };
}

// ─── Aggregates used by Home ────────────────────────────────────────

export interface KnowledgeOverview {
  total: number;
  active: number;
  needsReview: number;
  learning: number;
  mastered: number;
  archived: number;
  roots: number;
  /** Average of every root node's effective progress. */
  averageRootProgress: number | null;
}

export function buildKnowledgeOverview(
  nodes: KnowledgeNode[],
  index: KnowledgeIndex
): KnowledgeOverview {
  let needsReview = 0;
  let learning = 0;
  let mastered = 0;
  let archived = 0;
  for (const node of nodes) {
    if (isArchived(node)) {
      archived += 1;
      continue;
    }
    if (node.status === 'needs_review') needsReview += 1;
    if (node.status === 'learning') learning += 1;
    if (node.status === 'mastered') mastered += 1;
  }
  const roots = index.rootIds.map((id) => index.byId.get(id)).filter(Boolean) as KnowledgeNode[];
  const rootProgress = roots.map((n) => effectiveProgress(n, index));
  const active = nodes.length - archived;

  return {
    total: nodes.length,
    active,
    needsReview,
    learning,
    mastered,
    archived,
    roots: roots.length,
    averageRootProgress:
      rootProgress.length > 0
        ? Math.round(rootProgress.reduce((sum, v) => sum + v, 0) / rootProgress.length)
        : null,
  };
}

export interface SubjectTreeSummary {
  subjectId: string;
  progress: number;
  nodeCount: number;
}

/**
 * Per-subject tree progress. Only the topmost node assigned to a subject counts,
 * so a branch is never counted twice through its descendants.
 */
export function buildSubjectTreeSummaries(
  nodes: KnowledgeNode[],
  index: KnowledgeIndex
): SubjectTreeSummary[] {
  const totals = new Map<string, { sum: number; count: number }>();

  for (const node of nodes) {
    if (isArchived(node) || node.subjectIds.length === 0) continue;
    const ancestors = index.ancestorsById.get(node.id) ?? [];
    const alreadyCounted = ancestors.some((ancestor) =>
      ancestor.subjectIds.some((sid) => node.subjectIds.includes(sid))
    );
    if (alreadyCounted) continue;

    const subtreeNodeCount = 1 + (index.descendantCountById.get(node.id) ?? 0);
    const progress = effectiveProgress(node, index);
    for (const subjectId of node.subjectIds) {
      const entry = totals.get(subjectId) ?? { sum: 0, count: 0 };
      entry.sum += progress * subtreeNodeCount;
      entry.count += subtreeNodeCount;
      totals.set(subjectId, entry);
    }
  }

  return Array.from(totals.entries()).map(([subjectId, entry]) => ({
    subjectId,
    progress: entry.count > 0 ? Math.round(entry.sum / entry.count) : 0,
    nodeCount: entry.count,
  }));
}

/**
 * The single sentence Home shows about the tree — only when real nodes make it
 * meaningful, otherwise null and Home stays quiet.
 */
export function buildKnowledgeHomeLine(
  nodes: KnowledgeNode[],
  index: KnowledgeIndex,
  subjects: Subject[]
): { title: string; detail?: string } | null {
  if (nodes.length === 0) return null;
  const overview = buildKnowledgeOverview(nodes, index);
  if (overview.active === 0) return null;

  if (overview.needsReview > 0) {
    const count = overview.needsReview;
    return {
      title: `${count} concept${count === 1 ? '' : 's'} ${count === 1 ? 'needs' : 'need'} review`,
      detail: 'in your knowledge tree',
    };
  }

  // A subject tree is only worth mentioning once it has some substance.
  const summaries = buildSubjectTreeSummaries(nodes, index);
  const candidate = summaries
    .filter((s) => s.nodeCount >= 3 && s.progress >= 20)
    .sort((a, b) => b.nodeCount - a.nodeCount)[0];
  if (candidate) {
    const subject = subjects.find((s) => s.id === candidate.subjectId);
    if (subject) {
      return {
        title: `You're ${candidate.progress}% through your ${subject.name} tree`,
        detail: `${candidate.nodeCount} node${candidate.nodeCount === 1 ? '' : 's'}`,
      };
    }
  }

  if (overview.total >= 3) {
    return {
      title: `${overview.total} nodes in your knowledge tree`,
      detail: `${overview.learning} learning`,
    };
  }

  return null;
}

// ─── Export / import (plain JSON, no filesystem access) ─────────────

export const KNOWLEDGE_EXPORT_VERSION = 1;

export interface KnowledgeExportFile {
  format: 'delulu-knowledge-tree';
  version: number;
  exportedAt: string;
  nodes: KnowledgeNode[];
}

export function serializeKnowledgeTree(nodes: KnowledgeNode[]): string {
  const payload: KnowledgeExportFile = {
    format: 'delulu-knowledge-tree',
    version: KNOWLEDGE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    nodes,
  };
  return JSON.stringify(payload, null, 2);
}

export interface KnowledgeImportResult {
  nodes: KnowledgeNode[];
  /** Roots in the incoming file (the top-level nodes that will be added). */
  rootCount: number;
  skipped: number;
}

/**
 * Validate an exported tree and rebuild it as a fresh set of roots. Ids are
 * regenerated, so importing twice never collides with existing nodes.
 */
export function parseKnowledgeTree(
  text: string,
  newId: () => string
): KnowledgeImportResult | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }

  const container = raw as { nodes?: unknown; format?: unknown } | null;
  if (!container || typeof container !== 'object') {
    return { error: 'That file does not contain a knowledge tree.' };
  }
  const list = Array.isArray(container.nodes) ? container.nodes : Array.isArray(raw) ? (raw as unknown[]) : null;
  if (!list) {
    return { error: 'That file does not contain a knowledge tree.' };
  }

  const now = new Date().toISOString();
  const valid = list.filter((entry): entry is Record<string, unknown> => {
    return !!entry && typeof entry === 'object' && typeof (entry as { title?: unknown }).title === 'string';
  });
  const skipped = list.length - valid.length;
  if (valid.length === 0) {
    return { error: 'No nodes with a title were found in that file.' };
  }

  const idMap = new Map<string, string>();
  for (const entry of valid) {
    const oldId = typeof entry.id === 'string' ? entry.id : null;
    if (oldId) idMap.set(oldId, newId());
  }
  const idFor = (entry: Record<string, unknown>): string => {
    const oldId = typeof entry.id === 'string' ? entry.id : null;
    if (oldId && idMap.has(oldId)) return idMap.get(oldId) as string;
    const fresh = newId();
    if (oldId) idMap.set(oldId, fresh);
    return fresh;
  };

  const oldIds = new Set(valid.map((entry) => (typeof entry.id === 'string' ? entry.id : null)).filter(Boolean) as string[]);

  const nodes: KnowledgeNode[] = valid.map((entry, position) => {
    const oldParentId = typeof entry.parentId === 'string' ? entry.parentId : null;
    // Parents that are missing from the file turn into new roots.
    const keepParent = oldParentId !== null && oldIds.has(oldParentId);
    const type = entry.type as KnowledgeNodeType;
    const status = entry.status as KnowledgeStatus;
    const priority = entry.priority as KnowledgeNode['priority'];
    return {
      id: idFor(entry),
      parentId: keepParent ? (idMap.get(oldParentId as string) as string) : null,
      title: (entry.title as string).trim() || 'Untitled',
      type: KNOWLEDGE_TYPES.includes(type) ? type : 'concept',
      status: KNOWLEDGE_STATUSES.includes(status) ? status : 'not_started',
      progress: clampProgress(entry.progress),
      description: typeof entry.description === 'string' ? entry.description : undefined,
      subjectIds: Array.isArray(entry.subjectIds)
        ? (entry.subjectIds.filter((id) => typeof id === 'string') as string[])
        : [],
      semester:
        typeof entry.semester === 'number'
          ? entry.semester
          : entry.semester === null
            ? null
            : null,
      tags: Array.isArray(entry.tags)
        ? (entry.tags.filter((tag) => typeof tag === 'string') as string[])
        : [],
      priority: priority === 'low' || priority === 'medium' || priority === 'high' ? priority : undefined,
      order: typeof entry.order === 'number' && Number.isFinite(entry.order) ? entry.order : position,
      archived: entry.archived === true,
      progressManual: entry.progressManual === true ? true : undefined,
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : now,
      updatedAt: now,
      linkedNoteIds: Array.isArray(entry.linkedNoteIds)
        ? (entry.linkedNoteIds.filter((id) => typeof id === 'string') as string[])
        : [],
      linkedFileIds: Array.isArray(entry.linkedFileIds)
        ? (entry.linkedFileIds.filter((id) => typeof id === 'string') as string[])
        : [],
      linkedSyllabusTopicId:
        typeof entry.linkedSyllabusTopicId === 'string' ? entry.linkedSyllabusTopicId : null,
    };
  });

  const rootCount = nodes.filter((n) => n.parentId === null).length;
  return { nodes, rootCount, skipped };
}

/** Flat lookup for a syllabus topic (used only to show a genuine linked topic). */
export function findSyllabusTopic(
  syllabusUnits: SyllabusUnit[],
  topicId: string | null | undefined
): { id: string; name: string; completed: boolean; unitName: string; subjectId: string } | null {
  if (!topicId) return null;
  for (const unit of syllabusUnits) {
    const topic = unit.topics.find((t) => t.id === topicId);
    if (topic) {
      return {
        id: topic.id,
        name: topic.name,
        completed: topic.completed,
        unitName: unit.name,
        subjectId: topic.subjectId,
      };
    }
  }
  return null;
}
