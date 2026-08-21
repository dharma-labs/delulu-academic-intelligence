'use client';

import { useStore, calculateSGPA, calculateCGPA, getSubjectProgress, getSubjectAttendance, getSubjectMarks, getSubjectGrade, getStudyTimeThisWeek } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { Download, Printer, FileText, GraduationCap, UserCheck, BookOpen, BarChart3, Clock } from 'lucide-react';

export default function ReportView() {
  const { subjects, assessments, attendance, studySessions, profile, calendarEvents } = useStore();
  const activeSubjects = subjects.filter((s) => !s.archived);

  const reportData = useMemo(() => {
    const sgpa = calculateSGPA();
    const cgpa = calculateCGPA();
    const weekMinutes = getStudyTimeThisWeek();

    const subjectReports = activeSubjects.map((sub) => {
      const progress = getSubjectProgress(sub.id);
      const att = getSubjectAttendance(sub.id);
      const marks = getSubjectMarks(sub.id);
      const grade = getSubjectGrade(sub.id);
      return { subject: sub, progress, attendance: att, marks, grade };
    });

    const totalAssessments = assessments.length;
    const avgAssessmentPct = totalAssessments > 0
      ? Math.round(assessments.reduce((a, c) => a + (c.obtainedMarks / c.maxMarks) * 100, 0) / totalAssessments)
      : 0;

    const totalSessions = studySessions.length;
    const totalStudyHours = Math.round(studySessions.reduce((a, s) => a + s.duration, 0) / 3600);

    return { sgpa, cgpa, weekMinutes, subjectReports, totalAssessments, avgAssessmentPct, totalSessions, totalStudyHours };
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
        <div class="metric-card"><div class="metric-value">${reportData.totalStudyHours}h</div><div class="metric-label">Total Study</div></div>
        <div class="metric-card"><div class="metric-value">${reportData.totalSessions}</div><div class="metric-label">Sessions</div></div>
      </div>

      <div class="section">
        <div class="section-title">Subject Performance</div>
        <table><thead><tr><th>Subject</th><th>Code</th><th>Credits</th><th>Grade</th><th>Attendance</th><th>Syllabus</th><th>CA Score</th></tr></thead><tbody>
        ${reportData.subjectReports.map(r => `<tr><td>${r.subject.name}</td><td>${r.subject.code}</td><td>${r.subject.credits}</td><td>${r.grade}</td><td>${r.attendance.percentage.toFixed(0)}%</td><td>${r.progress.percentage.toFixed(0)}%</td><td>${r.marks.percentage.toFixed(0)}%</td></tr>`).join('')}
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Academic Report</h1>
          <p className="text-muted-foreground text-sm mt-1">Professional report of your academic performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
          <Button onClick={handleDownload}><Download className="w-4 h-4 mr-2" />Download PDF</Button>
        </div>
      </div>

      <div id="report-content" className="bg-card border border-border rounded-xl p-6 space-y-6">
        {/* Report Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Delulu 4.0 — Academic Report</h2>
            <p className="text-sm text-muted-foreground">
              {profile.name} · Semester {profile.semester}{profile.branch ? ` · ${profile.branch}` : ''} · {format(new Date(), 'd MMMM yyyy')}
            </p>
          </div>
          <FileText className="w-10 h-10 text-muted-foreground/30" />
        </div>

        <Separator />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-none bg-muted/50">
            <CardContent className="p-4 text-center">
              <GraduationCap className="w-5 h-5 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold tabular-nums">{reportData.cgpa.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">CGPA</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-none bg-muted/50">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-5 h-5 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold tabular-nums">{reportData.sgpa.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">SGPA</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-none bg-muted/50">
            <CardContent className="p-4 text-center">
              <UserCheck className="w-5 h-5 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold tabular-nums">{reportData.subjectReports.length > 0 ? Math.round(reportData.subjectReports.reduce((a, r) => a + r.attendance.percentage, 0) / reportData.subjectReports.length) : 0}%</div>
              <div className="text-xs text-muted-foreground">Avg Attendance</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-none bg-muted/50">
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold tabular-nums">{reportData.totalStudyHours}h</div>
              <div className="text-xs text-muted-foreground">Total Study</div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Subject Table */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Subject Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Subject</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground hidden sm:table-cell">Code</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">Credits</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">Grade</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">Attendance</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground hidden md:table-cell">Syllabus</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">CA</th>
                </tr>
              </thead>
              <tbody>
                {reportData.subjectReports.map((r) => (
                  <tr key={r.subject.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.subject.color }} />
                        <span className="font-medium truncate max-w-[180px]">{r.subject.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground hidden sm:table-cell">{r.subject.code}</td>
                    <td className="py-2.5 px-3 text-center tabular-nums">{r.subject.credits}</td>
                    <td className="py-2.5 px-3 text-center"><Badge variant="outline">{r.grade}</Badge></td>
                    <td className="py-2.5 px-3 text-center tabular-nums">{r.attendance.percentage.toFixed(0)}%</td>
                    <td className="py-2.5 px-3 text-center tabular-nums hidden md:table-cell">{r.progress.percentage.toFixed(0)}%</td>
                    <td className="py-2.5 px-3 text-center tabular-nums">{r.marks.percentage.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeSubjects.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No subjects to report.</p>}
        </div>

        <Separator />

        {/* Assessment Summary */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Assessment Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-xl font-bold tabular-nums">{reportData.totalAssessments}</div>
              <div className="text-xs text-muted-foreground">Total Assessments</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-xl font-bold tabular-nums">{reportData.avgAssessmentPct}%</div>
              <div className="text-xs text-muted-foreground">Average Score</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-xl font-bold tabular-nums">{reportData.totalSessions}</div>
              <div className="text-xs text-muted-foreground">Study Sessions</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center">
          Generated by Delulu 4.0 — Academic Operating System · {format(new Date(), 'd MMMM yyyy HH:mm')}
        </div>
      </div>
    </div>
  );
}