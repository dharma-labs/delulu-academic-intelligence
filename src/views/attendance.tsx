'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, getDay } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  BookOpen,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import { getSubjectAttendance } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
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
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-950',
        border: 'border-emerald-300 dark:border-emerald-800',
        progressClass: '[&>div]:bg-emerald-500',
        icon: ShieldCheck,
      };
    case 'WATCH':
      return {
        label: 'WATCH',
        color: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-950',
        border: 'border-amber-300 dark:border-amber-800',
        progressClass: '[&>div]:bg-amber-500',
        icon: AlertTriangle,
      };
    case 'RISK':
      return {
        label: 'RISK',
        color: 'text-red-700 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-950',
        border: 'border-red-300 dark:border-red-800',
        progressClass: '[&>div]:bg-red-500',
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
  // Formula: we want (present) / (total + x) >= threshold/100
  // => x <= (present * 100 / threshold) - total
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
      date: todayStr,
      present,
      totalClasses: 1,
    });
  };

  const goToSubjectAttendance = (subjectId: string) => {
    selectSubject(subjectId);
    navigate('subject-detail');
  };

  const overallCfg = getStatusConfig(overallStats.status);
  const OverallIcon = overallCfg.icon;

  return (
    <div className='p-4 md:p-6 max-w-7xl mx-auto'>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'
      >
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Attendance</h1>
          <p className='text-muted-foreground text-sm mt-1'>Track and manage your class attendance</p>
        </div>
      </motion.div>

      {/* Overall Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className='mb-8'
      >
        <Card className={`border-l-4 ${overallCfg.border}`}>
          <CardContent className='py-5'>
            <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
              <div className='h-12 w-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0'>
                <OverallIcon className={`h-6 w-6 ${overallCfg.color}`} />
              </div>
              <div className='flex-1'>
                <div className='flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1'>
                  <span className='text-2xl font-bold'>{overallStats.avgPercentage}%</span>
                  <Badge variant='secondary' className={`w-fit ${overallCfg.bg} ${overallCfg.color}`}>
                    {overallCfg.label}
                  </Badge>
                </div>
                <p className='text-sm text-muted-foreground'>
                  Overall attendance across {subjectData.filter((d) => d.att.total > 0).length} subjects
                  {overallStats.totalClasses > 0 && (
                    <span className='ml-1'>( {overallStats.totalPresent} / {overallStats.totalClasses} classes )</span>
                  )}
                </p>
              </div>
              <div className='text-sm text-muted-foreground'>
                Threshold: <span className='font-medium text-foreground'>{threshold}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Per-Subject Attendance Cards */}
      <div className='mb-8'>
        <h2 className='text-lg font-semibold mb-4'>Subject Attendance</h2>
        {activeSubjects.length === 0 ? (
          <Card>
            <CardContent className='py-12 text-center'>
              <BookOpen className='h-10 w-10 mx-auto text-muted-foreground/40 mb-3' />
              <p className='text-sm text-muted-foreground'>No subjects yet. Add a subject to track attendance.</p>
              <Button variant='outline' size='sm' className='mt-4' onClick={() => navigate('subjects')}>
                Go to Subjects
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={container}
            initial='hidden'
            animate='show'
            className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
          >
            {subjectData.map(({ subject, att, status, canMiss }) => {
              const cfg = status ? getStatusConfig(status) : null;
              const StatusIcon = cfg?.icon;
              const alreadyMarkedToday = todayAttendanceMap.has(subject.id);
              const todayPresent = todayAttendanceMap.get(subject.id);

              return (
                <motion.div key={subject.id} variants={fadeUp}>
                  <Card className='group hover:border-primary/30 transition-all'>
                    {/* Color bar */}
                    <div className='h-1.5 rounded-t-lg' style={{ backgroundColor: subject.color }} />
                    <CardContent className='pt-4'>
                      {/* Header row */}
                      <div className='flex items-start justify-between mb-3'>
                        <button
                          className='flex items-center gap-2 min-w-0 text-left'
                          onClick={() => goToSubjectAttendance(subject.id)}
                        >
                          <div className='flex-1 min-w-0'>
                            <p className='font-medium truncate group-hover:text-primary transition-colors'>
                              {subject.name}
                            </p>
                            <p className='text-xs text-muted-foreground'>{subject.code}</p>
                          </div>
                          <ArrowRight className='h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0' />
                        </button>
                        {cfg && (
                          <Badge variant='secondary' className={`flex-shrink-0 ml-2 ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                        )}
                      </div>

                      {/* Percentage display */}
                      {att.total > 0 ? (
                        <>
                          <div className='flex items-end justify-between mb-1'>
                            <span className='text-3xl font-bold'>{att.percentage}%</span>
                            <span className='text-sm text-muted-foreground'>
                              {att.present} / {att.total}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <Progress
                            value={att.percentage}
                            className={`h-2 mb-3 ${cfg?.progressClass || '[&>div]:bg-muted-foreground'}`}
                          />

                          {/* Can miss message */}
                          <p className='text-xs text-muted-foreground mb-4'>
                            {canMiss > 0
                              ? `You can miss ${canMiss} more class${canMiss > 1 ? 'es' : ''} and stay above ${threshold}%`
                              : `Every class counts! You cannot miss any more classes.`}
                          </p>

                          {/* Quick mark buttons */}
                          <div className='flex gap-2'>
                            {alreadyMarkedToday ? (
                              <div className='flex items-center gap-1.5 text-sm'>
                                {todayPresent ? (
                                  <>
                                    <Check className='h-4 w-4 text-emerald-500' />
                                    <span className='text-emerald-600'>Present today</span>
                                  </>
                                ) : (
                                  <>
                                    <X className='h-4 w-4 text-red-500' />
                                    <span className='text-red-600'>Absent today</span>
                                  </>
                                )}
                              </div>
                            ) : (
                              <>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='flex-1 h-10'
                                  onClick={() => handleQuickMark(subject.id, true)}
                                >
                                  <Check className='h-4 w-4 mr-1.5 text-emerald-500' />
                                  Present
                                </Button>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='flex-1 h-10'
                                  onClick={() => handleQuickMark(subject.id, false)}
                                >
                                  <X className='h-4 w-4 mr-1.5 text-red-500' />
                                  Absent
                                </Button>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className='py-4 text-center'>
                          <p className='text-sm text-muted-foreground'>No attendance recorded</p>
                          <div className='flex gap-2 mt-3'>
                            <Button
                              variant='outline'
                              size='sm'
                              className='flex-1 h-10'
                              onClick={() => handleQuickMark(subject.id, true)}
                            >
                              <Check className='h-4 w-4 mr-1.5 text-emerald-500' />
                              Present
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              className='flex-1 h-10'
                              onClick={() => handleQuickMark(subject.id, false)}
                            >
                              <X className='h-4 w-4 mr-1.5 text-red-500' />
                              Absent
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Bulk Mark Today's Attendance */}
      {todaySlots.length > 0 && (
        <div>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold'>Mark Today's Attendance</h2>
            <Badge variant='secondary'>{format(today, 'EEEE, dd MMM')}</Badge>
          </div>
          <Card>
            <CardContent className='pt-4'>
              <div className='space-y-3'>
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
                      className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/20 transition-colors'
                    >
                      <div className='flex items-center gap-3 min-w-0'>
                        <span
                          className='h-3 w-3 rounded-full flex-shrink-0'
                          style={{ backgroundColor: subject.color }}
                        />
                        <div className='min-w-0'>
                          <p className='font-medium text-sm truncate'>{subject.name}</p>
                          <p className='text-xs text-muted-foreground'>
                            {slot.startTime} - {slot.endTime}
                            {slot.room ? ` | ${slot.room}` : ''} | {slot.type}
                          </p>
                        </div>
                      </div>

                      {alreadyMarked ? (
                        <div className='flex items-center gap-1.5 text-sm pl-6 sm:pl-0'>
                          {isPresent ? (
                            <>
                              <UserCheck className='h-4 w-4 text-emerald-500' />
                              <span className='text-emerald-600 font-medium'>Present</span>
                            </>
                          ) : (
                            <>
                              <UserX className='h-4 w-4 text-red-500' />
                              <span className='text-red-600 font-medium'>Absent</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className='flex gap-2 pl-6 sm:pl-0'>
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-10 min-w-[100px]'
                            onClick={() => handleQuickMark(subject.id, true)}
                          >
                            <Check className='h-4 w-4 mr-1.5 text-emerald-500' />
                            Present
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-10 min-w-[100px]'
                            onClick={() => handleQuickMark(subject.id, false)}
                          >
                            <X className='h-4 w-4 mr-1.5 text-red-500' />
                            Absent
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
