'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useState, useMemo } from 'react';
import { Plus, FileSearch, AlertTriangle, Clock, CheckCircle2, Circle, Trash2, ExternalLink, Pencil, RefreshCw } from 'lucide-react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { PageHeader, MetricCard, StatusBadge, EmptyState, SectionHeader, InsightCard } from '@/components/shared';
import type { ERPaper } from '@/lib/types';

const PRIORITY_CONFIG = {
  critical: { label: 'CRITICAL', variant: 'destructive' as const, icon: AlertTriangle, signal: 'critical' as const },
  high: { label: 'HIGH', variant: 'default' as const, icon: Circle, signal: 'attention' as const },
  normal: { label: 'NORMAL', variant: 'secondary' as const, icon: Clock, signal: 'improving' as const },
  low: { label: 'LOW', variant: 'outline' as const, icon: Circle, signal: 'improving' as const },
};

const STATUS_MAP: Record<string, { label: string; status: 'attention' | 'improving' | 'healthy' }> = {
  pending: { label: 'Pending', status: 'attention' },
  in_progress: { label: 'In Progress', status: 'improving' },
  completed: { label: 'Completed', status: 'healthy' },
};

export default function ERCenterView() {
  const { erPapers, subjects, addERPaper, updateERPaper, deleteERPaper } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ERPaper>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  // Filter/search logic
  const filteredPapers = useMemo(() => {
    let papers = [...erPapers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      papers = papers.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.author && p.author.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    }
    if (filterSubject !== 'all') {
      papers = papers.filter((p) => p.subjectId === filterSubject);
    }
    if (filterYear !== 'all') {
      papers = papers.filter((p) => {
        if (!p.deadline) return false;
        return p.deadline.startsWith(filterYear);
      });
    }
    const pOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    papers.sort((a, b) => {
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return (a.deadline || 'z').localeCompare(b.deadline || 'z');
    });
    return papers;
  }, [erPapers, searchQuery, filterSubject, filterYear]);

  // Group filtered papers
  const grouped = useMemo(() => {
    const groups = { critical: [] as ERPaper[], high: [] as ERPaper[], normal: [] as ERPaper[], low: [] as ERPaper[] };
    for (const p of filteredPapers) groups[p.priority].push(p);
    return groups;
  }, [filteredPapers]);

  // Extract unique years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const p of erPapers) {
      if (p.deadline) years.add(p.deadline.slice(0, 4));
    }
    return [...years].sort().reverse();
  }, [erPapers]);

  const getSubject = (id?: string) => subjects.find((s) => s.id === id);

  const openAdd = () => {
    setEditingId(null);
    setForm({ subjectId: subjects[0]?.id, priority: 'normal', status: 'pending' });
    setDialogOpen(true);
  };

  const openEdit = (paper: ERPaper) => {
    setEditingId(paper.id);
    setForm({ ...paper });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title || !form.subjectId) { toast.error('Title and subject are required'); return; }
    if (editingId) {
      updateERPaper(editingId, form);
      toast.success('Paper updated');
    } else {
      addERPaper({
        subjectId: form.subjectId!, title: form.title!, author: form.author || '',
        status: (form.status as ERPaper['status']) || 'pending',
        priority: (form.priority as ERPaper['priority']) || 'normal',
        deadline: form.deadline, url: form.url, notes: form.notes,
      });
      toast.success('Paper added');
    }
    setDialogOpen(false);
  };

  const cycleStatus = (paper: ERPaper) => {
    const order: ERPaper['status'][] = ['pending', 'in_progress', 'completed'];
    const next = order[(order.indexOf(paper.status) + 1) % 3];
    updateERPaper(paper.id, { status: next });
    toast.success(`Status: ${STATUS_MAP[next].label}`);
  };

  const totalCount = erPapers.length;
  const completedCount = erPapers.filter((p) => p.status === 'completed').length;
  const pendingCount = erPapers.filter((p) => p.status === 'pending').length;
  const inProgressCount = erPapers.filter((p) => p.status === 'in_progress').length;

  return (
    <div className="fab-content-pad">
      <PageHeader
        title="ER Command Center"
        subtitle="Track and manage exam preparation papers"
        actions={
          <Button onClick={openAdd} size='sm'>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Paper
          </Button>
        }
      />

      {/* Summary Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <MetricCard
          label="Critical"
          value={grouped.critical.length}
          icon={AlertTriangle}
          iconColor='text-[var(--delulu-danger)]'
          valueColor={grouped.critical.length > 0 ? 'text-[var(--delulu-danger)]' : undefined}
        />
        <MetricCard
          label="In Progress"
          value={inProgressCount}
          icon={RefreshCw}
          iconColor='text-[var(--delulu-info)]'
        />
        <MetricCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          iconColor='text-[var(--delulu-warning)]'
        />
        <MetricCard
          label="Completed"
          value={`${completedCount}/${totalCount}`}
          context={totalCount > 0 ? `${Math.round((completedCount / totalCount) * 100)}% done` : undefined}
          icon={CheckCircle2}
          iconColor='text-[var(--delulu-success)]'
          valueColor={completedCount === totalCount && totalCount > 0 ? 'text-[var(--delulu-success)]' : undefined}
        />
      </motion.div>

      {/* Search & Filter Bar */}
      {totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="metric-card p-3 flex flex-col sm:flex-row gap-2 sm:gap-3"
        >
          <Input
            placeholder="Search papers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <div className="flex gap-2">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.filter((s) => !s.archived).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableYears.length > 0 && (
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-8 text-xs w-[100px]">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </motion.div>
      )}

      {/* Papers by priority */}
      {totalCount === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No papers tracked"
          description="Add papers you need to study for exam preparation"
          action={
            <Button onClick={openAdd} size='sm'>
              <Plus className="w-4 h-4 mr-1.5" />Add Your First Paper
            </Button>
          }
        />
      ) : filteredPapers.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No matching papers"
          description="Try adjusting your search or filters"
          action={
            <Button variant='outline' size='sm' onClick={() => { setSearchQuery(''); setFilterSubject('all'); setFilterYear('all'); }}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          {(['critical', 'high', 'normal', 'low'] as const).map((pri) => {
            if (grouped[pri].length === 0) return null;
            return (
              <motion.div
                key={pri}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="section-label">{PRIORITY_CONFIG[pri].label}</span>
                  <StatusBadge
                    status={PRIORITY_CONFIG[pri].signal}
                    label={`${grouped[pri].length} paper${grouped[pri].length > 1 ? 's' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  {grouped[pri].map((paper) => {
                    const sub = getSubject(paper.subjectId);
                    const statusInfo = STATUS_MAP[paper.status];
                    const daysLeft = paper.deadline ? differenceInDays(parseISO(paper.deadline), new Date()) : null;
                    return (
                      <div key={paper.id} className="card-interactive p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <StatusBadge
                                status={statusInfo.status}
                                label={statusInfo.label}
                              />
                              <span className="text-sm font-medium truncate">{paper.title}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {sub && (
                                <span className="flex items-center gap-1.5">
                                  <span className="status-dot" style={{ backgroundColor: sub.color }} />
                                  {sub.name}
                                </span>
                              )}
                              {paper.author && <span>by {paper.author}</span>}
                              {paper.deadline && (
                                <span className={daysLeft !== null && daysLeft < 0 ? 'text-[var(--delulu-danger)] font-medium' : daysLeft !== null && daysLeft <= 3 ? 'text-[var(--delulu-warning)] font-medium' : ''}>
                                  {isPast(parseISO(paper.deadline)) ? 'Overdue' : `${daysLeft}d left`}
                                </span>
                              )}
                            </div>
                            {paper.notes && (
                              <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{paper.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cycleStatus(paper)} title="Cycle status">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            {paper.url && (
                              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                                <Button size="icon" variant="ghost" className="h-7 w-7">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </a>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(paper)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { deleteERPaper(paper.id); toast.success('Paper removed'); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Paper' : 'Add Paper'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="section-label">Title *</span>
              <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Paper title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="section-label">Subject *</span>
                <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subjects.filter((s) => !s.archived).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="section-label">Author</span>
                <Input value={form.author || ''} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="section-label">Priority</span>
                <Select value={form.priority || 'normal'} onValueChange={(v) => setForm({ ...form, priority: v as ERPaper['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="section-label">Status</span>
                <Select value={form.status || 'pending'} onValueChange={(v) => setForm({ ...form, status: v as ERPaper['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="section-label">Deadline</span>
                <Input type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <span className="section-label">URL</span>
                <Input value={form.url || ''} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="section-label">Notes</span>
              <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Save' : 'Add Paper'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}