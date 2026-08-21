'use client';

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { ViewId } from '@/lib/types';
import { ViewRouter } from '@/components/view-router';
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
  ChevronLeft,
  GraduationCap,
  Ellipsis,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';

// ─── Nav item types ─────────────────────────────────────────────────

interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ─── Navigation structure ────────────────────────────────────────────

const MAIN_NAV: NavItem = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'ACADEMICS',
    items: [
      { id: 'subjects', label: 'Subjects', icon: BookOpen },
      { id: 'marks', label: 'Marks & CA', icon: BarChart3 },
      { id: 'attendance', label: 'Attendance', icon: UserCheck },
      { id: 'exams', label: 'Exams', icon: FileText },
    ],
  },
  {
    label: 'STUDY',
    items: [
      { id: 'focus', label: 'Focus', icon: Timer },
      { id: 'revision', label: 'Revision', icon: BrainCircuit },
      { id: 'notes', label: 'Notes', icon: StickyNote },
    ],
  },
  {
    label: 'PLANNING',
    items: [
      { id: 'calendar', label: 'Calendar', icon: CalendarDays },
      { id: 'timetable', label: 'Timetable', icon: Clock },
      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
      { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { id: 'analytics', label: 'Analytics', icon: TrendingUp },
      { id: 'er-center', label: 'ER Center', icon: FileSearch },
    ],
  },
];

const BOTTOM_NAV: NavItem[] = [
  { id: 'ai-tutor', label: 'AI Tutor', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Mobile bottom nav items
const MOBILE_NAV_ITEMS = [
  { id: 'dashboard' as ViewId, label: 'Home', icon: LayoutDashboard },
  { id: 'subjects' as ViewId, label: 'Study', icon: BookOpen },
  { id: 'marks' as ViewId, label: 'Academics', icon: GraduationCap },
  { id: 'calendar' as ViewId, label: 'Plan', icon: CalendarDays },
  { id: 'more' as 'more', label: 'More', icon: Ellipsis },
];

type MobileViewId = ViewId | 'more';

// ─── Sidebar nav item component ──────────────────────────────────────

function SidebarNavItem({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const currentView = useStore((s) => s.currentView);
  const navigate = useStore((s) => s.navigate);
  const isActive = currentView === item.id;
  const Icon = item.icon;

  return (
    <button
      onClick={() => navigate(item.id)}
      title={collapsed ? item.label : undefined}
      className={`flex w-full items-center gap-3 rounded-md py-2 text-sm transition-colors duration-150
        ${
          isActive
            ? 'bg-accent text-primary font-medium border-l-2 border-primary pl-[10px] pr-3'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground pl-3 pr-3'
        }
        ${collapsed ? 'justify-center px-2 border-l-0' : ''}
      `}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border/50 glass md:hidden">
      <div className="flex h-full items-center justify-around px-2">
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
                  navigate(item.id);
                }
              }}
              className={`relative flex min-w-[48px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] transition-colors duration-150
                ${isActive ? 'text-primary' : 'text-muted-foreground'}
              `}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -top-px left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />
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

  const allItems = useMemo(() => {
    const items: NavItem[] = [
      ...NAV_GROUPS.flatMap((g) => g.items),
      { id: 'analytics', label: 'Analytics', icon: TrendingUp },
      { id: 'er-center', label: 'ER Center', icon: FileSearch },
      { id: 'ai-tutor', label: 'AI Tutor', icon: Bot },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
    return items;
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-xl">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
          <SheetDescription>Navigate to other sections</SheetDescription>
        </SheetHeader>
        <div className="scrollbar-thin max-h-[55vh] overflow-y-auto px-4 pb-8">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground px-1 mb-1 mt-2">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.id);
                      onOpenChange(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150
                      ${
                        isActive
                          ? 'bg-accent text-primary font-medium'
                          : 'text-foreground hover:bg-accent'
                      }
                    `}
                  >
                    <Icon className="size-[18px] shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="border-t border-border pt-4 mt-2">
            {BOTTOM_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.id);
                    onOpenChange(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150
                    ${
                      isActive
                        ? 'bg-accent text-primary font-medium'
                        : 'text-foreground hover:bg-accent'
                    }
                  `}
                >
                  <Icon className="size-[18px] shrink-0" />
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

// ─── Command palette ─────────────────────────────────────────────────

function CommandPalette() {
  const commandOpen = useStore((s) => s.commandOpen);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const navigate = useStore((s) => s.navigate);
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

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={setCommandOpen}
    >
      <CommandInput placeholder="Search subjects, tasks, notes, or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Commands */}
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
            <span>Add Assessment</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('attendance'))}>
            <UserCheck className="size-4" />
            <span>Go to Attendance</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => navigate('marks'))}>
            <BarChart3 className="size-4" />
            <span>Go to Marks</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Subjects */}
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

        {/* Tasks */}
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

        {/* Notes */}
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

        {/* Exams */}
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

        {/* Syllabus topics */}
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
      </CommandList>
    </CommandDialog>
  );
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────

function DesktopSidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setCommandOpen = useStore((s) => s.setCommandOpen);

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border/50 bg-sidebar h-screen sticky top-0 transition-all duration-150 shrink-0
        ${collapsed ? 'w-16' : 'w-[240px]'}
      `}
    >
      {/* Brand + Collapse toggle */}
      <div className="flex items-center justify-between px-3 h-14 shrink-0">
        {!collapsed && (
          <span className="gradient-text text-lg font-bold tracking-tight select-none">
            DELULU
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className={`flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150
            ${collapsed ? 'mx-auto' : ''}
          `}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {/* Search button */}
      <div className={`px-3 mb-2 shrink-0 ${collapsed ? 'px-2' : ''}`}>
        <button
          onClick={() => setCommandOpen(true)}
          className={`flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/30 focus-within:border-primary/50 hover:bg-accent transition-all duration-200
            ${collapsed ? 'justify-center px-2' : ''}
          `}
          aria-label="Open command palette"
        >
          <Search className="size-4 shrink-0" />
          {!collapsed && (
            <span className="flex-1 text-left">Search...</span>
          )}
          {!collapsed && (
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </button>
      </div>

      {/* Nav items - scrollable */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2">
        {/* Main: Dashboard */}
        <SidebarNavItem item={MAIN_NAV} collapsed={collapsed} />

        {/* Groups */}
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground px-3 mt-4 mb-1">
                {group.label}
              </p>
            )}
            {collapsed && (
              <div className="border-t border-border my-3 mx-2" />
            )}
            {group.items.map((item) => (
              <SidebarNavItem key={item.id} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-border px-2 py-2 shrink-0">
        {BOTTOM_NAV.map((item) => (
          <SidebarNavItem key={item.id} item={item} collapsed={collapsed} />
        ))}
      </div>
    </aside>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────

export function AppShell() {
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setCommandOpen]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main content area */}
      <main className="flex-1 min-w-0">
        <div
          className={`p-6 pb-24 md:pb-6 transition-all duration-150`}
        >
          {/* Mobile header bar */}
          <div className="flex items-center justify-between mb-6 md:mb-0">
            <div className="md:hidden flex items-center gap-3">
              <span className="gradient-text text-lg font-bold tracking-tight">DELULU</span>
            </div>
            <button
              onClick={() => setCommandOpen(true)}
              className="md:hidden flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors duration-150 ml-auto"
              aria-label="Open command palette"
            >
              <Search className="size-4" />
            </button>
          </div>

          <ViewRouter />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav onMoreOpen={() => setMoreSheetOpen(true)} />
      <MobileMoreSheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen} />

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}
