'use client';

import React, { useState } from 'react';
import { FileText, FolderOpen, Link2, Plus, Target, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import type { KnowledgeNode } from '@/lib/types';
import { findSyllabusTopic } from '@/lib/knowledge';
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

/**
 * Notes / Files / syllabus-topic links for one node.
 *
 * A section only appears when the records behind it genuinely exist, and linking
 * never copies content — it stores an id. Unlinking removes the relationship,
 * never the note or the file.
 */
export function LinkedItemsSection({
  node,
  onUpdate,
}: {
  node: KnowledgeNode;
  onUpdate: (data: Partial<KnowledgeNode>) => void;
}) {
  const subjects = useStore((s) => s.subjects);
  const notes = useStore((s) => s.notes);
  const userFiles = useStore((s) => s.userFiles);
  const syllabusUnits = useStore((s) => s.syllabusUnits);
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);
  const setSubjectDetailTab = useStore((s) => s.setSubjectDetailTab);

  const [notePickerOpen, setNotePickerOpen] = useState(false);
  const [filePickerOpen, setFilePickerOpen] = useState(false);

  const linkedNoteIds = node.linkedNoteIds ?? [];
  const linkedFileIds = node.linkedFileIds ?? [];

  const linkedNotes = linkedNoteIds
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  const linkedFiles = linkedFileIds
    .map((id) => userFiles.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  const linkedTopic = findSyllabusTopic(syllabusUnits, node.linkedSyllabusTopicId);

  const syllabusTopicOptions = syllabusUnits
    .filter((unit) => subjects.some((s) => s.id === unit.subjectId))
    .map((unit) => ({
      unitName: unit.name,
      subjectName: subjects.find((s) => s.id === unit.subjectId)?.name ?? '',
      topics: unit.topics.map((topic) => ({ id: topic.id, name: topic.name })),
    }))
    .filter((unit) => unit.topics.length > 0);

  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <p className="section-label">Linked items</p>

      {notes.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="size-3.5" />
              Notes
            </span>
            {linkedNotes.length < notes.length && (
              <Popover open={notePickerOpen} onOpenChange={setNotePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus className="size-3" />
                    Link note
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-2">
                  <div className="max-h-56 space-y-0.5 overflow-y-auto">
                    {notes
                      .filter((note) => !linkedNoteIds.includes(note.id))
                      .map((note) => (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => {
                            onUpdate({ linkedNoteIds: [...linkedNoteIds, note.id] });
                            setNotePickerOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                        >
                          <span className="min-w-0 flex-1 truncate">{note.title}</span>
                          <Link2 className="size-3 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {linkedNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes linked yet.</p>
          ) : (
            <ul className="space-y-1">
              {linkedNotes.map((note) => (
                <li
                  key={note.id}
                  className="flex items-center gap-2 rounded-xl bg-secondary/50 px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-xs">{note.title}</span>
                  <button
                    type="button"
                    onClick={() => navigate('notes' as never)}
                    title="Notes has no per-note deep link, so it opens the Notes view"
                    className="shrink-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Open Notes
                  </button>
                  <button
                    type="button"
                    aria-label={`Unlink note ${note.title}`}
                    onClick={() =>
                      onUpdate({ linkedNoteIds: linkedNoteIds.filter((id) => id !== note.id) })
                    }
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {userFiles.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <FolderOpen className="size-3.5" />
              Files
            </span>
            {linkedFiles.length < userFiles.length && (
              <Popover open={filePickerOpen} onOpenChange={setFilePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus className="size-3" />
                    Link file
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-2">
                  <div className="max-h-56 space-y-0.5 overflow-y-auto">
                    {userFiles
                      .filter((file) => !linkedFileIds.includes(file.id))
                      .map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => {
                            onUpdate({ linkedFileIds: [...linkedFileIds, file.id] });
                            setFilePickerOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                        >
                          <span className="min-w-0 flex-1 truncate">{file.name}</span>
                          <Link2 className="size-3 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {linkedFiles.length === 0 ? (
            <p className="text-xs text-muted-foreground">No files linked yet.</p>
          ) : (
            <ul className="space-y-1">
              {linkedFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 rounded-xl bg-secondary/50 px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => navigate('files' as never)}
                    title="Files has no per-file deep link, so it opens the Files view"
                    className="shrink-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Open Files
                  </button>
                  <button
                    type="button"
                    aria-label={`Unlink file ${file.name}`}
                    onClick={() =>
                      onUpdate({ linkedFileIds: linkedFileIds.filter((id) => id !== file.id) })
                    }
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {syllabusTopicOptions.length > 0 && (
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="size-3.5" />
            Syllabus topic
          </span>
          {linkedTopic ? (
            <div className="flex items-center gap-2 rounded-xl bg-secondary/50 px-2.5 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs">{linkedTopic.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {linkedTopic.unitName}
                  {linkedTopic.completed ? ' · marked complete' : ' · still open'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  selectSubject(linkedTopic.subjectId);
                  setSubjectDetailTab('syllabus');
                  navigate('syllabus' as never);
                }}
                className="shrink-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Open syllabus
              </button>
              <button
                type="button"
                aria-label="Unlink syllabus topic"
                onClick={() => onUpdate({ linkedSyllabusTopicId: null })}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <Select
              value="none"
              onValueChange={(value) =>
                onUpdate({ linkedSyllabusTopicId: value === 'none' ? null : value })
              }
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Link a syllabus topic (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {syllabusTopicOptions.map((unit) =>
                  unit.topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {unit.subjectName} — {topic.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          <p className="text-[11px] text-muted-foreground">
            A link only borrows the syllabus topic; the tree keeps its own structure.
          </p>
        </div>
      )}
    </div>
  );
}
