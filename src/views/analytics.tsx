'use client';

import { useEffect, useState } from 'react';
import { useStore, getSubjectAttendance, getSubjectProgress, getDueRevisionItems } from '@/lib/store';
import { Clock, BarChart3, BrainCircuit, Target, Flame, Activity } from 'lucide-react';
import { format, subDays, startOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { PageHeader, MetricCard, SectionHeader, EmptyState, InsightCard, CompactProgress } from '@/components/shared';
import { progressColorClass } from '@/components/shared';

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
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester'>('week');

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
        return { id: sub.id, name: sub.name, color: sub.color, percentage: p };
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

  const getHeatColor = (m: number) => {
    if (m === 0) return 'bg-border';
    if (m < 15) return 'bg-primary/20';
    if (m < 30) return 'bg-primary/40';
    if (m < 60) return 'bg-primary/60';
    return 'bg-primary';
  };

  const belowThresholdCount = attendanceTrend.filter((a) => a.percentage < threshold).length;
  const hasInsights = weekMinutes > 0 || uniqueSubjects > 0 || belowThresholdCount > 0;

  if (!ready) {
    return (
      <div className="p-6">
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        <div className="h-4 w-56 bg-muted animate-pulse rounded mt-2" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="metric-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 content-area animate-fade-slide-in">
      <PageHeader
        title="Analytics"
        subtitle="Academic performance insights and trends"
        actions={
          <div className="flex items-center bg-secondary rounded-lg p-0.5">
            {(['week', 'month', 'semester'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary Metric Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <MetricCard
          label="Study Time"
          value={`${weekMinutes}m`}
          context={`${weekSessions} sessions this week`}
          icon={Clock}
          trend={weekMinutes > 120 ? 'up' : 'neutral'}
          trendValue={weekMinutes > 0 ? `${uniqueSubjects} subjects` : undefined}
        />
        <MetricCard
          label="Avg Session"
          value={`${avgSession}m`}
          context="minutes per session"
          icon={Target}
        />
        <MetricCard
          label="CA Average"
          value={`${assessmentAvgPct}%`}
          context={`${assessmentCount} assessments`}
          icon={BarChart3}
          valueColor={getColor(assessmentAvgPct)}
        />
        <MetricCard
          label="Revision Queue"
          value={dueRevisionCount}
          context="items due now"
          icon={BrainCircuit}
          valueColor={dueRevisionCount > 5 ? 'text-[var(--delulu-danger)]' : undefined}
        />
      </motion.div>

      {/* Study Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="metric-card mb-6"
      >
        <SectionHeader title="Study Activity" subtitle="Last 35 days" />
        <div className="flex flex-wrap gap-[3px]">
          {heatmap.map((d) => (
            <div
              key={d.dateStr}
              className={`w-3 h-3 rounded-[2px] ${getHeatColor(d.minutes)} transition-colors`}
              title={`${d.dateStr}: ${d.minutes}m`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2.5 mt-3 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-[3px]">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-border" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-primary/20" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-primary/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-primary/60" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-primary" />
          </div>
          <span>More</span>
        </div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Study Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="metric-card"
        >
          <SectionHeader title="Study Distribution" subtitle="This week by subject" />
          {studyDist.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No study data"
              description="Start a study session to see your distribution"
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {studyDist.map((d) => {
                const mx = Math.max(...studyDist.map((x) => x.minutes), 1);
                return (
                  <div key={d.subjectId}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="status-dot" style={{ backgroundColor: d.color }} />
                        <span className="text-xs font-medium truncate max-w-[140px]">{d.name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{d.minutes}m</span>
                    </div>
                    <div className="progress-thin">
                      <div style={{ width: `${(d.minutes / mx) * 100}%`, backgroundColor: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Attendance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="metric-card"
        >
          <SectionHeader title="Attendance Overview" subtitle="Per subject" />
          {attendanceTrend.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No attendance data"
              description="Mark your attendance to track trends"
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {attendanceTrend.map((a) => (
                <CompactProgress
                  key={a.id}
                  label={a.name}
                  value={a.percentage}
                  color={progressColorClass(a.percentage)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Syllabus Coverage */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.14 }}
          className="metric-card"
        >
          <SectionHeader title="Syllabus Coverage" subtitle="Per subject" />
          {syllabusTrend.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No subjects"
              description="Add subjects to track syllabus progress"
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {syllabusTrend.map((s) => (
                <CompactProgress
                  key={s.id}
                  label={s.name}
                  value={s.percentage}
                  color={progressColorClass(s.percentage)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Assessments */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="metric-card"
        >
          <SectionHeader title="Recent Assessments" subtitle="Last 5 performance scores" />
          {recentAssessments.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No assessments yet"
              description="Record your CA marks to see performance trends"
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {recentAssessments.map((a, i) => {
                const pct = (a.obtainedMarks / a.maxMarks) * 100;
                return (
                  <div key={a.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground tabular-nums w-4">{i + 1}.</span>
                        <span className="text-xs font-medium truncate max-w-[140px]">{a.name}</span>
                      </div>
                      <span className={`text-xs font-semibold tabular-nums ${getColor(pct)}`}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-thin">
                      <div
                        className={progressColorClass(pct) === 'green' ? 'bg-emerald-500 dark:bg-emerald-400' :
                          progressColorClass(pct) === 'blue' ? 'bg-blue-500 dark:bg-blue-400' :
                          progressColorClass(pct) === 'amber' ? 'bg-amber-500 dark:bg-amber-400' :
                          'bg-red-500 dark:bg-red-400'}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Insights */}
      {hasInsights && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-2"
        >
          <SectionHeader title="Insights" subtitle="Based on your data" />
          {weekMinutes > 0 && (
            <InsightCard
              type="info"
              icon={Activity}
              title={`Studied ${weekMinutes} minutes this week`}
              description={`Across ${weekSessions} sessions covering ${uniqueSubjects} subject${uniqueSubjects > 1 ? 's' : ''}`}
            />
          )}
          {belowThresholdCount > 0 && (
            <InsightCard
              type="warning"
              icon={Flame}
              title={`${belowThresholdCount} subject${belowThresholdCount > 1 ? 's' : ''} below ${threshold}% attendance`}
              description="Consider attending more classes to meet your threshold"
            />
          )}
          {uniqueSubjects === 0 && weekMinutes === 0 && (
            <InsightCard
              type="positive"
              icon={Activity}
              title="Start studying this week"
              description="Log study sessions to unlock detailed analytics"
            />
          )}
        </motion.div>
      )}
    </div>
  );
}
