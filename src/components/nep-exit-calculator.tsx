'use client';

import { useMemo } from 'react';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NEPCalculatorProps {
  currentCGPA: number;
  completedCredits: number;
}

const EXIT_POINTS = [
  { label: 'Certificate', years: 1, minCredits: 44 },
  { label: 'Diploma', years: 2, minCredits: 88 },
  { label: "Bachelor's", years: 3, minCredits: 132 },
  { label: 'Honours', years: 4, minCredits: 176 },
] as const;

export function NEPExitCalculator({ currentCGPA, completedCredits }: NEPCalculatorProps) {
  const projections = useMemo(() =>
    EXIT_POINTS.map((ep) => ({
      ...ep,
      progressPct: Math.min(100, (completedCredits / ep.minCredits) * 100),
    })),
    [completedCredits]
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          NEP Exit Points
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {projections.map((p) => (
          <div key={p.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{p.label} <span className="text-muted-foreground font-normal">({p.years}yr)</span></span>
              <span className="tabular-nums text-muted-foreground">{p.minCredits} cr</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.progressPct}%`, backgroundColor: p.progressPct >= 100 ? 'var(--delulu-success)' : 'rgba(var(--primary-rgb), 0.5)' }} />
            </div>
            {p.progressPct >= 100 && (
              <p className="text-[10px] text-muted-foreground">Eligible to exit · projected CGPA {currentCGPA.toFixed(2)}</p>
            )}
          </div>
        ))}
        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/70 pt-1">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>Credit thresholds per DU FYUGP guidelines 2025 (verified source: theweek.in, DU FYUGP notification). Projection assumes current CGPA holds.</span>
        </div>
      </CardContent>
    </Card>
  );
}
