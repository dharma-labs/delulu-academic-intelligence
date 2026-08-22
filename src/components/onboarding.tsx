'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { SUBJECT_COLORS } from '@/lib/types';
import {
  BookOpen,
  CheckCircle2,
  User,
  Zap,
  BrainCircuit,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  Check,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Step transition variants ───────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
    scale: 0.98,
  }),
};

// ─── Preset color options ───────────────────────────────────────

const PRESET_COLORS = SUBJECT_COLORS.slice(0, 8);

// ─── Feature list items for welcome step ────────────────────────

const FEATURES = [
  { icon: CheckCircle2, label: 'Track attendance across all subjects' },
  { icon: BookOpen, label: 'Manage syllabus with unit & topic tracking' },
  { icon: BrainCircuit, label: 'AI-powered study recommendations' },
  { icon: Zap, label: 'Spaced repetition for effective revision' },
];

// ─── Onboarding Component ──────────────────────────────────────

export function Onboarding() {
  const subjects = useStore((s) => s.subjects);
  const updateProfile = useStore((s) => s.updateProfile);
  const addSubject = useStore((s) => s.addSubject);
  const navigate = useStore((s) => s.navigate);

  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Profile form state
  const [name, setName] = useState('');
  const [semester, setSemester] = useState('1');
  const [branch, setBranch] = useState('');
  const [targetCGPA, setTargetCGPA] = useState('8.5');
  const [attendanceThreshold, setAttendanceThreshold] = useState('75');

  // Subject form state
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectCredits, setSubjectCredits] = useState('3');
  const [subjectColor, setSubjectColor] = useState(PRESET_COLORS[0]);

  const totalSteps = 3;

  const goNext = useCallback(() => {
    if (step < totalSteps - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [step]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleFinish = useCallback(() => {
    // Save profile
    updateProfile({
      name: name.trim() || 'Student',
      semester: Math.max(1, Math.min(8, parseInt(semester) || 1)),
      branch: branch.trim(),
      targetCGPA: parseFloat(targetCGPA) || 8.5,
      attendanceThreshold: Math.max(0, Math.min(100, parseInt(attendanceThreshold) || 75)),
    });

    // Add first subject if name provided
    if (subjectName.trim()) {
      addSubject({
        name: subjectName.trim(),
        code: subjectCode.trim(),
        credits: Math.max(1, parseInt(subjectCredits) || 3),
        color: subjectColor,
        archived: false,
      });
    }

    setOpen(false);
    navigate('subjects');
  }, [name, semester, branch, targetCGPA, attendanceThreshold, subjectName, subjectCode, subjectCredits, subjectColor, updateProfile, addSubject, navigate]);

  // Don't render if user has subjects
  if (subjects.length > 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-lg p-0 overflow-hidden"
        showCloseButton={step === 0}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Subtle gradient overlay for visual depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-[var(--delulu-purple)]/[0.03] pointer-events-none rounded-lg" aria-hidden="true" />
        {/* Step indicator: numbered circles with connecting lines */}
        <div className="flex items-center justify-center gap-0 pt-5 pb-2 px-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <React.Fragment key={i}>
              <button
                onClick={() => {
                  setDirection(i > step ? 1 : -1);
                  setStep(i);
                }}
                className={cn(
                  'relative z-10 h-7 w-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-all duration-300 shrink-0',
                  i === step
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : i < step
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                )}
                aria-label={`Go to step ${i + 1}`}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </button>
              {i < totalSteps - 1 && (
                <div className="flex-1 h-px mx-1.5 min-w-[24px]">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      i < step ? 'bg-primary/40' : 'bg-border'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 pb-2 min-h-[320px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ── Step 0: Welcome ────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-5">
                  <GraduationCap className="size-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Welcome to Delulu
                </h2>
                <p className="text-sm text-primary font-medium mt-1 mb-4">
                  Your Academic Intelligence System
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-6">
                  A comprehensive toolkit to manage your academic life. Track progress,
                  stay organized, and study smarter — all in one place.
                </p>
                <div className="w-full space-y-2.5 text-left">
                  {FEATURES.map(({ icon: FIcon, label }) => (
                    <div key={label} className="flex items-center gap-3 px-1">
                      <FIcon className="size-4 text-primary/70 shrink-0" />
                      <span className="text-sm text-foreground/80">{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Profile ─────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <DialogHeader className="mb-5 text-center">
                  <DialogTitle className="text-lg">Set up your profile</DialogTitle>
                  <DialogDescription>
                    Help us personalize your experience
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="onb-name" className="section-label">
                      Name
                    </label>
                    <Input
                      id="onb-name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="onb-semester" className="section-label">
                        Semester
                      </label>
                      <Input
                        id="onb-semester"
                        type="number"
                        min={1}
                        max={8}
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="onb-branch" className="section-label">
                        Branch / Dept
                      </label>
                      <Input
                        id="onb-branch"
                        placeholder="e.g. CSE"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="onb-cgpa" className="section-label">
                        Target CGPA
                      </label>
                      <Input
                        id="onb-cgpa"
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={targetCGPA}
                        onChange={(e) => setTargetCGPA(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="onb-threshold" className="section-label">
                        Attendance Threshold
                      </label>
                      <div className="relative">
                        <Input
                          id="onb-threshold"
                          type="number"
                          min={0}
                          max={100}
                          value={attendanceThreshold}
                          onChange={(e) => setAttendanceThreshold(e.target.value)}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: First Subject ───────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <DialogHeader className="mb-5 text-center">
                  <DialogTitle className="text-lg">Quick start</DialogTitle>
                  <DialogDescription>
                    Let&apos;s add your first subject
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="onb-sub-name" className="section-label">
                      Subject Name
                    </label>
                    <Input
                      id="onb-sub-name"
                      placeholder="e.g. Data Structures"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="onb-sub-code" className="section-label">
                        Code
                      </label>
                      <Input
                        id="onb-sub-code"
                        placeholder="e.g. CS201"
                        value={subjectCode}
                        onChange={(e) => setSubjectCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="onb-sub-credits" className="section-label">
                        Credits
                      </label>
                      <Input
                        id="onb-sub-credits"
                        type="number"
                        min={1}
                        max={10}
                        value={subjectCredits}
                        onChange={(e) => setSubjectCredits(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="section-label">Color</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSubjectColor(color)}
                          className={cn(
                            'h-7 w-7 rounded-full transition-all duration-150 border-2',
                            subjectColor === color
                              ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground/30 scale-110'
                              : 'border-transparent hover:scale-105'
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        >
                          {subjectColor === color && (
                            <Check className="size-3.5 mx-auto text-white drop-shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 pb-5 pt-2">
          {step > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              className="text-muted-foreground"
            >
              <ArrowLeft className="size-3.5 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps - 1 ? (
            <Button size="sm" onClick={goNext}>
              Next
              <ArrowRight className="size-3.5 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish}>
              <Check className="size-3.5 mr-1" />
              Add & Start
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
