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
    return Object.values(normaliseRecord(statusData))
        .filter(day => normaliseRecord(day)[subjectId] === 'absent')
        .length;
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
