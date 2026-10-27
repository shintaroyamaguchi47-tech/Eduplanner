import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { loadScripts } from './load.mjs';

const { window } = new JSDOM('');
const get = loadScripts(['sanitize.js'], { DOMParser: window.DOMParser });
const sanitizeHtml = get('sanitizeHtml');

test('書式・改行・添付画像は残す', () => {
  const img = '<img src="data:image/jpeg;base64,AAAA" alt="添付画像" style="max-width:100%; border-radius:8px;">';
  const html = `<div><b>太字</b><br><span style="color: rgb(220, 38, 38);">赤</span><font color="#2563eb">青</font></div><ul><li>項目</li></ul>${img}`;
  assert.equal(sanitizeHtml(html), html);
});

test('イベント属性とスクリプトを取り除く', () => {
  assert.equal(sanitizeHtml('<img src="x" onerror="alert(1)">'), '');
  assert.equal(sanitizeHtml('<img src="data:image/png;base64,AA" onerror="alert(1)">'), '<img src="data:image/png;base64,AA">');
  assert.equal(sanitizeHtml('a<script>alert(1)</script>b'), 'ab');
  assert.equal(sanitizeHtml('<div onclick="x()" onmouseover="y()">t</div>'), '<div>t</div>');
  assert.equal(sanitizeHtml('<iframe src="https://example.com"></iframe>ok'), 'ok');
  assert.equal(sanitizeHtml('<svg><script>alert(1)</script></svg>ok'), 'ok');
  assert.equal(sanitizeHtml('<style>body{display:none}</style>ok'), 'ok');
});

test('危険な URL を取り除く', () => {
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), '<a target="_blank" rel="noopener noreferrer">x</a>');
  assert.equal(sanitizeHtml('<a href="https://example.com">x</a>'), '<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>');
  assert.equal(sanitizeHtml('<img src="javascript:alert(1)">'), '');
  assert.equal(sanitizeHtml('<img src="data:text/html;base64,AA">'), '');
  assert.equal(sanitizeHtml('<span style="background:url(javascript:alert(1))">x</span>'), '<span>x</span>');
});

test('知らない要素はタグだけ外して文字を残す', () => {
  assert.equal(sanitizeHtml('<custom-el data-x="1">中身</custom-el>'), '中身');
  assert.equal(sanitizeHtml('<details><summary>見出し</summary>本文</details>'), '見出し本文');
});

test('空や文字だけの入力', () => {
  assert.equal(sanitizeHtml(''), '');
  assert.equal(sanitizeHtml(null), '');
  assert.equal(sanitizeHtml('a &lt; b'), 'a &lt; b');
});

test('parseInertHtml は一覧のプレビュー用に文字と画像の有無を返す', () => {
  const body = get('parseInertHtml')('<p>メモ</p><img src="x" onerror="globalThis.hit=1">');
  assert.equal(body.textContent, 'メモ');
  assert.ok(body.querySelector('img'));
});
