import test from 'node:test';
import assert from 'node:assert/strict';
import {
    countAbsences,
    formatDateKey,
    getDayClass,
    normaliseRecord,
    todayKey,
    upcomingEventDates
} from '../app-logic.js';

test('formatDateKey converte AAAA-MM-DD para DD/MM/AAAA', () => {
    assert.equal(formatDateKey('2026-10-09'), '09/10/2026');
});

test('todayKey usa data local recebida', () => {
    assert.equal(todayKey(new Date(2026, 9, 9, 8, 30)), '2026-10-09');
});

test('countAbsences conta apenas ausências da matéria', () => {
    const data = {
        '2026-10-01': { SE620: 'absent' },
        '2026-10-02': { SE620: 'present' },
        '2026-10-03': { SE620: 'absent', SE621A: 'absent' }
    };
    assert.equal(countAbsences(data, 'SE620'), 2);
    assert.equal(countAbsences(data, 'SE621A'), 1);
});

test('getDayClass representa combinações de status', () => {
    assert.equal(getDayClass({ a: 'present' }), 'is-present');
    assert.equal(getDayClass({ a: 'absent' }), 'is-absent');
    assert.equal(getDayClass({ a: 'cancelled' }), 'is-cancelled');
    assert.equal(getDayClass({ a: 'present', b: 'absent' }), 'mix-present-absent');
    assert.equal(getDayClass({ a: 'present', b: 'cancelled' }), 'mix-present-cancelled');
    assert.equal(getDayClass({ a: 'absent', b: 'cancelled' }), 'mix-absent-cancelled');
    assert.equal(getDayClass({ a: 'present', b: 'absent', c: 'cancelled' }), 'mix-all');
});

test('upcomingEventDates ignora datas antigas e dias vazios', () => {
    const events = {
        '2026-10-08': { a: { type: 'prova' } },
        '2026-10-09': {},
        '2026-10-10': { b: { type: 'trabalho' } },
        '2026-11-01': { c: { type: 'prova' } }
    };
    assert.deepEqual(upcomingEventDates(events, '2026-10-09'), ['2026-10-10', '2026-11-01']);
});

test('normaliseRecord protege contra dados inesperados', () => {
    assert.deepEqual(normaliseRecord(null), {});
    assert.deepEqual(normaliseRecord([]), {});
    assert.deepEqual(normaliseRecord({ ok: true }), { ok: true });
});
