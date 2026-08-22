'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, getDay } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  BookOpen,
  BarChart3,
  Download,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import { getSubjectAttendance } from '@/lib/store';
import { exportAttendanceCSV } from '@/lib/csv-export';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PageHeader,
  EmptyState,
  MetricCard,
  CompactProgress,
  SectionHeader,
  StatusBadge,
} from '@/components/shared';

// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// -- Attendance status helpers ----------------------------------------
function getAttendanceStatus(
  percentage: number,
  threshold: number
): 'SAFE' | 'WATCH' | 'RISK' {
  if (percentage >= threshold + 10) return 'SAFE';
  if (percentage >= threshold - 5) return 'WATCH';
  return 'RISK';
}

function getStatusConfig(status: 'SAFE' | 'WATCH' | 'RISK') {
  switch (status) {
    case 'SAFE':
      return {
        label: 'SAFE',
        statusKey: 'healthy' as const,
        color: 'bg-emerald-500',
        progressColor: 'green' as const,
        icon: ShieldCheck,
      };
    case 'WATCH':
      return {
        label: 'WATCH',
        statusKey: 'attention' as const,
        color: 'bg-amber-500',
        progressColor: 'amber' as const,
        icon: AlertTriangle,
      };
    case 'RISK':
      return {
        label: 'RISK',
        statusKey: 'critical' as const,
        color: 'bg-red-500',
        progressColor: 'red' as const,
        icon: ShieldAlert,
      };
  }
}

// -- Can miss calculation ---------------------------------------------
function calculateCanMiss(
  present: number,
  total: number,
  threshold: number
): number {
  const maxAllowed = Math.floor((present * 100) / threshold - total);
  return Math.max(0, maxAllowed);
}

// -- Main component ---------------------------------------------------
export default function AttendanceView() {
  const {
    subjects,
    attendance,
    timetableSlots,
    profile,
    navigate,
    selectSubject,
    addAttendance,
  } = useStore();

  const activeSubjects = useMemo(
    () => subjects.filter((s) => !s.archived),
    [subjects]
  );

  const threshold = profile.attendanceThreshold;

  // Per-subject attendance data
  const subjectData = useMemo(() => {
    return activeSubjects.map((subject) => {
      const att = getSubjectAttendance({ attendance }, subject.id);
      const status = att.total > 0 ? getAttendanceStatus(att.percentage, threshold) : null;
      const canMiss = att.total > 0 ? calculateCanMiss(att.present, att.total, threshold) : 0;
      return { subject, att, status, canMiss };
    });
  }, [activeSubjects, attendance, threshold]);

  // Overall stats
  const overallStats = useMemo(() => {
    const withData = subjectData.filter((d) => d.att.total > 0);
    if (withData.length === 0) return { avgPercentage: 0, totalPresent: 0, totalClasses: 0, status: 'SAFE' as const };
    const totalPresent = withData.reduce((s, d) => s + d.att.present, 0);
    const totalClasses = withData.reduce((s, d) => s + d.att.total, 0);
    const avgPercentage = Math.round((totalPresent / totalClasses) * 100);
    const status = getAttendanceStatus(avgPercentage, threshold);
    return { avgPercentage, totalPresent, totalClasses, status };
  }, [subjectData, threshold]);

  // Bulk attendance — today's timetable slots
  const today = new Date();
  const todayDow = getDay(today) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const todayStrVal = format(today, 'yyyy-MM-dd');

  const todaySlots = timetableSlots.filter((slot) => slot.day === todayDow);

  // Check which subjects already have attendance today
  const todayAttendanceMap = (() => {
    const map = new Map<string, boolean>();
    attendance.forEach((a) => {
      if (a.date === todayStrVal) {
        map.set(a.subjectId, a.present);
      }
    });
    return map;
  })();

  // Quick mark handlers
  const handleQuickMark = (subjectId: string, present: boolean) => {
    addAttendance({
      subjectId,
      date: todayStrVal,
      present,
      totalClasses: 1,
    });
  };

  const goToSubjectAttendance = (subjectId: string) => {
    selectSubject(subjectId);
    navigate('subject-detail');
  };

  const overallCfg = getStatusConfig(overallStats.status);

  return (
    <div className='p-4 md:p-6 content-area'>
      {/* Header */}
      <PageHeader
        title='Attendance'
        subtitle='Track and manage your class attendance'
        actions={
          <Button
            variant='outline'
            size='sm'
            className='text-xs'
            onClick={() => exportAttendanceCSV(attendance, subjects, timetableSlots)}
            disabled={attendance.length === 0}
          >
            <Download className='h-3.5 w-3.5 mr-1.5' />
            Export CSV
          </Button>
        }
      />

      {/* Overall Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className='mb-8'
      >
        <MetricCard
          label='Overall Attendance'
          value={`${overallStats.avgPercentage}%`}
          context={`${overallStats.totalPresent} / ${overallStats.totalClasses} classes across ${subjectData.filter((d) => d.att.total > 0).length} subjects · Threshold: ${threshold}%`}
          icon={BarChart3}
          iconColor={overallStats.status === 'SAFE' ? 'text-emerald-500' : overallStats.status === 'RISK' ? 'text-red-500' : 'text-amber-500'}
          className='border-l-2'
          style={{ borderLeftColor: overallStats.status === 'SAFE' ? 'var(--delulu-success)' : overallStats.status === 'RISK' ? 'var(--delulu-danger)' : 'var(--delulu-warning)' }}
        />
      </motion.div>

      {/* Per-Subject Attendance */}
      <SectionHeader title='Subject Attendance' className='mb-4' />
      {activeSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title='No subjects yet'
          description='Add a subject to track attendance.'
          action={
            <Button variant='outline' size='sm' onClick={() => navigate('subjects')}>
              Go to Subjects
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={container}
          initial='hidden'
          animate='show'
          className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8'
        >
          {subjectData.map(({ subject, att, status, canMiss }) => {
            const cfg = status ? getStatusConfig(status) : null;
            const alreadyMarkedToday = todayAttendanceMap.has(subject.id);
            const todayPresent = todayAttendanceMap.get(subject.id);

            return (
              <motion.div key={subject.id} variants={fadeUp}>
                <div className='card-interactive p-4 group'>
                  {/* Header row */}
                  <div className='flex items-start justify-between mb-3'>
                    <button
                      className='flex items-center gap-2 min-w-0 text-left flex-1'
                      onClick={() => goToSubjectAttendance(subject.id)}
                    >
                      <div
                        className='status-dot'
                        style={{ backgroundColor: subject.color }}
                      />
                      <div className='min-w-0'>
                        <p className='text-sm font-medium truncate group-hover:text-primary transition-colors'>
                          {subject.name}
                        </p>
                        <p className='text-[11px] text-muted-foreground'>{subject.code}</p>
                      </div>
                    </button>
                    {cfg && (
                      <StatusBadge status={cfg.statusKey} label={cfg.label} className='ml-2' />
                    )}
                  </div>

                  {/* Percentage & progress */}
                  {att.total > 0 ? (
                    <>
                      <div className='flex items-end justify-between mb-3'>
                        <span className='text-2xl font-bold tracking-tight'>{att.percentage}%</span>
                        <span className='text-xs text-muted-foreground'>
                          {att.present} / {att.total}
                        </span>
                      </div>

                      <CompactProgress
                        label={canMiss > 0
                          ? `Can miss ${canMiss} more class${canMiss > 1 ? 'es' : ''}`
                          : 'Every class counts!'}
                        value={att.percentage}
                        color={cfg?.progressColor || 'blue'}
                        className='mb-4'
                      />

                      {/* Quick mark */}
                      {alreadyMarkedToday ? (
                        <div className='flex items-center gap-1.5 text-xs'>
                          {todayPresent ? (
                            <>
                              <Check className='h-3.5 w-3.5 text-emerald-500' />
                              <span className='text-emerald-600 dark:text-emerald-400'>Present today</span>
                            </>
                          ) : (
                            <>
                              <X className='h-3.5 w-3.5 text-red-500' />
                              <span className='text-red-600 dark:text-red-400'>Absent today</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className='flex gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            className='flex-1 h-8 text-xs'
                            onClick={() => handleQuickMark(subject.id, true)}
                          >
                            <Check className='h-3.5 w-3.5 mr-1 text-emerald-500' />
                            Present
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            className='flex-1 h-8 text-xs'
                            onClick={() => handleQuickMark(subject.id, false)}
                          >
                            <X className='h-3.5 w-3.5 mr-1 text-red-500' />
                            Absent
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className='py-3'>
                      <p className='text-xs text-muted-foreground mb-3'>No attendance recorded</p>
                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='flex-1 h-8 text-xs'
                          onClick={() => handleQuickMark(subject.id, true)}
                        >
                          <Check className='h-3.5 w-3.5 mr-1 text-emerald-500' />
                          Present
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='flex-1 h-8 text-xs'
                          onClick={() => handleQuickMark(subject.id, false)}
                        >
                          <X className='h-3.5 w-3.5 mr-1 text-red-500' />
                          Absent
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Bulk Mark Today's Attendance */}
      {todaySlots.length > 0 && (
        <div>
          <SectionHeader
            title="Mark Today's Attendance"
            action={
              <span className='text-xs text-muted-foreground font-medium'>{format(today, 'EEEE, dd MMM')}</span>
            }
          />
          <div className='border border-border rounded-lg bg-card divide-y divide-border'>
            {todaySlots.map((slot) => {
              const subject = subjects.find((s) => s.id === slot.subjectId);
              if (!subject || subject.archived) return null;

              const alreadyMarked = todayAttendanceMap.has(subject.id);
              const isPresent = todayAttendanceMap.get(subject.id);

              // Deduplicate: show one card per subject even if multiple slots
              const subjectAlreadyShown = todaySlots
                .slice(0, todaySlots.indexOf(slot))
                .some((s) => s.subjectId === subject.id);
              if (subjectAlreadyShown) return null;

              return (
                <div
                  key={subject.id}
                  className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-accent/50 transition-colors'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <div
                      className='status-dot'
                      style={{ backgroundColor: subject.color }}
                    />
                    <div className='min-w-0'>
                      <p className='text-sm font-medium truncate'>{subject.name}</p>
                      <p className='text-[11px] text-muted-foreground'>
                        {slot.startTime} – {slot.endTime}
                        {slot.room ? ` · ${slot.room}` : ''} · {slot.type}
                      </p>
                    </div>
                  </div>

                  {alreadyMarked ? (
                    <div className='flex items-center gap-1.5 text-xs pl-6 sm:pl-0'>
                      {isPresent ? (
                        <>
                          <UserCheck className='h-3.5 w-3.5 text-emerald-500' />
                          <span className='text-emerald-600 dark:text-emerald-400 font-medium'>Present</span>
                        </>
                      ) : (
                        <>
                          <UserX className='h-3.5 w-3.5 text-red-500' />
                          <span className='text-red-600 dark:text-red-400 font-medium'>Absent</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className='flex gap-2 pl-6 sm:pl-0'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-8 min-w-[90px] text-xs'
                        onClick={() => handleQuickMark(subject.id, true)}
                      >
                        <Check className='h-3.5 w-3.5 mr-1 text-emerald-500' />
                        Present
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-8 min-w-[90px] text-xs'
                        onClick={() => handleQuickMark(subject.id, false)}
                      >
                        <X className='h-3.5 w-3.5 mr-1 text-red-500' />
                        Absent
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
