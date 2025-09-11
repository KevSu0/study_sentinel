"use strict";
// Golden Dataset for Phase B+C Analytics v2 Validation
// This dataset covers all edge cases and boundary conditions for migration testing
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMBINED_EXPECTED_METRICS = exports.GOLDEN_DATASET = void 0;
exports.validateGoldenDataset = validateGoldenDataset;
exports.calculateExpectedMetrics = calculateExpectedMetrics;
exports.validateInvariants = validateInvariants;
// Golden dataset covering edge cases
exports.GOLDEN_DATASET = [
    // Standard session across day boundary
    {
        id: 'session-001',
        timestamp: new Date('2024-01-15T23:30:00Z').getTime(),
        type: 'study_session_created',
        data: {
            subject: 'Mathematics',
            duration: 120,
            startTime: new Date('2024-01-15T23:30:00Z').getTime(),
            endTime: new Date('2024-01-16T01:30:00Z').getTime(),
            sessionId: 'cross-boundary-001',
            notes: 'Late night calculus study',
            rating: 4,
            tags: ['calculus', 'homework']
        },
        expectedMetrics: {
            totalDuration: 120,
            totalSessions: 1,
            averageSessionLength: 120,
            subjectBreakdown: { 'Mathematics': 120 },
            dailyTotals: {
                '2024-01-15': 30, // 30 min on 15th
                '2024-01-16': 90 // 90 min on 16th
            },
            weeklyTotals: { '2024-W03': 120 },
            monthlyTotals: { '2024-01': 120 },
            heatmap: {
                23: 30, // 11 PM
                0: 90, // 12 AM
                1: 30 // 1 AM
            },
            sessionLengthDistribution: { short: 0, medium: 1, long: 0 },
            consistencyScore: 1.0,
            topStudyDays: [{ date: '2024-01-15', duration: 120 }]
        }
    },
    // Multiple short sessions on same day
    {
        id: 'session-002',
        timestamp: new Date('2024-01-16T09:00:00Z').getTime(),
        type: 'study_session_created',
        data: {
            subject: 'Physics',
            duration: 25,
            startTime: new Date('2024-01-16T09:00:00Z').getTime(),
            endTime: new Date('2024-01-16T09:25:00Z').getTime(),
            sessionId: 'short-session-001',
            rating: 3,
            tags: ['quantum']
        },
        expectedMetrics: {
            totalDuration: 25,
            totalSessions: 1,
            averageSessionLength: 25,
            subjectBreakdown: { 'Physics': 25 },
            dailyTotals: { '2024-01-16': 25 },
            weeklyTotals: { '2024-W03': 25 },
            monthlyTotals: { '2024-01': 25 },
            heatmap: { 9: 25 },
            sessionLengthDistribution: { short: 1, medium: 0, long: 0 },
            consistencyScore: 0.8,
            topStudyDays: [{ date: '2024-01-16', duration: 25 }]
        }
    },
    // Session updated (duration changed)
    {
        id: 'session-003',
        timestamp: new Date('2024-01-16T10:00:00Z').getTime(),
        type: 'study_session_created',
        data: {
            subject: 'Chemistry',
            duration: 60,
            startTime: new Date('2024-01-16T10:00:00Z').getTime(),
            endTime: new Date('2024-01-16T11:00:00Z').getTime(),
            sessionId: 'updated-session-001',
            rating: 5,
            tags: ['organic']
        },
        expectedMetrics: {
            totalDuration: 60,
            totalSessions: 1,
            averageSessionLength: 60,
            subjectBreakdown: { 'Chemistry': 60 },
            dailyTotals: { '2024-01-16': 60 },
            weeklyTotals: { '2024-W03': 60 },
            monthlyTotals: { '2024-01': 60 },
            heatmap: { 10: 60 },
            sessionLengthDistribution: { short: 0, medium: 1, long: 0 },
            consistencyScore: 0.9,
            topStudyDays: [{ date: '2024-01-16', duration: 60 }]
        }
    },
    {
        id: 'session-004',
        timestamp: new Date('2024-01-16T11:30:00Z').getTime(),
        type: 'study_session_updated',
        data: {
            subject: 'Chemistry',
            duration: 90, // Updated from 60 to 90
            startTime: new Date('2024-01-16T10:00:00Z').getTime(),
            endTime: new Date('2024-01-16T11:30:00Z').getTime(),
            sessionId: 'updated-session-001',
            rating: 4,
            tags: ['organic', 'lab']
        },
        expectedMetrics: {
            totalDuration: 90,
            totalSessions: 1,
            averageSessionLength: 90,
            subjectBreakdown: { 'Chemistry': 90 },
            dailyTotals: { '2024-01-16': 90 },
            weeklyTotals: { '2024-W03': 90 },
            monthlyTotals: { '2024-01': 90 },
            heatmap: { 10: 90, 11: 30 },
            sessionLengthDistribution: { short: 0, medium: 1, long: 0 },
            consistencyScore: 0.95,
            topStudyDays: [{ date: '2024-01-16', duration: 90 }]
        }
    },
    // Long study session
    {
        id: 'session-005',
        timestamp: new Date('2024-01-17T14:00:00Z').getTime(),
        type: 'study_session_created',
        data: {
            subject: 'Computer Science',
            duration: 180,
            startTime: new Date('2024-01-17T14:00:00Z').getTime(),
            endTime: new Date('2024-01-17T17:00:00Z').getTime(),
            sessionId: 'long-session-001',
            notes: 'Algorithm design marathon',
            rating: 5,
            tags: ['algorithms', 'programming']
        },
        expectedMetrics: {
            totalDuration: 180,
            totalSessions: 1,
            averageSessionLength: 180,
            subjectBreakdown: { 'Computer Science': 180 },
            dailyTotals: { '2024-01-17': 180 },
            weeklyTotals: { '2024-W03': 180 },
            monthlyTotals: { '2024-01': 180 },
            heatmap: { 14: 180, 15: 180, 16: 180 },
            sessionLengthDistribution: { short: 0, medium: 0, long: 1 },
            consistencyScore: 1.0,
            topStudyDays: [{ date: '2024-01-17', duration: 180 }]
        }
    },
    // Task-related study session
    {
        id: 'session-006',
        timestamp: new Date('2024-01-18T16:00:00Z').getTime(),
        type: 'study_session_created',
        data: {
            subject: 'Biology',
            duration: 45,
            startTime: new Date('2024-01-18T16:00:00Z').getTime(),
            endTime: new Date('2024-01-18T16:45:00Z').getTime(),
            sessionId: 'task-related-001',
            rating: 3,
            tags: ['cells', 'homework']
        },
        expectedMetrics: {
            totalDuration: 45,
            totalSessions: 1,
            averageSessionLength: 45,
            subjectBreakdown: { 'Biology': 45 },
            dailyTotals: { '2024-01-18': 45 },
            weeklyTotals: { '2024-W03': 45 },
            monthlyTotals: { '2024-01': 45 },
            heatmap: { 16: 45 },
            sessionLengthDistribution: { short: 1, medium: 0, long: 0 },
            consistencyScore: 0.85,
            topStudyDays: [{ date: '2024-01-18', duration: 45 }]
        }
    },
    // Badge earned during session
    {
        id: 'badge-001',
        timestamp: new Date('2024-01-18T16:30:00Z').getTime(),
        type: 'badge_earned',
        data: {
            badgeId: 'consistent_studier_7',
            badgeName: 'Consistent Studier (7 days)',
            criteria: 'Study for 7 consecutive days',
            earnedAt: new Date('2024-01-18T16:30:00Z').getTime(),
            sessionId: 'task-related-001'
        },
        expectedMetrics: {
            totalDuration: 0,
            totalSessions: 0,
            averageSessionLength: 0,
            subjectBreakdown: {},
            dailyTotals: {},
            weeklyTotals: {},
            monthlyTotals: {},
            heatmap: {},
            sessionLengthDistribution: { short: 0, medium: 0, long: 0 },
            consistencyScore: 1.0,
            topStudyDays: []
        }
    }
];
// Combined expected metrics for all records
exports.COMBINED_EXPECTED_METRICS = {
    totalDuration: 520, // 120 + 25 + 90 + 180 + 45
    totalSessions: 5, // 5 study sessions (badge doesn't count)
    averageSessionLength: 104, // 520 / 5
    subjectBreakdown: {
        'Mathematics': 120,
        'Physics': 25,
        'Chemistry': 90,
        'Computer Science': 180,
        'Biology': 45
    },
    dailyTotals: {
        '2024-01-15': 30,
        '2024-01-16': 175, // 90 + 25 + 60
        '2024-01-17': 180,
        '2024-01-18': 45
    },
    weeklyTotals: {
        '2024-W03': 520
    },
    monthlyTotals: {
        '2024-01': 520
    },
    heatmap: {
        0: 90, // 12 AM
        1: 30, // 1 AM
        9: 25, // 9 AM
        10: 90, // 10 AM
        11: 30, // 11 AM
        14: 180, // 2 PM
        15: 180, // 3 PM
        16: 180, // 4 PM
        23: 30 // 11 PM
    },
    sessionLengthDistribution: {
        short: 2, // Physics (25), Biology (45)
        medium: 2, // Chemistry (90), Mathematics (120)
        long: 1 // Computer Science (180)
    },
    consistencyScore: 0.85, // Weighted average
    topStudyDays: [
        { date: '2024-01-17', duration: 180 },
        { date: '2024-01-16', duration: 175 },
        { date: '2024-01-15', duration: 120 },
        { date: '2024-01-18', duration: 45 }
    ]
};
// Validation functions
function validateGoldenDataset() {
    // Check that all records have valid timestamps and data
    for (const record of exports.GOLDEN_DATASET) {
        if (!record.id || !record.timestamp || !record.type) {
            return false;
        }
        if (!record.data || !record.expectedMetrics) {
            return false;
        }
        // Validate study session data
        if (record.type.startsWith('study_session')) {
            const session = record.data;
            if (!session.subject || !session.duration || !session.startTime || !session.endTime) {
                return false;
            }
            if (session.duration <= 0 || session.endTime <= session.startTime) {
                return false;
            }
        }
    }
    return true;
}
function calculateExpectedMetrics(records) {
    // Filter out badge records for duration calculations
    const sessionRecords = records.filter(r => r.type.startsWith('study_session'));
    const totalDuration = sessionRecords.reduce((sum, r) => sum + r.data.duration, 0);
    const totalSessions = sessionRecords.length;
    const averageSessionLength = totalSessions > 0 ? totalDuration / totalSessions : 0;
    // Calculate subject breakdown
    const subjectBreakdown = {};
    sessionRecords.forEach(r => {
        const subject = r.data.subject;
        subjectBreakdown[subject] = (subjectBreakdown[subject] || 0) + r.data.duration;
    });
    // Calculate daily totals
    const dailyTotals = {};
    sessionRecords.forEach(r => {
        const date = new Date(r.data.startTime).toISOString().split('T')[0];
        dailyTotals[date] = (dailyTotals[date] || 0) + r.data.duration;
    });
    // Calculate weekly totals
    const weeklyTotals = {};
    Object.entries(dailyTotals).forEach(([date, duration]) => {
        const week = getWeekNumber(new Date(date));
        weeklyTotals[week] = (weeklyTotals[week] || 0) + duration;
    });
    // Calculate monthly totals
    const monthlyTotals = {};
    Object.entries(dailyTotals).forEach(([date, duration]) => {
        const month = date.substring(0, 7); // YYYY-MM
        monthlyTotals[month] = (monthlyTotals[month] || 0) + duration;
    });
    // Calculate heatmap
    const heatmap = {};
    sessionRecords.forEach(r => {
        const startHour = new Date(r.data.startTime).getHours();
        const endHour = new Date(r.data.endTime).getHours();
        // Distribute duration across hours
        for (let hour = startHour; hour <= endHour; hour++) {
            const hourKey = hour % 24;
            heatmap[hourKey] = (heatmap[hourKey] || 0) + r.data.duration;
        }
    });
    // Calculate session length distribution
    const sessionLengthDistribution = {
        short: sessionRecords.filter(r => r.data.duration < 30).length,
        medium: sessionRecords.filter(r => r.data.duration >= 30 && r.data.duration <= 120).length,
        long: sessionRecords.filter(r => r.data.duration > 120).length
    };
    // Calculate consistency score (simplified)
    const consistencyScore = sessionRecords.length > 0
        ? Math.min(1.0, sessionRecords.filter(r => r.data.rating >= 4).length / sessionRecords.length)
        : 0;
    // Get top study days
    const topStudyDays = Object.entries(dailyTotals)
        .map(([date, duration]) => ({ date, duration }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);
    return {
        totalDuration,
        totalSessions,
        averageSessionLength,
        subjectBreakdown,
        dailyTotals,
        weeklyTotals,
        monthlyTotals,
        heatmap,
        sessionLengthDistribution,
        consistencyScore,
        topStudyDays
    };
}
function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dayOfYear = getDayOfYear(d);
    const week = Math.ceil(dayOfYear / 7);
    const year = d.getFullYear();
    return `${year}-W${week.toString().padStart(2, '0')}`;
}
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}
// Invariant validation functions
function validateInvariants(metrics) {
    const errors = [];
    // Total duration should equal sum of subject breakdown
    const subjectTotal = Object.values(metrics.subjectBreakdown).reduce((sum, val) => sum + val, 0);
    if (Math.abs(subjectTotal - metrics.totalDuration) > 0.01) {
        errors.push(`Subject breakdown total (${subjectTotal}) doesn't match total duration (${metrics.totalDuration})`);
    }
    // Daily totals should equal total duration
    const dailyTotal = Object.values(metrics.dailyTotals).reduce((sum, val) => sum + val, 0);
    if (Math.abs(dailyTotal - metrics.totalDuration) > 0.01) {
        errors.push(`Daily totals sum (${dailyTotal}) doesn't match total duration (${metrics.totalDuration})`);
    }
    // Weekly totals should equal total duration
    const weeklyTotal = Object.values(metrics.weeklyTotals).reduce((sum, val) => sum + val, 0);
    if (Math.abs(weeklyTotal - metrics.totalDuration) > 0.01) {
        errors.push(`Weekly totals sum (${weeklyTotal}) doesn't match total duration (${metrics.totalDuration})`);
    }
    // Monthly totals should equal total duration
    const monthlyTotal = Object.values(metrics.monthlyTotals).reduce((sum, val) => sum + val, 0);
    if (Math.abs(monthlyTotal - metrics.totalDuration) > 0.01) {
        errors.push(`Monthly totals sum (${monthlyTotal}) doesn't match total duration (${metrics.totalDuration})`);
    }
    // Session distribution should equal total sessions
    const distributionTotal = metrics.sessionLengthDistribution.short +
        metrics.sessionLengthDistribution.medium +
        metrics.sessionLengthDistribution.long;
    if (distributionTotal !== metrics.totalSessions) {
        errors.push(`Session distribution (${distributionTotal}) doesn't match total sessions (${metrics.totalSessions})`);
    }
    // Average session length should be realistic
    if (metrics.totalSessions > 0 && metrics.averageSessionLength <= 0) {
        errors.push(`Average session length (${metrics.averageSessionLength}) should be positive`);
    }
    // Consistency score should be between 0 and 1
    if (metrics.consistencyScore < 0 || metrics.consistencyScore > 1) {
        errors.push(`Consistency score (${metrics.consistencyScore}) should be between 0 and 1`);
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
