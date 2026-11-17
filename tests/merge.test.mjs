import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './load.mjs';

const load = loadScripts(['merge.js']);
const plain = (v) => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);
const merge = (b, m, t) => plain(load('mergeThreeWay')(b, m, t));

test('この端末で何も変えていなければ、クラウドの内容をそのまま採る', () => {
  const base = { '2026-11-16-1': { subject: '国語' } };
  const theirs = { '2026-11-16-1': { subject: '国語' }, '2026-11-17-2': { subject: '社会' } };
  assert.deepEqual(merge(base, base, theirs), theirs);
});

test('他の端末で変えていなければ、この端末の内容を採る', () => {
  const base = [{ id: 1, text: 'a' }];
  const mine = [{ id: 1, text: 'a' }, { id: 2, text: 'b' }];
  assert.deepEqual(merge(base, mine, base), mine);
});

test('別々の日に入れた予定は両方残る', () => {
  const base = { '2026': { '11-1': ['運動会'] } };
  const mine = { '2026': { '11-1': ['運動会'], '11-20': ['研究授業'] } };
  const theirs = { '2026': { '11-1': ['運動会'], '11-25': ['職員会議'] } };
  assert.deepEqual(merge(base, mine, theirs), { '2026': { '11-1': ['運動会'], '11-20': ['研究授業'], '11-25': ['職員会議'] } });
});

test('ToDo は項目ごとに突き合わせる（追加・削除・完了をそれぞれ活かす）', () => {
  const base = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }];
  const mine = [{ id: 'a', text: 'A', completed: true }, { id: 'c', text: 'C' }, { id: 'm', text: 'iPadで追加' }]; // b を削除、a を完了
  const theirs = [{ id: 'x', text: 'Chromebookで追加' }, { id: 'a', text: 'A' }, { id: 'b', text: 'B' }]; // c を削除
  assert.deepEqual(merge(base, mine, theirs), [
    { id: 'x', text: 'Chromebookで追加' }, { id: 'a', text: 'A', completed: true }, { id: 'm', text: 'iPadで追加' },
  ]);
});

test('片方で消した項目でも、もう片方で編集していれば残す', () => {
  const base = [{ id: 1, text: 'old' }];
  assert.deepEqual(merge(base, [], [{ id: 1, text: 'new' }]), [{ id: 1, text: 'new' }]);
  assert.deepEqual(merge(base, [{ id: 1, text: 'mine' }], []), [{ id: 1, text: 'mine' }]);
});

test('同じ所を両方で変えたときは、この端末の内容を採る', () => {
  assert.deepEqual(merge({ s: '国語' }, { s: '数学' }, { s: '理科' }), { s: '数学' });
});

test('他の端末で消したキーは、この端末で変えていなければ消す', () => {
  assert.deepEqual(merge({ a: 1, b: 2 }, { a: 1, b: 2 }, { a: 1 }), { a: 1 });
  assert.deepEqual(merge({ a: 1, b: 2 }, { a: 1, b: 3 }, { a: 1 }), { a: 1, b: 3 });
});

test('クラウドにまだ無いときは、この端末の内容を採る', () => {
  assert.deepEqual(merge(undefined, [{ id: 1 }], undefined), [{ id: 1 }]);
});

const patch = (b, n) => plain(load('mergeSavePatch')(b, n));

test('保存するときは、この端末で変えた予定だけを送る（他の端末の予定を古い内容で上書きしない）', () => {
  // クラウドにはiPadで入れた 11-18 の予定がある。この端末はまだそれを受け取っておらず、11-17 だけを編集した
  const base = { yearlyData: { 2026: { '11-17': '', '11-18': '' } }, documents: [], vacations: [] };
  const next = { yearlyData: { 2026: { '11-17': '研究授業', '11-18': '' } }, documents: [], vacations: [] };
  assert.deepEqual(patch(base, next), { yearlyData: { 2026: { '11-17': '研究授業' } } });
});

test('クラウドの内容をまだ知らないときは、すべて送る', () => {
  const next = { todos: [{ id: 1 }] };
  assert.deepEqual(patch(null, next), next);
});

test('配列や中身の変わった項目はまるごと送り、空の {} もそのまま送る', () => {
  const base = { todos: [{ id: 1, text: 'a' }], w: { a: { subject: '国語', memo: 'x' } }, s: { k: { x: 1 } } };
  const next = { todos: [{ id: 1, text: 'b' }], w: { a: { subject: '数学', memo: 'x' } }, s: { k: {} } };
  assert.deepEqual(patch(base, next), { todos: [{ id: 1, text: 'b' }], w: { a: { subject: '数学' } }, s: { k: {} } });
});

test('送った差分を手元のクラウドの内容に当てはめる', () => {
  const base = { yearlyData: { 2026: { '11-17': '', '11-18': '遠足' } }, documents: [] };
  const out = plain(load('mergeApplyPatch')(base, { yearlyData: { 2026: { '11-17': '研究授業' } } }));
  assert.deepEqual(out, { yearlyData: { 2026: { '11-17': '研究授業', '11-18': '遠足' } }, documents: [] });
});

test('時間のかかる同期の結果は、書き換えた所だけを最新のデータに当てはめる', () => {
  const carry = (c, f, t, d) => plain(load('mergeCarryEdits')(c, f, t, d));
  // 同期を始めた時点のデータ
  const from = { 2026: { '11-17': '', '11-18': '' } };
  // 同期が 11-17 に書き戻した
  const to = { 2026: { '11-17': 'Googleで直した', '11-18': '' }, 2027: { '4-6': '始業式' } };
  // 同期中にiPadから 11-18 の予定が届いていた
  const cur = { 2026: { '11-17': '', '11-18': 'iPadで入れた' }, 2027: { '4-7': '入学式' } };
  assert.deepEqual(carry(cur, from, to, 2), { 2026: { '11-17': 'Googleで直した', '11-18': 'iPadで入れた' }, 2027: { '4-6': '始業式', '4-7': '入学式' } });
  // 1段のとき：週案のコマ単位
  assert.deepEqual(carry({ a: 1, b: 2, c: 3 }, { a: 1, c: 3 }, { a: 9 }, 1), { a: 9, b: 2 });
});
