'use client';

import React, { Suspense, lazy } from 'react';
import { useStore } from '@/lib/store';
import type { ViewId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const viewComponents: Record<ViewId, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: lazy(() => import('@/views/dashboard')),
  subjects: lazy(() => import('@/views/subjects')),
  'subject-detail': lazy(() => import('@/views/subject-detail')),
  syllabus: lazy(() => import('@/views/subject-detail')),
  marks: lazy(() => import('@/views/marks')),
  attendance: lazy(() => import('@/views/attendance')),
  focus: lazy(() => import('@/views/focus')),
  revision: lazy(() => import('@/views/revision')),
  notes: lazy(() => import('@/views/notes')),
  calendar: lazy(() => import('@/views/calendar')),
  timetable: lazy(() => import('@/views/timetable')),
  tasks: lazy(() => import('@/views/tasks')),
  analytics: lazy(() => import('@/views/analytics')),
  'er-center': lazy(() => import('@/views/er-center')),
  exams: lazy(() => import('@/views/exams')),
  assignments: lazy(() => import('@/views/assignments')),
  settings: lazy(() => import('@/views/settings')),
  'ai-tutor': lazy(() => import('@/views/ai-tutor')),
  report: lazy(() => import('@/views/report')),
};

function ViewLoadingFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export function ViewRouter() {
  const currentView = useStore((s) => s.currentView);
  const ViewComponent = viewComponents[currentView];

  if (!ViewComponent) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Not Found</h1>
        <p className="text-muted-foreground mt-2">This view does not exist.</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<ViewLoadingFallback />}>
      <ViewComponent />
    </Suspense>
  );
}
