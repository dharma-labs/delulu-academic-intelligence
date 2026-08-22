'use client';

import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useStore, getSemesterHealth, getStudyStreak, getStudyTimeToday } from '@/lib/store';
import type { ViewId } from '@/lib/types';
import { ViewRouter } from '@/components/view-router';
import { format } from 'date-fns';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  UserCheck,
  FileText,
  Timer,
  BrainCircuit,
  StickyNote,
  CalendarDays,
  Clock,
  CheckSquare,
  TrendingUp,
  FileSearch,
  Bot,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  MoreHorizontal,
  ClipboardList,
  Flame,
  Keyboard,
  ArrowRight,
  Sun,
  Moon,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ShortcutsOverlay } from '@/components/shortcuts-overlay';
import { Onboarding } from '@/components/onboarding';
import { QuickNoteDialog } from '@/components/quick-note-dialog';
import { ToastProvider } from '@/components/toast';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Notification badges hook ──────────────────────────────────────

function useNavBadges() {
  const tasks = useStore((s) => s.tasks);
  const revisionItems = useStore((s) => s.revisionItems);
  const exams = useStore((s) => s.exams);
  const assignments = useStore((s) => s.assignments);

  return useMemo(() => {
    const badges: Partial<Record<ViewId, number>> = {};

    // Overdue tasks
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
    if (overdueTasks.length > 0) badges['tasks'] = overdueTasks.length;

    // Due revisions
    const dueRevisions = revisionItems.filter(r => {
      const nextReview = new Date(r.nextReview);
      return nextReview <= new Date();
    });
    if (dueRevisions.length > 0) badges['revision'] = dueRevisions.length;

    // Upcoming exams (within 7 days)
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const upcomingExams = exams.filter(e => e.status === 'upcoming' && e.date >= today && e.date <= weekFromNow.toISOString().split('T')[0]);
    if (upcomingExams.length > 0) badges['exams'] = upcomingExams.length;

    // Upcoming assignments (within 3 days)
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);
    const upcomingAssign = assignments.filter(a => a.status !== 'completed' && a.deadline >= today && a.deadline <= threeDays.toISOString().split('T')[0]);
    if (upcomingAssign.length > 0) badges['assignments'] = upcomingAssign.length;

    return badges;
  }, [tasks, revisionItems, exams, assignments]);
}

// ─── Nav badge component ──────────────────────────────────────────

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count > 9 ? '9+' : String(count);
  return (
    <span className="ml-auto flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white leading-none animate-badge-pop">
      {display}
    </span>
  );
}

// ─── Nav item types ─────────────────────────────────────────────────

interface NavItem {
  id: ViewId | 'more';
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ─── Navigation structure ────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Academic',
    items: [
      { id: 'subjects', label: 'Subjects', icon: BookOpen },
      { id: 'marks', label: 'Marks & CA', icon: BarChart3 },
      { id: 'attendance', label: 'Attendance', icon: UserCheck },
      { id: 'exams', label: 'Exams', icon: FileText },
      { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    ],
  },
  {
    label: 'Study',
    items: [
      { id: 'focus', label: 'Focus', icon: Timer },
      { id: 'revision', label: 'Revision', icon: BrainCircuit },
      { id: 'notes', label: 'Notes', icon: StickyNote },
      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    ],
  },
  {
    label: 'Planning',
    items: [
      { id: 'calendar', label: 'Calendar', icon: CalendarDays },
      { id: 'timetable', label: 'Timetable', icon: Clock },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'analytics', label: 'Analytics', icon: TrendingUp },
      { id: 'er-center', label: 'ER Center', icon: FileSearch },
      { id: 'ai-tutor', label: 'AI Tutor', icon: Bot },
      { id: 'report', label: 'Report', icon: GraduationCap },
    ],
  },
];

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Mobile bottom nav items
const MOBILE_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'focus', label: 'Study', icon: Timer },
  { id: 'calendar', label: 'Plan', icon: CalendarDays },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

// ─── Sidebar nav item component ──────────────────────────────────────

function SidebarNavItem({
  item,
  collapsed,
  badge,
}: {
  item: NavItem;
  collapsed: boolean;
  badge?: number;
}) {
  const currentView = useStore((s) => s.currentView);
  const navigate = useStore((s) => s.navigate);
  const isActive = currentView === item.id;
  const Icon = item.icon;

  return (
    <button
      onClick={() => navigate(item.id as ViewId)}
      className={cn(
        'group relative flex w-full items-center gap-2.5 rounded-md text-[13px] transition-all duration-200',
        collapsed ? 'relative justify-center px-2 py-2' : 'px-2.5 py-1.5 border-l-2',
        isActive
          ? 'sidebar-active'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground border-l-transparent'
      )}
    >
      <Icon className="size-[16px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && <NavBadge count={badge} />}
      {collapsed && badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[8px] h-2 rounded-full bg-red-500" />
      )}
      {collapsed && (
        <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-md z-50">
          {item.label}
        </span>
      )}
    </button>
  );
}

// ─── Mobile bottom nav ───────────────────────────────────────────────

function MobileBottomNav({
  onMoreOpen,
}: {
  onMoreOpen: () => void;
}) {
  const currentView = useStore((s) => s.currentView);
  const navigate = useStore((s) => s.navigate);
  const badges = useNavBadges();
  const totalBadges = Object.values(badges).reduce((s, v) => s + (v || 0), 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border glass md:hidden safe-area-bottom">
      <div className="flex h-[60px] items-center justify-around px-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'more' ? false : currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'more') {
                  onMoreOpen();
                } else {
                  navigate(item.id as ViewId);
                }
              }}
              className={cn(
                'bottom-nav-item relative flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-medium transition-all duration-200',
                isActive ? 'active text-primary' : 'text-muted-foreground active:scale-95'
              )}
            >
              <Icon className={cn('bottom-nav-icon size-[18px] mb-0.5 transition-transform duration-200')} />
              <span className={cn(isActive && 'font-semibold')}>{item.label}</span>
              {item.id === 'more' && totalBadges > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-3 flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full bg-red-500 text-[8px] font-bold text-white leading-none">
                  {totalBadges > 9 ? '9+' : totalBadges}
                </span>
              )}
              {isActive && (
                <span className="bottom-nav-indicator" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Mobile more sheet ───────────────────────────────────────────────

function MobileMoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const currentView = useStore((s) => s.currentView);
  const navigate = useStore((s) => s.navigate);
  const badges = useNavBadges();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
        <SheetHeader className="mb-2">
          <SheetTitle className="text-base">Navigation</SheetTitle>
          <SheetDescription className="text-xs">
            Jump to any section
          </SheetDescription>
        </SheetHeader>
        <div className="scrollbar-thin max-h-[55vh] overflow-y-auto px-4 pb-8">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="section-label px-1 mb-1.5 mt-3 first:mt-0">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.id as ViewId);
                        onOpenChange(false);
                      }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 text-left',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-accent'
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {badges[item.id as ViewId] !== undefined && badges[item.id as ViewId]! > 0 && (
                        <span className="ml-auto flex items-center justify-center min-w-[18px] h-5 px-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-semibold tabular-nums">
                          {badges[item.id as ViewId]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="border-t border-border pt-3 mt-2">
            {BOTTOM_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.id as ViewId);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── View meta for command palette recent views ──────────────────

const _recentViews: string[] = [];
let _lastTrackedView = '';

function trackRecentView(viewId: string) {
  if (viewId === _lastTrackedView) return;
  _lastTrackedView = viewId;
  const idx = _recentViews.indexOf(viewId);
  if (idx !== -1) _recentViews.splice(idx, 1);
  _recentViews.unshift(viewId);
  if (_recentViews.length > 3) _recentViews.length = 3;
}

const VIEW_META: Record<string, { label: string; icon: LucideIcon }> = {
  'dashboard': { label: 'Dashboard', icon: LayoutDashboard },
  'subjects': { label: 'Subjects', icon: BookOpen },
  'subject-detail': { label: 'Subject Detail', icon: BookOpen },
  'syllabus': { label: 'Syllabus', icon: BookOpen },
  'marks': { label: 'Marks & CA', icon: BarChart3 },
  'attendance': { label: 'Attendance', icon: UserCheck },
  'focus': { label: 'Focus', icon: Timer },
  'revision': { label: 'Revision', icon: BrainCircuit },
  'notes': { label: 'Notes', icon: StickyNote },
  'calendar': { label: 'Calendar', icon: CalendarDays },
  'timetable': { label: 'Timetable', icon: Clock },
  'tasks': { label: 'Tasks', icon: CheckSquare },
  'analytics': { label: 'Analytics', icon: TrendingUp },
  'er-center': { label: 'ER Center', icon: FileSearch },
  'exams': { label: 'Exams', icon: FileText },
  'assignments': { label: 'Assignments', icon: ClipboardList },
  'settings': { label: 'Settings', icon: Settings },
  'ai-tutor': { label: 'AI Tutor', icon: Bot },
  'report': { label: 'Report', icon: GraduationCap },
};

// ─── Command palette ─────────────────────────────────────────────────

function CommandPalette({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const commandOpen = useStore((s) => s.commandOpen);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const navigate = useStore((s) => s.navigate);
  // Track navigation into recent views
  const currentView = useStore((s) => s.currentView);
  trackRecentView(currentView);
  const recentViewsSnapshot = useMemo(() => {
    return _recentViews.filter((v) => v !== currentView);
  }, [currentView]);
  const subjects = useStore((s) => s.subjects);
  const tasks = useStore((s) => s.tasks);
  const notes = useStore((s) => s.notes);
  const exams = useStore((s) => s.exams);
  const syllabusUnits = useStore((s) => s.syllabusUnits);

  const handleSelect = useCallback(
    (action: () => void) => {
      setCommandOpen(false);
      action();
    },
    [setCommandOpen]
  );

  if (!commandOpen) return null;

  const filteredRecents = recentViewsSnapshot;

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search subjects, tasks, notes, or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent Views */}
        {filteredRecents.length > 0 && (
          <>
            <CommandGroup heading="Recent Views">
              {filteredRecents.map((viewId) => {
                const meta = VIEW_META[viewId];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <CommandItem
                    key={`recent-${viewId}`}
                    onSelect={() => handleSelect(() => navigate(viewId as ViewId))}
                    className="bg-secondary/50"
                  >
                    <Icon className="size-4" />
                    <span>{meta.label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-medium tracking-wide">RECENT</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Commands">
          <CommandItem onSelect={() => handleSelect(() => navigate('tasks'))}>
            <CheckSquare className="size-4" />
            <span>Add Task</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('focus'))}>
            <Timer className="size-4" />
            <span>Start Focus</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('marks'))}>
            <BarChart3 className="size-4" />
            <span>Go to Marks</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('attendance'))}>
            <UserCheck className="size-4" />
            <span>Go to Attendance</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {subjects.length > 0 && (
          <CommandGroup heading="Subjects">
            {subjects.map((s) => (
              <CommandItem
                key={s.id}
                onSelect={() =>
                  handleSelect(() => {
                    useStore.getState().selectSubject(s.id);
                    navigate('subject-detail');
                  })
                }
              >
                <BookOpen className="size-4" />
                <span>
                  {s.name}
                  <span className="ml-2 text-muted-foreground">{s.code}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {tasks
              .filter((t) => !t.completed)
              .slice(0, 5)
              .map((t) => (
                <CommandItem
                  key={t.id}
                  onSelect={() => handleSelect(() => navigate('tasks'))}
                >
                  <CheckSquare className="size-4" />
                  <span>{t.title}</span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {notes.length > 0 && (
          <CommandGroup heading="Notes">
            {notes.slice(0, 5).map((n) => (
              <CommandItem
                key={n.id}
                onSelect={() => handleSelect(() => navigate('notes'))}
              >
                <StickyNote className="size-4" />
                <span>{n.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {exams.length > 0 && (
          <CommandGroup heading="Exams">
            {exams
              .filter((e) => e.status === 'upcoming')
              .slice(0, 5)
              .map((e) => (
                <CommandItem
                  key={e.id}
                  onSelect={() => handleSelect(() => navigate('exams'))}
                >
                  <FileText className="size-4" />
                  <span>{e.name}</span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        {syllabusUnits.length > 0 && (
          <CommandGroup heading="Syllabus Topics">
            {syllabusUnits
              .flatMap((u) =>
                u.topics.map((t) => ({
                  ...t,
                  unitName: u.name,
                  subjectId: u.subjectId,
                }))
              )
              .slice(0, 5)
              .map((t) => (
                <CommandItem
                  key={t.id}
                  onSelect={() =>
                    handleSelect(() => {
                      useStore.getState().selectSubject(t.subjectId);
                      navigate('subject-detail');
                    })
                  }
                >
                  <BookOpen className="size-4" />
                  <span>
                    {t.name}
                    <span className="ml-2 text-muted-foreground">
                      {t.unitName}
                    </span>
                  </span>
                </CommandItem>
              ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Help">
          <CommandItem onSelect={() => handleSelect(onShowShortcuts)}>
            <Keyboard className="size-4" />
            <span>Show all shortcuts</span>
            <ArrowRight className="ml-auto size-3 text-muted-foreground" />
            <kbd className="pointer-events-none ml-1 hidden sm:inline-flex h-4 select-none items-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
              ?
            </kbd>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      {/* Footer with keyboard hints */}
      <div className="border-t border-border/50 px-3 py-2 flex items-center justify-center gap-3">
        <span className="text-[10px] text-muted-foreground/60">↑↓ Navigate</span>
        <span className="text-[10px] text-muted-foreground/60">↵ Select</span>
        <span className="text-[10px] text-muted-foreground/60">Esc Close</span>
      </div>
    </CommandDialog>
  );
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────

function DesktopSidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const badges = useNavBadges();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-border bg-sidebar h-screen sticky top-0 transition-all duration-200 shrink-0',
        collapsed ? 'w-[52px]' : 'w-[180px] lg:w-[220px]'
      )}
    >
      {/* Brand */}
      <div className="flex items-center h-12 px-3 shrink-0 border-b border-border/50">
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-foreground select-none">
            DELULU
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            collapsed ? 'mx-auto' : 'ml-auto'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-3.5" />
          ) : (
            <PanelLeftClose className="size-3.5" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className={cn('px-2 pt-2 pb-1 shrink-0', collapsed && 'px-1.5')}>
        <button
          onClick={() => setCommandOpen(true)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md border border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:bg-accent transition-all duration-200',
            collapsed ? 'justify-center px-1.5 py-1.5' : 'px-2.5 py-1.5'
          )}
          aria-label="Open command palette"
        >
          <Search className="size-3.5 shrink-0" />
          {!collapsed && (
            <span className="flex-1 text-left text-xs">Search...</span>
          )}
          {!collapsed && (
            <kbd className="pointer-events-none hidden sm:inline-flex h-4 select-none items-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className={cn(
        'scrollbar-thin flex-1 px-1.5 pt-1',
        collapsed ? 'overflow-visible' : 'overflow-y-auto'
      )}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="section-label px-2.5 mt-4 mb-1.5">{group.label}</p>
            )}
            {collapsed && gi > 0 && (
              <div className="border-t border-border/50 my-2 mx-2" />
            )}
            {group.items.map((item) => (
              <SidebarNavItem key={item.id} item={item} collapsed={collapsed} badge={badges[item.id as ViewId]} />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border/50 px-1.5 py-2 shrink-0">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.id} item={item} collapsed={collapsed} badge={badges[item.id as ViewId]} />
        ))}
      </div>
    </aside>
  );
}

// ─── Theme Toggle (mobile) ─────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background/50 text-muted-foreground hover:bg-accent hover:text-foreground active:scale-95 transition-all duration-150"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

// ─── Mobile Streak Badge ─────────────────────────────────────────

function MobileStreakBadge() {
  const studySessions = useStore((s) => s.studySessions);
  const streak = useMemo(() => getStudyStreak({ studySessions }), [studySessions]);

  if (streak <= 0) return null;

  return (
    <span className="md:hidden inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 dark:text-orange-400 text-[10px] font-semibold tabular-nums">
      <Flame className="size-3" />
      {streak}
    </span>
  );
}

// ─── Desktop Top Bar ───────────────────────────────────────────────

function DesktopTopBar() {
  const { theme, setTheme } = useTheme();
  const studySessions = useStore((s) => s.studySessions);
  const subjects = useStore((s) => s.subjects);
  const syllabusUnits = useStore((s) => s.syllabusUnits);
  const assessments = useStore((s) => s.assessments);
  const attendance = useStore((s) => s.attendance);
  const revisionItems = useStore((s) => s.revisionItems);
  const profile = useStore((s) => s.profile);

  const healthScore = useMemo(
    () => getSemesterHealth({ subjects, syllabusUnits, assessments, attendance, revisionItems, profile } as never),
    [subjects, syllabusUnits, assessments, attendance, revisionItems, profile]
  );
  const streak = useMemo(() => getStudyStreak({ studySessions }), [studySessions]);
  const studyToday = useMemo(() => getStudyTimeToday({ studySessions }), [studySessions]);

  const todayMinutes = Math.floor(studyToday / 60);
  const todayH = Math.floor(todayMinutes / 60);
  const todayM = todayMinutes % 60;
  const todayStr = todayH === 0 ? `${todayM}m` : todayM === 0 ? `${todayH}h` : `${todayH}h ${todayM}m`;

  return (
    <div className="top-bar hidden md:flex items-center gap-3 px-4 lg:px-6 py-1.5">
      <span className="text-xs text-muted-foreground tabular-nums">{format(new Date(), 'EEE, d MMM · HH:mm')}</span>
      <span className="text-border">·</span>
      <div className="flex items-center gap-3">
        <span className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide',
          healthScore >= 75 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : healthScore >= 50 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : healthScore >= 30 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
        )}>
          Health {healthScore}
        </span>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 text-orange-500 dark:text-orange-400">
            <Flame className="size-3" />
            <span className="font-semibold tabular-nums">{streak}d</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3" />
          <span className="tabular-nums">{todayStr}</span>
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="hidden lg:flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Mobile FAB ──────────────────────────────────────────────────

const FAB_ACTIONS: ({ label: string; icon: LucideIcon; view?: ViewId; color: string; customAction?: string })[] = [
  { label: 'Quick Note', icon: StickyNote, color: 'bg-amber-500 dark:bg-amber-400', customAction: 'quick-note' },
  { label: 'New Subject', icon: BookOpen, view: 'subjects', color: 'bg-violet-500 dark:bg-violet-400' },
  { label: 'New Task', icon: CheckSquare, view: 'tasks', color: 'bg-blue-500 dark:bg-blue-400' },
  { label: 'Start Focus', icon: Timer, view: 'focus', color: 'bg-orange-500 dark:bg-orange-400' },
];

function MobileFAB() {
  const [open, setOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const navigate = useStore((s) => s.navigate);
  const currentView = useStore((s) => s.currentView);
  const fabRef = useRef<HTMLDivElement>(null);

  // Auto-close when navigating away (store currentView is external state)
  const prevViewRef = useRef(currentView);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (prevViewRef.current !== currentView) {
      prevViewRef.current = currentView;
      setOpen(false);
    }
  }, [currentView]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleClose = useCallback(() => setOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Delay to avoid immediate close from the toggle click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  const handleAction = (action: typeof FAB_ACTIONS[number]) => {
    setOpen(false);
    if (action.customAction === 'quick-note') {
      setQuickNoteOpen(true);
    } else if (action.view) {
      navigate(action.view);
    }
  };

  return (
    <div ref={fabRef} className="fixed bottom-[76px] right-4 z-30 md:hidden">
      {/* Backdrop overlay when open */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[-1]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Radial menu items */}
      <AnimatePresence>
        {open && (
          <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2.5">
            {FAB_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 10 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="flex items-center gap-2.5"
                >
                  <span className="text-xs font-medium text-foreground whitespace-nowrap bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 shadow-sm">
                    {action.label}
                  </span>
                  <button
                    onClick={() => handleAction(action)}
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center shadow-lg press-scale transition-colors',
                      action.color,
                      'text-white'
                    )}
                    aria-label={action.label}
                  >
                    <Icon className="size-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        whileTap={{ scale: 0.92 }}
        className="h-12 w-12 rounded-full bg-primary text-primary-foreground fab-shadow press-scale flex items-center justify-center"
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        style={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Plus className="size-5" />
      </motion.button>

      <QuickNoteDialog open={quickNoteOpen} onOpenChange={setQuickNoteOpen} />
    </div>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────

export function AppShell() {
  const subjects = useStore((s) => s.subjects);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const showShortcuts = useCallback(() => {
    setCommandOpen(false);
    setShortcutsOpen(true);
  }, [setCommandOpen]);

  // ── Auto-collapse sidebar on tablet (768–1024) ──
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px) and (max-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        useStore.setState({ sidebarCollapsed: true });
      }
    };
    // Collapse immediately if already in tablet range
    if (mql.matches) {
      useStore.setState({ sidebarCollapsed: true });
    }
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const NUMBER_KEY_VIEWS: Record<string, ViewId> = {
      '1': 'dashboard',
      '2': 'subjects',
      '3': 'marks',
      '4': 'attendance',
      '5': 'exams',
      '6': 'focus',
      '7': 'revision',
      '8': 'notes',
      '9': 'tasks',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      const hasModifier = e.metaKey || e.ctrlKey || e.altKey;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        useStore.getState().navigate('settings');
      }
      if (!isInput && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
      // Number keys 1-9 for view navigation (no modifiers, not in input)
      if (!isInput && !hasModifier && !e.shiftKey && NUMBER_KEY_VIEWS[e.key]) {
        e.preventDefault();
        useStore.getState().navigate(NUMBER_KEY_VIEWS[e.key]);
      }
      // D key for theme toggle (no modifiers, not in input)
      if (!isInput && !hasModifier && e.key === 'd') {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }
      // N key for context-sensitive new action (no modifiers, not in input)
      if (!isInput && !hasModifier && e.key === 'n') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('shortcut:new-action'));
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setCommandOpen, theme, setTheme]);

  return (
    <ToastProvider>
    <MobileFAB />
    <div className="flex min-h-screen">
      <DesktopSidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        <DesktopTopBar />
        <div className="content-area flex-1 px-4 md:px-5 lg:px-6 py-5 pb-[76px] md:pb-6">
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-5 md:mb-0">
            <div className="flex items-center gap-2">
              <span className="md:hidden text-sm font-bold tracking-tight text-foreground">
                DELULU
              </span>
              <MobileStreakBadge />
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <ThemeToggle />
              <button
                onClick={() => setCommandOpen(true)}
                className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background/50 text-muted-foreground hover:bg-accent hover:text-foreground active:scale-95 transition-all duration-150"
                aria-label="Search"
              >
                <Search className="size-4" />
              </button>
            </div>
          </div>

          {/* Onboarding — shows when no subjects exist */}
          {subjects.length === 0 && <Onboarding />}

          <ViewRouter />
        </div>
      </main>

      <MobileBottomNav onMoreOpen={() => setMoreSheetOpen(true)} />
      <MobileMoreSheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen} />
      <CommandPalette onShowShortcuts={showShortcuts} />
      <ShortcutsOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
    </ToastProvider>
  );
}
