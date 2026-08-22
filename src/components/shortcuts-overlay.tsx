'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

type ShortcutItem = {
  keys: string;
  label: string;
};

interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUTS: ShortcutSection[] = [
  {
    title: 'Navigation',
    items: [
      { keys: '⌘K', label: 'Command Palette' },
      { keys: '?', label: 'Show Shortcuts' },
      { keys: 'D', label: 'Dashboard' },
      { keys: 'S', label: 'Subjects' },
      { keys: 'F', label: 'Focus' },
      { keys: 'N', label: 'Notes' },
      { keys: 'T', label: 'Tasks' },
      { keys: 'R', label: 'Revision' },
      { keys: 'A', label: 'Analytics' },
      { keys: 'E', label: 'Exams' },
      { keys: 'M', label: 'Marks' },
    ],
  },
  {
    title: 'Actions',
    items: [
      { keys: 'Shift + /', label: 'Show Shortcuts' },
      { keys: '1', label: 'Quick Switch → Dashboard' },
      { keys: '2', label: 'Quick Switch → Subjects' },
      { keys: '3', label: 'Quick Switch → Focus' },
      { keys: '4', label: 'Quick Switch → Notes' },
      { keys: '5', label: 'Quick Switch → Tasks' },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: 4, transition: { duration: 0.12, ease: 'easeIn' } },
};

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-muted border border-border rounded px-1.5 py-0.5 text-[11px] font-mono">
      {children}
    </kbd>
  );
}

interface ShortcutsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsOverlay({ open, onOpenChange }: ShortcutsOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-lg gap-0 overflow-hidden p-0"
        onPointerDownOutside={() => onOpenChange(false)}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Keyboard className="size-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Keyboard Shortcuts
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Navigate faster with key commands
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Shortcuts grid */}
        <motion.div
          className="px-6 pb-5 max-h-[400px] overflow-y-auto scrollbar-thin"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          key="shortcuts-grid"
        >
          {SHORTCUTS.map((section) => (
            <motion.div
              key={section.title}
              className="mb-4 last:mb-0"
              variants={itemVariants}
            >
              <p className="section-label px-1 mb-2">{section.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
                {section.items.map((shortcut) => (
                  <motion.div
                    key={`${section.title}-${shortcut.label}`}
                    className="flex items-center justify-between py-1.5 px-1 rounded-md hover:bg-muted/60 transition-colors duration-150"
                    variants={itemVariants}
                  >
                    <span className="text-sm text-foreground/80 truncate pr-3">
                      {shortcut.label}
                    </span>
                    <span className="shrink-0 flex items-center gap-1">
                      {shortcut.keys.split(' + ').map((key, i, arr) => (
                        <React.Fragment key={`${shortcut.label}-${key}-${i}`}>
                          <Kbd>{key}</Kbd>
                          {i < arr.length - 1 && (
                            <span className="text-muted-foreground text-[10px]">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer hint */}
        <div className="border-t border-border/60 px-6 py-3 bg-muted/30">
          <p className="text-[11px] text-muted-foreground text-center">
            Press{' '}
            <kbd className="bg-muted border border-border rounded px-1.5 py-0.5 text-[11px] font-mono">
              ?
            </kbd>{' '}
            to toggle this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
