'use client';
"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardView;
var react_1 = require("react");
var date_fns_1 = require("date-fns");
var lucide_react_1 = require("lucide-react");
var framer_motion_1 = require("framer-motion");
var store_1 = require("@/lib/store");
var card_1 = require("@/components/ui/card");
var badge_1 = require("@/components/ui/badge");
var button_1 = require("@/components/ui/button");
var shared_1 = require("@/components/shared");
// -- Animation --
var container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
var fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };
// -- Health status --
function getHealthConfig(score) {
    if (score >= 80)
        return { label: 'HEALTHY', status: 'healthy', description: 'Academics on track' };
    if (score >= 60)
        return { label: 'GOOD', status: 'improving', description: 'Solid progress' };
    if (score >= 40)
        return { label: 'NEEDS ATTENTION', status: 'attention', description: 'Some areas need focus' };
    if (score > 0)
        return { label: 'CRITICAL', status: 'critical', description: 'Immediate action required' };
    return { label: 'NO DATA', status: 'nodata', description: 'Add subjects to begin' };
}
function formatStudyTime(seconds) {
    var totalMinutes = Math.floor(seconds / 60);
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    if (h === 0)
        return "".concat(m, "m");
    if (m === 0)
        return "".concat(h, "h");
    return "".concat(h, "h ").concat(m, "m");
}
function signalDotClass(signal) {
    var map = {
        healthy: 'bg-emerald-500', improving: 'bg-blue-500', attention: 'bg-amber-500',
        critical: 'bg-red-500', upcoming: 'bg-purple-500', nodata: 'bg-muted-foreground/40',
    };
    return map[signal];
}
// ════════════════════════════════════════════════════════════════════
// Dashboard
// ════════════════════════════════════════════════════════════════════
// ─── Weekly Heatmap ──────────────────────────────────────────────
function WeeklyHeatmap(_a) {
    var studySessions = _a.studySessions;
    var days = (0, react_1.useMemo)(function () {
        var start = (0, date_fns_1.startOfWeek)(new Date(), { weekStartsOn: 1 });
        return Array.from({ length: 7 }, function (_, i) {
            var d = (0, date_fns_1.addDays)(start, i);
            var dateStr = d.toISOString().split('T')[0];
            var daySessions = studySessions.filter(function (s) { return s.date === dateStr; });
            var totalMinutes = Math.floor(daySessions.reduce(function (sum, s) { return sum + s.duration / 60; }, 0));
            return { date: d, dateStr: dateStr, label: (0, date_fns_1.format)(d, 'EEE'), totalMinutes: totalMinutes, count: daySessions.length };
        });
    }, [studySessions]);
    var maxMinutes = Math.max.apply(Math, __spreadArray(__spreadArray([], days.map(function (d) { return d.totalMinutes; }), false), [1], false));
    var today = new Date().toISOString().split('T')[0];
    return (<div className="grid grid-cols-7 gap-1.5">
      {days.map(function (d) {
            var intensity = Math.min(d.totalMinutes / maxMinutes, 1);
            var isToday = d.dateStr === today;
            var bgOpacity = d.count === 0 ? 0.08 : Math.max(0.15, intensity);
            return (<div key={d.dateStr} className="flex flex-col items-center gap-1">
            <div className={"w-full aspect-square rounded-md transition-colors ".concat(isToday ? 'ring-2 ring-primary/30' : '')} style={{ backgroundColor: "rgba(var(--primary-rgb), ".concat(bgOpacity, ")") }}/>
            <span className={"text-[10px] ".concat(isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{d.label}</span>
            {d.count > 0 && (<span className="text-[9px] text-muted-foreground tabular-nums">{d.totalMinutes}m</span>)}
          </div>);
        })}
    </div>);
}
function DashboardView() {
    var profile = (0, store_1.useStore)(function (s) { return s.profile; });
    var subjects = (0, store_1.useStore)(function (s) { return s.subjects; });
    var syllabusUnits = (0, store_1.useStore)(function (s) { return s.syllabusUnits; });
    var attendance = (0, store_1.useStore)(function (s) { return s.attendance; });
    var assessments = (0, store_1.useStore)(function (s) { return s.assessments; });
    var studySessions = (0, store_1.useStore)(function (s) { return s.studySessions; });
    var revisionItems = (0, store_1.useStore)(function (s) { return s.revisionItems; });
    var exams = (0, store_1.useStore)(function (s) { return s.exams; });
    var assignments = (0, store_1.useStore)(function (s) { return s.assignments; });
    var tasks = (0, store_1.useStore)(function (s) { return s.tasks; });
    var navigate = (0, store_1.useStore)(function (s) { return s.navigate; });
    var selectSubject = (0, store_1.useStore)(function (s) { return s.selectSubject; });
    var activeSubjects = (0, react_1.useMemo)(function () { return subjects.filter(function (s) { return !s.archived; }); }, [subjects]);
    // -- Core metrics --
    var healthScore = (0, react_1.useMemo)(function () { return (0, store_1.getSemesterHealth)({ subjects: subjects, syllabusUnits: syllabusUnits, assessments: assessments, attendance: attendance, revisionItems: revisionItems, profile: profile }); }, [subjects, syllabusUnits, assessments, attendance, revisionItems, profile]);
    var cgpa = (0, react_1.useMemo)(function () { return (0, store_1.calculateCGPA)({ subjects: subjects, assessments: assessments }); }, [subjects, assessments]);
    var avgAttendance = (0, react_1.useMemo)(function () {
        if (activeSubjects.length === 0)
            return 0;
        var attState = { attendance: attendance };
        return Math.round(activeSubjects.reduce(function (sum, s) { return sum + (0, store_1.getSubjectAttendance)(attState, s.id).percentage; }, 0) / activeSubjects.length);
    }, [activeSubjects, attendance]);
    var avgSyllabus = (0, react_1.useMemo)(function () {
        if (activeSubjects.length === 0)
            return 0;
        var syllState = { syllabusUnits: syllabusUnits };
        return Math.round(activeSubjects.reduce(function (sum, s) { return sum + (0, store_1.getSubjectProgress)(syllState, s.id); }, 0) / activeSubjects.length);
    }, [activeSubjects, syllabusUnits]);
    var studyTimeThisWeek = (0, react_1.useMemo)(function () { return (0, store_1.getStudyTimeThisWeek)({ studySessions: studySessions }); }, [studySessions]);
    var dueRevisionCount = (0, react_1.useMemo)(function () { return (0, store_1.getDueRevisionItems)({ revisionItems: revisionItems }).length; }, [revisionItems]);
    var healthConfig = (0, react_1.useMemo)(function () { return getHealthConfig(healthScore); }, [healthScore]);
    // -- CGPA trend --
    var cgpaTrend = (0, react_1.useMemo)(function () {
        if (cgpa === 0)
            return 'neutral';
        if (cgpa >= profile.targetCGPA)
            return 'up';
        if (cgpa >= profile.targetCGPA - 1)
            return 'neutral';
        return 'down';
    }, [cgpa, profile.targetCGPA]);
    // -- Subject health data for Academic Flow --
    var subjectHealthData = (0, react_1.useMemo)(function () {
        return activeSubjects.map(function (s) {
            var progress = (0, store_1.getSubjectProgress)({ syllabusUnits: syllabusUnits }, s.id);
            var att = (0, store_1.getSubjectAttendance)({ attendance: attendance }, s.id);
            var signal = (0, store_1.getSubjectSignal)({ attendance: attendance, assessments: assessments, syllabusUnits: syllabusUnits, revisionItems: revisionItems, profile: profile, subjects: subjects }, s.id);
            return { subject: s, progress: progress, att: att, signal: signal };
        }).sort(function (a, b) { return a.progress - b.progress; });
    }, [activeSubjects, syllabusUnits, attendance, assessments, revisionItems, profile, subjects]);
    // -- Recommendations --
    var recommendations = (0, react_1.useMemo)(function () {
        var _a;
        var items = [];
        // 1. Incomplete syllabus topic with lowest progress
        var syllState = { syllabusUnits: syllabusUnits };
        var sortedByProgress = activeSubjects.map(function (s) { return ({ subject: s, progress: (0, store_1.getSubjectProgress)(syllState, s.id) }); }).sort(function (a, b) { return a.progress - b.progress; });
        var _loop_1 = function (subject, progress) {
            if (progress >= 100)
                return "continue";
            var units = syllabusUnits.filter(function (u) { return u.subjectId === subject.id; });
            var incompleteTopic = units.flatMap(function (u) { return u.topics; }).find(function (t) { return !t.completed; });
            if (incompleteTopic) {
                items.push({
                    title: incompleteTopic.name, description: "".concat(subject.name, " \u2014 ").concat(progress, "% complete"),
                    priority: 'HIGH IMPACT', priorityColor: 'signal-attention',
                    actionLabel: 'STUDY', actionView: 'focus', subjectId: subject.id,
                });
                return "break";
            }
        };
        for (var _i = 0, sortedByProgress_1 = sortedByProgress; _i < sortedByProgress_1.length; _i++) {
            var _b = sortedByProgress_1[_i], subject = _b.subject, progress = _b.progress;
            var state_1 = _loop_1(subject, progress);
            if (state_1 === "break")
                break;
        }
        // 2. Deadline
        var today = new Date().toISOString().split('T')[0];
        var upcomingExams = exams.filter(function (e) { return e.status === 'upcoming' && e.date >= today; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
        var upcomingAssignments = assignments.filter(function (a) { return a.status !== 'completed' && a.deadline >= today; }).sort(function (a, b) { return a.deadline.localeCompare(b.deadline); });
        var deadlineItem = upcomingExams[0] || upcomingAssignments[0];
        if (deadlineItem) {
            var dateStr = 'date' in deadlineItem ? deadlineItem.date : deadlineItem.deadline;
            var daysUntil = Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
            var sub = subjects.find(function (s) { return s.id === deadlineItem.subjectId; });
            items.push({
                title: deadlineItem.name || deadlineItem.title, description: "".concat((_a = sub === null || sub === void 0 ? void 0 : sub.name) !== null && _a !== void 0 ? _a : '', " \u2014 ").concat(daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : "In ".concat(daysUntil, "d")),
                priority: 'DEADLINE', priorityColor: 'signal-critical',
                actionLabel: 'PREPARE', actionView: 'subject-detail', subjectId: deadlineItem.subjectId,
            });
        }
        // 3. Low attendance
        var attState = { attendance: attendance };
        var lowestAtt = activeSubjects.map(function (s) { return ({ subject: s, att: (0, store_1.getSubjectAttendance)(attState, s.id) }); }).filter(function (x) { return x.att.total > 0; }).sort(function (a, b) { return a.att.percentage - b.att.percentage; })[0];
        if (lowestAtt && lowestAtt.att.percentage < profile.attendanceThreshold) {
            items.push({
                title: "".concat(lowestAtt.subject.name, " Attendance"), description: "".concat(lowestAtt.att.percentage, "% \u2014 need ").concat(profile.attendanceThreshold, "%"),
                priority: 'ATTENTION', priorityColor: 'signal-attention',
                actionLabel: 'VIEW', actionView: 'attendance', subjectId: lowestAtt.subject.id,
            });
        }
        return items;
    }, [activeSubjects, syllabusUnits, exams, assignments, subjects, attendance, profile]);
    // -- Upcoming deadlines --
    var upcomingDeadlines = (0, react_1.useMemo)(function () {
        var today = new Date().toISOString().split('T')[0];
        var items = [];
        exams.filter(function (e) { return e.status === 'upcoming' && e.date >= today; }).sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, 3).forEach(function (e) {
            var _a, _b;
            var sub = subjects.find(function (s) { return s.id === e.subjectId; });
            items.push({ title: e.name, subjectName: (_a = sub === null || sub === void 0 ? void 0 : sub.name) !== null && _a !== void 0 ? _a : '', date: e.date, type: 'exam', color: (_b = sub === null || sub === void 0 ? void 0 : sub.color) !== null && _b !== void 0 ? _b : 'var(--delulu-info)' });
        });
        assignments.filter(function (a) { return a.status !== 'completed' && a.deadline >= today; }).sort(function (a, b) { return a.deadline.localeCompare(b.deadline); }).slice(0, 3).forEach(function (a) {
            var _a, _b;
            var sub = subjects.find(function (s) { return s.id === a.subjectId; });
            items.push({ title: a.title, subjectName: (_a = sub === null || sub === void 0 ? void 0 : sub.name) !== null && _a !== void 0 ? _a : '', date: a.deadline, type: 'assignment', color: (_b = sub === null || sub === void 0 ? void 0 : sub.color) !== null && _b !== void 0 ? _b : 'var(--delulu-warning)' });
        });
        return items.sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, 5);
    }, [exams, assignments, subjects]);
    // -- Insights --
    var insights = (0, react_1.useMemo)(function () {
        var result = [];
        // Check subjects at risk
        var atRisk = subjectHealthData.filter(function (s) { return s.signal === 'critical' || s.signal === 'attention'; });
        if (atRisk.length > 0) {
            result.push({ type: 'warning', title: "".concat(atRisk.length, " subject").concat(atRisk.length > 1 ? 's' : '', " need attention"), description: atRisk.map(function (s) { return s.subject.name; }).join(', ') });
        }
        // Revision queue
        if (dueRevisionCount > 0) {
            result.push({ type: 'info', title: "".concat(dueRevisionCount, " revision").concat(dueRevisionCount > 1 ? 's' : '', " due"), description: 'Items in your SM-2 queue are ready for review' });
        }
        // Attendance
        var lowAttSubjects = subjectHealthData.filter(function (s) { return s.att.total > 0 && s.att.percentage < profile.attendanceThreshold; });
        if (lowAttSubjects.length > 0) {
            result.push({ type: lowAttSubjects.some(function (s) { return s.att.percentage < profile.attendanceThreshold - 5; }) ? 'critical' : 'warning', title: 'Attendance below threshold', description: "".concat(lowAttSubjects.map(function (s) { return "".concat(s.subject.name, " (").concat(s.att.percentage, "%)"); }).join(', ')) });
        }
        // Study streak
        var now = new Date();
        var startStr = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }).toISOString().split('T')[0];
        var weekSessions = studySessions.filter(function (s) { return s.date >= startStr; }).length;
        if (weekSessions >= 5) {
            result.push({ type: 'positive', title: "".concat(weekSessions, " study sessions this week"), description: 'Consistent study pattern detected' });
        }
        else if (weekSessions === 0) {
            result.push({ type: 'warning', title: 'No study sessions this week', description: 'Start a focus session to build momentum' });
        }
        // CGPA
        if (cgpa > 0 && cgpa >= profile.targetCGPA) {
            result.push({ type: 'positive', title: "CGPA on target", description: "".concat(cgpa.toFixed(1), " meets your goal of ").concat(profile.targetCGPA) });
        }
        return result.slice(0, 4);
    }, [subjectHealthData, dueRevisionCount, profile.attendanceThreshold, studySessions, cgpa, profile.targetCGPA]);
    // -- Greeting --
    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var formattedDate = (0, date_fns_1.format)(new Date(), 'EEEE, d MMMM');
    function handleAction(view, subjectId) {
        if (subjectId)
            selectSubject(subjectId);
        navigate(view);
    }
    return (<framer_motion_1.motion.div className="space-y-5" variants={container} initial="hidden" animate="show">
      {/* ── Header Bar ── */}
      <framer_motion_1.motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {greeting}, {profile.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <badge_1.Badge variant="outline" className="text-[10px] font-medium tracking-wider uppercase px-2 py-0.5">
            Semester {profile.semester}{profile.branch ? " \u00B7 ".concat(profile.branch) : ''}
          </badge_1.Badge>
        </div>
      </framer_motion_1.motion.div>

      {/* ── Academic Health + Metrics Row ── */}
      <framer_motion_1.motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4">
        {/* Health Score */}
        <card_1.Card className="hero-card">
          <card_1.CardContent className="p-5 pt-6">
            <span className="section-label">Academic Health</span>
            <div className="mt-3 mb-2">
              <span className="text-4xl font-bold tracking-tighter text-foreground leading-none">
                {healthScore}
              </span>
              <span className="text-lg font-medium text-muted-foreground ml-1">/100</span>
            </div>
            <shared_1.StatusBadge status={healthConfig.status} label={healthConfig.label} className="mb-2"/>
            <p className="text-xs text-muted-foreground mt-1">{healthConfig.description}</p>
            <div className="mt-4">
              <shared_1.CompactProgress label="Overall" value={healthScore} color={healthScore >= 75 ? 'green' : healthScore >= 50 ? 'blue' : healthScore >= 30 ? 'amber' : 'red'}/>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <shared_1.MetricCard label="Attendance" value={"".concat(avgAttendance, "%")} context={"".concat(activeSubjects.reduce(function (s, sub) { return s + (0, store_1.getSubjectAttendance)({ attendance: attendance }, sub.id).present; }, 0), " / ").concat(activeSubjects.reduce(function (s, sub) { return s + (0, store_1.getSubjectAttendance)({ attendance: attendance }, sub.id).total; }, 0), " classes")} trend={avgAttendance >= profile.attendanceThreshold ? 'up' : 'down'} icon={lucide_react_1.UserCheck} valueColor={avgAttendance >= profile.attendanceThreshold ? 'text-[var(--delulu-success)]' : 'text-[var(--delulu-danger)]'} onClick={function () { return navigate('attendance'); }}/>
          <shared_1.MetricCard label="Syllabus" value={"".concat(avgSyllabus, "%")} context="Average completion" icon={lucide_react_1.BookOpen} onClick={function () { return navigate('subjects'); }}/>
          <shared_1.MetricCard label="CGPA" value={cgpa.toFixed(1)} context={"Target: ".concat(profile.targetCGPA)} trend={cgpaTrend} trendValue={cgpaTrend === 'up' ? 'On target' : cgpaTrend === 'down' ? 'Below' : undefined} icon={lucide_react_1.BarChart3} onClick={function () { return navigate('marks'); }}/>
          <shared_1.MetricCard label="Study Time" value={formatStudyTime(studyTimeThisWeek)} context="This week" icon={lucide_react_1.Clock} onClick={function () { return navigate('analytics'); }}/>
        </div>
      </framer_motion_1.motion.div>

      {/* ── Weekly Activity Heatmap ── */}
      <framer_motion_1.motion.div variants={fadeUp}>
        <card_1.Card>
          <card_1.CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <card_1.CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <lucide_react_1.Clock className="size-4 text-primary"/>
                This Week
              </card_1.CardTitle>
              <span className="text-[10px] text-muted-foreground font-medium">Study sessions</span>
            </div>
          </card_1.CardHeader>
          <card_1.CardContent className="px-5 pb-4">
            <WeeklyHeatmap studySessions={studySessions}/>
          </card_1.CardContent>
        </card_1.Card>
      </framer_motion_1.motion.div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Focus + Recommendations */}
        <framer_motion_1.motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          <card_1.Card>
            <card_1.CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <card_1.CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <lucide_react_1.Target className="size-4 text-primary"/>
                  Today's Focus
                </card_1.CardTitle>
                <span className="text-[10px] text-muted-foreground font-medium">{recommendations.length} action{recommendations.length !== 1 ? 's' : ''}</span>
              </div>
            </card_1.CardHeader>
            <card_1.CardContent className="px-5 pb-4">
              {recommendations.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-2.5 mb-2.5">
                    <lucide_react_1.CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400"/>
                  </div>
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No pending actions right now</p>
                </div>) : (<div className="space-y-2.5">
                  {recommendations.map(function (rec, i) { return (<div key={i} className="card-interactive flex items-center gap-3 p-3 group" onClick={function () { return handleAction(rec.actionView, rec.subjectId); }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium truncate">{rec.title}</p>
                          <shared_1.StatusBadge status={rec.priorityColor === 'signal-critical' ? 'critical' : 'attention'} label={rec.priority} className="text-[9px] shrink-0"/>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{rec.description}</p>
                      </div>
                      <button_1.Button size="sm" variant="ghost" className="shrink-0 text-xs font-medium text-primary md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {rec.actionLabel}
                        <lucide_react_1.ArrowRight className="size-3 ml-1"/>
                      </button_1.Button>
                    </div>); })}
                </div>)}
            </card_1.CardContent>
          </card_1.Card>

          {/* Academic Flow */}
          <card_1.Card>
            <card_1.CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <card_1.CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <lucide_react_1.Activity className="size-4 text-primary"/>
                  Academic Flow
                </card_1.CardTitle>
                <button_1.Button variant="ghost" size="sm" className="text-xs" onClick={function () { return navigate('subjects'); }}>
                  View all <lucide_react_1.ChevronRight className="size-3 ml-0.5"/>
                </button_1.Button>
              </div>
            </card_1.CardHeader>
            <card_1.CardContent className="px-5 pb-4">
              {activeSubjects.length === 0 ? (<p className="text-xs text-muted-foreground py-4 text-center">No subjects added yet</p>) : (<div className="space-y-2.5">
                  {subjectHealthData.map(function (_a) {
                var subject = _a.subject, progress = _a.progress, att = _a.att, signal = _a.signal;
                return (<div key={subject.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group" onClick={function () { selectSubject(subject.id); navigate('subject-detail'); }}>
                      <span className={"status-dot ".concat(signalDotClass(signal))}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{subject.name}</span>
                          <span className="text-xs font-semibold tabular-nums text-muted-foreground ml-2">{progress}%</span>
                        </div>
                        <div className="progress-thin">
                          <div className={progress >= 75 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : progress >= 30 ? 'bg-amber-500' : 'bg-red-500'} style={{ width: "".concat(Math.min(100, progress), "%") }}/>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground">Att: {att.total > 0 ? "".concat(att.percentage, "%") : '—'}</span>
                          <span className="text-[10px] text-muted-foreground">{subject.credits} cr</span>
                        </div>
                      </div>
                      <lucide_react_1.ChevronRight className="size-3.5 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"/>
                    </div>);
            })}
                </div>)}
            </card_1.CardContent>
          </card_1.Card>

          {/* Signal Legend */{ activeSubjects: activeSubjects, : .length > 0 && (<div className="signal-legend px-1">
              <div className="signal-legend-item"><span className="status-dot bg-emerald-500"/> On Track</div>
              <div className="signal-legend-item"><span className="status-dot bg-blue-500"/> Improving</div>
              <div className="signal-legend-item"><span className="status-dot bg-amber-500"/> At Risk</div>
              <div className="signal-legend-item"><span className="status-dot bg-red-500"/> Critical</div>
            </div>) }}
        </framer_motion_1.motion.div>

        {/* Right Column */}
        <framer_motion_1.motion.div variants={fadeUp} className="space-y-4">
          {/* Insights */}
          <card_1.Card>
            <card_1.CardHeader className="pb-3 pt-4 px-5">
              <card_1.CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <lucide_react_1.Sparkles className="size-4 text-[var(--delulu-purple)]"/>
                Insights
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="px-5 pb-4">
              {insights.length === 0 ? (<p className="text-xs text-muted-foreground py-4 text-center">No insights yet</p>) : (<div className="space-y-2.5">
                  {insights.map(function (insight, i) {
                var iconMap = { positive: lucide_react_1.CheckCircle2, warning: lucide_react_1.AlertTriangle, critical: lucide_react_1.AlertTriangle, info: lucide_react_1.Info };
                var Icon = iconMap[insight.type];
                return (<div key={i} className={i >= 1 ? 'hidden md:block' : ''}>
                        <shared_1.InsightCard type={insight.type} icon={Icon} title={insight.title} description={insight.description}/>
                      </div>);
            })}
                </div>)}
            </card_1.CardContent>
          </card_1.Card>

          {/* Upcoming Deadlines */}
          <card_1.Card>
            <card_1.CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <card_1.CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <lucide_react_1.CalendarClock className="size-4 text-[var(--delulu-warning)]"/>
                  Deadlines
                </card_1.CardTitle>
                <button_1.Button variant="ghost" size="sm" className="text-xs" onClick={function () { return navigate('calendar'); }}>
                  Calendar <lucide_react_1.ChevronRight className="size-3 ml-0.5"/>
                </button_1.Button>
              </div>
            </card_1.CardHeader>
            <card_1.CardContent className="px-5 pb-4">
              {upcomingDeadlines.length === 0 ? (<p className="text-xs text-muted-foreground py-4 text-center">No upcoming deadlines</p>) : (<div className="space-y-2">
                  {upcomingDeadlines.map(function (d, i) {
                var daysUntil = Math.ceil((new Date(d.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (<div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer" onClick={function () { return navigate(d.type === 'exam' ? 'exams' : 'assignments'); }}>
                        <div className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: d.color }}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{d.title}</p>
                          <p className="text-[10px] text-muted-foreground">{d.subjectName}</p>
                        </div>
                        <badge_1.Badge variant={daysUntil <= 2 ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 shrink-0">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tmrw' : "".concat(daysUntil, "d")}
                        </badge_1.Badge>
                      </div>);
            })}
                </div>)}
            </card_1.CardContent>
          </card_1.Card>

          {/* Quick Actions — desktop only */}
          <card_1.Card className="hidden md:block">
            <card_1.CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {[
            { label: 'Focus', icon: lucide_react_1.Timer, view: 'focus' },
            { label: 'Revise', icon: lucide_react_1.BrainCircuit, view: 'revision' },
            { label: 'Notes', icon: lucide_react_1.BookOpen, view: 'notes' },
            { label: 'Report', icon: lucide_react_1.BarChart3, view: 'report' },
        ].map(function (a) {
            var Icon = a.icon;
            return (<button key={a.view} onClick={function () { return navigate(a.view); }} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      <Icon className="size-3.5"/>
                      {a.label}
                    </button>);
        })}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </framer_motion_1.motion.div>
      </div>
    </framer_motion_1.motion.div>);
}
