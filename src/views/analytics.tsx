'use client';

import { useStore, getSubjectProgress, getSubjectAttendance, getSubjectMarks, getStudyTimeThisWeek, getDueRevisionItems } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, BookOpen, UserCheck, Timer, BrainCircuit, BarChart3, Clock, Target, Flame } from 'lucide-react';
import { useMemo } from 'react';
import { format, subDays, startOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

export default function AnalyticsView() {
  const { subjects, studySessions, assessments, attendance, revisionItems, tasks, profile, calendarEvents } = useStore();

  const activeSubjects = subjects.filter((s) => !s.archived);

  // Study heatmap data (last 35 days)
  const heatmapData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 34), end: new Date() });
    return days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const totalSeconds = studySessions
        .filter((s) => s.date === dayStr)
        .reduce((acc, s) => acc + s.duration, 0);
      return { date: day, dateStr: dayStr, minutes: Math.round(totalSeconds / 60) };
    });
  }, [studySessions]);

  const maxMinutes = Math.max(...heatmapData.map((d) => d.minutes), 1);

  // Study distribution per subject
  const studyDistribution = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return activeSubjects.map((sub) => {
      const seconds = studySessions
        .filter((s) => s.subjectId === sub.id && parseISO(s.date) >= weekStart)
        .reduce((acc, s) => acc + s.duration, 0);
      return { subject: sub, minutes: Math.round(seconds / 60) };
    }).filter((d) => d.minutes > 0).sort((a, b) => b.minutes - a.minutes);
  }, [activeSubjects, studySessions]);

  // Weekly stats
  const weekStats = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekSessions = studySessions.filter((s) => parseISO(s.date) >= weekStart);
    const totalMinutes = weekSessions.reduce((acc, s) => acc + s.duration, 0);
    return {
      totalSessions: weekSessions.length,
      totalMinutes: Math.round(totalMinutes / 60),
      avgPerSession: weekSessions.length > 0 ? Math.round(totalMinutes / weekSessions.length / 60) : 0,
      uniqueSubjects: new Set(weekSessions.map((s) => s.subjectId)).size,
    };
  }, [studySessions]);

  // Attendance trends
  const attendanceTrend = useMemo(() => {
    return activeSubjects.map((sub) => {
      const att = getSubjectAttendance(sub.id);
      return { subject: sub, ...att };
    });
  }, [activeSubjects]);

  // Assessment performance
  const assessmentStats = useMemo(() => {
    const total = assessments.length;
    const avgPct = total > 0 ? Math.round(assessments.reduce((acc, a) => acc + (a.obtainedMarks / a.maxMarks) * 100, 0) / total) : 0;
    const latest5 = [...assessments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return { total, avgPct, latest: latest5 };
  }, [assessments]);

  // Interpretation messages
  const interpretations = useMemo(() => {
    const msgs: string[] = [];
    if (weekStats.totalMinutes > 0) {
      msgs.push(`You studied ${weekStats.totalMinutes} minutes across ${weekStats.totalSessions} sessions this week.`);
    }
    if (weekStats.uniqueSubjects > 0) {
      msgs.push(`You covered ${weekStats.uniqueSubjects} subject${weekStats.uniqueSubjects > 1 ? 's' : ''} this week.`);
    }
    const lowAtt = attendanceTrend.filter((a) => a.percentage < profile.attendanceThreshold);
    if (lowAtt.length > 0) {
      msgs.push(`${lowAtt.length} subject${lowAtt.length > 1 ? 's have' : ' has'} attendance below your ${profile.attendanceThreshold}% threshold.`);
    }
    if (assessmentStats.latest.length >= 2) {
      const last = assessmentStats.latest[0];
      const prev = assessmentStats.latest[1];
      const lastPct = (last.obtainedMarks / last.maxMarks) * 100;
      const prevPct = (prev.obtainedMarks / prev.maxMarks) * 100;
      if (lastPct > prevPct) msgs.push('CA performance improved in your latest assessment.');
      else if (lastPct < prevPct) msgs.push('CA performance dipped in your latest assessment.');
    }
    const dueRevision = getDueRevisionItems().length;
    if (dueRevision > 0) {
      msgs.push(`${dueRevision} revision item${dueRevision > 1 ? 's are' : ' is'} overdue.`);
    }
    return msgs;
  }, [weekStats, attendanceTrend, assessmentStats, profile.attendanceThreshold]);

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

  const getHeatColor = (minutes: number) => {
    if (minutes === 0) return 'bg-border';
    if (minutes < 15) return 'bg-primary/20';
    if (minutes < 30) return 'bg-primary/40';
    if (minutes < 60) return 'bg-primary/60';
    return 'bg-primary';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Your academic performance insights</p>
      </div>

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Study Time</div>
            <div className="text-2xl font-bold tabular-nums">{weekStats.totalMinutes}m</div>
            <div className="text-xs text-muted-foreground mt-1">{weekStats.totalSessions} sessions this week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Target className="w-3.5 h-3.5" /> Avg Session</div>
            <div className="text-2xl font-bold tabular-nums">{weekStats.avgPerSession}m</div>
            <div className="text-xs text-muted-foreground mt-1">minutes per session</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BarChart3 className="w-3.5 h-3.5" /> CA Average</div>
            <div className={`text-2xl font-bold tabular-nums ${getColor(assessmentStats.avgPct)}`}>{assessmentStats.avgPct}%</div>
            <div className="text-xs text-muted-foreground mt-1">{assessmentStats.total} assessments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BrainCircuit className="w-3.5 h-3.5" /> Revision Queue</div>
            <div className="text-2xl font-bold tabular-nums">{getDueRevisionItems().length}</div>
            <div className="text-xs text-muted-foreground mt-1">items due now</div>
          </CardContent>
        </Card>
      </div>

      {/* Study Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Study Activity</CardTitle>
          <CardDescription>Last 35 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {heatmapData.map((d) => (
              <div
                key={d.dateStr}
                className={`w-3.5 h-3.5 rounded-sm ${getHeatColor(d.minutes)} transition-colors`}
                title={`${format(d.date, 'MMM d')}: ${d.minutes} min`}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Study Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Study Distribution</CardTitle>
            <CardDescription>This week by subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {studyDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">No study sessions this week.</p>
            ) : (
              studyDistribution.map((d) => {
                const maxM = Math.max(...studyDistribution.map((x) => x.minutes), 1);
                return (
                  <div key={d.subject.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.subject.color }} />
                        <span className="truncate max-w-[160px]">{d.subject.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">{d.minutes}m</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(d.minutes / maxM) * 100}%`, backgroundColor: d.subject.color }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Attendance Overview */}
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
                <div key={a.subject.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.subject.color }} />
                      <span className="truncate max-w-[160px]">{a.subject.name}</span>
                    </div>
                    <span className={`font-medium tabular-nums ${getColor(a.percentage)}`}>{a.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${getBarColor(a.percentage)}`} style={{ width: `${Math.min(a.percentage, 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Subject Progress Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Syllabus Coverage</CardTitle>
            <CardDescription>Per subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects.</p>
            ) : (
              activeSubjects.map((sub) => {
                const prog = getSubjectProgress(sub.id);
                return (
                  <div key={sub.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                        <span className="truncate max-w-[160px]">{sub.name}</span>
                      </div>
                      <span className={`font-medium tabular-nums ${getColor(prog.percentage)}`}>{prog.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${getBarColor(prog.percentage)}`} style={{ width: `${prog.percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Assessment Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Assessments</CardTitle>
            <CardDescription>Last 5 performance scores</CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentStats.latest.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assessments yet.</p>
            ) : (
              <div className="space-y-3">
                {assessmentStats.latest.map((a, i) => {
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

      {/* AI Interpretations */}
      {interpretations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Flame className="w-4 h-4" /> Insights</CardTitle>
            <CardDescription>Based on your actual data</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {interpretations.map((msg, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {msg}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}