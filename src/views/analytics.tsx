'use client';

import { useEffect, useState } from 'react';
import { useStore, getSubjectAttendance, getSubjectProgress, getDueRevisionItems } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, BarChart3, BrainCircuit, Target, Flame } from 'lucide-react';
import { format, subDays, startOfWeek, eachDayOfInterval, parseISO } from 'date-fns';

type SubjectSummary = { id: string; name: string; color: string; percentage: number };
type HeatmapDay = { dateStr: string; minutes: number };
type StudyDistItem = { subjectId: string; name: string; color: string; minutes: number };
type AssessSummary = { id: string; name: string; obtainedMarks: number; maxMarks: number };

export default function AnalyticsView() {
  const [ready, setReady] = useState(false);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);
  const [avgSession, setAvgSession] = useState(0);
  const [uniqueSubjects, setUniqueSubjects] = useState(0);
  const [assessmentAvgPct, setAssessmentAvgPct] = useState(0);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [dueRevisionCount, setDueRevisionCount] = useState(0);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<SubjectSummary[]>([]);
  const [syllabusTrend, setSyllabusTrend] = useState<SubjectSummary[]>([]);
  const [studyDist, setStudyDist] = useState<StudyDistItem[]>([]);
  const [recentAssessments, setRecentAssessments] = useState<AssessSummary[]>([]);
  const [threshold, setThreshold] = useState(75);

  useEffect(() => {
    const compute = () => {
      const s = useStore.getState();
      const active = s.subjects.filter((x) => !x.archived);
      const days = eachDayOfInterval({ start: subDays(new Date(), 34), end: new Date() });
      const hm = days.map((day) => {
        const ds = format(day, 'yyyy-MM-dd');
        const secs = s.studySessions.filter((x) => x.date === ds).reduce((a, x) => a + x.duration, 0);
        return { dateStr: ds, minutes: Math.round(secs / 60) };
      });
      setHeatmap(hm);
      const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
      const wsList = s.studySessions.filter((x) => parseISO(x.date) >= ws);
      const totalSec = wsList.reduce((a, x) => a + x.duration, 0);
      setWeekMinutes(Math.round(totalSec / 60));
      setWeekSessions(wsList.length);
      setAvgSession(wsList.length > 0 ? Math.round(totalSec / wsList.length / 60) : 0);
      setUniqueSubjects(new Set(wsList.map((x) => x.subjectId)).size);
      const aCount = s.assessments.length;
      setAssessmentCount(aCount);
      setAssessmentAvgPct(aCount > 0 ? Math.round(s.assessments.reduce((a, x) => a + (x.obtainedMarks / x.maxMarks) * 100, 0) / aCount) : 0);
      setRecentAssessments([...s.assessments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5));
      setAttendanceTrend(active.map((sub) => {
        const att = getSubjectAttendance({ attendance: s.attendance }, sub.id);
        return { id: sub.id, name: sub.name, color: sub.color, percentage: att.percentage };
      }));
      setSyllabusTrend(active.map((sub) => {
        const p = getSubjectProgress({ syllabusUnits: s.syllabusUnits }, sub.id);
        return { id: sub.id, name: sub.name, color: sub.color, percentage: p.percentage };
      }));
      setStudyDist(
        active
          .map((sub) => ({
            subjectId: sub.id, name: sub.name, color: sub.color,
            minutes: Math.round(s.studySessions.filter((x) => x.subjectId === sub.id && parseISO(x.date) >= ws).reduce((a, x) => a + x.duration, 0) / 60),
          }))
          .filter((d) => d.minutes > 0)
          .sort((a, b) => b.minutes - a.minutes),
      );
      setDueRevisionCount(getDueRevisionItems({ revisionItems: s.revisionItems }).length);
      setThreshold(s.profile.attendanceThreshold);
      setReady(true);
    };
    compute();
    const unsub = useStore.subscribe(compute);
    return () => unsub();
  }, []);

  const getColor = (pct: number) => {
    if (pct >= 75) return 'text-[var(--delulu-success)]';
    if (pct >= 50) return 'text-[var(--delulu-info)]';
    if (pct >= 30) return 'text-[var(--delulu-warning)]';
    return 'text-[var(--delulu-danger)]';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 75) return 'bg-[var(--delulu-success)]';
    if (pct >= 50) return 'bg-[var(--delulu-info)]';
    if (pct >= 30) return 'bg-[var(--delulu-warning)]';
    return 'bg-[var(--delulu-danger)]';
  };

  const getHeatColor = (m: number) => {
    if (m === 0) return 'bg-border';
    if (m < 15) return 'bg-primary/20';
    if (m < 30) return 'bg-primary/40';
    if (m < 60) return 'bg-primary/60';
    return 'bg-primary';
  };

  if (!ready) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Your academic performance insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              Study Time
            </div>
            <div className="text-2xl font-bold tabular-nums">{weekMinutes}m</div>
            <div className="text-xs text-muted-foreground mt-1">
              {weekSessions} sessions this week
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Target className="w-3.5 h-3.5" />
              Avg Session
            </div>
            <div className="text-2xl font-bold tabular-nums">{avgSession}m</div>
            <div className="text-xs text-muted-foreground mt-1">
              minutes per session
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BarChart3 className="w-3.5 h-3.5" />
              CA Average
            </div>
            <div
              className={`text-2xl font-bold tabular-nums ${getColor(assessmentAvgPct)}`}
              {assessmentAvgPct}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {assessmentCount} assessments
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BrainCircuit className="w-3.5 h-3.5" />
              Revision Queue
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {dueRevisionCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              items due now
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Study Activity</CardTitle>
          <CardDescription>Last 35 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {heatmap.map((d) => (
              <div
                key={d.dateStr}
                className={`w-3.5 h-3.5 rounded-sm ${getHeatColor(d.minutes)} transition-colors`}
                title={`${d.dateStr}: ${d.minutes}m`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-border" />
              <div className="w-3 h-3 rounded-sm bg-primary/20" />
              <div className="w-3 h-3 rounded-sm bg-primary/40" />
              <div className="w-3 h-3 rounded-sm bg-primary/60" />
              <div className="w-3 h-3 rounded-sm bg-primary" />
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Study Distribution</CardTitle>
            <CardDescription>This week by subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {studyDist.length === 0 ? (
              <p className="text-sm text-muted-foreground">No study sessions this week.</p>
            ) : (
              studyDist.map((d) => {
                const mx = Math.max(...studyDist.map((x) => x.minutes), 1);
                return (
                  <div key={d.subjectId} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="truncate max-w-[160px]">{d.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">{d.minutes}m</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(d.minutes / mx) * 100}%`, backgroundColor: d.color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attendance Overview</CardTitle>
            <CardDescription>Per subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {attendanceTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance data.</p>
            ) : (
              attendanceTrend.map((a) => (
                <div key={a.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                      <span className="truncate max-w-[160px]">{a.name}</span>
                    </div>
                    <span className={`font-medium tabular-nums ${getColor(a.percentage)}`}>{a.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getBarColor(a.percentage)}`}
                      style={{ width: `${Math.min(a.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Syllabus Coverage</CardTitle>
            <CardDescription>Per subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {syllabusTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects.</p>
            ) : (
              syllabusTrend.map((s) => (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate max-w-[160px]">{s.name}</span>
                    </div>
                    <span className={`font-medium tabular-nums ${getColor(s.percentage)}`}>{s.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getBarColor(s.percentage)}`}
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Assessments</CardTitle>
            <CardDescription>Last 5 performance scores</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAssessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assessments yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAssessments.map((a, i) => {
                  const pct = (a.obtainedMarks / a.maxMarks) * 100;
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="truncate">{a.name}</span>
                          <span className={`font-medium tabular-nums ml-2 ${getColor(pct)}`}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Insights
          </CardTitle>
          <CardDescription>Based on your data</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {weekMinutes > 0 && (
              <li className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                You studied {weekMinutes} minutes across {weekSessions} sessions this week.
              </li>
            )}
            {uniqueSubjects > 0 && (
              <li className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                You covered {uniqueSubjects} subject{uniqueSubjects > 1 ? 's' : ''} this week.
              </li>
            )}
            {attendanceTrend.filter((a) => a.percentage < threshold).length > 0 && (
              <li className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {attendanceTrend.filter((a) => a.percentage < threshold).length} subject(s) below {threshold}% attendance threshold.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
