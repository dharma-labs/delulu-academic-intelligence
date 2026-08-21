"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGNAL_COLORS = exports.SUBJECT_COLORS = exports.GRADE_FROM_PERCENTAGE = exports.GRADE_POINTS = void 0;
// Grade point mapping
exports.GRADE_POINTS = {
    'O': 10, 'A+': 10, 'A': 9, 'A-': 8, 'B+': 7, 'B': 6, 'B-': 5,
    'C+': 4, 'C': 3, 'C-': 2, 'D': 1, 'F': 0,
};
var GRADE_FROM_PERCENTAGE = function (pct) {
    if (pct >= 90)
        return 'O';
    if (pct >= 80)
        return 'A';
    if (pct >= 70)
        return 'A-';
    if (pct >= 60)
        return 'B+';
    if (pct >= 55)
        return 'B';
    if (pct >= 50)
        return 'B-';
    if (pct >= 45)
        return 'C';
    if (pct >= 40)
        return 'P';
    return 'F';
};
exports.GRADE_FROM_PERCENTAGE = GRADE_FROM_PERCENTAGE;
exports.SUBJECT_COLORS = [
    '#635BFF', '#E5484D', '#16A36A', '#D99200', '#3478F6',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
    '#84CC16', '#F43F5E', '#A855F7', '#22D3EE', '#FB923C',
];
exports.SIGNAL_COLORS = {
    healthy: 'var(--delulu-success)',
    improving: 'var(--delulu-info)',
    attention: 'var(--delulu-warning)',
    critical: 'var(--delulu-danger)',
    upcoming: 'var(--delulu-purple)',
    nodata: 'var(--muted-foreground)',
};
