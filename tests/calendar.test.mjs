import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './load.mjs';

const load = loadScripts(['calendar.js']);
// vm の中で作られた配列・オブジェクトはプロトタイプが別物なので、比べる前に素の値へ直す
const plain = (v) => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);
const get = (name) => { const f = load(name); return typeof f === 'function' ? (...a) => { const r = f(...a); return r && typeof r === 'object' && typeof r.getTime !== 'function' ? plain(r) : r; } : f; };
const getHolidayName = get('getHolidayName');
const holidaysOf = (y) => Object.entries(get('buildYearHolidays')(y)).map(([k, v]) => `${k} ${v}`).sort();

// 内閣府「国民の祝日」の一覧と照合する
test('2025年の祝日', () => {
  assert.deepEqual(holidaysOf(2025), [
    '1-1 元日', '1-13 成人の日', '10-13 スポーツの日', '11-23 勤労感謝の日', '11-24 振替休日', '11-3 文化の日',
    '2-11 建国記念の日', '2-23 天皇誕生日', '2-24 振替休日', '3-20 春分の日', '4-29 昭和の日',
    '5-3 憲法記念日', '5-4 みどりの日', '5-5 こどもの日', '5-6 振替休日', '7-21 海の日',
    '8-11 山の日', '9-15 敬老の日', '9-23 秋分の日',
  ].sort());
});

test('2026年の祝日（国民の休日と、連休明けへの振替を含む）', () => {
  assert.deepEqual(holidaysOf(2026), [
    '1-1 元日', '1-12 成人の日', '10-12 スポーツの日', '11-23 勤労感謝の日', '11-3 文化の日',
    '2-11 建国記念の日', '2-23 天皇誕生日', '3-20 春分の日', '4-29 昭和の日',
    '5-3 憲法記念日', '5-4 みどりの日', '5-5 こどもの日', '5-6 振替休日', '7-20 海の日',
    '8-11 山の日', '9-21 敬老の日', '9-22 国民の休日', '9-23 秋分の日',
  ].sort());
});

test('春分・秋分（国立天文台の発表値）', () => {
  const eq = get('getEquinoxDate');
  const cases = { 2024: [20, 22], 2025: [20, 23], 2026: [20, 23], 2027: [21, 23], 2028: [20, 22], 2030: [20, 23] };
  for (const [y, [spring, autumn]] of Object.entries(cases)) {
    assert.equal(eq(Number(y), true), spring, `${y} 春分`);
    assert.equal(eq(Number(y), false), autumn, `${y} 秋分`);
  }
  assert.equal(getHolidayName(2027, 3, 22), '🎌 振替休日');
});

test('getHolidayName は祝日でない日に null', () => {
  assert.equal(getHolidayName(2026, 10, 27), null);
  assert.equal(getHolidayName(2026, 1, 1), '🎌 元日');
});

test('年度は4月始まり', () => {
  const sy = get('getSchoolYearOf');
  assert.equal(sy('2026-03-31'), 2025);
  assert.equal(sy('2026-04-01'), 2026);
  assert.equal(sy('2027-01-15'), 2026);
});

test('getMonday / formatDate', () => {
  const monday = (y, m, d) => get('formatDate')(get('getMonday')(new Date(y, m - 1, d)));
  assert.equal(monday(2026, 10, 27), '2026-10-26');
  assert.equal(monday(2026, 11, 1), '2026-10-26');
  assert.equal(monday(2026, 10, 26), '2026-10-26');
  assert.equal(monday(2027, 1, 3), '2026-12-28');
});

test('長期休業中は平日が出勤、土日祝が休日', () => {
  const v = get('getVacationDaySetting');
  const vacs = [{ start: '2026-07-23', end: '2026-08-26' }];
  assert.deepEqual(v('2026-07-24', 4, vacs), { type: 'work' });
  assert.deepEqual(v('2026-07-25', 5, vacs), { type: 'holiday' });
  assert.deepEqual(v('2026-08-11', 1, vacs), { type: 'holiday' });
  assert.equal(v('2026-09-01', 1, vacs), null);
});

test('行事の年度送り: 同じ曜日へ', () => {
  const { events, onHoliday } = get('shiftYearlyEvents')({ '4-8': '始業式', '3-18': '修了式' }, 2025, 2026, 'weekday');
  assert.equal(events['4-7'], '始業式');
  assert.equal(events['3-17'], '修了式');
  assert.deepEqual(onHoliday, []);
});

test('行事の年度送り: 4/1より前にはみ出す日は1週あとへ', () => {
  const { events } = get('shiftYearlyEvents')({ '4-1': '着任式' }, 2025, 2026, 'weekday');
  // 2025-04-01 +364日 = 2026-03-31（前年度）→ 1週あとの 2026-04-07
  assert.equal(events['4-7'], '着任式');
});

test('行事の年度送り: 同じ日付へ（存在しない日は落とし、祝日は知らせる）', () => {
  const { events, dropped, onHoliday } = get('shiftYearlyEvents')({ '2-29': 'A', '5-4': 'B', '6-1': 'C' }, 2023, 2024, 'date');
  assert.deepEqual(dropped, ['2/29']);
  assert.equal(events['5-4'], 'B');
  assert.equal(events['6-1'], 'C');
  assert.deepEqual(onHoliday, ['5/4（みどりの日）B']);
});

test('shiftDateByYear は存在しない日を月末に寄せる', () => {
  const s = get('shiftDateByYear');
  assert.equal(s('2024-02-29', 1), '2025-02-28');
  assert.equal(s('2026-07-23', 1), '2027-07-23');
});
