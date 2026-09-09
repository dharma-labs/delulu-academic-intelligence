'use client';

import { useState, useMemo } from 'react';
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
import { GraduationCap, Plus, TrendingUp, Award } from 'lucide-react';
import type { CUETScore } from '@/lib/types';

export function CUETTracker() {
  const { cuetScores, addCUETScore, updateCUETScore, removeCUETScore } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    score: 0,
    maxScore: 800,
    percentile: 0,
    year: new Date().getFullYear(),
  });

  const summary = useMemo(() => {
    if (cuetScores.length === 0) return null;
    const withPercentile = cuetScores.filter((s) => s.percentile);
    const avgPercentile = withPercentile.length > 0
      ? withPercentile.reduce((a, s) => a + (s.percentile ?? 0), 0) / withPercentile.length
      : null;
    const best = cuetScores.reduce((a, s) => (s.score / s.maxScore > a.score / a.maxScore ? s : a), cuetScores[0]);
    return { avgPercentile, best, total: cuetScores.length };
  }, [cuetScores]);

  const handleAdd = () => {
    if (!form.subject.trim()) return;
    addCUETScore({
      subject: form.subject.trim(),
      score: form.score,
      maxScore: form.maxScore,
      percentile: form.percentile > 0 ? form.percentile : undefined,
      year: form.year,
    });
    setForm({ subject: '', score: 0, maxScore: 800, percentile: 0, year: new Date().getFullYear() });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold">CUET Scores</h3>
          <Badge variant="secondary" className="text-xs">{cuetScores.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add CUET Score</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                placeholder="Subject (e.g. Physics, Chemistry)"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Score</label>
                  <Input
                    type="number"
                    value={form.score}
                    onChange={(e) => setForm((f) => ({ ...f, score: +e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max Score</label>
                  <Input
                    type="number"
                    value={form.maxScore}
                    onChange={(e) => setForm((f) => ({ ...f, maxScore: +e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Percentile (optional)</label>
                  <Input
                    type="number"
                    value={form.percentile}
                    onChange={(e) => setForm((f) => ({ ...f, percentile: +e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Year</label>
                  <Input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: +e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!form.subject.trim()}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {summary && (
        <div className="flex items-center gap-4 text-xs">
          {summary.avgPercentile !== null && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-amber-500" />
              <span>Avg percentile: <strong>{summary.avgPercentile.toFixed(1)}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Award className="h-3 w-3 text-emerald-500" />
            <span>Best: <strong>{summary.best.subject}</strong> ({(summary.best.score / summary.best.maxScore * 100).toFixed(0)}%)</span>
          </div>
        </div>
      )}

      {/* Score list */}
      {cuetScores.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No CUET scores added yet.
        </p>
      )}

      <div className="space-y-1">
        {cuetScores.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 text-xs rounded-lg border px-3 py-2">
            <div className="min-w-0">
              <span className="font-medium">{s.subject}</span>
              <span className="text-muted-foreground ml-2">{s.year}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono">{s.score}/{s.maxScore}</span>
              {s.percentile && <Badge variant="outline" className="text-[10px]">P{s.percentile}</Badge>}
              <button
                onClick={() => removeCUETScore(s.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
