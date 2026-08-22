'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

// ─── Metric Card ─────────────────────────────────────────────────

type MetricAccent = 'primary' | 'success' | 'warning' | 'danger' | 'purple';

const ACCENT_CLASS: Record<MetricAccent, string> = {
  primary: 'metric-card-accent-primary',
  success: 'metric-card-accent-success',
  warning: 'metric-card-accent-warning',
  danger: 'metric-card-accent-danger',
  purple: 'metric-card-accent-purple',
};

interface MetricCardProps {
  label: string;
  value: string | number;
  context?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
  iconColor?: string;
  valueColor?: string;
  accent?: MetricAccent;
  sparkline?: number[];
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  context,
  trend = 'neutral',
  trendValue,
  icon: Icon,
  iconColor,
  valueColor,
  accent,
  sparkline,
  className,
  onClick,
}: MetricCardProps) {
  const maxVal = sparkline ? Math.max(...sparkline, 1) : 0;
  return (
    <div
      className={cn('metric-card metric-card-accent-top card-hover-lift', onClick && 'cursor-pointer', accent && ACCENT_CLASS[accent], className)}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <span className="metric-label">{label}</span>
        {Icon && (
          <Icon className={cn('size-3.5 md:size-4 text-muted-foreground', iconColor)} />
        )}
      </div>
      <div className="flex items-baseline gap-1.5 md:gap-2">
        <span className={cn('text-xl md:text-2xl font-bold tracking-tight leading-none', valueColor)}>{value}</span>
        {trend === 'up' && (
          <span className="flex items-center gap-0.5 text-xs font-medium trend-up">
            <TrendingUp className="size-3" />
            {trendValue}
          </span>
        )}
        {trend === 'down' && (
          <span className="flex items-center gap-0.5 text-xs font-medium trend-down">
            <TrendingDown className="size-3" />
            {trendValue}
          </span>
        )}
        {trend === 'neutral' && trendValue && (
          <span className="flex items-center gap-0.5 text-xs font-medium trend-neutral">
            <Minus className="size-3" />
            {trendValue}
          </span>
        )}
      </div>
      {sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-px h-4 mt-2 opacity-50 group-hover:opacity-80 transition-opacity">
          {sparkline.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-current transition-all duration-300"
              style={{ height: `${Math.max(10, (v / maxVal) * 100)}%` }}
            />
          ))}
        </div>
      )}
      {context && <p className="metric-context">{context}</p>}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────

interface StatusBadgeProps {
  status: 'healthy' | 'improving' | 'attention' | 'critical' | 'upcoming' | 'nodata';
  label: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  healthy: 'signal-healthy',
  improving: 'signal-improving',
  attention: 'signal-attention',
  critical: 'signal-critical',
  upcoming: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  nodata: 'bg-secondary text-muted-foreground',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase border-0',
        STATUS_STYLES[status] || STATUS_STYLES.nodata,
        className
      )}
    >
      {label}
    </span>
  );
}

// ─── Insight Card ────────────────────────────────────────────────

interface InsightCardProps {
  type: 'positive' | 'warning' | 'critical' | 'info';
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function InsightCard({
  type,
  icon: Icon,
  title,
  description,
  action,
  className,
}: InsightCardProps) {
  return (
    <div className={cn('insight-card', type, className)}>
      <Icon className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm leading-snug">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, badge, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('page-header', className)}>
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <div>
        <span className="section-label">{title}</span>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  illustration?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Generate a deterministic geometric pattern SVG based on icon name */
function GeometricPattern({ iconName }: { iconName: string }) {
  const seed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < iconName.length; i++) {
      hash = ((hash << 5) - hash + iconName.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }, [iconName]);

  const circles = useMemo(() => {
    const items: { cx: number; cy: number; r: number; opacity: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const s = (seed * (i + 1) * 13) % 100;
      items.push({
        cx: 20 + (s % 60),
        cy: 20 + ((s * 7) % 60),
        r: 4 + (s % 12),
        opacity: 0.04 + (s % 6) * 0.01,
      });
    }
    return items;
  }, [seed]);

  const lines = useMemo(() => {
    const items: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const s = (seed * (i + 1) * 17) % 100;
      items.push({
        x1: 10 + (s % 80),
        y1: 10 + ((s * 3) % 80),
        x2: 10 + ((s * 11) % 80),
        y2: 10 + ((s * 23) % 80),
        opacity: 0.03 + (s % 5) * 0.01,
      });
    }
    return items;
  }, [seed]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      {circles.map((c, i) => (
        <circle
          key={`c-${i}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          className="fill-primary"
          style={{ opacity: c.opacity }}
        />
      ))}
      {lines.map((l, i) => (
        <line
          key={`l-${i}`}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          className="stroke-primary"
          strokeWidth="0.5"
          style={{ opacity: l.opacity }}
        />
      ))}
    </svg>
  );
}

const floatAnimation = {
  y: [0, -6, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

export function EmptyState({ icon: Icon, title, description, illustration, action, className }: EmptyStateProps) {
  const patternKey = Icon.displayName || Icon.name || 'empty';

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <motion.div
        className="relative mb-4"
        animate={floatAnimation}
      >
        <div className="h-16 w-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center relative overflow-hidden">
          {!illustration && <GeometricPattern iconName={patternKey} />}
          {illustration ? (
            <div className="relative z-10">{illustration}</div>
          ) : (
            <Icon className="size-6 text-primary/50 relative z-10" />
          )}
        </div>
      </motion.div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Progress with label ─────────────────────────────────────────

interface CompactProgressProps {
  label: string;
  value: number;
  displayValue?: string;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple';
  className?: string;
}

const PROGRESS_COLORS: Record<string, string> = {
  green: 'bg-emerald-500 dark:bg-emerald-400',
  blue: 'bg-blue-500 dark:bg-blue-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  red: 'bg-red-500 dark:bg-red-400',
  purple: 'bg-purple-500 dark:bg-purple-400',
};

function progressColorClass(value: number): 'green' | 'blue' | 'amber' | 'red' {
  if (value >= 75) return 'green';
  if (value >= 50) return 'blue';
  if (value >= 30) return 'amber';
  return 'red';
}

function progressStatusLabel(value: number): string {
  if (value >= 75) return 'On track';
  if (value >= 50) return 'Moderate';
  if (value >= 30) return 'Needs work';
  return 'Critical';
}

export function CompactProgress({
  label,
  value,
  displayValue,
  color: colorProp,
  className,
}: CompactProgressProps) {
  const color = colorProp || progressColorClass(value);
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums">
          {displayValue || `${value}%`}
        </span>
      </div>
      <div className="progress-thin progress-animate">
        <div
          className={PROGRESS_COLORS[color]}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-1">
        {progressStatusLabel(value)}
      </p>
    </div>
  );
}

export { progressColorClass, progressStatusLabel, PROGRESS_COLORS };
