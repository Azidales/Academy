import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = ['../styles.css', '../styles/base.css', '../styles/calendar.css', '../styles/components.css', '../styles/responsive.css']
    .map(path => readFileSync(new URL(path, import.meta.url), 'utf8'))
    .join('\n');

const requiredIds = [
    'calendarDays', 'monthDisplay', 'summary-container', 'agenda-container',
    'dayDetails', 'dayBody', 'dayForm', 'evtToggle', 'evtFields',
    'evtTypeProva', 'evtTypeTrabalho', 'evtSubject', 'evtDesc', 'evtAdd',
    'semesterStats', 'syncStatusText', 'syncStatusTime', 'todayBtn'
];

test('IDs essenciais existem uma única vez no HTML', () => {
    for (const id of requiredIds) {
        const matches = html.match(new RegExp(`id=["']${id}["']`, 'g')) ?? [];
        assert.equal(matches.length, 1, `${id} deveria existir exatamente uma vez`);
    }
});

test('HTML referencia os arquivos principais', () => {
    assert.match(html, /href="\.\/styles\.css"/);
    assert.match(html, /src="\.\/app\.js"/);
});

test('front-end não depende mais do Tailwind CDN', () => {
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
});

test('handlers usados no HTML estão expostos no app', () => {
    for (const handler of ['switchTab', 'changeMonth', 'goToday', 'showDay', 'setStatus', 'toggleEvtForm', 'setEvtType', 'addEvent', 'delEvent']) {
        assert.match(app, new RegExp(`window\\.${handler}\\s*=`));
    }
});

test('breakpoints principais de desktop e mobile existem', () => {
    assert.match(css, /@media \(min-width: 768px\)/);
    assert.match(css, /@media \(max-width: 767px\)/);
    assert.match(css, /\.mobile-nav/);
    assert.match(css, /\.dashboard-layout/);
});
