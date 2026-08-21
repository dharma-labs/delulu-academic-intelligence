'use client';

import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useState, useMemo } from 'react';
import { Plus, FileSearch, AlertTriangle, Clock, CheckCircle2, Circle, Trash2, ExternalLink } from 'lucide-react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { toast } from 'sonner';
import type { ERPaper } from '@/lib/types';

const PRIORITY_CONFIG = {
  critical: { label: 'CRITICAL', variant: 'destructive' as const, icon: AlertTriangle },
  high: { label: 'HIGH', variant: 'default' as const, icon: Circle },
  normal: { label: 'NORMAL', variant: 'secondary' as const, icon: Clock },
  low: { label: 'LOW', variant: 'outline' as const, icon: Circle },
};

const STATUS_STYLES: Record<string, { color: string; label: string; icon: typeof Circle }> = {
  pending: { color: 'text-[var(--delulu-warning)]', label: 'Pending', icon: Circle },
  in_progress: { color: 'text-[var(--delulu-info)]', label: 'In Progress', icon: Clock },
  completed: { color: 'text-[var(--delulu-success)]', label: 'Completed', icon: CheckCircle2 },
};

export default function ERCenterView() {
  const { erPapers, subjects, addERPaper, updateERPaper, deleteERPaper } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ERPaper>>({});

  const grouped = useMemo(() => {
    const groups = { critical: [] as ERPaper[], high: [] as ERPaper[], normal: [] as ERPaper[], low: [] as ERPaper[] };
    erPapers.sort((a, b) => {
      const pOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return (a.deadline || 'z').localeCompare(b.deadline || 'z');
    });
    for (const p of erPapers) groups[p.priority].push(p);
    return groups;
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
    toast.success(`Status: ${STATUS_STYLES[next].label}`);
  };

  const totalCount = erPapers.length;
  const completedCount = erPapers.filter((p) => p.status === 'completed').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ER Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage your exam preparation papers</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Paper</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[var(--delulu-danger)]">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Critical</div>
            <div className="text-2xl font-bold text-[var(--delulu-danger)]">{grouped.critical.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[var(--delulu-warning)]">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">High</div>
            <div className="text-2xl font-bold text-[var(--delulu-warning)]">{grouped.high.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[var(--delulu-info)]">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Normal</div>
            <div className="text-2xl font-bold text-[var(--delulu-info)]">{grouped.normal.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-muted-foreground/30">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Completed</div>
            <div className="text-2xl font-bold text-[var(--delulu-success)]">{completedCount}/{totalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Papers by priority */}
      {totalCount === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileSearch className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-medium mb-1">No papers tracked</h3>
            <p className="text-sm text-muted-foreground mb-4">Add papers you need to study for exam preparation.</p>
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Your First Paper</Button>
          </CardContent>
        </Card>
      ) : (
        (['critical', 'high', 'normal', 'low'] as const).map((pri) => {
          if (grouped[pri].length === 0) return null;
          const cfg = PRIORITY_CONFIG[pri];
          return (
            <div key={pri}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
                <span className="text-sm text-muted-foreground">{grouped[pri].length} paper{grouped[pri].length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {grouped[pri].map((paper) => {
                  const sub = getSubject(paper.subjectId);
                  const statusCfg = STATUS_STYLES[paper.status];
                  const StatusIcon = statusCfg.icon;
                  const daysLeft = paper.deadline ? differenceInDays(parseISO(paper.deadline), new Date()) : null;
                  return (
                    <Card key={paper.id} className="hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <StatusIcon className={`w-4 h-4 ${statusCfg.color} shrink-0`} />
                              <span className="font-medium truncate">{paper.title}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {sub && (
                                <Badge variant="outline" className="text-xs" style={{ borderColor: sub.color, color: sub.color }}>
                                  {sub.name}
                                </Badge>
                              )}
                              {paper.author && <span>by {paper.author}</span>}
                              {paper.deadline && (
                                <span className={daysLeft !== null && daysLeft < 0 ? 'text-[var(--delulu-danger)]' : daysLeft !== null && daysLeft <= 3 ? 'text-[var(--delulu-warning)]' : ''}>
                                  {isPast(parseISO(paper.deadline)) ? 'Overdue' : `${daysLeft}d left`}
                                </span>
                              )}
                            </div>
                            {paper.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{paper.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="ghost" onClick={() => cycleStatus(paper)} title="Cycle status">
                              <StatusIcon className="w-4 h-4" />
                            </Button>
                            {paper.url && (
                              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                              </a>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => openEdit(paper)}><Plus className="w-4 h-4 scale-75" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { deleteERPaper(paper.id); toast.success('Paper removed'); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Paper' : 'Add Paper'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Paper title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subjects.filter((s) => !s.archived).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Input value={form.author || ''} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
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
              <div className="space-y-2">
                <Label>Status</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={form.url || ''} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
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