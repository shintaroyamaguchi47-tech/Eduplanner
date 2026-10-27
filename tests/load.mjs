// src/ の素の JS は <script> で読み込む前提（トップレベルの const がページ全体で共有される）なので、
// テストでも同じように 1 つの文脈で順に実行し、名前で取り出す。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export const loadScripts = (files, globals = {}) => {
  const ctx = vm.createContext({ ...globals });
  for (const f of files) vm.runInContext(readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8'), ctx, { filename: f });
  return (name) => vm.runInContext(name, ctx);
};
