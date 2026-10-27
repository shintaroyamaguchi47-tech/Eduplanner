// 日付・祝日・年度まわりの計算。画面に依存しない純粋な関数だけを置く。
// index.html から <script src="src/calendar.js"> で読み込み、ここの const はアプリ本体からそのまま使える
// （通常の <script> のトップレベル宣言はページ全体で共有される）。tests/calendar.test.mjs で単体テストしている。

// 年度（4月始まり）の判定
const getSchoolYearOf = (ds) => { const [y, m] = ds.split('-').map(Number); return m < 4 ? y - 1 : y; };

// 国民の祝日は祝日法から計算する。年ごとの一覧を初回だけ組み立ててキャッシュする。
// 春分・秋分は国立天文台の近似式（1980〜2099年で有効）。
// 五輪年のような法改正での臨時移動が決まったときは HOLIDAY_OVERRIDES に "2020-7-23":"海の日" の形で書けば計算結果より優先される。
const HOLIDAY_OVERRIDES = {};
const FIXED_HOLIDAYS = [
  [1,1,'元日'], [2,11,'建国記念の日'], [2,23,'天皇誕生日'], [4,29,'昭和の日'],
  [5,3,'憲法記念日'], [5,4,'みどりの日'], [5,5,'こどもの日'], [8,11,'山の日'],
  [11,3,'文化の日'], [11,23,'勤労感謝の日'],
];
// ハッピーマンデー: [月, 第何月曜, 名称]
const HAPPY_MONDAY_HOLIDAYS = [ [1,2,'成人の日'], [7,3,'海の日'], [9,3,'敬老の日'], [10,2,'スポーツの日'] ];
const getNthMondayDate = (y, m, nth) => {
  const first = new Date(y, m - 1, 1);
  return 1 + ((8 - first.getDay()) % 7) + (nth - 1) * 7;
};
const getEquinoxDate = (y, isSpring) =>
  Math.floor((isSpring ? 20.8431 : 23.2488) + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));

const buildYearHolidays = (y) => {
  const map = {};
  FIXED_HOLIDAYS.forEach(([m, d, name]) => { map[`${m}-${d}`] = name; });
  HAPPY_MONDAY_HOLIDAYS.forEach(([m, nth, name]) => { map[`${m}-${getNthMondayDate(y, m, nth)}`] = name; });
  map[`3-${getEquinoxDate(y, true)}`] = '春分の日';
  map[`9-${getEquinoxDate(y, false)}`] = '秋分の日';
  // 振替休日: 日曜と重なった祝日の次の、祝日でない日
  Object.keys(map).forEach(key => {
    const [m, d] = key.split('-').map(Number);
    if (new Date(y, m - 1, d).getDay() !== 0) return;
    const dt = new Date(y, m - 1, d);
    do { dt.setDate(dt.getDate() + 1); } while (map[`${dt.getMonth() + 1}-${dt.getDate()}`]);
    map[`${dt.getMonth() + 1}-${dt.getDate()}`] = '振替休日';
  });
  // 国民の休日: 前後を祝日に挟まれた平日（敬老の日と秋分の日の間など）
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(y, m - 1, d);
      if (dt.getMonth() !== m - 1 || dt.getDay() === 0 || map[`${m}-${d}`]) continue;
      const prev = new Date(y, m - 1, d - 1), next = new Date(y, m - 1, d + 1);
      if (map[`${prev.getMonth() + 1}-${prev.getDate()}`] && map[`${next.getMonth() + 1}-${next.getDate()}`]) map[`${m}-${d}`] = '国民の休日';
    }
  }
  Object.entries(HOLIDAY_OVERRIDES).forEach(([key, name]) => {
    const [oy, om, od] = key.split('-').map(Number);
    if (oy !== y) return;
    if (name) map[`${om}-${od}`] = name; else delete map[`${om}-${od}`];
  });
  return map;
};

const holidayCacheByYear = {};
const getHolidayName = (y, m, d) => {
  if (!holidayCacheByYear[y]) holidayCacheByYear[y] = buildYearHolidays(Number(y));
  const name = holidayCacheByYear[y][`${m}-${d}`];
  return name ? `🎌 ${name}` : null;
};

// 長期休業期間の日課: 平日は「休業(出勤)」、土日祝は「休日」
const getVacationDaySetting = (ds, di, vacations) => {
  if (!vacations.find(v => ds >= v.start && ds <= v.end)) return null;
  const [y, m, d] = ds.split('-').map(Number);
  return (di >= 5 || getHolidayName(y, m, d)) ? { type: 'holiday' } : { type: 'work' };
};

const getMonday = (d) => { const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); const monday = new Date(date.setDate(diff)); monday.setHours(0,0,0,0); return monday; };
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

// ── 年度の切り替え ──
// 前年度の行事を新年度へ写す。mode==='weekday' は52週（364日）後の同じ曜日へ、'date' は月日そのまま。
// 4/1付近で前年度側にはみ出す日は1週あとへ送る。同じ日に重なったら改行でつなぐ
const shiftYearlyEvents = (prevMap, prevY, y, mode) => {
  const events = {}; const onHoliday = []; const dropped = [];
  Object.keys(prevMap || {}).forEach(key => {
    const text = String(prevMap[key] || '').trim(); if (!text) return;
    const [m, d] = key.split('-').map(Number); if (!m || !d) return;
    let nd;
    if (mode === 'weekday') {
      nd = new Date(prevY + (m < 4 ? 1 : 0), m - 1, d + 364);
      if (getSchoolYearOf(formatDate(nd)) < y) nd.setDate(nd.getDate() + 7);
    } else {
      nd = new Date(y + (m < 4 ? 1 : 0), m - 1, d);
      if (nd.getMonth() !== m - 1) { dropped.push(`${m}/${d}`); return; }
    }
    const nm = nd.getMonth() + 1, nday = nd.getDate(), nk = `${nm}-${nday}`;
    events[nk] = events[nk] ? `${events[nk]}\n${text}` : text;
    const hol = getHolidayName(nd.getFullYear(), nm, nday);
    if (hol) onHoliday.push(`${nm}/${nday}（${hol.replace(/^🎌\s*/, '')}）${text.split('\n')[0]}`);
  });
  return { events, onHoliday, dropped };
};

const shiftDateByYear = (ds, n) => { const [yy, m, d] = ds.split('-').map(Number); const dt = new Date(yy + n, m - 1, d); if (dt.getMonth() !== m - 1) dt.setDate(0); return formatDate(dt); };
