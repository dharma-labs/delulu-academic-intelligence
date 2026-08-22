'use client';

import { useStore, calculateSGPA, calculateCGPA, getSubjectProgress, getSubjectAttendance, getSubjectMarks, getSubjectGrade, getStudyTimeThisWeek } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { PageHeader, MetricCard, SectionHeader, EmptyState } from '@/components/shared';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { Download, Printer, GraduationCap, UserCheck, BarChart3, Clock, FileText } from 'lucide-react';

function gradeSignal(grade: string): string {
  if (['A+', 'A'].includes(grade)) return 'signal-healthy';
  if (['B+', 'B'].includes(grade)) return 'signal-improving';
  if (['C+', 'C'].includes(grade)) return 'signal-attention';
  return 'signal-critical';
}

export default function ReportView() {
  const { subjects, assessments, attendance, studySessions, profile, calendarEvents } = useStore();
  const activeSubjects = subjects.filter((s) => !s.archived);

  const reportData = useMemo(() => {
    const state = useStore.getState();
    const sgpa = calculateSGPA({ subjects: state.subjects, assessments: state.assessments });
    const cgpa = calculateCGPA({ subjects: state.subjects, assessments: state.assessments });
    const weekMinutes = getStudyTimeThisWeek({ studySessions: state.studySessions });

    const subjectReports = activeSubjects.map((sub) => {
      const progress = getSubjectProgress({ syllabusUnits: state.syllabusUnits }, sub.id);
      const att = getSubjectAttendance({ attendance: state.attendance }, sub.id);
      const marks = getSubjectMarks({ assessments: state.assessments }, sub.id);
      const grade = getSubjectGrade({ assessments: state.assessments }, sub.id);
      return { subject: sub, progress, attendance: att, marks, grade };
    });

    const totalAssessments = assessments.length;
    const avgAssessmentPct = totalAssessments > 0
      ? Math.round(assessments.reduce((a, c) => a + (c.obtainedMarks / c.maxMarks) * 100, 0) / totalAssessments)
      : 0;

    const totalSessions = studySessions.length;
    const totalStudyHours = Math.round(studySessions.reduce((a, s) => a + s.duration, 0) / 3600);

    const avgAttendance = subjectReports.length > 0
      ? Math.round(subjectReports.reduce((a, r) => a + r.attendance.percentage, 0) / subjectReports.length)
      : 0;

    return { sgpa, cgpa, weekMinutes, subjectReports, totalAssessments, avgAssessmentPct, totalSessions, totalStudyHours, avgAttendance };
  }, [activeSubjects, assessments, attendance, studySessions, profile]);

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const el = document.getElementById('report-content');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) { alert('Pop-up blocked. Please allow pop-ups.'); return; }
    w.document.write(`
      <!DOCTYPE html><html><head><title>Delulu 4.0 - Academic Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #171923; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
        .subtitle { color: #626979; margin-bottom: 24px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #626979; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #E5E7EF; font-size: 13px; }
        th { font-weight: 600; color: #626979; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .metric-card { padding: 16px; border: 1px solid #E5E7EF; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: 700; }
        .metric-label { font-size: 11px; color: #626979; margin-top: 4px; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EF; font-size: 11px; color: #9298A6; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>Delulu 4.0 — Academic Report</h1>
      <p class="subtitle">${profile.name} · Semester ${profile.semester}${profile.branch ? ' · ' + profile.branch : ''} · Generated ${format(new Date(), 'd MMMM yyyy')}</p>
      
      <div class="metric-grid">
        <div class="metric-card"><div class="metric-value">${reportData.cgpa.toFixed(2)}</div><div class="metric-label">CGPA</div></div>
        <div class="metric-card"><div class="metric-value">${reportData.sgpa.toFixed(2)}</div><div class="metric-label">SGPA</div></div>
        <div class="metric-card"><div class="metric-value">${reportData.avgAttendance}%</div><div class="metric-label">Avg Attendance</div></div>
        <div class="metric-card"><div class="metric-value">${reportData.totalStudyHours}h</div><div class="metric-label">Total Study</div></div>
      </div>

      <div class="section">
        <div class="section-title">Subject Performance</div>
        <table><thead><tr><th>Subject</th><th>Code</th><th>Credits</th><th>Grade</th><th>Attendance</th><th>Syllabus</th><th>CA Score</th></tr></thead><tbody>
        ${reportData.subjectReports.map(r => `<tr><td>${r.subject.name}</td><td>${r.subject.code}</td><td>${r.subject.credits}</td><td>${r.grade}</td><td>${r.attendance.percentage.toFixed(0)}%</td><td>${r.progress.toFixed(0)}%</td><td>${r.marks.percentage.toFixed(0)}%</td></tr>`).join('')}
        </tbody></table>
      </div>

      <div class="section">
        <div class="section-title">Assessment Summary</div>
        <p style="font-size:13px;">Total Assessments: ${reportData.totalAssessments} · Average Score: ${reportData.avgAssessmentPct}%</p>
      </div>

      <div class="footer">Generated by Delulu 4.0 — Academic Operating System · ${format(new Date(), 'd MMMM yyyy HH:mm')}</div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Academic Report"
        subtitle="Professional report of your academic performance"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="size-3.5 mr-1.5" />Print
            </Button>
            <Button size="sm" onClick={handleDownload}>
              <Download className="size-3.5 mr-1.5" />Download PDF
            </Button>
          </>
        }
      />

      {activeSubjects.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No report data"
          description="Add subjects and record assessments to generate a report."
        />
      ) : (
        <div id="report-content" className="bg-card border border-border rounded-xl p-4 md:p-6 space-y-5">
          {/* Report Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Delulu 4.0 — Academic Report</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile.name} · Semester {profile.semester}{profile.branch ? ` · ${profile.branch}` : ''} · {format(new Date(), 'd MMMM yyyy')}
              </p>
            </div>
            <FileText className="size-8 text-muted-foreground/20" />
          </div>

          <div className="border-b border-border" />

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="CGPA"
              value={reportData.cgpa.toFixed(2)}
              icon={GraduationCap}
            />
            <MetricCard
              label="SGPA"
              value={reportData.sgpa.toFixed(2)}
              icon={BarChart3}
            />
            <MetricCard
              label="Avg Attendance"
              value={`${reportData.avgAttendance}%`}
              icon={UserCheck}
            />
            <MetricCard
              label="Total Study"
              value={`${reportData.totalStudyHours}h`}
              icon={Clock}
            />
          </div>

          <div className="border-b border-border" />

          {/* Subject Table */}
          <div>
            <SectionHeader title="Subject Performance" />
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="section-label text-left py-2.5 px-3">Subject</th>
                    <th className="section-label text-left py-2.5 px-3 hidden sm:table-cell">Code</th>
                    <th className="section-label text-center py-2.5 px-3">Credits</th>
                    <th className="section-label text-center py-2.5 px-3">Grade</th>
                    <th className="section-label text-center py-2.5 px-3">Attendance</th>
                    <th className="section-label text-center py-2.5 px-3 hidden md:table-cell">Syllabus</th>
                    <th className="section-label text-center py-2.5 px-3">CA</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.subjectReports.map((r) => (
                    <tr key={r.subject.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="status-dot" style={{ backgroundColor: r.subject.color }} />
                          <span className="font-medium truncate max-w-[180px]">{r.subject.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground hidden sm:table-cell">{r.subject.code}</td>
                      <td className="py-2.5 px-3 text-center tabular-nums">{r.subject.credits}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={cn('inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase', gradeSignal(r.grade))}>
                          {r.grade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums">{r.attendance.percentage.toFixed(0)}%</td>
                      <td className="py-2.5 px-3 text-center tabular-nums hidden md:table-cell">{r.progress.toFixed(0)}%</td>
                      <td className="py-2.5 px-3 text-center tabular-nums">{r.marks.percentage.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-b border-border" />

          {/* Assessment Summary */}
          <div>
            <SectionHeader title="Assessment Summary" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="metric-card text-center">
                <div className="text-xl font-bold tabular-nums tracking-tight">{reportData.totalAssessments}</div>
                <p className="metric-context text-center mt-1.5">Total Assessments</p>
              </div>
              <div className="metric-card text-center">
                <div className="text-xl font-bold tabular-nums tracking-tight">{reportData.avgAssessmentPct}%</div>
                <p className="metric-context text-center mt-1.5">Average Score</p>
              </div>
              <div className="metric-card text-center">
                <div className="text-xl font-bold tabular-nums tracking-tight">{reportData.totalSessions}</div>
                <p className="metric-context text-center mt-1.5">Study Sessions</p>
              </div>
            </div>
          </div>

          <div className="border-b border-border" />

          {/* Footer */}
          <div className="text-xs text-muted-foreground text-center py-1">
            Generated by Delulu 4.0 — Academic Operating System · {format(new Date(), 'd MMMM yyyy HH:mm')}
          </div>
        </div>
      )}
    </div>
  );
}