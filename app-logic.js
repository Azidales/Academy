export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

export function todayKey(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatDateKey(dateKey) {
    return String(dateKey).split('-').reverse().join('/');
}

export function normaliseRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function countAbsences(statusData, subjectId) {
    return subjectAttendanceStats(statusData, subjectId).absent;
}

export function subjectAttendanceStats(statusData, subjectId) {
    const totals = { present: 0, absent: 0, cancelled: 0, recorded: 0, rate: null };

    for (const day of Object.values(normaliseRecord(statusData))) {
        const status = normaliseRecord(day)[subjectId];
        if (status === 'present') totals.present += 1;
        if (status === 'absent') totals.absent += 1;
        if (status === 'cancelled') totals.cancelled += 1;
    }

    totals.recorded = totals.present + totals.absent;
    totals.rate = totals.recorded > 0 ? Math.round((totals.present / totals.recorded) * 100) : null;
    return totals;
}

export function aggregateAttendanceStats(statusData) {
    const totals = { present: 0, absent: 0, cancelled: 0, recorded: 0, rate: null };

    for (const day of Object.values(normaliseRecord(statusData))) {
        for (const status of Object.values(normaliseRecord(day))) {
            if (status === 'present') totals.present += 1;
            if (status === 'absent') totals.absent += 1;
            if (status === 'cancelled') totals.cancelled += 1;
        }
    }

    totals.recorded = totals.present + totals.absent;
    totals.rate = totals.recorded > 0 ? Math.round((totals.present / totals.recorded) * 100) : null;
    return totals;
}

export function countEvents(eventsData) {
    return Object.values(normaliseRecord(eventsData))
        .reduce((total, day) => total + Object.keys(normaliseRecord(day)).length, 0);
}

export function getDayClass(statuses = {}) {
    const vals = Object.values(normaliseRecord(statuses));
    const hasPresent = vals.includes('present');
    const hasAbsent = vals.includes('absent');
    const hasCancelled = vals.includes('cancelled');

    if (hasPresent && hasAbsent && hasCancelled) return 'mix-all';
    if (hasPresent && hasAbsent) return 'mix-present-absent';
    if (hasPresent && hasCancelled) return 'mix-present-cancelled';
    if (hasAbsent && hasCancelled) return 'mix-absent-cancelled';
    if (hasPresent) return 'is-present';
    if (hasAbsent) return 'is-absent';
    if (hasCancelled) return 'is-cancelled';
    return '';
}

export function upcomingEventDates(eventsData, fromKey = todayKey()) {
    return Object.keys(normaliseRecord(eventsData))
        .filter(dateKey => {
            const events = normaliseRecord(eventsData[dateKey]);
            return dateKey >= fromKey && Object.keys(events).length > 0;
        })
        .sort();
}
