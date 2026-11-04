// EduPlanner 毎朝の自動バックアップ（Google Apps Script）
//
// Firebase（Firestore）にある週案などの全データを、毎朝 Google ドライブに JSON で保存する。
// 保存したファイルは、アプリの 設定 → データバックアップ →「データを復元（インポート）」でそのまま読み込める。
//
// 使い方は同じフォルダの README.md を参照。最初に一度だけ setup を実行すると、毎朝の実行が登録される。
//
// しくみ: Firebase プロジェクトの持ち主の Google アカウントで動かすと、そのアカウントの権限で
// Firestore を読める（アプリのセキュリティルールとは別の、管理者としての読み取り）。
// そのため、Firebase プロジェクトを作ったのと同じ Google アカウントで実行すること。

// ===== 設定（必要なら書き換える） =====
const CONFIG = {
  PROJECT_ID: 'eduplanner-v2',
  // 自分のユーザーID（Firebase コンソール → Authentication → ユーザー の「ユーザー UID」）。
  // 空のままなら、データのあるユーザーが1人だけのときに自動で選ぶ
  UID: '',
  FOLDER_NAME: 'EduPlanner バックアップ',
  // 毎日のファイルを残す日数。これより古いものは、各月のいちばん古い1つ（月ごとの控え）を除いてゴミ箱へ移す
  KEEP_DAYS: 30,
  // 毎朝この時刻（日本時間）ごろに実行する。Google の都合で最大1時間ほど前後する
  HOUR: 6,
};

const FILE_PREFIX = 'EduPlanner_';
const TIME_ZONE = 'Asia/Tokyo';

// ===== 最初に一度だけ実行する =====
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'dailyBackup')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(CONFIG.HOUR).inTimezone(TIME_ZONE).create();
  dailyBackup();
  console.log(`毎朝 ${CONFIG.HOUR} 時ごろの自動バックアップを登録しました。`);
}

// 自動バックアップをやめるとき
function stopDailyBackup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'dailyBackup')
    .forEach(t => ScriptApp.deleteTrigger(t));
  console.log('自動バックアップを止めました（保存済みのファイルはそのまま残ります）。');
}

// ===== 毎朝の処理 =====
function dailyBackup() {
  const uid = resolveUid_();
  const docs = fetchPlannerDocs_(uid);
  if (!Object.keys(docs).length) {
    // 空のデータで保存すると、古いファイルの整理で大事な控えまで減っていくので、ここで止める
    throw new Error(`ユーザー ${uid} のデータが見つかりませんでした。CONFIG.UID を確認してください。`);
  }
  const now = new Date();
  const today = Utilities.formatDate(now, TIME_ZONE, 'yyyy-MM-dd');
  const backup = buildBackup_(docs, { uid, savedAt: now.toISOString() });

  const folder = getBackupFolder_();
  const name = `${FILE_PREFIX}${today}.json`;
  // 同じ日に二度実行したら、新しいほうに置き換える
  const same = folder.getFilesByName(name);
  while (same.hasNext()) same.next().setTrashed(true);
  const file = folder.createFile(name, JSON.stringify(backup), 'application/json');
  console.log(`保存しました: ${CONFIG.FOLDER_NAME}/${name}（${Math.round(file.getSize() / 1024)}KB）`);

  pruneOldBackups_(folder, today);
}

// ===== Firestore からの読み込み =====
function firestoreGet_(path, query) {
  const qs = query ? '?' + Object.keys(query).filter(k => query[k] !== undefined && query[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`).join('&') : '';
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/databases/(default)/documents/${path}${qs}`;
  const res = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
      // 利用量の付け先を Firebase プロジェクトにする（Apps Script 側のプロジェクトでは Firestore を使えないため）
      'X-Goog-User-Project': CONFIG.PROJECT_ID,
    },
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code === 200) return JSON.parse(body);
  if (code === 403 || code === 401) {
    throw new Error(`Firestore を読む権限がありません（${code}）。Firebase プロジェクト「${CONFIG.PROJECT_ID}」を作った Google アカウントで実行しているか確認してください。\n${body.slice(0, 500)}`);
  }
  throw new Error(`Firestore の読み込みに失敗しました（${code}）。\n${body.slice(0, 500)}`);
}

function resolveUid_() {
  if (CONFIG.UID) return CONFIG.UID;
  // users/{uid} 自体のドキュメントは無く、下に teacherPlanner があるだけなので showMissing で探す
  const ids = [];
  let pageToken = '';
  do {
    const res = firestoreGet_('users', { pageSize: 100, showMissing: 'true', pageToken });
    (res.documents || []).forEach(d => ids.push(d.name.split('/').pop()));
    pageToken = res.nextPageToken || '';
  } while (pageToken);
  if (ids.length === 1) return ids[0];
  if (!ids.length) throw new Error('データのあるユーザーが見つかりませんでした。');
  throw new Error(`ユーザーが ${ids.length} 人見つかりました。CONFIG.UID に自分のユーザー UID を書いてください（Firebase コンソール → Authentication → ユーザー で確認できます）。`);
}

function fetchPlannerDocs_(uid) {
  const docs = {};
  let pageToken = '';
  do {
    const res = firestoreGet_(`users/${encodeURIComponent(uid)}/teacherPlanner`, { pageSize: 100, pageToken });
    (res.documents || []).forEach(d => { docs[d.name.split('/').pop()] = decodeFields_(d.fields || {}); });
    pageToken = res.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// Firestore REST の値（{ stringValue: 'a' } など）をふつうの JSON に戻す
function decodeValue_(v) {
  if (!v || typeof v !== 'object') return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('bytesValue' in v) return v.bytesValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue_);
  if ('mapValue' in v) return decodeFields_(v.mapValue.fields || {});
  return null;
}

function decodeFields_(fields) {
  const out = {};
  Object.keys(fields).forEach(k => { out[k] = decodeValue_(fields[k]); });
  return out;
}

// ===== アプリの書き出しと同じ形にまとめる =====
// 週案はアプリと同じく「旧ドキュメント weekly（移行済みなら使わない）」→「年度ごとの weekly_YYYY（年度順）」の順に重ねる
function buildBackup_(docs, meta) {
  const pick = (name, field) => (docs[name] ? docs[name][field] : undefined);
  const idx = docs.weeklyIndex || null;
  const migrated = !!(idx && idx.migrated);
  const years = (idx && Array.isArray(idx.years)) ? idx.years.map(String).sort() : [];
  const parts = [];
  if (docs.weekly && !migrated) parts.push(docs.weekly);
  years.forEach(y => { if (docs[`weekly_${y}`]) parts.push(docs[`weekly_${y}`]); });
  const weeklyData = {};
  const weeklySettings = {};
  parts.forEach(p => {
    Object.assign(weeklyData, p.weeklyData || {});
    Object.assign(weeklySettings, p.weeklySettings || {});
  });

  return {
    baseTemplate: pick('template', 'baseTemplate'),
    templateSettings: pick('template', 'templateSettings'),
    weeklyData,
    weeklySettings,
    todos: pick('todos', 'todos'),
    yearlyData: pick('extra', 'yearlyData'),
    documents: pick('extra', 'documents'),
    vacations: pick('extra', 'vacations'),
    notesData: pick('notes', 'notes'),
    syllabusData: pick('syllabus', 'syllabus'),
    quickMemos: pick('quickMemos', 'memos'),
    // ここから下はアプリの復元では使わない（手作業で戻すときのための控え）
    _backup: { app: 'EduPlanner', by: 'Google Apps Script', savedAt: meta.savedAt, uid: meta.uid },
    _firestore: docs,
  };
}

// ===== 古いファイルの整理 =====
function getBackupFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) { /* 消された・見つからないときは作り直す */ }
  }
  const found = DriveApp.getFoldersByName(CONFIG.FOLDER_NAME);
  const folder = found.hasNext() ? found.next() : DriveApp.createFolder(CONFIG.FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function pruneOldBackups_(folder, today) {
  const byDate = {};
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const m = f.getName().match(/^EduPlanner_(\d{4}-\d{2}-\d{2})\.json$/);
    if (m) (byDate[m[1]] = byDate[m[1]] || []).push(f);
  }
  const toDelete = pickDatesToDelete_(Object.keys(byDate), today, CONFIG.KEEP_DAYS);
  toDelete.forEach(d => byDate[d].forEach(f => f.setTrashed(true)));
  if (toDelete.length) console.log(`古いファイルをゴミ箱へ移しました: ${toDelete.join(', ')}`);
}

// 残す: 今日から KEEP_DAYS 日以内のもの、および各月でいちばん古い日付のもの（月ごとの控え）。
// 1日の実行が失敗した月でも、その月の最初のファイルが月ごとの控えになる
function pickDatesToDelete_(dates, today, keepDays) {
  const dayNum = (s) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) / 864e5;
  const t = dayNum(today);
  const firstOfMonth = {};
  dates.slice().sort().forEach(d => { const ym = d.slice(0, 7); if (!firstOfMonth[ym]) firstOfMonth[ym] = d; });
  return dates.filter(d => t - dayNum(d) >= keepDays && firstOfMonth[d.slice(0, 7)] !== d).sort();
}
