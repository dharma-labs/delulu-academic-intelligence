'use client';

import { BrainCircuit, ExternalLink, Timer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { KnowledgeNode } from '@/lib/types';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Hands a node's work over to the features that already exist.
 *
 * Revision needs a subject (its items belong to one) and Focus only accepts a
 * subject through the store, so this section states plainly what can and cannot
 * carry context instead of pretending.
 */
export function WorkOnThisSection({ node }: { node: KnowledgeNode }) {
  const subjects = useStore((s) => s.subjects);
  const revisionItems = useStore((s) => s.revisionItems);
  const focusActive = useStore((s) => s.focusActive);
  const addRevisionItem = useStore((s) => s.addRevisionItem);
  const startFocus = useStore((s) => s.startFocus);
  const navigate = useStore((s) => s.navigate);

  const primarySubjectId = node.subjectIds[0];
  const primarySubject = subjects.find((s) => s.id === primarySubjectId);
  const hasSubject = node.subjectIds.length > 0;

  const existingRevision = revisionItems.find(
    (item) =>
      item.topicId === node.id ||
      (node.linkedSyllabusTopicId ? item.topicId === node.linkedSyllabusTopicId : false)
  );

  const revisionDisabled = !hasSubject || Boolean(existingRevision);

  return (
    <div className="space-y-2 border-t border-border/60 pt-4">
      <p className="section-label">Work on this</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={revisionDisabled}
          onClick={() => {
            if (!primarySubjectId) return;
            addRevisionItem({
              subjectId: primarySubjectId,
              topicId: node.linkedSyllabusTopicId ?? node.id,
              topicName: node.title,
              easeFactor: 2.5,
              interval: 1,
              repetitions: 0,
              nextReview: todayStr(),
            });
          }}
          title={
            !hasSubject
              ? 'Assign a subject first — Revision items belong to a subject'
              : existingRevision
                ? 'This node is already in Revision'
                : `Add to Revision (${primarySubject?.name ?? ''})`
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors',
            revisionDisabled
              ? 'bg-secondary/60 text-muted-foreground opacity-70'
              : 'bg-secondary text-foreground hover:bg-secondary/70'
          )}
        >
          <BrainCircuit className="size-3.5" />
          {existingRevision ? 'In revision' : 'Add to Revision'}
        </button>

        {hasSubject && !focusActive ? (
          <button
            type="button"
            onClick={() => {
              if (!primarySubjectId) return;
              startFocus(primarySubjectId);
              navigate('focus' as never);
            }}
            title={`Starts a focus session on ${primarySubject?.name ?? 'the subject'}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70"
          >
            <Timer className="size-3.5" />
            Start focus on {primarySubject?.name ?? 'subject'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('focus' as never)}
            title={
              focusActive
                ? 'A focus session is already running, so this node cannot start one'
                : 'Focus needs a subject, which this node does not have yet'
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70"
          >
            <Timer className="size-3.5" />
            Open Focus
            <ExternalLink className="size-3" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {existingRevision
          ? `Next review ${format(parseISO(existingRevision.nextReview), 'd MMM yyyy')}.`
          : focusActive
            ? 'A focus session is already running, so Focus opens without this node’s context.'
            : !hasSubject
              ? 'Assign a subject to carry this node’s context into Focus and Revision.'
              : 'Revision keeps the node’s title and subject; nothing is copied from its children.'}
      </p>
    </div>
  );
}
