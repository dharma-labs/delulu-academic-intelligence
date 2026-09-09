'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useStore } from '@/lib/store';
import {
  RotateCcw,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileCheck,
  Pencil,
} from 'lucide-react';
import type { ReEvalRequest } from '@/lib/types';

const STATUS_CONFIG: Record<
  ReEvalRequest['status'],
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: <Pencil className="h-3 w-3" /> },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: <FileCheck className="h-3 w-3" /> },
  'result-pending': { label: 'Result Pending', color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
  'result-received': { label: 'Result Received', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
};

const NEXT_STATUS: Partial<Record<ReEvalRequest['status'], ReEvalRequest['status']>> = {
  draft: 'submitted',
  submitted: 'result-pending',
  'result-pending': 'result-received',
};

export function ReEvalTracker() {
  const { subjects, reEvalRequests, addReEvalRequest, updateReEvalRequest, removeReEvalRequest } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subjectId: '',
    originalMarks: 0,
    maxMarks: 100,
    notes: '',
  });
  const [resultInput, setResultInput] = useState<Record<string, number>>({});

  const activeSubjects = subjects.filter((s) => !s.archived);

  const selectedSubject = activeSubjects.find((s) => s.id === form.subjectId);

  const handleAdd = () => {
    if (!form.subjectId) return;
    const subj = activeSubjects.find((s) => s.id === form.subjectId);
    if (!subj) return;
    addReEvalRequest({
      subjectId: subj.id,
      subjectName: subj.name,
      upcCode: subj.upcCode,
      semester: subj.semester || 1,
      originalMarks: form.originalMarks,
      maxMarks: form.maxMarks,
      status: 'draft',
      notes: form.notes || undefined,
    });
    setForm({ subjectId: '', originalMarks: 0, maxMarks: 100, notes: '' });
    setOpen(false);
  };

  const advanceStatus = (req: ReEvalRequest) => {
    const next = NEXT_STATUS[req.status];
    if (!next) return;
    const update: Partial<ReEvalRequest> = { status: next };
    if (next === 'submitted') {
      update.submittedDate = new Date().toISOString();
      update.feePaid = true;
    }
    if (next === 'result-received') {
      update.resultDate = new Date().toISOString();
      update.resultMarks = resultInput[req.id];
    }
    updateReEvalRequest(req.id, update);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold">Re-evaluation Requests</h3>
          <Badge variant="secondary" className="text-xs">{reEvalRequests.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Re-evaluation</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.subjectId}
                onChange={(e) => {
                  const subj = activeSubjects.find((s) => s.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    subjectId: e.target.value,
                    originalMarks: subj?.internalMarksObtained ?? subj?.endSemMarksObtained ?? f.originalMarks,
                    maxMarks: subj?.endSemMarksMax ?? f.maxMarks,
                  }));
                }}
              >
                <option value="">Select subject...</option>
                {activeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (Sem {s.semester})</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Original Marks</label>
                  <Input
                    type="number"
                    value={form.originalMarks}
                    onChange={(e) => setForm((f) => ({ ...f, originalMarks: +e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max Marks</label>
                  <Input
                    type="number"
                    value={form.maxMarks}
                    onChange={(e) => setForm((f) => ({ ...f, maxMarks: +e.target.value }))}
                  />
                </div>
              </div>
              <Input
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!form.subjectId}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {reEvalRequests.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No re-evaluation requests. Need one? Click Request above.
        </p>
      )}

      <div className="space-y-2">
        {reEvalRequests.map((req) => {
          const cfg = STATUS_CONFIG[req.status];
          return (
            <div key={req.id} className="rounded-lg border px-3 py-2 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 ${cfg.color}`}>
                    {cfg.label}
                  </Badge>
                  <span className="font-medium truncate">{req.subjectName}</span>
                  {req.upcCode && (
                    <span className="text-[10px] text-muted-foreground font-mono">{req.upcCode}</span>
                  )}
                </div>
                <button
                  onClick={() => removeReEvalRequest(req.id)}
                  className="text-muted-foreground hover:text-destructive text-xs shrink-0"
                >
                  ×
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Original: {req.originalMarks}/{req.maxMarks}</span>
                {req.resultMarks !== undefined && (
                  <span>Result: <strong>{req.resultMarks}/{req.maxMarks}</strong></span>
                )}
                {req.feePaid && <span className="text-emerald-600">Fee paid</span>}
                {req.submittedDate && <span>Filed: {new Date(req.submittedDate).toLocaleDateString()}</span>}
              </div>
              <div className="flex items-center gap-2">
                {NEXT_STATUS[req.status] && (
                  <>
                    {req.status === 'result-pending' && (
                      <Input
                        type="number"
                        placeholder="Result marks"
                        className="h-7 text-xs w-28"
                        value={resultInput[req.id] ?? ''}
                        onChange={(e) => setResultInput((r) => ({ ...r, [req.id]: +e.target.value }))}
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => advanceStatus(req)}
                    >
                      <ChevronRight className="h-3 w-3" />
                      {req.status === 'draft' ? 'Submit' : req.status === 'submitted' ? 'Mark Pending' : 'Record Result'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
