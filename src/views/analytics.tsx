'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore, getSubjectAttendance, getSubjectProgress, getDueRevisionItems } from '@/lib/store';
import { Clock, BarChart3, BrainCircuit, Target, Flame, Activity } from 'lucide-react';
import { format, subDays, startOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
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
  const [completionRate, setCompletionRate] = useState(0);
  const [threshold, setThreshold] = useState(75);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester'>('week');
  const [chartTheme, setChartTheme] = useState({ primary: '#3B82F6', primaryRgb: '59, 130, 246', card: '#FFFFFF', foreground: '#0F172A', border: '#E2E8F0' });

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
      const syllabusProgresses = active.map((sub) => getSubjectProgress({ syllabusUnits: s.syllabusUnits }, sub.id));
      setCompletionRate(active.length > 0 ? Math.round(syllabusProgresses.reduce((a, p) => a + p, 0) / active.length) : 0);
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

  // Read CSS variables for Recharts (SVG doesn't support var() in attributes)
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      setChartTheme({
        primary: s.getPropertyValue('--primary').trim() || '#3B82F6',
        primaryRgb: s.getPropertyValue('--primary-rgb').trim() || '59, 130, 246',
        card: s.getPropertyValue('--card').trim() || '#FFFFFF',
        foreground: s.getPropertyValue('--foreground').trim() || '#0F172A',
        border: s.getPropertyValue('--border').trim() || '#E2E8F0',
      });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Chart data derived from existing computed state
  const weekBarData = useMemo(() => {
    const last7 = heatmap.slice(-7);
    return last7.map((d) => ({
      day: format(parseISO(d.dateStr), 'EEE'),
      minutes: d.minutes,
    }));
  }, [heatmap]);

  const cgpaTrendData = useMemo(() => {
    return [...recentAssessments]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((a) => ({
        name: a.name.length > 14 ? a.name.slice(0, 14) + '…' : a.name,
        percentage: Math.round((a.obtainedMarks / a.maxMarks) * 100),
      }));
  }, [recentAssessments]);

  const pieData = useMemo(() => {
    return studyDist.map((d) => ({
      name: d.name.length > 16 ? d.name.slice(0, 16) + '…' : d.name,
      value: d.minutes,
      color: d.color,
    }));
  }, [studyDist]);

  const tooltipStyle = useMemo(() => ({
    backgroundColor: chartTheme.card,
    borderColor: chartTheme.border,
    color: chartTheme.foreground,
    border: `1px solid ${chartTheme.border}`,
    borderRadius: '8px',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  }), [chartTheme]);

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

      {/* Mobile KPI Strip */}
      <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-3">
        {[
          { label: 'This Week', value: `${(weekMinutes / 60).toFixed(1)}h`, sub: 'study time' },
          { label: 'Avg Session', value: `${avgSession}m`, sub: 'per session' },
          { label: 'Subjects', value: `${uniqueSubjects}`, sub: 'studied' },
          { label: 'Completion', value: `${completionRate}%`, sub: 'syllabus' },
        ].map(kpi => (
          <div key={kpi.label} className="shrink-0 bg-card border border-border/50 rounded-xl px-3 py-2.5 min-w-[100px]">
            <p className="text-sm font-bold tracking-tight tabular-nums">{kpi.value}</p>
            <p className="text-[9px] text-muted-foreground font-medium tracking-wider uppercase mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Summary Metric Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6"
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
        className="metric-card mb-4 md:mb-6"
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

      {/* Recharts Visualizations */}
      <div className="mb-4 md:mb-6">
        <SectionHeader title="Visualizations" subtitle="Interactive charts powered by your study data" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {/* Weekly Study Time Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 }}
            className="metric-card min-w-0"
          >
            <SectionHeader title="Weekly Study Time" subtitle="Minutes per day — last 7 days" />
            {weekBarData.every((d) => d.minutes === 0) ? (
              <EmptyState
                icon={BarChart3}
                title="No study data this week"
                description="Log study sessions to see your daily chart"
                className="py-8"
              />
            ) : (
              <ResponsiveContainer width="100%" height={200} maintainAspectRatio={false}>
                <BarChart data={weekBarData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${chartTheme.primaryRgb}, 0.08)`} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: chartTheme.foreground }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: chartTheme.foreground }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: `rgba(${chartTheme.primaryRgb}, 0.06)` }}
                    formatter={(value: number) => [`${value}m`, 'Study time']}
                  />
                  <Bar
                    dataKey="minutes"
                    fill={chartTheme.primary}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* CGPA Trend Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="metric-card min-w-0"
          >
            <SectionHeader title="Assessment Performance" subtitle="Score trend across assessments" />
            {cgpaTrendData.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No assessments yet"
                description="Record CA marks to see your performance trend"
                className="py-8"
              />
            ) : (
              <ResponsiveContainer width="100%" height={200} maintainAspectRatio={false}>
                <LineChart data={cgpaTrendData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`rgba(${chartTheme.primaryRgb}, 0.08)`} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: chartTheme.foreground }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: chartTheme.foreground }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}%`, 'Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke={chartTheme.primary}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: chartTheme.primary, stroke: chartTheme.card, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: chartTheme.primary, stroke: chartTheme.card, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Study Distribution Donut Chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="metric-card min-w-0"
          >
            <SectionHeader title="Study Distribution" subtitle="Time per subject this week" />
            {pieData.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No study data"
                description="Start a study session to see your distribution"
                className="py-8"
              />
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200} maintainAspectRatio={false}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [`${value}m`, 'Study time']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pieData.slice(0, 5).map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="status-dot" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-muted-foreground truncate flex-1">{d.name}</span>
                      <span className="text-xs font-semibold tabular-nums">{d.value}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
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
