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

// クラウドへ保存するとき、送る中身を「この端末が最後に見たクラウドの内容（base）」から変わった所だけに絞る。
// 以前は保存のたびに年間予定・週案をまるごと送っていたため、他の端末の変更をまだ受け取っていない端末が
// 何か1つ編集すると、他の端末で入れた予定まで古い内容で上書きしてしまっていた。
// 保存は setDoc(..., { merge: true }) で行うので、送らなかった所はクラウド側の内容がそのまま残る。
// （merge: true の保存はもともと項目を消さないので、ここでも消した項目を送ることはしない）
const mergeSavePatch = (base, next) => {
  if (!mergeIsPlainObject(base) || !mergeIsPlainObject(next)) return next;
  const out = {};
  Object.keys(next).forEach(k => {
    const n = next[k], b = base[k];
    if (mergeSame(n, b)) return;
    // 空の {} は merge: true でもその項目を {} に置き換えるので、そのまま送る（これまでと同じ動き）
    if (mergeIsPlainObject(n) && mergeIsPlainObject(b) && Object.keys(n).length) {
      const sub = mergeSavePatch(b, n);
      if (Object.keys(sub).length) out[k] = sub;
      return;
    }
    out[k] = n;
  });
  return out;
};

// mergeSavePatch で作った差分をクラウドへ送り終えたあと、手元の「クラウドの内容」に当てはめる
const mergeApplyPatch = (base, patch) => {
  if (!mergeIsPlainObject(base) || !mergeIsPlainObject(patch)) return patch;
  const out = { ...base };
  Object.keys(patch).forEach(k => {
    const p = patch[k];
    out[k] = mergeIsPlainObject(p) && Object.keys(p).length && mergeIsPlainObject(out[k]) ? mergeApplyPatch(out[k], p) : p;
  });
  return out;
};

// 時間のかかる処理（Googleカレンダー同期など）が、始めた時点のデータ（from）をもとに作った結果（to）のうち、
// 実際に書き換えた所だけを最新のデータ（cur）に当てはめる。処理中に他の端末から届いた変更を消さないためのもの。
// depth は何段目まで項目ごとに見るか（年間予定は 年度 → 月日 の2段）
const mergeCarryEdits = (cur, from, to, depth = 1) => {
  const out = { ...(mergeIsPlainObject(cur) ? cur : {}) };
  const f = mergeIsPlainObject(from) ? from : {};
  const t = mergeIsPlainObject(to) ? to : {};
  new Set([...Object.keys(f), ...Object.keys(t)]).forEach(k => {
    const a = f[k], b = t[k];
    if (a === b || mergeSame(a, b)) return;
    if (depth > 1 && mergeIsPlainObject(b) && (a === undefined || mergeIsPlainObject(a))) { out[k] = mergeCarryEdits(out[k], a, b, depth - 1); return; }
    if (b === undefined) delete out[k]; else out[k] = b;
  });
  return out;
};
