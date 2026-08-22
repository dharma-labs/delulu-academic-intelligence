'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { StickyNote } from 'lucide-react';

import { useStore } from '@/lib/store';
import { useToast } from '@/components/toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface QuickNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickNoteDialog({ open, onOpenChange }: QuickNoteDialogProps) {
  const subjects = useStore((s) => s.subjects);
  const addNote = useStore((s) => s.addNote);
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState('__none__');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSubjects = subjects.filter((s) => !s.archived);

  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setSubjectId('__none__');
  }, []);

  const handleDialogChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }, [onOpenChange, resetForm]);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSave = useCallback(() => {
    const noteTitle = title.trim() || 'Quick Note';
    addNote({
      title: noteTitle,
      content: content.trim(),
      subjectId: subjectId === '__none__' ? undefined : subjectId,
    });
    onOpenChange(false);
    toast({ title: 'Note saved', description: noteTitle });
  }, [title, content, subjectId, addNote, onOpenChange, toast]);

  const handleCancel = useCallback(() => {
    handleDialogChange(false);
  }, [handleDialogChange]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="size-4 text-amber-500" />
            Quick Note
          </DialogTitle>
          <DialogDescription>
            Capture a thought quickly. You can edit it later in Notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Subject selector */}
          {activeSubjects.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No subject</SelectItem>
                  {activeSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title input */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>

          {/* Content textarea */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Content</Label>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              className="min-h-[100px] resize-none text-sm leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
