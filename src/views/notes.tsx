'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Trash2,
  ArrowLeft,
  StickyNote,
  Save,
  FileText,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { useStore } from '@/lib/store';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Separator } from '@/components/ui/separator';

// ─── Component ─────────────────────────────────────────────────────
export default function NotesView() {
  const {
    notes,
    subjects,
    syllabusUnits,
    addNote,
    updateNote,
    deleteNote,
  } = useStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Editor state (for the selected note)
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSubjectId, setEditorSubjectId] = useState<string>('');
  const [editorTopicId, setEditorTopicId] = useState<string>('');
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Derived data ────────────────────────────────────────────────
  const activeSubjects = useMemo(
    () => subjects.filter((s) => !s.archived),
    [subjects]
  );

  const topicsForEditorSubject = useMemo(() => {
    if (!editorSubjectId) return [];
    const units = syllabusUnits.filter((u) => u.subjectId === editorSubjectId);
    return units
      .sort((a, b) => a.order - b.order)
      .flatMap((u) =>
        u.topics
          .sort((a, b) => a.order - b.order)
          .map((t) => ({ id: t.id, name: t.name }))
      );
  }, [editorSubjectId, syllabusUnits]);

  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      );
    }

    // Subject filter
    if (subjectFilter !== 'all') {
      result = result.filter((n) => n.subjectId === subjectFilter);
    }

    // Sort by updatedAt descending
    result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return result;
  }, [notes, searchQuery, subjectFilter]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  // ─── Load note into editor ──────────────────────────────────────
  const loadNoteIntoEditor = useCallback((
    note: { title: string; content: string; subjectId?: string; topicId?: string } | null
  ) => {
    if (note) {
      setEditorTitle(note.title);
      setEditorContent(note.content);
      setEditorSubjectId(note.subjectId || '');
      setEditorTopicId(note.topicId || '');
    } else {
      setEditorTitle('');
      setEditorContent('');
      setEditorSubjectId('');
      setEditorTopicId('');
    }
    setHasUnsaved(false);
  }, []);

  const handleSelectNote = useCallback((id: string) => {
    setSelectedNoteId(id);
    const note = notes.find((n) => n.id === id);
    if (note) loadNoteIntoEditor(note);
  }, [notes, loadNoteIntoEditor]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editorContent]);

  // ─── Actions ─────────────────────────────────────────────────────
  const handleNewNote = useCallback(() => {
    addNote({
      title: 'Untitled Note',
      content: '',
      subjectId: undefined,
      topicId: undefined,
    });
    // Pick the newly added note from the store
    const latestNotes = useStore.getState().notes;
    const justAdded = latestNotes[latestNotes.length - 1];
    if (justAdded) {
      setSelectedNoteId(justAdded.id);
      loadNoteIntoEditor({
        title: 'Untitled Note',
        content: '',
      });
    }
  }, [addNote, loadNoteIntoEditor]);

  const handleSave = useCallback(() => {
    if (!selectedNoteId) return;
    const now = new Date().toISOString();
    updateNote(selectedNoteId, {
      title: editorTitle || 'Untitled Note',
      content: editorContent,
      subjectId: editorSubjectId || undefined,
      topicId: editorTopicId || undefined,
      updatedAt: now,
    });
    setHasUnsaved(false);
  }, [selectedNoteId, editorTitle, editorContent, editorSubjectId, editorTopicId, updateNote]);

  const handleBlur = useCallback(() => {
    if (hasUnsaved && selectedNoteId) {
      handleSave();
    }
  }, [hasUnsaved, selectedNoteId, handleSave]);

  const handleDelete = useCallback(() => {
    if (!selectedNoteId) return;
    deleteNote(selectedNoteId);
    setSelectedNoteId(null);
    loadNoteIntoEditor(null);
    setShowDeleteDialog(false);
  }, [selectedNoteId, deleteNote, loadNoteIntoEditor]);

  const handleEditorChange = useCallback(
    (field: 'title' | 'content', value: string) => {
      if (field === 'title') setEditorTitle(value);
      else setEditorContent(value);
      setHasUnsaved(true);
    },
    []
  );

  // ─── Helper ──────────────────────────────────────────────────────
  const getSubjectName = useCallback(
    (subjectId?: string) => {
      if (!subjectId) return null;
      return subjects.find((s) => s.id === subjectId)?.name ?? null;
    },
    [subjects]
  );

  const getSubjectColor = useCallback(
    (subjectId?: string) => {
      if (!subjectId) return null;
      return subjects.find((s) => s.id === subjectId)?.color ?? null;
    },
    [subjects]
  );

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className='p-4 sm:p-6 h-full flex flex-col'>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row sm:items-center gap-3 mb-6'>
        <div className='flex-1'>
          <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
            <StickyNote className='h-6 w-6' />
            Notes
            <Badge variant='secondary' className='ml-1'>
              {notes.length}
            </Badge>
          </h1>
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          <div className='relative flex-1 sm:flex-initial sm:w-64'>
            <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search notes...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 h-9'
            />
          </div>

          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className='w-[140px] h-9 text-xs'>
              <SelectValue placeholder='Subject' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Subjects</SelectItem>
              {activeSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size='sm' onClick={handleNewNote}>
            <Plus className='mr-1.5 h-4 w-4' />
            New Note
          </Button>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className='flex-1 flex flex-col md:flex-row gap-4 min-h-0'>
        {/* Notes List */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 ${selectedNoteId ? 'hidden md:block' : ''}`}
        >
          {filteredNotes.length > 0 ? (
            <div className='space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin pr-1'>
              <AnimatePresence>
                {filteredNotes.map((note) => {
                  const subjectName = getSubjectName(note.subjectId);
                  const subjectColor = getSubjectColor(note.subjectId);
                  const isSelected = note.id === selectedNoteId;
                  const firstLine = note.content
                    ? note.content.split('\n')[0].slice(0, 100)
                    : 'No content';

                  return (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <Card
                        className={`cursor-pointer p-3 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/30'
                        }`}
                        onClick={() => handleSelectNote(note.id)}
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <h3 className='font-medium text-sm truncate'>{note.title}</h3>
                          <span className='text-xs text-muted-foreground shrink-0'>
                            {format(parseISO(note.updatedAt), 'MMM d')}
                          </span>
                        </div>
                        <p className='text-xs text-muted-foreground mt-1 truncate'>
                          {firstLine}
                        </p>
                        {subjectName && (
                          <div className='mt-2'>
                            <Badge
                              variant='outline'
                              className='text-[10px] px-1.5 py-0'
                              style={
                                subjectColor
                                  ? { borderColor: subjectColor, color: subjectColor }
                                  : undefined
                              }
                            >
                              {subjectName}
                            </Badge>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <Card className='p-8 text-center'>
              <FileText className='mx-auto h-12 w-12 text-muted-foreground/40' />
              <p className='mt-4 text-lg font-medium'>No notes yet</p>
              <p className='mt-1 text-sm text-muted-foreground'>
                Create your first note.
              </p>
              <Button className='mt-4' size='sm' onClick={handleNewNote}>
                <Plus className='mr-1.5 h-4 w-4' />
                New Note
              </Button>
            </Card>
          )}
        </div>

        {/* Note Editor */}
        <AnimatePresence>
          {selectedNoteId && (
            <motion.div
              key='editor'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className={`flex-1 min-w-0 flex flex-col ${!selectedNoteId ? 'hidden md:flex' : 'flex'}`}
            >
              <Card className='flex-1 flex flex-col p-4 sm:p-6'>
                {/* Editor toolbar */}
                <div className='flex items-center gap-2 mb-4'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='md:hidden'
                    onClick={() => setSelectedNoteId(null)}
                  >
                    <ArrowLeft className='h-4 w-4 mr-1' />
                    Back
                  </Button>

                  <div className='flex-1' />

                  {hasUnsaved && (
                    <span className='text-xs text-amber-500 mr-2'>Unsaved</span>
                  )}

                  <Button size='sm' onClick={handleSave} disabled={!hasUnsaved}>
                    <Save className='mr-1.5 h-4 w-4' />
                    Save
                  </Button>

                  <Button
                    size='sm'
                    variant='destructive'
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>

                <Separator className='mb-4' />

                {/* Title */}
                <Input
                  value={editorTitle}
                  onChange={(e) => handleEditorChange('title', e.target.value)}
                  onBlur={handleBlur}
                  placeholder='Note title...'
                  className='text-xl font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none'
                />

                {/* Subject & Topic selectors */}
                <div className='flex flex-col sm:flex-row gap-2 mt-3 mb-4'>
                  <div className='flex-1'>
                    <Label className='text-xs text-muted-foreground'>Subject (optional)</Label>
                    <Select
                      value={editorSubjectId}
                      onValueChange={(v) => {
                        setEditorSubjectId(v);
                        setEditorTopicId('');
                        setHasUnsaved(true);
                      }}
                    >
                      <SelectTrigger className='h-8 text-xs'>
                        <SelectValue placeholder='Select subject' />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSubjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editorSubjectId && topicsForEditorSubject.length > 0 && (
                    <div className='flex-1'>
                      <Label className='text-xs text-muted-foreground'>Topic (optional)</Label>
                      <Select
                        value={editorTopicId}
                        onValueChange={(v) => {
                          setEditorTopicId(v);
                          setHasUnsaved(true);
                        }}
                      >
                        <SelectTrigger className='h-8 text-xs'>
                          <SelectValue placeholder='Select topic' />
                        </SelectTrigger>
                        <SelectContent>
                          {topicsForEditorSubject.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator className='mb-4' />

                {/* Content textarea */}
                <Textarea
                  ref={textareaRef}
                  value={editorContent}
                  onChange={(e) => handleEditorChange('content', e.target.value)}
                  onBlur={handleBlur}
                  placeholder='Start writing your note...'
                  className='flex-1 min-h-[300px] resize-none border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none text-sm leading-relaxed'
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Delete Confirmation ─────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{selectedNote?.title || 'this note'}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
