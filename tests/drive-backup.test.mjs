// gas/drive-backup/Code.js（Google Apps Script）のうち、Google のサービスを使わない部分のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL('../gas/drive-backup/Code.js', import.meta.url), 'utf8'), ctx, { filename: 'Code.js' });
const get = (name) => vm.runInContext(name, ctx);
// vm の中で作られた配列・オブジェクトはプロトタイプが違うので、比べる前に JSON で通常の値にする
const plain = (v) => JSON.parse(JSON.stringify(v));

test('Firestore の値をふつうの JSON に戻す', () => {
  const decodeFields_ = get('decodeFields_');
  const out = decodeFields_({
    s: { stringValue: 'あ' },
    i: { integerValue: '42' },
    d: { doubleValue: 1.5 },
    b: { booleanValue: false },
    n: { nullValue: null },
    t: { timestampValue: '2026-11-05T00:00:00Z' },
    a: { arrayValue: { values: [{ integerValue: '1' }, { mapValue: { fields: { x: { stringValue: 'y' } } } }] } },
    ea: { arrayValue: {} },
    m: { mapValue: { fields: { inner: { arrayValue: { values: [{ booleanValue: true }] } } } } },
    em: { mapValue: {} },
  });
  assert.deepEqual(plain(out), {
    s: 'あ', i: 42, d: 1.5, b: false, n: null, t: '2026-11-05T00:00:00Z',
    a: [1, { x: 'y' }], ea: [], m: { inner: [true] }, em: {},
  });
});

test('アプリの書き出しと同じ形にまとめる（移行済みなら旧 weekly は使わない）', () => {
  const buildBackup_ = get('buildBackup_');
  const docs = {
    template: { baseTemplate: { a: 1 }, templateSettings: { b: 2 } },
    weekly: { weeklyData: { '2024-04-08-1': { text: '旧' } }, weeklySettings: {} },
    weeklyIndex: { migrated: true, years: ['2025', '2024'] },
    weekly_2024: { weeklyData: { '2024-04-08-1': { text: '24' }, k: { text: '24only' } }, weeklySettings: { '2024-04-08': { s: 1 } } },
    weekly_2025: { weeklyData: { k: { text: '25' } } },
    todos: { todos: [{ id: 't' }] },
    notes: { notes: [{ id: 'n' }] },
    syllabus: { syllabus: [{ id: 's' }] },
    quickMemos: { memos: [{ id: 'q' }] },
    extra: { yearlyData: { 2025: {} }, documents: [], vacations: [{ id: 'v' }], googleCalSettings: { connected: true } },
  };
  const out = plain(buildBackup_(docs, { uid: 'u1', savedAt: 'X' }));
  assert.deepEqual(out.weeklyData, { '2024-04-08-1': { text: '24' }, k: { text: '25' } });
  assert.deepEqual(out.weeklySettings, { '2024-04-08': { s: 1 } });
  assert.deepEqual(out.baseTemplate, { a: 1 });
  assert.deepEqual(out.templateSettings, { b: 2 });
  assert.deepEqual(out.todos, [{ id: 't' }]);
  assert.deepEqual(out.notesData, [{ id: 'n' }]);
  assert.deepEqual(out.syllabusData, [{ id: 's' }]);
  assert.deepEqual(out.quickMemos, [{ id: 'q' }]);
  assert.deepEqual(out.vacations, [{ id: 'v' }]);
  assert.deepEqual(out.yearlyData, { 2025: {} });
  assert.deepEqual(out._backup, { app: 'EduPlanner', by: 'Google Apps Script', savedAt: 'X', uid: 'u1' });
  assert.deepEqual(out._firestore.extra.googleCalSettings, { connected: true });
});

test('移行前は旧 weekly を土台にして年度ぶんを重ねる', () => {
  const buildBackup_ = get('buildBackup_');
  const out = plain(buildBackup_({
    weekly: { weeklyData: { a: 1, b: 1 }, weeklySettings: { w: 1 } },
    weeklyIndex: { migrated: false, years: ['2024'] },
    weekly_2024: { weeklyData: { b: 2 } },
  }, { uid: 'u', savedAt: 'X' }));
  assert.deepEqual(out.weeklyData, { a: 1, b: 2 });
  assert.deepEqual(out.weeklySettings, { w: 1 });
  // 無いドキュメントの項目は書き出さない（JSON にすると消える）
  assert.equal('todos' in out, false);
});

test('古いファイルの整理: 30日以内と各月の最初の1つを残す', () => {
  const pick = get('pickDatesToDelete_');
  const dates = [];
  for (let d = new Date(Date.UTC(2026, 8, 1)); d <= new Date(Date.UTC(2026, 10, 5)); d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  const del = plain(pick(dates, '2026-11-05', 30));
  // 9/1・10/1 は月ごとの控え、10/7〜11/5 は30日以内で残る
  assert.equal(del.includes('2026-09-01'), false);
  assert.equal(del.includes('2026-10-01'), false);
  assert.equal(del.includes('2026-10-06'), true);
  assert.equal(del.includes('2026-10-07'), false);
  assert.equal(del.includes('2026-09-02'), true);
  assert.equal(del.length, 29 + 5); // 9/2〜9/30 と 10/2〜10/6（10/6 は今日からちょうど30日前なので消す）
  const kept = dates.filter(d => !del.includes(d));
  assert.equal(kept.length, 2 + 30);
});

test('古いファイルの整理: 1日が無い月はその月の最初のファイルを残す', () => {
  const pick = get('pickDatesToDelete_');
  const del = plain(pick(['2026-08-03', '2026-08-04', '2026-11-05'], '2026-11-05', 30));
  assert.deepEqual(del, ['2026-08-04']);
});
