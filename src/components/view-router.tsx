'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import type { ViewId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const viewComponents: Record<ViewId, React.ComponentType> = {
  dashboard: dynamic(() => import('@/views/dashboard'), { ssr: false }),
  subjects: dynamic(() => import('@/views/subjects'), { ssr: false }),
  'subject-detail': dynamic(() => import('@/views/subject-detail'), { ssr: false }),
  syllabus: dynamic(() => import('@/views/subject-detail'), { ssr: false }),
  marks: dynamic(() => import('@/views/marks'), { ssr: false }),
  attendance: dynamic(() => import('@/views/attendance'), { ssr: false }),
  focus: dynamic(() => import('@/views/focus'), { ssr: false }),
  revision: dynamic(() => import('@/views/revision'), { ssr: false }),
  notes: dynamic(() => import('@/views/notes'), { ssr: false }),
  calendar: dynamic(() => import('@/views/calendar'), { ssr: false }),
  timetable: dynamic(() => import('@/views/timetable'), { ssr: false }),
  tasks: dynamic(() => import('@/views/tasks'), { ssr: false }),
  analytics: dynamic(() => import('@/views/analytics'), { ssr: false }),
  'er-center': dynamic(() => import('@/views/er-center'), { ssr: false }),
  exams: dynamic(() => import('@/views/exams'), { ssr: false }),
  assignments: dynamic(() => import('@/views/assignments'), { ssr: false }),
  settings: dynamic(() => import('@/views/settings'), { ssr: false }),
  'ai-tutor': dynamic(() => import('@/views/ai-tutor'), { ssr: false }),
  report: dynamic(() => import('@/views/report'), { ssr: false }),
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
