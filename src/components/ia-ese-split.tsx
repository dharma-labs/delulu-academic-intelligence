'use client';

import { useState } from 'react';
import { BookOpen, Target, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GRADE_POINTS } from '@/lib/types';
import { eseMarksNeeded } from '@/lib/marks-projection';
import type { Subject } from '@/lib/types';

interface IAESplitProps { subject: Subject; }

export function IAESplitView({ subject }: IAESplitProps) {
  const [targetGrade, setTargetGrade] = useState<string>('C');
  const iaObtained = subject.internalMarksObtained ?? 0;
  const iaMax = subject.internalMarksMax;
  const eseObtained = subject.endSemMarksObtained;
  const eseMax = subject.endSemMarksMax;
  const targetGP = GRADE_POINTS[targetGrade] ?? 0;
  const targetPct = targetGP * 10;
  const neededEse = eseMarksNeeded(iaObtained, iaMax, eseMax, targetPct);
  const possible = neededEse <= eseMax;
  const gradeOptions = Object.entries(GRADE_POINTS).sort((a, b) => b[1] - a[1]).map(([grade, gp]) => ({ grade, gp }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          Marks Split — {subject.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Internal Assessment</span>
            <span className="tabular-nums font-medium">{iaObtained} / {iaMax}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-[var(--delulu-success)] transition-all duration-500" style={{ width: iaMax > 0 ? `${Math.min(100, (iaObtained / iaMax) * 100)}%` : '0%' }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">End-Semester Exam</span>
            <span className="tabular-nums font-medium">{eseObtained !== undefined ? `${eseObtained} / ${eseMax}` : `\u2014 / ${eseMax}`}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: eseObtained !== undefined && eseMax > 0 ? `${Math.min(100, (eseObtained / eseMax) * 100)}%` : '0%', backgroundColor: eseObtained !== undefined ? 'var(--delulu-success)' : 'var(--muted)' }} />
          </div>
        </div>
        <div className="border-t border-border/50 pt-2 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">To keep grade</span>
            <Select value={targetGrade} onValueChange={setTargetGrade}>
              <SelectTrigger className="h-6 w-16 text-xs">{targetGrade}</SelectTrigger>
              <SelectContent>
                {gradeOptions.map(({ grade, gp }) => (<SelectItem key={grade} value={grade} className="text-xs">{grade} ({gp})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {eseObtained === undefined ? (
            <p className="text-xs text-muted-foreground">
              {possible ? `You need \u2265${neededEse} out of ${eseMax} in the end-sem to reach ${targetGrade}.` : `${targetGrade} is not reachable from here — the required score (${neededEse}) exceeds the end-sem max (${eseMax}).`}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">End-sem already recorded ({eseObtained}/{eseMax}).</p>
          )}
          <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/70">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>Estimate assumes linear %\u2192grade mapping. Actual DU grading may differ by ordinance.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
