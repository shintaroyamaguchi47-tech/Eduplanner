// 公開用ビルド: index.html（編集元）から dist/ を作る。
// ・ブラウザで毎回行っていた JSX 変換（Babel standalone）を事前に済ませる
// ・Tailwind CDN の代わりに、使っているクラスだけのCSSを作って同じサーバーから配る
// ・React / ReactDOM も unpkg ではなく同じサーバーから配る
// ・Firebase SDK（ログイン・保存）も www.gstatic.com ではなく同じサーバーから配る
// 学校のフィルタで CDN が止められても開けるようにし、起動も速くするため。
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import babel from '@babel/core';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const assets = join(dist, 'assets');

const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);
const replaceOnce = (src, from, to, label) => {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`${label}: 置換対象が ${n} 箇所見つかりました（1箇所のはず）`);
  return src.replace(from, () => to);
};

rmSync(dist, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });

let html = readFileSync(join(root, 'index.html'), 'utf8');

// 1) アプリ本体（<script type="text/babel"> の中身）を変換して外部ファイルにする
const open = '<script type="text/babel">';
const start = html.indexOf(open);
if (start < 0 || html.indexOf(open, start + 1) >= 0) throw new Error('<script type="text/babel"> がちょうど1つ必要です');
const end = html.indexOf('</script>', start);
const source = html.slice(start + open.length, end);
let { code } = babel.transformSync(source, {
  babelrc: false, configFile: false, sourceType: 'script',
  presets: [[require.resolve('@babel/preset-react'), { runtime: 'classic' }]],
  comments: false, compact: true,
});

// 1a) Firebase SDK を gstatic ではなく同じサーバーから配る。
//     npm の firebase パッケージに gstatic と同じ ES モジュール版が入っているので、それをコピーする。
//     auth / firestore は中で firebase-app.js を gstatic の URL で import しているため、そこも書き換える。
//     同じ URL で読み込まないと別モジュール扱いになりアプリが二重に作られるので、アプリ側もすべて置き換える
const fbUrls = [...new Set(source.match(/https:\/\/www\.gstatic\.com\/firebasejs\/[0-9.]+\/firebase-[a-z]+\.js/g) || [])];
if (!fbUrls.length) throw new Error('Firebase SDK の読み込み部分が見つかりません');
const fbPkg = JSON.parse(readFileSync(require.resolve('firebase/package.json'), 'utf8'));
const fbDir = dirname(require.resolve('firebase/package.json'));
const fbAppUrl = `https://www.gstatic.com/firebasejs/${fbPkg.version}/firebase-app.js`;
for (const u of fbUrls) {
  if (!u.includes(`/firebasejs/${fbPkg.version}/`)) throw new Error(`index.html の Firebase (${u}) と package.json の firebase@${fbPkg.version} の版がそろっていません`);
}
const stripMap = (s) => s.replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, '\n');
const fbAppSrc = stripMap(readFileSync(join(fbDir, 'firebase-app.js'), 'utf8'));
const fbAppName = `firebase-app.${hash(fbAppSrc)}.js`;
writeFileSync(join(assets, fbAppName), fbAppSrc);
const fbMap = { [fbAppUrl]: `/assets/${fbAppName}` };
for (const u of fbUrls) {
  const mod = u.match(/firebase-([a-z]+)\.js$/)[1];
  if (mod === 'app') continue;
  let src = stripMap(readFileSync(join(fbDir, `firebase-${mod}.js`), 'utf8'));
  src = src.split(fbAppUrl).join(`/assets/${fbAppName}`);
  if (/https:\/\/www\.gstatic\.com\/firebasejs\//.test(src)) throw new Error(`firebase-${mod}.js に gstatic への参照が残っています`);
  const name = `firebase-${mod}.${hash(src)}.js`;
  writeFileSync(join(assets, name), src);
  fbMap[u] = `/assets/${name}`;
}
for (const [from, to] of Object.entries(fbMap)) code = code.split(from).join(to);
if (/www\.gstatic\.com\/firebasejs\//.test(code.replace(/CONNECTION_TARGETS_ALL[\s\S]*?\];/, ''))) throw new Error('アプリ本体に gstatic の Firebase 参照が残っています');

const appName = `app.${hash(code)}.js`;
writeFileSync(join(assets, appName), code);
html = html.slice(0, start) + `<script src="/assets/${appName}"></script>` + html.slice(end + '</script>'.length);

// 1b) src/ の素の JS（JSX なし）はそのまま /assets/ にハッシュ付きで置く
for (const name of ['calendar', 'sanitize']) {
  const buf = readFileSync(join(root, 'src', `${name}.js`));
  const out = `${name}.${hash(buf)}.js`;
  writeFileSync(join(assets, out), buf);
  html = replaceOnce(html, `<script src="src/${name}.js"></script>`, `<script src="/assets/${out}"></script>`, `src/${name}.js`);
}

// 2) Tailwind: 使っているクラスだけのCSSを作る
const twIn = join(dist, '.tw-input.css');
const twOut = join(dist, '.tw-output.css');
writeFileSync(twIn, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
execFileSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-c', join(root, 'tailwind.config.cjs'), '-i', twIn, '-o', twOut, '--minify'], { cwd: root, stdio: 'inherit' });
const css = readFileSync(twOut);
rmSync(twIn); rmSync(twOut);
const cssName = `tailwind.${hash(css)}.css`;
writeFileSync(join(assets, cssName), css);
html = html.replace(/[ \t]*<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>\s*<script>\s*tailwind\.config = \{[\s\S]*?\}\s*<\/script>\n?/, (m) => {
  return `  <link rel="stylesheet" href="/assets/${cssName}">\n`;
});
if (!html.includes(`/assets/${cssName}`)) throw new Error('Tailwind CDN の読み込み部分が見つかりません');

// 3) React / ReactDOM を同じサーバーから配る。Babel standalone は不要になるので外す
const vendor = (pkgFile, url, label) => {
  // umd/ は package.json の exports に無いので、パッケージのフォルダから直接たどる
  const [pkg, ...rest] = pkgFile.split('/');
  const file = join(dirname(require.resolve(`${pkg}/package.json`)), ...rest);
  const buf = readFileSync(file);
  const name = `${label}.${hash(buf)}.js`;
  copyFileSync(file, join(assets, name));
  html = replaceOnce(html, `<script crossorigin src="${url}"></script>`, `<script src="/assets/${name}"></script>`, label);
};
vendor('react/umd/react.production.min.js', 'https://unpkg.com/react@18.3.1/umd/react.production.min.js', 'react');
vendor('react-dom/umd/react-dom.production.min.js', 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', 'react-dom');
html = html.replace(/[ \t]*<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"><\/script>\n?/, '');
if (/unpkg\.com|cdn\.tailwindcss\.com|text\/babel/.test(html.replace(/CONNECTION_TARGETS_ALL[\s\S]*?\];/, ''))) {
  throw new Error('CDN への参照が残っています');
}

// 4) ビルド版であることを起動前に知らせる（起動状況の表示・接続チェックが使う）
const buildId = hash(html);
html = replaceOnce(html, '<head>', `<head>\n  <script>window.__EP_BUILD = '${buildId}';</script>`, 'head');

writeFileSync(join(dist, 'index.html'), html);
console.log(`dist/ を作成しました (build ${buildId}): ${appName} (${Math.round(code.length / 1024)}KB), ${cssName} (${Math.round(css.length / 1024)}KB)`);
