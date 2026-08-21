'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

// ─── Metric Card ─────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  context?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
  iconColor?: string;
  valueColor?: string;
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
  className,
  onClick,
}: MetricCardProps) {
  return (
    <div
      className={cn('metric-card', onClick && 'cursor-pointer', className)}
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
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
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
      <div className="progress-thin">
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
