// 端末内のデータで先に表示を始めた（オフラインモード）あとでクラウドの読み込みが終わったとき、
// 「表示を始めた時点の端末内データ（base）」「その後この端末で編集した内容（mine）」「クラウドの最新（theirs）」の
// 3つを突き合わせて1つにまとめる。他の端末で入れた予定を、この端末の古いデータで上書きして消さないためのもの。
// - 片方しか変えていない所は、変えた側を採る
// - id を持つ項目の配列（ToDo・ノートなど）は、項目ごとに突き合わせる（追加・削除・編集をそれぞれ活かす）
// - 同じ所を両方が別々に変えたときは、この端末の内容（mine）を採る
// tests/merge.test.mjs で単体テストしている。

const mergeIsPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const mergeSame = (a, b) => {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
};

const mergeIsIdList = (...lists) => lists.every(l => l === undefined || (Array.isArray(l) && l.every(x => mergeIsPlainObject(x) && x.id !== undefined && x.id !== null)));

const mergeIdLists = (base, mine, theirs) => {
  const toMap = (l) => { const m = new Map(); (l || []).forEach(x => m.set(String(x.id), x)); return m; };
  const b = toMap(base), m = toMap(mine), t = toMap(theirs);
  const pick = (id) => {
    const inB = b.has(id), inM = m.has(id), inT = t.has(id);
    if (inB) {
      // この端末で消した項目：クラウド側で編集されていなければ消す
      if (!inM) return inT && !mergeSame(t.get(id), b.get(id)) ? t.get(id) : undefined;
      // 他の端末で消した項目：この端末で編集していなければ消す
      if (!inT) return !mergeSame(m.get(id), b.get(id)) ? m.get(id) : undefined;
      return mergeThreeWay(b.get(id), m.get(id), t.get(id));
    }
    if (inM && inT) return mergeThreeWay(undefined, m.get(id), t.get(id));
    return inM ? m.get(id) : t.get(id);
  };
  // 並び順はこの端末の順を基本にし、他の端末で増えた項目はそのクラウド上の位置の近くに差し込む
  const order = (mine || []).map(x => String(x.id));
  const seen = new Set(order);
  (theirs || []).forEach((x, i) => {
    const id = String(x.id);
    if (seen.has(id)) return;
    seen.add(id);
    const prev = i > 0 ? String(theirs[i - 1].id) : null;
    const at = prev === null ? 0 : order.indexOf(prev) + 1;
    order.splice(at > 0 ? at : 0, 0, id);
  });
  const out = [];
  order.forEach(id => { const v = pick(id); if (v !== undefined) out.push(v); });
  return out;
};

const mergeThreeWay = (base, mine, theirs) => {
  if (theirs === undefined) return mine;
  if (mine === undefined && base === undefined) return theirs;
  if (mergeSame(mine, theirs)) return mine;
  if (mergeSame(mine, base)) return theirs;
  if (mergeSame(theirs, base)) return mine;
  if (mergeIsPlainObject(mine) && mergeIsPlainObject(theirs)) {
    const b = mergeIsPlainObject(base) ? base : {};
    const out = {};
    new Set([...Object.keys(mine), ...Object.keys(theirs)]).forEach(k => {
      const inM = Object.prototype.hasOwnProperty.call(mine, k);
      const inT = Object.prototype.hasOwnProperty.call(theirs, k);
      const inB = Object.prototype.hasOwnProperty.call(b, k);
      let v;
      if (inM && inT) v = mergeThreeWay(inB ? b[k] : undefined, mine[k], theirs[k]);
      else if (inM) v = inB && mergeSame(mine[k], b[k]) ? undefined : mine[k];   // 他の端末で消した
      else v = inB && mergeSame(theirs[k], b[k]) ? undefined : theirs[k];        // この端末で消した
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  if (Array.isArray(mine) && Array.isArray(theirs) && mergeIsIdList(base, mine, theirs)) {
    return mergeIdLists(Array.isArray(base) ? base : [], mine, theirs);
  }
  return mine;
};
