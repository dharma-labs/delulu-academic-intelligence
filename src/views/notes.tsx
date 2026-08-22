'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Trash2,
  ArrowLeft,
  Save,
  FileText,
  StickyNote,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { useStore } from '@/lib/store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  PageHeader,
  SectionHeader,
  EmptyState,
} from '@/components/shared';

// --- Component ---
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
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'alpha'>('recent');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Editor state
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSubjectId, setEditorSubjectId] = useState<string>('');
  const [editorTopicId, setEditorTopicId] = useState<string>('');
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Derived data ---
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      );
    }

    if (subjectFilter !== 'all') {
      result = result.filter((n) => n.subjectId === subjectFilter);
    }

    if (sortBy === 'recent') {
      result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    } else if (sortBy === 'alpha') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [notes, searchQuery, subjectFilter, sortBy]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  // --- Load note into editor ---
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

  // --- Actions ---
  const handleNewNote = useCallback(() => {
    addNote({
      title: 'Untitled Note',
      content: '',
      subjectId: undefined,
      topicId: undefined,
    });
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

  // --- Helpers ---
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

  // --- Render ---
  return (
    <div className='content-area px-4 sm:px-6 py-6 h-full flex flex-col'>
      {/* --- Header --- */}
      <PageHeader
        title='Notes'
        subtitle={`${notes.length} total note${notes.length !== 1 ? 's' : ''}`}
        actions={
          <Button size='sm' onClick={handleNewNote} className='h-8'>
            <Plus className='mr-1.5 h-3.5 w-3.5' />
            <span className='hidden sm:inline'>New Note</span>
          </Button>
        }
      />

      {/* --- Search, Filter, Sort --- */}
      <div className='metric-card p-2.5 mb-4'>
        <div className='flex flex-col gap-2'>
          {/* Search — full width */}
          <div className='relative'>
            <Search className='absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search notes...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-8 h-8 text-xs'
            />
          </div>
          {/* Filter + Sort row */}
          <div className='flex gap-2'>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className='flex-1 h-8 text-xs'>
                <SelectValue placeholder='All Subjects' />
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

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'recent' | 'oldest' | 'alpha')}>
              <SelectTrigger className='w-[130px] h-8 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='recent'>Recent</SelectItem>
                <SelectItem value='oldest'>Oldest</SelectItem>
                <SelectItem value='alpha'>Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className='flex-1 flex flex-col md:flex-row gap-4 min-h-0'>
        {/* Notes List */}
        <div
          className={`w-full md:w-72 lg:w-80 shrink-0 ${selectedNoteId ? 'hidden md:block' : ''}`}
        >
          {filteredNotes.length > 0 ? (
            <div className='space-y-1.5'>
              <SectionHeader
                title={`${filteredNotes.length} Note${filteredNotes.length !== 1 ? 's' : ''}`}
              />
              <div className='max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin pr-1 space-y-1'>
                <AnimatePresence>
                  {filteredNotes.map((note) => {
                    const subjectName = getSubjectName(note.subjectId);
                    const subjectColor = getSubjectColor(note.subjectId);
                    const isSelected = note.id === selectedNoteId;
                    const firstLine = note.content
                      ? note.content.split('\n')[0].slice(0, 80)
                      : 'No content';

                    return (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        <div
                          className={`card-interactive p-3 ${isSelected ? '!border-primary/40 !bg-primary/5' : ''}`}
                          onClick={() => handleSelectNote(note.id)}
                        >
                          <div className='flex items-start justify-between gap-2'>
                            <h3 className={`text-sm truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>{note.title}</h3>
                            <span className='text-[10px] text-muted-foreground shrink-0 tabular-nums'>
                              {format(parseISO(note.updatedAt), 'MMM d')}
                            </span>
                          </div>
                          <p className='text-[11px] text-muted-foreground mt-0.5 truncate leading-relaxed'>
                            {firstLine}
                          </p>
                          {subjectName && subjectColor && (
                            <div className='mt-1.5'>
                              <span
                                className='inline-flex items-center gap-1 text-[10px] font-medium'
                                style={{ color: subjectColor }}
                              >
                                <span
                                  className='status-dot'
                                  style={{ backgroundColor: subjectColor }}
                                />
                                {subjectName}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title='No notes yet'
              description='Create your first note to get started.'
              action={
                <Button size='sm' onClick={handleNewNote}>
                  <Plus className='mr-1.5 h-3.5 w-3.5' />
                  New Note
                </Button>
              }
            />
          )}
        </div>

        {/* Note Editor */}
        <AnimatePresence>
          {selectedNoteId && (
            <motion.div
              key='editor'
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className={`flex-1 min-w-0 flex flex-col ${!selectedNoteId ? 'hidden md:flex' : 'flex'}`}
            >
              <div className='metric-card flex-1 flex flex-col p-0 overflow-hidden'>
                {/* Editor toolbar */}
                <div className='flex items-center gap-2 px-4 py-3 border-b border-border'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='md:hidden h-7 px-2'
                    onClick={() => setSelectedNoteId(null)}
                  >
                    <ArrowLeft className='h-3.5 w-3.5 mr-1' />
                    <span className='text-xs'>Back</span>
                  </Button>

                  <div className='flex-1' />

                  {hasUnsaved && (
                    <span className='text-[10px] font-medium text-amber-500 uppercase tracking-wider mr-2'>
                      Unsaved
                    </span>
                  )}

                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-7 px-2 text-xs'
                    onClick={handleSave}
                    disabled={!hasUnsaved}
                  >
                    <Save className='mr-1.5 h-3 w-3' />
                    Save
                  </Button>

                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-7 px-2 text-destructive hover:text-destructive'
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className='h-3 w-3' />
                  </Button>
                </div>

                {/* Title + Metadata area */}
                <div className='px-5 pt-5 pb-0'>
                  <Input
                    value={editorTitle}
                    onChange={(e) => handleEditorChange('title', e.target.value)}
                    onBlur={handleBlur}
                    placeholder='Note title...'
                    className='text-lg font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none h-auto'
                  />

                  {/* Subject & Topic selectors */}
                  <div className='flex flex-col sm:flex-row gap-2 mt-3 pb-4 border-b border-border'>
                    <div className='flex-1'>
                      <Label className='section-label'>Subject</Label>
                      <Select
                        value={editorSubjectId}
                        onValueChange={(v) => {
                          setEditorSubjectId(v);
                          setEditorTopicId('');
                          setHasUnsaved(true);
                        }}
                      >
                        <SelectTrigger className='h-7 text-xs mt-1'>
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
                        <Label className='section-label'>Topic</Label>
                        <Select
                          value={editorTopicId}
                          onValueChange={(v) => {
                            setEditorTopicId(v);
                            setHasUnsaved(true);
                          }}
                        >
                          <SelectTrigger className='h-7 text-xs mt-1'>
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
                </div>

                {/* Content textarea */}
                <div className='flex-1 min-h-0 overflow-y-auto scrollbar-thin px-5 py-4'>
                  <Textarea
                    ref={textareaRef}
                    value={editorContent}
                    onChange={(e) => handleEditorChange('content', e.target.value)}
                    onBlur={handleBlur}
                    placeholder='Start writing your note...'
                    className='min-h-[300px] resize-none border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none text-sm leading-relaxed'
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Delete Confirmation --- */}
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
