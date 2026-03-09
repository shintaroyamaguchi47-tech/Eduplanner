[index.html](https://github.com/user-attachments/files/25841913/index.html)
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>EduPlanner</title>
  
  <!-- iOS ホーム画面追加用（PWA化）メタタグ -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="EduPlanner">

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- React & ReactDOM -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  
  <!-- Babel -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Google Fonts (Noto Sans JP) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">

  <style>
    body { 
      font-family: 'Noto Sans JP', sans-serif; 
      -webkit-tap-highlight-color: transparent; 
      background-color: #4f46e5;
      letter-spacing: 0.02em; 
    }
    .smooth-scroll { -webkit-overflow-scrolling: touch; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    /* カスタムスクロールバー */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    /* 横スクロール用（月タブなど） */
    .overflow-x-auto::-webkit-scrollbar { height: 4px; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef } = React;

    const _importDynamic = new Function('modulePath', 'return import(modulePath)');
    const Icon = ({ char, className }) => <span className={`inline-block leading-none ${className}`}>{char}</span>;

    // --- 日課定義 ---
    const SCHEDULE_TYPES = {
      normal: { id: 'normal', label: '通常日課', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      short: { id: 'short', label: '短縮日課', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      special: { id: 'special', label: '特別短縮', color: 'bg-pink-50 text-pink-700 border-pink-200' },
      holiday: { id: 'holiday', label: '休日・部活', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    };

    // 時間設定
    const SCHEDULE_TIMES = {
      normal: {
        event: null, morning: { start: '08:15', end: '08:30' }, p1: { start: '08:40', end: '09:30' },
        p2: { start: '09:40', end: '10:30' }, p3: { start: '10:40', end: '11:30' }, p4: { start: '11:40', end: '12:30' },
        lunch: { start: '12:30', end: '13:35' }, p5: { start: '13:35', end: '14:25' }, p6: { start: '14:35', end: '15:25' },
        afterschool: { start: '16:00', end: '' },
      },
      short: {
        event: null, morning: { start: '08:15', end: '08:30' }, p1: { start: '08:40', end: '09:25' },
        p2: { start: '09:35', end: '10:20' }, p3: { start: '10:30', end: '11:15' }, p4: { start: '11:25', end: '12:10' },
        lunch: { start: '12:10', end: '13:15' }, p5: { start: '13:15', end: '14:00' }, p6: { start: '14:10', end: '14:55' },
        afterschool: { start: '15:30', end: '' },
      },
      special: {
        event: null, morning: { start: '08:15', end: '08:20' }, p1: { start: '08:30', end: '09:15' },
        p2: { start: '09:25', end: '10:10' }, p3: { start: '10:20', end: '11:05' }, p4: { start: '11:15', end: '12:00' },
        lunch: { start: '12:00', end: '13:05' }, p5: { start: '13:05', end: '13:50' }, p6: { start: '14:00', end: '14:45' },
        afterschool: { start: '15:10', end: '' },
      },
      holiday: {
        event: null, morning: null, p1: null, p2: null, p3: null, p4: null, lunch: null, p5: null, p6: null,
        afterschool: null
      }
    };

    const ROWS = [
      { id: 'event', name: '行事' },
      { id: 'morning', name: '朝' },
      { id: 'p1', name: '1限' },
      { id: 'p2', name: '2限' },
      { id: 'p3', name: '3限' },
      { id: 'p4', name: '4限' },
      { id: 'lunch', name: '昼休' },
      { id: 'p5', name: '5限' },
      { id: 'p6', name: '6限' },
      { id: 'afterschool', name: '放課後' },
      { id: 'diary', name: '日記' },
    ];

    const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
    const TODO_TAGS = ['授業準備', '学年業務', '部活', '会議・事務', '生徒・保護者', 'その他'];

    const DEFAULT_TEMPLATE_SETTINGS = {
      0: { type: 'normal', clean: false },
      1: { type: 'normal', clean: true },
      2: { type: 'normal', clean: true },
      3: { type: 'normal', clean: false },
      4: { type: 'normal', clean: true },
      5: { type: 'holiday', clean: false },
      6: { type: 'holiday', clean: false },
    };

    // PDFから抽出した初期の年間予定データ
    const NEW_INITIAL_YEARLY_DATA = {
      "2025": {
        "4-4": "新入生体験入学", "4-5": "新入生説明会", "4-8": "始業式/入学式 第1ステージ「出会い」",
        "4-11": "給食開始 専門委員会", "4-12": "仮入部 発育測定(2年)", "4-25": "授業参観",
        "5-20": "中間テスト", "5-23": "1年保護者会", "5-24": "2年保護者会", "5-31": "生徒総会",
        "6-10": "第2ステージ「挑戦」", "6-13": "中間テスト 1日目", "6-14": "中間テスト 2日目",
        "6-17": "教育実習開始", "7-20": "夏季休業開始", "7-23": "中体連県大会", "7-24": "専門委員会",
        "8-27": "夏季休業日終了", "8-28": "授業開始日", "9-3": "3年県学調(1)", "9-5": "体育祭",
        "9-12": "前期期末テスト", "9-28": "合唱祭", "10-11": "前期終業式", "10-15": "後期始業式 第3ステージ「深化」",
        "11-6": "後期中間テスト 1日目", "11-7": "後期中間テスト 2日目", "12-20": "冬季休業開始 第3ステージ終了",
        "1-6": "冬季休業日終了", "1-7": "授業開始日 第4ステージ「感謝」", "1-22": "1年保護者会",
        "2-4": "私立高校入試", "2-13": "学年末テスト", "3-5": "公立高校入試", "3-18": "修了式",
        "3-19": "卒業式", "3-20": "学年末休業日開始"
      },
      "2026": {
        "4-6": "第2回職員会議", "4-7": "始業式/入学式 第1ステージ「出会い」", "5-1": "1年生保護者会",
        "6-10": "前期中間テスト 1日目", "6-11": "前期中間テスト 2日目", "6-12": "第2ステージ「挑戦」開始",
        "6-15": "教育実習開始", "7-22": "夏季休業日前授業最終日", "8-27": "夏季休業日明け授業開始日",
        "9-2": "3年県学調(1)", "9-8": "前期期末テスト", "10-1": "体育祭", "10-15": "前期終業式 第2ステージ終了",
        "10-16": "後期始業式 第3ステージ「深化」開始", "11-4": "後期中間テスト 1日目", "11-5": "後期中間テスト 2日目",
        "12-22": "冬季休業開始 第3ステージ終了", "1-5": "冬季休業日明け授業開始日 第4ステージ「感謝」開始",
        "2-2": "私立高校入試 / 学年末テスト", "2-3": "私立高校入試 / 学年末テスト", "3-3": "公立高校入試",
        "3-4": "公立高校入試", "3-18": "修了式", "3-19": "卒業証書授与式"
      }
    };

    const getMonday = (d) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0,0,0,0);
      return monday;
    };

    const formatDate = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const getDurationMinutes = (start, end) => {
      if (!start || !end) return 45;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return diff > 0 ? diff : 45;
    };

    const FIREBASE_CONFIG = {
      apiKey: "AIzaSyAKYTim9MLz93Flwdo40b3olqnKst8rqr0",
      authDomain: "smartplanner-2026.firebaseapp.com",
      projectId: "smartplanner-2026",
      storageBucket: "smartplanner-2026.firebasestorage.app",
      messagingSenderId: "160086194590",
      appId: "1:160086194590:web:c859a65ad8f28502093e8f"
    };

    // テキストエリアの中身を単元配列に変換するユーティリティ
    const parseUnits = (text) => {
       return text.split('\n').filter(line => line.trim() !== '').map(line => {
          const parts = line.split(',');
          return { name: parts[0].trim(), hours: parseInt(parts[1]) || 1 };
       });
    };
    const formatUnits = (units) => units ? units.map(u => `${u.name},${u.hours}`).join('\n') : '';

    function TeacherPlanner() {
      const [authLoading, setAuthLoading] = useState(true);
      const [cloudUser, setCloudUser] = useState(null);
      const [authEmail, setAuthEmail] = useState('');
      const [authPassword, setAuthPassword] = useState('');
      const [authError, setAuthError] = useState('');
      const [isRegistering, setIsRegistering] = useState(false);

      const [activeTab, setActiveTab] = useState('weekly');
      const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
      const [currentMonth, setCurrentMonth] = useState(new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1));
      
      const [showTodo, setShowTodo] = useState(false);
      const [selectedDateDetails, setSelectedDateDetails] = useState(null); 
      
      const [baseTemplate, setBaseTemplate] = useState({});
      const [templateSettings, setTemplateSettings] = useState(DEFAULT_TEMPLATE_SETTINGS);
      const [weeklyData, setWeeklyData] = useState({});
      const [weeklySettings, setWeeklySettings] = useState({});
      const [todos, setTodos] = useState([]);
      const [yearlyData, setYearlyData] = useState(NEW_INITIAL_YEARLY_DATA);
      const [documents, setDocuments] = useState([]); 
      const [studentRecordUrl, setStudentRecordUrl] = useState('');
      
      // ★追加: 長期休業期間のデータ
      const [vacations, setVacations] = useState([]);
      
      const [quickMemos, setQuickMemos] = useState([]);
      const [showQuickMemoList, setShowQuickMemoList] = useState(false);
      const [handwritingMode, setHandwritingMode] = useState('cell');

      // 進度管理（シラバス）データ
      const [syllabusData, setSyllabusData] = useState([]);

      const [newTodoText, setNewTodoText] = useState('');
      const [newTodoDate, setNewTodoDate] = useState(''); 
      const [newTodoTag, setNewTodoTag] = useState('');
      const [newTodoImportant, setNewTodoImportant] = useState(false);
      
      const [editingCell, setEditingCell] = useState(null);
      const [tempSubject, setTempSubject] = useState('');
      const [tempMemo, setTempMemo] = useState('');
      const [tempStartTime, setTempStartTime] = useState('');
      const [tempEndTime, setTempEndTime] = useState('');
      const [tempEvents, setTempEvents] = useState([]);
      const [tempHandwriting, setTempHandwriting] = useState(null);
      const [showHandwritingPad, setShowHandwritingPad] = useState(false);

      const [cloudStatus, setCloudStatus] = useState('ローカル保存');

      const canvasRef = useRef(null);
      const [isDrawing, setIsDrawing] = useState(false);

      useEffect(() => {
        let isMounted = true;
        const initFirebase = async () => {
          try {
            const { initializeApp } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
            const { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
            const { getFirestore } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            
            const app = window.__firebaseApp || initializeApp(FIREBASE_CONFIG);
            window.__firebaseApp = app;
            const auth = getAuth(app);
            const db = getFirestore(app);
            window.__firebaseAuth = auth;
            window.__firebaseDb = db;

            await setPersistence(auth, browserLocalPersistence);

            onAuthStateChanged(auth, (user) => {
              if (isMounted) {
                if (user) {
                  setCloudUser({ uid: user.uid, db });
                  setCloudStatus('☁️ 同期中');
                } else {
                  setCloudUser(null);
                  setCloudStatus('未ログイン');
                }
                setAuthLoading(false);
              }
            });
          } catch (e) {
            console.error("Firebase Error:", e);
            if (isMounted) setAuthLoading(false);
          }
        };
        initFirebase();
        return () => { isMounted = false; };
      }, []);

      useEffect(() => {
        try {
          const load = (key) => JSON.parse(localStorage.getItem(key));
          if (localStorage.getItem('teacherPlanner_v4_template')) setBaseTemplate(load('teacherPlanner_v4_template'));
          if (localStorage.getItem('teacherPlanner_v4_template_settings')) setTemplateSettings(load('teacherPlanner_v4_template_settings'));
          if (localStorage.getItem('teacherPlanner_v4_weekly')) setWeeklyData(load('teacherPlanner_v4_weekly'));
          if (localStorage.getItem('teacherPlanner_v4_weekly_settings')) setWeeklySettings(load('teacherPlanner_v4_weekly_settings'));
          if (localStorage.getItem('teacherPlanner_v4_todos')) setTodos(load('teacherPlanner_v4_todos'));
          if (localStorage.getItem('teacherPlanner_v4_quickMemos')) setQuickMemos(load('teacherPlanner_v4_quickMemos'));
          if (localStorage.getItem('teacherPlanner_v4_syllabus')) setSyllabusData(load('teacherPlanner_v4_syllabus'));
          if (localStorage.getItem('teacherPlanner_v4_vacations')) setVacations(load('teacherPlanner_v4_vacations')); // ★追加
          
          let loadedYearly = load('teacherPlanner_v4_yearly');
          if (loadedYearly) {
            if (loadedYearly["4-8"] && typeof loadedYearly["4-8"] === "string") {
              loadedYearly = { "2025": loadedYearly };
            } else if (loadedYearly["4"] && typeof loadedYearly["4"] === "string") {
              loadedYearly = NEW_INITIAL_YEARLY_DATA;
            }
            const merged = { ...NEW_INITIAL_YEARLY_DATA };
            Object.keys(loadedYearly).forEach(year => {
              merged[year] = { ...merged[year], ...loadedYearly[year] };
            });
            setYearlyData(merged);
          } else {
            setYearlyData(NEW_INITIAL_YEARLY_DATA);
          }

          if (localStorage.getItem('teacherPlanner_v4_docs')) setDocuments(load('teacherPlanner_v4_docs') || []);
          const savedUrl = localStorage.getItem('teacherPlanner_v4_studentUrl');
          if (savedUrl) setStudentRecordUrl(savedUrl);
        } catch (e) {}
      }, []);

      useEffect(() => {
        if (!cloudUser) return;
        const { uid, db } = cloudUser;
        let unsubs = [];
        const listenCloud = async () => {
          const { doc, onSnapshot } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
          
          unsubs.push(onSnapshot(doc(db, 'users', uid, 'teacherPlanner', 'template'), (docSnap) => {
            if (docSnap.exists()) {
              const d = docSnap.data();
              if (d.baseTemplate) setBaseTemplate(d.baseTemplate);
              if (d.templateSettings) setTemplateSettings(d.templateSettings);
              if (d.studentRecordUrl) setStudentRecordUrl(d.studentRecordUrl);
            }
          }));
          unsubs.push(onSnapshot(doc(db, 'users', uid, 'teacherPlanner', 'weekly'), (docSnap) => {
            if (docSnap.exists()) {
              const d = docSnap.data();
              if (d.weeklyData) setWeeklyData(d.weeklyData);
              if (d.weeklySettings) setWeeklySettings(d.weeklySettings);
            }
          }));
          unsubs.push(onSnapshot(doc(db, 'users', uid, 'teacherPlanner', 'todos'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().todos) setTodos(docSnap.data().todos);
          }));
          unsubs.push(onSnapshot(doc(db, 'users', uid, 'teacherPlanner', 'quickMemos'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().memos) setQuickMemos(docSnap.data().memos);
          }));
          unsubs.push(onSnapshot(doc(db, 'users', uid, 'teacherPlanner', 'syllabus'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().syllabus) setSyllabusData(docSnap.data().syllabus);
          }));
          unsubs.push(onSnapshot(doc(db, 'users', uid, 'teacherPlanner', 'extra'), (docSnap) => {
            if (docSnap.exists()) {
              const d = docSnap.data();
              if (d.yearlyData) {
                 let cloudYearly = d.yearlyData;
                 if (cloudYearly["4-8"] && typeof cloudYearly["4-8"] === "string") {
                    cloudYearly = { "2025": cloudYearly };
                 } else if (cloudYearly["4"] && typeof cloudYearly["4"] === "string") {
                    cloudYearly = NEW_INITIAL_YEARLY_DATA;
                 }
                 const merged = { ...NEW_INITIAL_YEARLY_DATA };
                 Object.keys(cloudYearly).forEach(year => {
                   merged[year] = { ...merged[year], ...cloudYearly[year] };
                 });
                 setYearlyData(merged);
              }
              if (d.documents) setDocuments(d.documents);
              if (d.vacations) setVacations(d.vacations); // ★追加
            }
          }));
        };
        listenCloud();
        return () => unsubs.forEach(u => u());
      }, [cloudUser]);

      const saveAll = async (tData, tSettings, wData, wSettings) => {
        try {
          localStorage.setItem('teacherPlanner_v4_template', JSON.stringify(tData));
          localStorage.setItem('teacherPlanner_v4_template_settings', JSON.stringify(tSettings));
          localStorage.setItem('teacherPlanner_v4_weekly', JSON.stringify(wData));
          localStorage.setItem('teacherPlanner_v4_weekly_settings', JSON.stringify(wSettings));
        } catch (e) {}
        
        if (cloudUser && window.__firebaseDb) {
          try {
            const { doc, setDoc } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const { uid } = cloudUser;
            await setDoc(doc(window.__firebaseDb, 'users', uid, 'teacherPlanner', 'template'), { baseTemplate: tData, templateSettings: tSettings, studentRecordUrl }, { merge: true });
            await setDoc(doc(window.__firebaseDb, 'users', uid, 'teacherPlanner', 'weekly'), { weeklyData: wData, weeklySettings: wSettings }, { merge: true });
          } catch (e) {}
        }
      };

      // ★変更: 長期休業データ(vacations)も一緒に保存するように修正
      const saveExtraData = async (newYearly, newDocs, newVacations) => {
        setYearlyData(newYearly);
        setDocuments(newDocs);
        setVacations(newVacations);
        try {
          localStorage.setItem('teacherPlanner_v4_yearly', JSON.stringify(newYearly));
          localStorage.setItem('teacherPlanner_v4_docs', JSON.stringify(newDocs));
          localStorage.setItem('teacherPlanner_v4_vacations', JSON.stringify(newVacations));
        } catch (e) {}
        if (cloudUser && window.__firebaseDb) {
          try {
            const { doc, setDoc } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            await setDoc(doc(window.__firebaseDb, 'users', cloudUser.uid, 'teacherPlanner', 'extra'), { yearlyData: newYearly, documents: newDocs, vacations: newVacations }, { merge: true });
          } catch (e) {}
        }
      };

      const saveTodos = async (newTodos) => {
        setTodos(newTodos);
        try { localStorage.setItem('teacherPlanner_v4_todos', JSON.stringify(newTodos)); } catch (e) {}
        if (cloudUser && window.__firebaseDb) {
          try {
            const { doc, setDoc } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            await setDoc(doc(window.__firebaseDb, 'users', cloudUser.uid, 'teacherPlanner', 'todos'), { todos: newTodos }, { merge: true });
          } catch (e) {}
        }
      };

      const saveQuickMemos = async (newMemos) => {
        setQuickMemos(newMemos);
        try { localStorage.setItem('teacherPlanner_v4_quickMemos', JSON.stringify(newMemos)); } catch (e) {}
        if (cloudUser && window.__firebaseDb) {
          try {
            const { doc, setDoc } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            await setDoc(doc(window.__firebaseDb, 'users', cloudUser.uid, 'teacherPlanner', 'quickMemos'), { memos: newMemos }, { merge: true });
          } catch (e) {}
        }
      };

      const saveSyllabus = async (newSyllabus) => {
        setSyllabusData(newSyllabus);
        try { localStorage.setItem('teacherPlanner_v4_syllabus', JSON.stringify(newSyllabus)); } catch (e) {}
        if (cloudUser && window.__firebaseDb) {
          try {
            const { doc, setDoc } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            await setDoc(doc(window.__firebaseDb, 'users', cloudUser.uid, 'teacherPlanner', 'syllabus'), { syllabus: newSyllabus }, { merge: true });
          } catch (e) {}
        }
      };

      const shareMemo = async (dataUrl) => {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `EduPlanner_Memo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'EduPlanner クイックメモ',
              files: [file]
            });
          } else {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `EduPlanner_Memo_${Date.now()}.jpg`;
            link.click();
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
             alert('共有に失敗しました。ファイルとしてダウンロードします。');
             const link = document.createElement('a');
             link.href = dataUrl;
             link.download = `EduPlanner_Memo_${Date.now()}.jpg`;
             link.click();
          }
        }
      };

      const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
          const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
          if (isRegistering) {
            await createUserWithEmailAndPassword(window.__firebaseAuth, authEmail, authPassword);
          } else {
            await signInWithEmailAndPassword(window.__firebaseAuth, authEmail, authPassword);
          }
        } catch(err) {
          setAuthError(isRegistering ? '登録に失敗しました。パスワードは6文字以上にしてください。' : 'ログインに失敗しました。');
        }
      };

      const handleLogout = async () => {
        try {
          const { signOut } = await _importDynamic("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
          await signOut(window.__firebaseAuth);
        } catch(err) {}
      };

      const changeWeek = (offset) => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + offset * 7);
        setCurrentWeekStart(newDate);
        if (newDate.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
      };

      const changeMonth = (offset) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + offset);
        setCurrentMonth(newMonth);
      };

      const handleCellClick = (dateObj) => {
        setCurrentWeekStart(getMonday(dateObj));
        setActiveTab('weekly'); 
      };

      const handleNumberClick = (e, dateObj, dateStr) => {
        e.stopPropagation(); 
        setCurrentWeekStart(getMonday(dateObj));
        setSelectedDateDetails({ dateObj, dateStr });
      };

      // ★変更: 日課取得時に、長期休業期間内であればデフォルトで holiday を返す
      const getDaySetting = (dateStr, dayIndex) => {
        if (activeTab === 'template') return templateSettings[dayIndex] || DEFAULT_TEMPLATE_SETTINGS[dayIndex];
        
        // ユーザーが手動で変更した日課（通常日課に戻した等）があればそれを優先
        if (weeklySettings[dateStr]) return weeklySettings[dateStr];

        // 長期休業期間かどうかをチェック
        const isVacation = vacations.some(v => dateStr >= v.start && dateStr <= v.end);
        if (isVacation) {
            return { type: 'holiday' }; // 長期休業中はデフォルトで休日・部活モード
        }

        return templateSettings[dayIndex] || DEFAULT_TEMPLATE_SETTINGS[dayIndex];
      };

      const getPeriodTime = (setting, periodId) => {
        const times = SCHEDULE_TIMES[setting.type];
        if (setting.type === 'holiday') return null;
        return times[periodId] || null;
      };

      const getCellData = (dateStr, periodId, dayIndex) => {
        const tKey = `${dayIndex}-${periodId}`;
        const wKey = `${dateStr}-${periodId}`;
        let baseData = baseTemplate[tKey] || { subject: '', memo: '', startTime: '', endTime: '', events: [], handwriting: null };

        if (periodId === 'event' && activeTab !== 'template') {
           const [yearStr, monthStr, dayStr] = dateStr.split('-');
           const y = parseInt(monthStr, 10) < 4 ? parseInt(yearStr, 10) - 1 : parseInt(yearStr, 10);
           const mStr = parseInt(monthStr, 10).toString();
           const dStr = parseInt(dayStr, 10).toString();
           const yearlyEvent = yearlyData[y] && yearlyData[y][`${mStr}-${dStr}`];
           if (yearlyEvent) {
              baseData = { ...baseData, subject: yearlyEvent };
           }
        }

        if (activeTab === 'template') {
          return baseData;
        } else {
          const override = weeklyData[wKey];
          if (override && !override.useTemplate) {
              if (periodId === 'event' && !override.subject && baseData.subject) {
                  return { ...override, subject: baseData.subject };
              }
              return override;
          }
          return baseData;
        }
      };

      const getDailyEvents = (dateStr, dayIdx) => {
        const evs = [];
        const dataMap = {};
        ROWS.forEach(row => { dataMap[row.id] = getCellData(dateStr, row.id, dayIdx); });
        if (dataMap.event && dataMap.event.subject) evs.push(`🚩 ${dataMap.event.subject}`);
        if (dataMap.morning && dataMap.morning.subject) evs.push(`☀️ ${dataMap.morning.subject}`);
        if (dataMap.afterschool && dataMap.afterschool.events && dataMap.afterschool.events.length > 0) {
            dataMap.afterschool.events.forEach(e => { if (e.subject) evs.push(`🏫 ${e.subject}`); });
        } else if (dataMap.afterschool && dataMap.afterschool.subject) {
            evs.push(`🏫 ${dataMap.afterschool.subject}`);
        }
        if (dataMap.diary && dataMap.diary.subject) evs.push(`📝 ${dataMap.diary.subject}`);
        return evs;
      };

      const getCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        let firstDayIndex = firstDay.getDay() - 1;
        if (firstDayIndex === -1) firstDayIndex = 6;
        
        const days = [];
        const prevLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayIndex - 1; i >= 0; i--) {
          days.push({ date: new Date(year, month - 1, prevLastDay - i), isCurrentMonth: false });
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
          days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
          days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }
        return days;
      };

      const handleSettingChange = (dateStr, dayIndex, newSetting) => {
        if (activeTab === 'template') {
          const next = { ...templateSettings, [dayIndex]: newSetting };
          setTemplateSettings(next);
          saveAll(baseTemplate, next, weeklyData, weeklySettings);
        } else {
          const next = { ...weeklySettings, [dateStr]: newSetting };
          setWeeklySettings(next);
          saveAll(baseTemplate, templateSettings, weeklyData, next);
        }
      };

      const handleSaveCell = (data) => {
        if (!editingCell.isTemplate && data.subject) {
           let updatedSyllabus = [...syllabusData];
           let syllabusChanged = false;

           for (let i=0; i<updatedSyllabus.length; i++) {
              let subj = updatedSyllabus[i];
              
              if (subj.type === 'auto') {
                 const unit = subj.units[subj.currentUnitIdx];
                 if (unit) {
                    const expectedText = `${subj.name}（${unit.name} ${subj.currentHour}/${unit.hours}）`;
                    if (data.subject === expectedText) {
                       subj.currentHour++;
                       if (subj.currentHour > unit.hours) {
                          subj.currentHour = 1;
                          subj.currentUnitIdx++;
                       }
                       syllabusChanged = true;
                       break;
                    }
                 }
              } else if (subj.type === 'history') {
                 const match = data.subject.match(new RegExp(`^${subj.name}（(.+)）$`));
                 if (match) {
                    const keyword = match[1];
                    if (!subj.history) subj.history = [];
                    if (!subj.history.includes(keyword)) {
                       subj.history = [keyword, ...subj.history].slice(0, 15);
                       syllabusChanged = true;
                    }
                 }
              }
           }
           if (syllabusChanged) saveSyllabus(updatedSyllabus);
        }

        if (editingCell.isTemplate) {
          const next = { ...baseTemplate, [`${editingCell.dayIndex}-${editingCell.periodId}`]: data };
          setBaseTemplate(next);
          saveAll(next, templateSettings, weeklyData, weeklySettings);
        } else {
          const next = { ...weeklyData, [`${editingCell.dateStr}-${editingCell.periodId}`]: { ...data, useTemplate: false } };
          setWeeklyData(next);
          saveAll(baseTemplate, templateSettings, next, weeklySettings);
        }
        setEditingCell(null);
      };

      const handleRevert = () => {
        if (editingCell.isTemplate) return;
        const next = { ...weeklyData };
        delete next[`${editingCell.dateStr}-${editingCell.periodId}`];
        setWeeklyData(next);
        saveAll(baseTemplate, templateSettings, next, weeklySettings);
        setEditingCell(null);
      };

      const handleRevertDay = (dateStr) => {
        const nextSettings = { ...weeklySettings };
        delete nextSettings[dateStr];
        const nextData = { ...weeklyData };
        ROWS.forEach(row => { delete nextData[`${dateStr}-${row.id}`]; });
        setWeeklySettings(nextSettings);
        setWeeklyData(nextData);
        saveAll(baseTemplate, templateSettings, nextData, nextSettings);
      };

      const handleCopyDay = (targetDateStr, sourceDayIndex) => {
        if (sourceDayIndex === '') return;
        const sIdx = parseInt(sourceDayIndex);
        const sourceSetting = templateSettings[sIdx] || DEFAULT_TEMPLATE_SETTINGS[sIdx];
        const nextSettings = { ...weeklySettings, [targetDateStr]: sourceSetting };
        const nextData = { ...weeklyData };
        ROWS.forEach(row => {
          const sourceData = baseTemplate[`${sIdx}-${row.id}`] || { subject: '', memo: '', startTime: '', endTime: '', events: [] };
          nextData[`${targetDateStr}-${row.id}`] = { ...sourceData, useTemplate: false };
        });
        setWeeklySettings(nextSettings);
        setWeeklyData(nextData);
        saveAll(baseTemplate, templateSettings, nextData, nextSettings);
      };

      const openEditModal = (cellData, dateStr, row, dayIndex, dayName, isHoliday, defaultTime, isWeekend = false) => {
        if (row.id === 'afterschool') {
          let initEvents = cellData.events && cellData.events.length > 0 ? [...cellData.events] : [];
          if (initEvents.length === 0 && (cellData.subject || cellData.memo)) {
             initEvents = [{ startTime: cellData.startTime || '', endTime: cellData.endTime || '', subject: cellData.subject || '', memo: cellData.memo || '' }];
          }
          while (initEvents.length < 5) initEvents.push({ startTime: '', endTime: '', subject: '', memo: '' });
          setTempEvents(initEvents);
        } else {
          setTempSubject(cellData.subject || '');
          setTempMemo(cellData.memo || '');
          setTempStartTime(cellData.startTime || '');
          setTempEndTime(cellData.endTime || '');
        }
        setTempHandwriting(cellData.handwriting || null);
        setEditingCell({ 
          dateStr, periodId: row.id, dayIndex, dayName, periodName: isWeekend ? "休日の予定" : row.name, 
          isTemplate: activeTab === 'template', currentData: cellData, defaultTime, isHoliday, isWeekend 
        });
      };

      const updateTempEvent = (index, field, value) => {
        const newEvents = [...tempEvents];
        newEvents[index][field] = value;
        setTempEvents(newEvents);
      };

      const adjustSyllabusManual = (id, delta) => {
         let updated = syllabusData.map(s => {
            if (s.id !== id) return s;
            let currentH = s.currentHour + delta;
            let currentU = s.currentUnitIdx;
            if (currentH > s.units[currentU].hours) {
               if (currentU < s.units.length - 1) {
                  currentU++;
                  currentH = 1;
               } else {
                  currentH = s.units[currentU].hours; 
               }
            } else if (currentH < 1) {
               if (currentU > 0) {
                  currentU--;
                  currentH = s.units[currentU].hours;
               } else {
                  currentH = 1;
               }
            }
            return { ...s, currentHour: currentH, currentUnitIdx: currentU };
         });
         setSyllabusData(updated);
         
         const changedSubj = updated.find(s => s.id === id);
         const unit = changedSubj.units[changedSubj.currentUnitIdx];
         setTempSubject(`${changedSubj.name}（${unit.name} ${changedSubj.currentHour}/${unit.hours}）`);
      };

      const exportICS = async (type) => {
        let content = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//EduPlanner//JP\nCALSCALE:GREGORIAN\n";
        const now = new Date();
        const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        if (type === 'schedule') {
          for (let i = 0; i < 7; i++) {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() + i);
            const dateStr = formatDate(d);
            const dateIcs = dateStr.replace(/-/g, '');
            const setting = getDaySetting(dateStr, i);

            ROWS.forEach(row => {
              const data = getCellData(dateStr, row.id, i);
              const time = getPeriodTime(setting, row.id);

              if (row.id === 'afterschool' && data.events && data.events.length > 0) {
                data.events.forEach((ev, idx) => {
                  if (ev.subject) {
                    content += "BEGIN:VEVENT\n";
                    content += `DTSTAMP:${dtstamp}\n`;
                    content += `UID:plan-${dateStr}-${row.id}-${idx}@eduplanner\n`;
                    content += `LAST-MODIFIED:${dtstamp}\n`;
                    if (ev.startTime && ev.endTime) {
                      content += `DTSTART;TZID=Asia/Tokyo:${dateIcs}T${ev.startTime.replace(':','')}00\n`;
                      content += `DTEND;TZID=Asia/Tokyo:${dateIcs}T${ev.endTime.replace(':','')}00\n`;
                    } else if (time && time.start) {
                      content += `DTSTART;TZID=Asia/Tokyo:${dateIcs}T${time.start.replace(':','')}00\n`;
                      content += `DTEND;TZID=Asia/Tokyo:${dateIcs}T${time.start.replace(':','')}00\n`;
                    } else {
                      content += `DTSTART;VALUE=DATE:${dateIcs}\n`;
                    }
                    content += `SUMMARY:${ev.subject}\n`;
                    content += `DESCRIPTION:${ev.memo ? ev.memo.replace(/\n/g, '\\n') : ''}\n`;
                    content += "END:VEVENT\n";
                  }
                });
              } else if (data.subject) {
                const hasCustomTime = data.startTime && data.endTime;
                content += "BEGIN:VEVENT\n";
                content += `DTSTAMP:${dtstamp}\n`;
                content += `UID:plan-${dateStr}-${row.id}@eduplanner\n`;
                content += `LAST-MODIFIED:${dtstamp}\n`;
                if (hasCustomTime) {
                  content += `DTSTART;TZID=Asia/Tokyo:${dateIcs}T${data.startTime.replace(':','')}00\n`;
                  content += `DTEND;TZID=Asia/Tokyo:${dateIcs}T${data.endTime.replace(':','')}00\n`;
                } else if (time && time.start && time.end) {
                  content += `DTSTART;TZID=Asia/Tokyo:${dateIcs}T${time.start.replace(':','')}00\n`;
                  content += `DTEND;TZID=Asia/Tokyo:${dateIcs}T${time.end.replace(':','')}00\n`;
                } else {
                  content += `DTSTART;VALUE=DATE:${dateIcs}\n`;
                }
                content += `SUMMARY:${data.subject}\n`;
                content += `DESCRIPTION:${data.memo ? data.memo.replace(/\n/g, '\\n') : ''}\n`;
                content += "END:VEVENT\n";
              }
            });
          }
        } else if (type === 'todos') {
          const pending = todos.filter(t => !t.completed);
          if (!pending.length) return alert('未完了のタスクがありません');
          const today = formatDate(now).replace(/-/g, '');
          pending.forEach(t => {
            content += "BEGIN:VEVENT\n";
            content += `DTSTAMP:${dtstamp}\n`;
            content += `UID:todo-${t.id}@eduplanner\n`;
            content += `LAST-MODIFIED:${dtstamp}\n`;
            const todoDate = t.dueDate ? t.dueDate.replace(/-/g, '') : today;
            content += `DTSTART;VALUE=DATE:${todoDate}\n`;
            content += `SUMMARY:【TODO】${t.text}\n`;
            content += "END:VEVENT\n";
          });
        }
        content += "END:VCALENDAR";
        
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const fileName = `${type === 'schedule' ? '週案' : 'TODO'}.ics`;
        
        try {
          const file = new File([blob], fileName, { type: 'text/calendar' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: type === 'schedule' ? '週案の予定' : 'TODOリスト',
              files: [file]
            });
          } else {
            throw new Error('Share API not supported');
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      };

      const addTodo = (e) => {
        e.preventDefault();
        if (!newTodoText.trim()) return;
        saveTodos([...todos, { 
           id: Date.now(), 
           text: newTodoText, 
           completed: false, 
           dueDate: newTodoDate,
           tag: newTodoTag,
           important: newTodoImportant 
        }]);
        setNewTodoText('');
        setNewTodoDate(''); 
        setNewTodoImportant(false);
      };

      const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        setIsDrawing(true);
      };

      const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };

      const endDrawing = () => {
        setIsDrawing(false);
      };

      const saveHandwriting = () => {
        if(canvasRef.current) {
          const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
          
          if (handwritingMode === 'quick') {
             const newMemo = { id: Date.now(), dataUrl, timestamp: new Date().toISOString() };
             saveQuickMemos([newMemo, ...quickMemos]);
          } else {
             setTempHandwriting(dataUrl);
          }
        }
        setShowHandwritingPad(false);
        setHandwritingMode('cell'); 
      };

      const clearHandwriting = () => {
        const canvas = canvasRef.current;
        if(canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      };

      useEffect(() => {
        if (showHandwritingPad && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (tempHandwriting) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = tempHandwriting;
          }
        }
      }, [showHandwritingPad]);

      const schoolYear = currentMonth.getMonth() < 3 ? currentMonth.getFullYear() - 1 : currentMonth.getFullYear();
      const currentYearlyData = yearlyData[schoolYear] || {};

      const todayStr = formatDate(new Date());
      
      const sortedIncompleteTodos = todos.filter(t => !t.completed).sort((a, b) => {
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.id - a.id; 
      });

      const templateClasses = [];
      [0, 1, 2, 3, 4].forEach(dIdx => {
        ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].forEach(pid => {
          const key = `${dIdx}-${pid}`;
          const data = baseTemplate[key];
          if (data && data.subject && data.subject.trim() !== '') {
            templateClasses.push({
              label: `${DAYS[dIdx]}${pid.replace('p', '')}`,
              subject: data.subject,
              memo: data.memo || ''
            });
          }
        });
      });

      const MonthTabs = () => {
        const months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
        return (
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto hide-scrollbar w-full px-2 sm:px-4 py-1.5 bg-white border-b border-slate-200 shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 shrink-0 border border-slate-200/60">
              <button onClick={() => {
                const d = new Date(currentMonth); d.setFullYear(d.getFullYear() - 1); setCurrentMonth(d); setCurrentWeekStart(getMonday(d));
              }} className="text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 font-bold text-xs rounded-md hover:bg-white transition-colors">◀</button>
              <span className="text-[10px] sm:text-xs font-black text-slate-600 px-1">{schoolYear}年度</span>
              <button onClick={() => {
                const d = new Date(currentMonth); d.setFullYear(d.getFullYear() + 1); setCurrentMonth(d); setCurrentWeekStart(getMonday(d));
              }} className="text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 font-bold text-xs rounded-md hover:bg-white transition-colors">▶</button>
            </div>
            <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0"></div>
            <div className="flex items-center gap-1">
              {months.map(m => {
                const isCurrent = (currentMonth.getMonth() + 1) === m;
                return (
                  <button 
                    key={m}
                    onClick={() => {
                      const y = m <= 3 ? schoolYear + 1 : schoolYear;
                      const d = new Date(y, m - 1, 1);
                      setCurrentMonth(d);
                      setCurrentWeekStart(getMonday(d));
                    }}
                    className={`px-3 sm:px-4 py-1 rounded-lg font-black text-[10px] sm:text-xs whitespace-nowrap transition-all duration-200 shrink-0 
                      ${isCurrent ? 'bg-indigo-600 text-white shadow-md border-indigo-600' : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/60 hover:border-indigo-200'}`}
                  >
                    {m}月
                  </button>
                )
              })}
            </div>
          </div>
        );
      };

      if (authLoading) return <div className="flex h-[100dvh] items-center justify-center bg-slate-50 text-indigo-600 font-bold text-xl">⏳ 読み込み中...</div>;

      if (!cloudUser && cloudStatus !== 'スキップ') {
        return (
          <div className="flex h-[100dvh] w-full items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600 p-4 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">✨</div>
                <h1 className="text-2xl font-black text-slate-800 tracking-wide">EduPlanner</h1>
                <p className="text-sm text-slate-500 mt-2 font-bold">{isRegistering ? 'アカウントを作成して同期' : 'ログインして同期'}</p>
              </div>

              {authError && <div className="bg-rose-50 text-rose-600 text-xs font-bold p-3 rounded-lg mb-4 border border-rose-200">{authError}</div>}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1 ml-1">メールアドレス</label>
                  <input 
                    type="email" 
                    value={authEmail} 
                    onChange={e => setAuthEmail(e.target.value)} 
                    autoComplete="username"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1 ml-1">パスワード (6文字以上)</label>
                  <input 
                    type="password" 
                    value={authPassword} 
                    onChange={e => setAuthPassword(e.target.value)} 
                    autoComplete="current-password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                    required 
                  />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 mt-2">
                  {isRegistering ? '登録してはじめる' : 'ログイン'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-xs font-bold text-indigo-500 hover:text-indigo-700">
                  {isRegistering ? 'すでにアカウントをお持ちの方' : 'はじめての方（新規登録）'}
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                 <button onClick={() => setCloudStatus('スキップ')} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition underline">
                   設定をスキップして、この端末だけで使う
                 </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-50 w-full font-sans relative">
          
          <header className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0 shadow-sm z-30 pt-[env(safe-area-inset-top)] relative">
            <div className="max-w-full mx-auto px-2 sm:px-4 h-12 flex items-center justify-between">
              <h1 className="text-base sm:text-lg font-black flex items-center gap-1 sm:gap-2 drop-shadow-md tracking-wide">
                <Icon char="✨" className="text-indigo-200" /> <span className="hidden sm:inline">EduPlanner</span><span className="sm:hidden">EduPlanner</span>
              </h1>
              <div className="flex items-center gap-1.5 sm:gap-2">
                
                {activeTab === 'weekly' && (
                  <button 
                    onClick={() => exportICS('schedule')}
                    className="hidden sm:flex text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md text-white font-bold items-center gap-1 backdrop-blur-sm border border-white/10 transition-colors"
                  >
                    <span>📅</span> エクスポート
                  </button>
                )}

                <div className="hidden lg:flex text-[9px] bg-white/20 px-2 py-1 rounded-full text-white font-bold items-center gap-1 backdrop-blur-sm border border-white/10">
                  {cloudStatus === 'スキップ' ? 'ローカル' : cloudStatus}
                </div>
                
                <div className="flex bg-black/20 rounded-lg p-0.5 backdrop-blur-md overflow-x-auto hide-scrollbar max-w-[60vw] items-center">
                  <button onClick={() => setActiveTab('yearly')} className={`px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-bold transition whitespace-nowrap ${activeTab === 'yearly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:text-white'}`}>
                    年間
                  </button>
                  <button onClick={() => setActiveTab('monthly')} className={`px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-bold transition whitespace-nowrap ${activeTab === 'monthly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:text-white'}`}>
                    月間
                  </button>
                  <button onClick={() => setActiveTab('weekly')} className={`px-3 sm:px-4 py-1.5 mx-0.5 rounded-lg text-xs sm:text-sm font-black transition whitespace-nowrap shadow-md ${activeTab === 'weekly' ? 'bg-white text-indigo-800 border-2 border-indigo-300 scale-105' : 'bg-indigo-500/80 text-white hover:bg-indigo-400 border-2 border-transparent'}`}>
                    週案
                  </button>
                  <button onClick={() => setActiveTab('syllabus')} className={`px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-bold transition whitespace-nowrap ${activeTab === 'syllabus' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:text-white'}`}>
                    進度
                  </button>
                  <button onClick={() => setActiveTab('documents')} className={`px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-bold transition whitespace-nowrap ${activeTab === 'documents' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:text-white'}`}>
                    資料
                  </button>
                  <button onClick={() => setActiveTab('template')} className={`px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-bold transition whitespace-nowrap ${activeTab === 'template' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:text-white'}`}>
                    基本
                  </button>
                </div>
              </div>
            </div>
          </header>

          {(activeTab === 'monthly' || activeTab === 'weekly') && <MonthTabs />}

          <div className="flex flex-1 flex-col min-h-0 relative">
            
            {activeTab === 'yearly' && (
              <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
                <div className="px-4 py-2 sm:py-3 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
                  <h2 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
                    🗓️ 年間予定表
                  </h2>
                  <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 rounded-lg p-0.5 border border-slate-200/60">
                    <button onClick={() => {
                      const d = new Date(currentMonth); d.setFullYear(d.getFullYear() - 1); setCurrentMonth(d); setCurrentWeekStart(getMonday(d));
                    }} className="text-slate-400 hover:text-indigo-600 px-2 py-1 font-bold text-xs rounded-md hover:bg-white transition-colors">◀</button>
                    <span className="text-xs sm:text-sm font-black text-slate-700 px-2">{schoolYear}年度</span>
                    <button onClick={() => {
                      const d = new Date(currentMonth); d.setFullYear(d.getFullYear() + 1); setCurrentMonth(d); setCurrentWeekStart(getMonday(d));
                    }} className="text-slate-400 hover:text-indigo-600 px-2 py-1 font-bold text-xs rounded-md hover:bg-white transition-colors">▶</button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto w-full bg-white relative">
                  <table className="w-full border-collapse min-w-[1000px] text-sm table-fixed">
                    <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm text-slate-600">
                      <tr>
                        <th className="sticky left-0 bg-slate-100 z-30 border-b border-r border-slate-200 w-8 sm:w-10 min-w-[2rem] sm:min-w-[2.5rem] py-1.5 text-center font-black text-xs">日</th>
                        {[4,5,6,7,8,9,10,11,12,1,2,3].map(m => (
                          <th key={m} className="border-b border-r border-slate-200 py-1.5 w-24 sm:w-32 min-w-[6rem] sm:min-w-[8rem] max-w-[6rem] sm:max-w-[8rem] text-center font-black text-xs">{m}月</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <tr key={d} className="hover:bg-slate-50 transition-colors">
                          <td className="sticky left-0 bg-slate-50 z-10 border-b border-r border-slate-200 text-center font-black text-slate-500 py-1 text-[10px] sm:text-xs">
                            {d}
                          </td>
                          {[4,5,6,7,8,9,10,11,12,1,2,3].map(m => {
                            const y = m <= 3 ? schoolYear + 1 : schoolYear;
                            const date = new Date(y, m - 1, d);
                            const isValidDate = date.getDate() === d;
                            const dayOfWeekStr = isValidDate ? ['日','月','火','水','木','金','土'][date.getDay()] : '';
                            const isSun = isValidDate && date.getDay() === 0;
                            const isSat = isValidDate && date.getDay() === 6;

                            const dateStr = formatDate(date);
                            const isVac = vacations.some(v => dateStr >= v.start && dateStr <= v.end);
                            const isToday = dateStr === todayStr;

                            let tdBg = !isValidDate ? 'bg-slate-100' : isSun ? 'bg-rose-50/40' : isSat ? 'bg-blue-50/30' : 'bg-white';
                            if (isValidDate && isVac) {
                               tdBg = isSun ? 'bg-rose-100/60' : isSat ? 'bg-blue-100/50' : 'bg-amber-50/50';
                            }
                            if (isToday) {
                               tdBg = 'bg-rose-100 ring-2 ring-rose-400 ring-inset relative z-10';
                            }

                            return (
                              <td key={`${m}-${d}`} className={`border-b border-r border-slate-200 p-0 align-top w-24 sm:w-32 max-w-[6rem] sm:max-w-[8rem] overflow-hidden ${tdBg}`}>
                                {isValidDate && (
                                  <div className="flex items-stretch h-full w-full min-h-[32px] sm:min-h-[40px] overflow-hidden group">
                                    <div 
                                      onClick={() => {
                                        setCurrentWeekStart(getMonday(date));
                                        if (date.getMonth() !== currentMonth.getMonth()) {
                                          setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                                        }
                                        setActiveTab('weekly');
                                      }}
                                      title="この週の週案を開く"
                                      className={`w-4 sm:w-5 flex items-center justify-center text-[8px] sm:text-[10px] font-bold border-r border-slate-100/50 shrink-0 cursor-pointer hover:bg-indigo-100 hover:text-indigo-700 transition-colors
                                      ${isSun ? 'text-rose-500' : isSat ? 'text-blue-500' : 'text-slate-400'}`}
                                    >
                                      {dayOfWeekStr}
                                    </div>
                                    <textarea 
                                      className={`flex-1 min-w-0 w-full text-[9px] sm:text-xs font-bold p-1 outline-none resize-none overflow-hidden bg-transparent leading-tight break-all whitespace-pre-wrap ${isSun ? 'text-rose-800' : 'text-slate-700'}`}
                                      value={currentYearlyData[`${m}-${d}`] || ''}
                                      onChange={(e) => {
                                        const newYearly = { 
                                          ...yearlyData, 
                                          [schoolYear]: {
                                            ...(yearlyData[schoolYear] || {}),
                                            [`${m}-${d}`]: e.target.value 
                                          }
                                        };
                                        saveExtraData(newYearly, documents, vacations);
                                      }}
                                      rows={1}
                                      onInput={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                      }}
                                      placeholder=""
                                    />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'syllabus' && (
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2">📚 教科・進度管理</h2>
                    <p className="text-xs text-slate-500 font-bold mb-6">
                      専門教科は単元を登録して自動カウント。学活や道徳は入力履歴からサッと選べるように設定します。
                    </p>
                    
                    <div className="space-y-4">
                      {syllabusData.map((subj, idx) => (
                        <div key={subj.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 text-sm">{subj.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${subj.type === 'auto' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {subj.type === 'auto' ? '自動カウント' : '履歴から選択'}
                              </span>
                            </div>
                            <button onClick={() => saveSyllabus(syllabusData.filter(s => s.id !== subj.id))} className="text-rose-400 hover:text-rose-600 text-xs font-bold px-2">削除</button>
                          </div>
                          <div className="p-4 bg-white">
                            {subj.type === 'auto' ? (
                              <div>
                                <div className="text-[10px] text-slate-500 font-bold mb-2">📝 単元名と時数をカンマ区切りで入力してください（例: 野原はうたう,3）</div>
                                <textarea 
                                  className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none bg-slate-50 resize-y" 
                                  rows={5}
                                  value={subj.rawText !== undefined ? subj.rawText : formatUnits(subj.units)}
                                  onChange={(e) => {
                                     const text = e.target.value;
                                     const newUnits = parseUnits(text);
                                     const updated = [...syllabusData];
                                     updated[idx].rawText = text;
                                     updated[idx].units = newUnits;
                                     if (updated[idx].currentUnitIdx >= newUnits.length) {
                                        updated[idx].currentUnitIdx = Math.max(0, newUnits.length - 1);
                                        updated[idx].currentHour = 1;
                                     }
                                     saveSyllabus(updated);
                                  }}
                                  placeholder="野原はうたう,3&#10;ちょっと立ち止まって,2"
                                />
                                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 p-2 rounded-lg">
                                  <span>現在:</span>
                                  {subj.units && subj.units[subj.currentUnitIdx] ? (
                                    <span>{subj.units[subj.currentUnitIdx].name} ({subj.currentHour}/{subj.units[subj.currentUnitIdx].hours})</span>
                                  ) : (
                                    <span className="text-slate-400">単元が未登録、またはすべて終了</span>
                                  )}
                                  {subj.units && subj.units[subj.currentUnitIdx] && (
                                     <button onClick={() => {
                                        const updated = [...syllabusData];
                                        updated[idx].currentUnitIdx = 0;
                                        updated[idx].currentHour = 1;
                                        saveSyllabus(updated);
                                     }} className="ml-auto bg-white border border-indigo-200 px-2 py-0.5 rounded text-[10px] hover:bg-indigo-100">リセット</button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-[10px] text-slate-500 font-bold mb-2">📝 過去に入力した内容の履歴（不要なものは消せます）</div>
                                {subj.history && subj.history.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {subj.history.map((h, hIdx) => (
                                      <span key={hIdx} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                        {h}
                                        <button onClick={() => {
                                           const updated = [...syllabusData];
                                           updated[idx].history = subj.history.filter((_, i) => i !== hIdx);
                                           saveSyllabus(updated);
                                        }} className="text-emerald-400 hover:text-emerald-600 ml-1">✕</button>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-400 font-bold">まだ履歴がありません。週案で入力すると自動でここに追加されます。</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 bg-slate-100 p-4 rounded-xl border border-slate-200">
                      <h3 className="text-xs font-black text-slate-700 mb-3">＋ 新しい教科を追加</h3>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input id="newSubjName" type="text" placeholder="例: 1年A組 国語" className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
                        <select id="newSubjType" className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 cursor-pointer">
                          <option value="auto">単元カウント (専門教科)</option>
                          <option value="history">履歴から選択 (学活・道徳など)</option>
                        </select>
                        <button onClick={() => {
                          const name = document.getElementById('newSubjName').value;
                          const type = document.getElementById('newSubjType').value;
                          if(name) {
                            saveSyllabus([...syllabusData, {
                               id: Date.now().toString(),
                               name, type,
                               units: type === 'auto' ? [] : undefined,
                               rawText: type === 'auto' ? '' : undefined,
                               currentUnitIdx: type === 'auto' ? 0 : undefined,
                               currentHour: type === 'auto' ? 1 : undefined,
                               history: type === 'history' ? [] : undefined
                            }]);
                            document.getElementById('newSubjName').value = '';
                          }
                        }} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-indigo-700 transition">追加</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2">📁 資料室（リンク集）</h2>
                  <p className="text-xs text-slate-500 font-bold mb-6">学校のGoogleドライブ内のPDFのURLや、よく使うウェブサイトを登録しておけます。</p>
                  
                  <div className="space-y-3 mb-8">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 group">
                        <div className="text-2xl">📎</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-sm text-slate-800 truncate">{doc.title}</div>
                          <a href={doc.url} target="_blank" className="text-[10px] text-indigo-500 hover:underline truncate block">{doc.url}</a>
                        </div>
                        <button onClick={() => saveExtraData(yearlyData, documents.filter((_, i) => i !== idx), vacations)} className="text-rose-400 hover:text-rose-600 font-bold text-xs px-2 opacity-0 group-hover:opacity-100 transition">削除</button>
                      </div>
                    ))}
                    {documents.length === 0 && <div className="text-center text-slate-400 text-sm font-bold py-6">まだ資料が登録されていません</div>}
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <h3 className="text-xs font-black text-indigo-800 mb-3">新しい資料リンクを登録</h3>
                    <div className="space-y-2">
                      <input id="docTitle" type="text" placeholder="資料の名前 (例: R6年間予定表PDF)" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-400" />
                      <input id="docUrl" type="url" placeholder="URL (https://...)" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-400" />
                      <button onClick={() => {
                        const title = document.getElementById('docTitle').value;
                        const url = document.getElementById('docUrl').value;
                        if(title && url) {
                          saveExtraData(yearlyData, [...documents, {title, url}], vacations);
                          document.getElementById('docTitle').value = '';
                          document.getElementById('docUrl').value = '';
                        }
                      }} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-indigo-700 transition w-full">追加する</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
                <div className="px-4 sm:px-8 py-2 bg-white border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-10">
                  <div className="font-black text-slate-700 text-lg sm:text-xl flex items-center gap-2">
                    <Icon char="📅" className="text-indigo-500" /> {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                  </div>
                  <button onClick={() => {
                      const today = new Date(); setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setCurrentWeekStart(getMonday(today));
                  }} className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-white transition shadow-sm">今月</button>
                </div>
                <div className="flex-1 flex flex-col p-1.5 sm:p-3 overflow-hidden">
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-1 shrink-0">
                    {DAYS.map((d, i) => (<div key={d} className={`text-xs font-black py-0.5 ${i===5?'text-blue-500':i===6?'text-rose-500':'text-slate-600'}`}>{d}</div>))}
                  </div>
                  <div className="grid grid-cols-7 grid-rows-6 gap-1 sm:gap-2 flex-1 min-h-0">
                    {getCalendarDays().map((dayObj, i) => {
                      const dateStr = formatDate(dayObj.date);
                      const isCurrentMonth = dayObj.isCurrentMonth;
                      const isToday = dateStr === formatDate(new Date());
                      let dayIdx = dayObj.date.getDay() - 1; if(dayIdx === -1) dayIdx = 6;
                      const dailyEvents = getDailyEvents(dateStr, dayIdx); 
                      
                      const isVac = vacations.some(v => dateStr >= v.start && dateStr <= v.end);
                      const bgClass = isCurrentMonth 
                        ? (isVac ? 'bg-amber-50/60 border-amber-200 hover:border-amber-400' : 'bg-white border-slate-200 hover:border-indigo-300')
                        : 'bg-slate-100/50 border-slate-100 opacity-60';

                      return (
                        <div key={i} onClick={() => handleCellClick(dayObj.date)}
                             className={`rounded-xl sm:rounded-2xl border p-1 sm:p-2 flex flex-col overflow-hidden transition cursor-pointer group ${bgClass}`}>
                            <div className="flex justify-between items-start mb-1 shrink-0">
                              <button 
                                type="button"
                                onClick={(e) => handleNumberClick(e, dayObj.date, dateStr)}
                                className={`text-[11px] sm:text-sm font-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full shadow-sm border cursor-pointer hover:scale-110 hover:shadow-md transition-all relative z-10 ${isToday ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300'}`}
                                title="予定一覧を見る"
                              >
                                {dayObj.date.getDate()}
                              </button>
                            </div>
                            <div className="flex-1 overflow-hidden space-y-0.5 pr-0.5 mt-0.5">
                              {dailyEvents.slice(0, 3).map((ev, idx) => (
                                <div key={idx} className={`text-[8px] sm:text-[9px] font-bold rounded px-1 py-0.5 truncate border ${ev.startsWith('🚩') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                  {ev}
                                </div>
                              ))}
                              {dailyEvents.length > 3 && (
                                <div className="text-[7px] sm:text-[8px] font-bold text-slate-400 pl-1 pt-0.5">
                                  他 {dailyEvents.length - 3} 件
                                </div>
                              )}
                            </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'weekly' || activeTab === 'template') && (
              <main className="flex-1 flex flex-col min-h-0 bg-slate-50 relative overflow-hidden">
                <div className="px-2 sm:px-4 py-1.5 bg-white border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-20">
                  {activeTab === 'weekly' ? (
                    <div className="flex items-center gap-2 w-full overflow-hidden">
                      <div className="flex items-center bg-slate-100 rounded-md p-0.5 shrink-0">
                        <button onClick={() => changeWeek(-1)} className="px-2 py-0.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition font-bold text-[10px] sm:text-xs">◀ 週</button>
                        <span className="px-2 text-[10px] sm:text-xs font-black text-indigo-700 min-w-[70px] sm:min-w-[90px] text-center">{currentWeekStart.getMonth() + 1}月{currentWeekStart.getDate()}日〜</span>
                        <button onClick={() => changeWeek(1)} className="px-2 py-0.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition font-bold text-[10px] sm:text-xs">週 ▶</button>
                      </div>
                      
                      <button 
                        onClick={() => exportICS('schedule')}
                        className="sm:hidden shrink-0 text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-md font-bold shadow-sm"
                      >
                        📅 出力
                      </button>

                      <div className="flex-1 flex gap-1.5 items-center overflow-x-auto hide-scrollbar px-1">
                        {sortedIncompleteTodos.length > 0 ? (
                          <>
                            {sortedIncompleteTodos.slice(0, 3).map(t => {
                              const isOverdue = t.dueDate && t.dueDate < todayStr;
                              const isToday = t.dueDate === todayStr;
                              let alertIcon = t.important ? '⭐' : '📝';
                              if (isOverdue) alertIcon = '🔥';
                              else if (isToday) alertIcon = '🚨';
                              
                              const dateLabel = t.dueDate ? `${parseInt(t.dueDate.split('-')[1])}/${parseInt(t.dueDate.split('-')[2])} ` : '';
                              
                              return (
                                <button 
                                   key={t.id} 
                                   onClick={() => setShowTodo(true)} 
                                   className={`shrink-0 text-[9px] border px-2 py-0.5 rounded-full font-bold max-w-[120px] truncate transition shadow-sm flex items-center gap-0.5 ${isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' : isToday ? 'bg-orange-50 text-orange-700 border-orange-200' : t.important ? 'bg-yellow-50 text-yellow-700 border-yellow-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                   title={t.text}
                                >
                                  <span>{alertIcon}</span>
                                  <span className="truncate">{dateLabel}{t.text}</span>
                                </button>
                              )
                            })}
                            {sortedIncompleteTodos.length > 3 && (
                              <span className="shrink-0 text-[9px] text-slate-400 font-bold ml-1">他 {sortedIncompleteTodos.length - 3}件</span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold pl-2">未完了タスクなし✨</span>
                        )}
                      </div>
                    </div>
                  ) : (<div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 py-0.5"><span className="text-sm">⚙️</span> 基本設定モード</div>)}
                </div>

                <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative overflow-y-auto">
                  <div className="flex flex-col flex-1 min-w-max md:min-w-full pb-16 sm:pb-2">
                    <div className="sticky top-0 z-10 bg-white shadow-sm flex shrink-0">
                      <div className="w-8 sm:w-10 md:w-12 shrink-0 border-r border-b border-slate-200 bg-slate-50 sticky left-0 z-20 flex items-center justify-center font-bold text-[8px] sm:text-[9px] text-slate-400">枠</div>
                      {DAYS.map((day, i) => {
                        const d = new Date(currentWeekStart); d.setDate(d.getDate() + i); const dateStr = formatDate(d);
                        const setting = getDaySetting(dateStr, i); const style = SCHEDULE_TYPES[setting.type];
                        const isToday = dateStr === todayStr;
                        return (
                          <div key={day} className={`min-w-[120px] md:min-w-0 md:w-[14.28%] border-r border-b border-slate-200 p-1 text-center flex flex-col justify-center ${isToday ? 'bg-rose-50/80' : 'bg-white'}`}>
                            <div className="flex justify-center items-center gap-1 mb-1">
                              <span className={`font-black text-[10px] sm:text-xs ${isToday ? 'text-rose-600' : i===5?'text-blue-500':i===6?'text-rose-500':'text-slate-700'}`}>{day}</span>
                              {activeTab === 'weekly' && (
                                <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 rounded-full ${isToday ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 bg-slate-100'}`}>
                                  {d.getDate()}{isToday && ' (今日)'}
                                </span>
                              )}
                            </div>
                            <div className={`text-[8px] rounded px-1 py-0.5 border shadow-sm ${style.color}`}>
                              <select value={setting.type} onChange={(e) => handleSettingChange(dateStr, i, { ...setting, type: e.target.value })} className="bg-transparent font-bold w-full text-center outline-none appearance-none cursor-pointer">
                                {Object.values(SCHEDULE_TYPES).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                              </select>
                            </div>
                            {activeTab === 'weekly' && (
                              <div className="mt-1 relative w-full px-0.5">
                                <select 
                                  value="" 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'revert') handleRevertDay(dateStr);
                                    else if (val !== '') handleCopyDay(dateStr, val);
                                  }} 
                                  className="w-full text-[7.5px] sm:text-[8px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 font-bold rounded px-1 py-0.5 outline-none cursor-pointer text-center appearance-none shadow-sm transition-colors"
                                >
                                  <option value="" disabled>🔄 曜日振替</option>
                                  <option value="revert">🧹 リセット(元に戻す)</option>
                                  {DAYS.map((dName, dIdx) => <option key={dIdx} value={dIdx}>➡️ {dName}曜を適用</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-slate-400 text-[6px]">
                                  ▼
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex-1 flex flex-col">
                      {ROWS.map((row, rowIndex) => {
                        let rowBg = 'hover:bg-slate-100/50';
                        let rowHeight = 'min-h-[45px]';
                        
                        if (row.id === 'lunch') {
                          rowBg = 'bg-orange-100 hover:bg-orange-200/80';
                        } else if (row.id === 'morning') {
                          rowBg = 'bg-amber-50/30 hover:bg-amber-100/50';
                          rowHeight = 'min-h-[35px] max-h-[40px]'; 
                        } else if (row.id === 'event') {
                          rowHeight = 'min-h-[40px]';
                        }

                        let headerBg = 'bg-slate-50/90';
                        let headerTextColor = 'text-slate-500';
                        if (row.id === 'event') { headerBg = 'bg-indigo-50/80'; headerTextColor = 'text-indigo-700'; }
                        else if (row.id === 'lunch') { headerBg = 'bg-orange-200'; headerTextColor = 'text-orange-800'; }
                        else if (row.id === 'morning') { headerBg = 'bg-amber-100/80'; headerTextColor = 'text-amber-700'; }

                        return (
                          <div key={row.id} className={`flex flex-1 ${rowHeight} transition border-b border-slate-300 ${rowBg}`}>
                            <div className={`w-8 sm:w-10 md:w-12 shrink-0 border-r border-slate-200 sticky left-0 z-10 flex flex-col items-center justify-center px-0.5 text-center ${headerBg} backdrop-blur-md`}>
                              <span className="text-xs md:text-sm leading-none mb-0.5">{row.id === 'event' ? '🚩' : row.id === 'diary' ? '📝' : row.id === 'afterschool' ? '🏫' : row.id === 'lunch' ? '🍽️' : row.id === 'morning' ? '☀️' : <span className="text-[10px] text-slate-400 font-black">{row.id.replace('p', '')}</span>}</span>
                              <span className={`text-[7px] sm:text-[8px] font-black leading-none ${headerTextColor}`}>{row.name}</span>
                            </div>

                            {DAYS.map((day, i) => {
                              const d = new Date(currentWeekStart); d.setDate(d.getDate() + i); const dateStr = formatDate(d);
                              const setting = getDaySetting(dateStr, i); const isHoliday = setting.type === 'holiday';
                              const defaultTime = getPeriodTime(setting, row.id); const cellData = getCellData(dateStr, row.id, i);
                              
                              let cellContent;
                              if (row.id === 'afterschool') {
                                const events = cellData.events || [];
                                if (!events.some(ev => ev.subject) && cellData.subject) {
                                  const hasTime = cellData.startTime || cellData.endTime;
                                  cellContent = (
                                    <div className="bg-white rounded p-1 border shadow-sm w-full h-full flex flex-col justify-center">
                                      {hasTime && (
                                        <div className="text-[6.5px] text-indigo-500 font-mono font-bold leading-none mb-0.5">
                                          {cellData.startTime || ''}{cellData.startTime && cellData.endTime ? '-' : ''}{cellData.endTime || ''}
                                        </div>
                                      )}
                                      <div className="text-[9px] font-black text-slate-800 whitespace-pre-wrap break-words">{cellData.subject}</div>
                                    </div>
                                  );
                                } else {
                                  cellContent = (
                                    <div className="space-y-0.5 w-full h-full flex flex-col justify-center">
                                      {events.map((ev, idx) => ev.subject ? (
                                        <div key={idx} className="bg-white rounded p-0.5 border shadow-[0_1px_2px_-1px_rgba(0,0,0,0.05)] border-l-2 border-l-indigo-400 flex flex-col">
                                          {ev.startTime && (
                                            <div className="text-[6.5px] text-indigo-500 font-mono font-bold leading-none mb-0.5">
                                              {ev.startTime}{ev.endTime ? `-${ev.endTime}` : ''}
                                            </div>
                                          )}
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-[8px] font-black text-slate-800 whitespace-pre-wrap break-words flex-1">{ev.subject}</span>
                                          </div>
                                        </div>
                                      ) : null)}
                                    </div>
                                  );
                                }
                              } else {
                                const hasCustomTime = cellData.startTime || cellData.endTime;
                                const displayTime = hasCustomTime 
                                  ? `${cellData.startTime || ''}${cellData.startTime && cellData.endTime ? '-' : (cellData.startTime ? '〜' : '')}${cellData.endTime || ''}` 
                                  : (defaultTime && defaultTime.start && defaultTime.end ? `${defaultTime.start}-${defaultTime.end}` : '');
                                const isOverridden = activeTab === 'weekly' && weeklyData[`${dateStr}-${row.id}`] && !weeklyData[`${dateStr}-${row.id}`].useTemplate;
                                
                                if (isHoliday && hasCustomTime && cellData.startTime && cellData.endTime && row.id !== 'event' && row.id !== 'diary') {
                                  const duration = getDurationMinutes(cellData.startTime, cellData.endTime);
                                  const h = Math.max((duration * 0.8), 45); 
                                  cellContent = (
                                    <div 
                                      className="absolute left-1 right-1 p-1.5 z-20 shadow-[0_4px_10px_rgba(0,0,0,0.1)] border border-indigo-300 border-l-4 border-l-indigo-500 bg-indigo-50/95 backdrop-blur-md rounded-md flex flex-col transition-all hover:z-30 cursor-pointer top-1 overflow-y-auto hide-scrollbar"
                                      style={{ height: `calc(${h}px - 8px)`, minHeight: `calc(100% - 8px)` }}
                                    >
                                      <div className="font-mono font-bold mb-0.5 px-1 py-0.5 rounded inline-flex items-center gap-0.5 self-start leading-none bg-white text-indigo-700 shadow-sm text-[6px] sm:text-[7px]">
                                        <span>🕒</span> <span>{displayTime}</span>
                                      </div>
                                      <div className="font-black leading-tight text-indigo-900 whitespace-pre-wrap break-words text-[10px] mt-0.5">{cellData.subject}</div>
                                      <div className="text-[7px] text-indigo-700/80 font-medium whitespace-pre-wrap break-words leading-tight mt-0.5">{cellData.memo}</div>
                                      {cellData.handwriting && <div className="absolute top-1 right-1 text-[8px]">✏️</div>}
                                    </div>
                                  );
                                } else {
                                  cellContent = (
                                    <div className="h-full flex flex-col justify-center relative py-0.5">
                                      {displayTime && row.id !== 'event' && row.id !== 'diary' && (
                                        <div className={`font-mono font-bold mb-0.5 px-1 py-0.5 rounded inline-flex items-center gap-0.5 self-start leading-none ${hasCustomTime ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'} text-[6px] sm:text-[7px]`}>
                                          <span>🕒</span> <span>{displayTime}</span>
                                        </div>
                                      )}
                                      <div className={`font-black leading-tight whitespace-pre-wrap break-words ${row.id === 'event' ? 'text-indigo-700' : isOverridden ? 'text-amber-700' : 'text-slate-800'} text-[10px]`}>{cellData.subject || <span className="text-slate-200 font-normal">-</span>}</div>
                                      <div className="text-[6px] sm:text-[7px] text-slate-500 font-medium whitespace-pre-wrap break-words leading-tight mt-0.5">{cellData.memo}</div>
                                      {cellData.handwriting && <div className="absolute top-0 right-0 text-[8px]">✏️</div>}
                                    </div>
                                  );
                                }
                              }

                              const hasSubject = cellData.subject && cellData.subject.trim() !== '';
                              const isClassPeriod = row.id.startsWith('p');
                              const isToday = dateStr === todayStr;
                              
                              let cellBgClass = 'bg-white hover:bg-slate-50';
                              if (isHoliday) {
                                  cellBgClass = 'bg-slate-100/50 opacity-80 hover:bg-slate-200/50';
                              } else if (isClassPeriod && hasSubject) {
                                  cellBgClass = 'bg-sky-50/60 hover:bg-sky-100/60';
                              } else if (row.id === 'lunch' || row.id === 'morning') {
                                  cellBgClass = 'bg-transparent'; 
                              }
                              
                              if (isToday && !isHoliday && cellBgClass.includes('bg-white')) {
                                  cellBgClass = 'bg-rose-50/40 hover:bg-rose-100/50';
                              }

                              return (
                                <div key={i} onClick={() => openEditModal(cellData, dateStr, row, i, day, isHoliday, defaultTime, false)}
                                  className={`min-w-[120px] md:min-w-0 md:w-[14.28%] border-r border-slate-200 cursor-pointer relative group flex flex-col p-1 ${cellBgClass}`}>
                                  {cellContent}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    
                    {activeTab === 'template' && (
                      <div className="bg-slate-100 p-4 sm:p-8 border-t border-slate-200 shrink-0">
                        <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-2">🌴 長期休業（夏休み・冬休み等）の設定</h2>
                          <p className="text-xs text-slate-500 font-bold mb-4">
                            期間を設定すると、週案や月間カレンダーでその期間が自動的に「休日・部活」日課になります。
                          </p>
                          <div className="space-y-3 mb-4">
                            {vacations.map((vac, idx) => (
                               <div key={vac.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                 <span className="font-bold text-sm text-slate-700 sm:w-32 truncate">{vac.name}</span>
                                 <div className="flex items-center gap-2">
                                   <input type="date" value={vac.start} onChange={(e) => { const n = [...vacations]; n[idx].start = e.target.value; saveExtraData(yearlyData, documents, n); }} className="text-xs border rounded-md px-2 py-1.5 bg-white outline-none focus:border-indigo-400" />
                                   <span className="text-xs text-slate-400">〜</span>
                                   <input type="date" value={vac.end} onChange={(e) => { const n = [...vacations]; n[idx].end = e.target.value; saveExtraData(yearlyData, documents, n); }} className="text-xs border rounded-md px-2 py-1.5 bg-white outline-none focus:border-indigo-400" />
                                 </div>
                                 <button onClick={() => saveExtraData(yearlyData, documents, vacations.filter(v => v.id !== vac.id))} className="text-rose-500 hover:bg-rose-50 rounded text-xs font-bold sm:ml-auto px-3 py-1.5 transition">削除</button>
                               </div>
                            ))}
                            {vacations.length === 0 && <div className="text-xs text-slate-400 font-bold">まだ登録されていません。</div>}
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-2 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                             <input id="newVacName" type="text" placeholder="例: 夏季休業" className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 w-full sm:w-32 outline-none focus:border-indigo-400" />
                             <div className="flex items-center gap-2 w-full sm:w-auto">
                               <input id="newVacStart" type="date" className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-400 flex-1 sm:flex-none" />
                               <span className="text-xs text-indigo-400">〜</span>
                               <input id="newVacEnd" type="date" className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-400 flex-1 sm:flex-none" />
                             </div>
                             <button onClick={() => {
                                const name = document.getElementById('newVacName').value;
                                const start = document.getElementById('newVacStart').value;
                                const end = document.getElementById('newVacEnd').value;
                                if(name && start && end) {
                                   saveExtraData(yearlyData, documents, [...vacations, { id: Date.now().toString(), name, start, end }]);
                                   document.getElementById('newVacName').value = '';
                                   document.getElementById('newVacStart').value = '';
                                   document.getElementById('newVacEnd').value = '';
                                }
                             }} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition w-full sm:w-auto sm:ml-auto shadow-sm">追加</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </main>
            )}

          </div>

          {/* ▽▽ 月間カレンダータップ時の「予定一覧ポップアップ」 ▽▽ */}
          {selectedDateDetails && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4 sm:p-6" onClick={() => setSelectedDateDetails(null)}>
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-center shrink-0">
                  <div className="font-black text-lg drop-shadow-sm">{selectedDateDetails.dateStr} の予定</div>
                  <div className="flex gap-2">
                    <button onClick={() => { setActiveTab('weekly'); setSelectedDateDetails(null); }} className="text-white bg-white/20 px-3 py-1 rounded-lg text-xs font-bold hover:bg-white/30 transition shadow-sm">週案へ</button>
                    <button onClick={() => setSelectedDateDetails(null)} className="text-white bg-white/20 rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/30 transition shadow-sm">✕</button>
                  </div>
                </div>
                <div className="p-4 overflow-y-auto bg-slate-50 flex-1 space-y-2.5">
                  {ROWS.map((row, i) => {
                    let dayIdx = selectedDateDetails.dateObj.getDay() - 1;
                    if(dayIdx === -1) dayIdx = 6;
                    const cellData = getCellData(selectedDateDetails.dateStr, row.id, dayIdx);
                    
                    if (row.id === 'afterschool') {
                       const events = cellData.events || [];
                       const hasEvents = events.some(ev => ev.subject);
                       if (!hasEvents && !cellData.subject) return null;
                       return (
                         <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                           <div className="text-xl shrink-0">🏫</div>
                           <div className="flex-1 space-y-2">
                             {hasEvents ? events.map((ev, idx) => ev.subject && (
                               <div key={idx} className="border-l-2 border-indigo-400 pl-2">
                                  {ev.startTime && <div className="text-[10px] text-indigo-500 font-mono font-bold mb-0.5">{ev.startTime}{ev.endTime && `-${ev.endTime}`}</div>}
                                  <div className="text-sm font-black text-slate-800">{ev.subject}</div>
                                  {ev.memo && <div className="text-xs text-slate-500 mt-0.5">{ev.memo}</div>}
                               </div>
                             )) : (
                               <div>
                                 <div className="text-sm font-black text-slate-800">{cellData.subject}</div>
                                 {cellData.memo && <div className="text-xs text-slate-500 mt-0.5">{cellData.memo}</div>}
                               </div>
                             )}
                           </div>
                         </div>
                       );
                    } else {
                       if (!cellData.subject) return null;
                       const icon = row.id === 'event' ? '🚩' : row.id === 'diary' ? '📝' : row.id === 'morning' ? '☀️' : <span className="text-sm font-black text-slate-400">{row.id.replace('p', '')}</span>;
                       return (
                         <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                           <div className="text-xl shrink-0 w-6 text-center">{icon}</div>
                           <div className="flex-1">
                             {cellData.startTime && <div className="text-[10px] text-slate-400 font-mono font-bold mb-0.5">{cellData.startTime}{cellData.endTime && `-${cellData.endTime}`}</div>}
                             <div className="text-sm font-black text-slate-800">{cellData.subject}</div>
                             {cellData.memo && <div className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap">{cellData.memo}</div>}
                           </div>
                         </div>
                       );
                    }
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ▽▽ 常にオーバーレイ（スライドイン）のクイック手書きメモリスト ▽▽ */}
          {showQuickMemoList && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[40]" onClick={() => setShowQuickMemoList(false)}></div>}
          <aside className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white border-r border-slate-200 z-[50] transition-transform duration-300 flex flex-col pt-[env(safe-area-inset-top)] shadow-2xl ${showQuickMemoList ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-slate-800 flex justify-between items-center">
              <span>✍️ クイックメモ</span>
              <button 
                onClick={() => { setTempHandwriting(null); setHandwritingMode('quick'); setShowHandwritingPad(true); setShowQuickMemoList(false); }} 
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm flex items-center gap-1"
              >
                <span>➕</span> 新規メモ
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/50">
               {quickMemos.map(memo => (
                  <div key={memo.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
                     <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                       <span className="text-[10px] text-slate-500 font-bold">{new Date(memo.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                       <div className="flex gap-2">
                          <button onClick={() => shareMemo(memo.dataUrl)} className="text-indigo-500 hover:text-indigo-700 text-[10px] font-bold px-2 bg-indigo-50 rounded py-0.5">共有</button>
                          <button onClick={() => saveQuickMemos(quickMemos.filter(m => m.id !== memo.id))} className="text-rose-400 hover:text-rose-600 text-xs font-bold px-1 opacity-0 group-hover:opacity-100 transition-opacity">🗑</button>
                       </div>
                     </div>
                     <img src={memo.dataUrl} className="w-full h-auto cursor-pointer p-1" onClick={() => shareMemo(memo.dataUrl)} alt="クイックメモ" />
                  </div>
               ))}
               {quickMemos.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <span className="text-3xl mb-2 opacity-50">✍️</span>
                    <span className="text-xs font-bold">まだメモがありません</span>
                    <span className="text-[10px] mt-1">「➕ 新規メモ」から作成してください</span>
                  </div>
               )}
            </div>
          </aside>
          
          <button onClick={() => setShowQuickMemoList(!showQuickMemoList)} className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-4 sm:left-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-full shadow-2xl z-[60] active:scale-95 transition hover:scale-105">
            <span className="text-xl leading-none block">{showQuickMemoList ? '✕' : '✍️'}</span>
          </button>

          {/* ▽▽ TODOリスト（タグ＆重要度対応） ▽▽ */}
          {showTodo && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[40]" onClick={() => setShowTodo(false)}></div>}
          <aside className={`fixed inset-y-0 right-0 w-[22rem] max-w-[90vw] bg-white border-l border-slate-200 z-[50] transition-transform duration-300 flex flex-col pt-[env(safe-area-inset-top)] shadow-2xl ${showTodo ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-slate-800 flex justify-between items-center">📝 TODO</div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {sortedIncompleteTodos.map(t => {
                const isOverdue = !t.completed && t.dueDate && t.dueDate < todayStr;
                return (
                <div key={t.id} className={`flex gap-2.5 items-start bg-white p-3 rounded-xl border shadow-sm group transition-colors ${t.important ? 'border-yellow-300 bg-yellow-50/20' : isOverdue ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`}>
                  <button onClick={() => saveTodos(todos.map(todo => todo.id === t.id ? { ...todo, completed: !todo.completed } : todo))} className="mt-0.5 text-xl shrink-0">{t.completed ? '✅' : '⬜'}</button>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <span className={`text-sm pt-0.5 leading-relaxed break-words flex-1 ${t.completed ? 'text-slate-400 line-through' : isOverdue ? 'text-rose-700 font-bold' : 'text-slate-800 font-bold'}`}>
                        {t.important && <span className="text-yellow-500 mr-1">★</span>}
                        {t.text}
                      </span>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      {t.tag && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold border border-slate-200">{t.tag}</span>}
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-400">期限:</span>
                        <input 
                          type="date" 
                          value={t.dueDate || ''} 
                          onChange={(e) => saveTodos(todos.map(todo => todo.id === t.id ? { ...todo, dueDate: e.target.value } : todo))}
                          className={`text-[10px] outline-none bg-transparent cursor-pointer font-mono ${t.completed ? 'text-slate-300' : isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`} 
                        />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => saveTodos(todos.filter(todo => todo.id !== t.id))} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 p-1 shrink-0 transition-opacity">🗑</button>
                </div>
                )
              })}
            </div>
            
            <form onSubmit={addTodo} className="p-3 bg-white border-t border-slate-200 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                <div className="flex gap-2 items-center px-1">
                   <button type="button" onClick={() => setNewTodoImportant(!newTodoImportant)} className={`text-lg transition-transform active:scale-90 ${newTodoImportant ? 'text-yellow-500 scale-110 drop-shadow-sm' : 'text-slate-300 grayscale hover:grayscale-0'}`} title="重要マーク">
                     {newTodoImportant ? '⭐' : '☆'}
                   </button>
                   <input className="bg-transparent border-0 py-1 text-sm font-bold outline-none flex-1 placeholder-slate-400" placeholder="新しいタスクを入力..." value={newTodoText} onChange={e => setNewTodoText(e.target.value)} />
                </div>
                <div className="flex justify-between items-center gap-2 px-1">
                  <select value={newTodoTag} onChange={e => setNewTodoTag(e.target.value)} className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold rounded-md px-1.5 py-1 outline-none max-w-[80px]">
                     <option value="">タグなし</option>
                     {TODO_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-200 flex-1">
                    <span className="text-[9px] text-slate-400">期限:</span>
                    <input type="date" className="bg-transparent border-0 text-[10px] text-slate-600 font-mono outline-none cursor-pointer w-full" value={newTodoDate} onChange={e => setNewTodoDate(e.target.value)} />
                  </div>
                  <button type="submit" disabled={!newTodoText.trim()} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shrink-0">追加</button>
                </div>
              </div>
            </form>
          </aside>
          <button onClick={() => setShowTodo(!showTodo)} className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 sm:right-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 rounded-full shadow-2xl z-[60] active:scale-95 transition hover:scale-105">
            <span className="text-xl leading-none block">{showTodo ? '✕' : '📝'}</span>
          </button>

          {/* 編集モーダル */}
          {editingCell && !showHandwritingPad && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 sm:p-6" onClick={() => setEditingCell(null)}>
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white shrink-0 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] opacity-80 font-bold mb-1">{editingCell.isTemplate ? '基本設定モード' : `${editingCell.dateStr} (${editingCell.dayName}曜)`}</div>
                    <div className="text-xl font-black">{editingCell.periodName}</div>
                  </div>
                  <button type="button" onClick={() => { setHandwritingMode('cell'); setShowHandwritingPad(true); }} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1">
                    ✏️ 手書きメモ
                  </button>
                </div>

                <div className="overflow-y-auto p-4 sm:p-6 bg-slate-50 flex-1 flex flex-col gap-4">
                  {tempHandwriting && (
                    <div className="bg-white p-2 rounded-xl border border-slate-200 relative group shrink-0">
                      <div className="text-[10px] font-black text-slate-400 mb-1">手書きメモあり</div>
                      <img src={tempHandwriting} alt="手書きメモ" className="w-full max-h-32 object-contain border border-slate-100 rounded-lg bg-slate-50" />
                      <button type="button" onClick={() => setTempHandwriting(null)} className="absolute top-2 right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">✕</button>
                    </div>
                  )}

                  <form id="edit-form" onSubmit={e => { 
                      e.preventDefault(); 
                      const data = { handwriting: tempHandwriting };
                      if (editingCell.periodId === 'afterschool') {
                          data.events = tempEvents.filter(ev => ev.subject.trim() !== '');
                      } else { 
                          data.subject = tempSubject; 
                          data.memo = tempMemo; 
                          data.startTime = tempStartTime;
                          data.endTime = tempEndTime;
                      }
                      handleSaveCell(data); 
                    }} className="space-y-4 shrink-0">
                    
                    {editingCell.periodId === 'afterschool' ? (
                      <div className="space-y-3">
                        {tempEvents.map((ev, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input type="time" value={ev.startTime} onChange={e => updateTempEvent(idx, 'startTime', e.target.value)} className="w-24 bg-slate-50 border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                              <span className="text-slate-400 text-xs mt-1">〜</span>
                              <input type="time" value={ev.endTime} onChange={e => updateTempEvent(idx, 'endTime', e.target.value)} className="w-24 bg-slate-50 border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <input type="text" placeholder="予定・活動内容" value={ev.subject} onChange={e => updateTempEvent(idx, 'subject', e.target.value)} className="w-full font-black text-sm border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-1" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        {editingCell.periodId !== 'event' && editingCell.periodId !== 'diary' && (
                          <div className="flex gap-2 items-center">
                            <input type="time" value={tempStartTime} onChange={e => setTempStartTime(e.target.value)} className="w-24 bg-slate-50 border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                            <span className="text-slate-400 text-xs">〜</span>
                            <input type="time" value={tempEndTime} onChange={e => setTempEndTime(e.target.value)} className="w-24 bg-slate-50 border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                            <span className="text-[10px] text-slate-400 font-bold ml-2">※任意の時間を設定</span>
                          </div>
                        )}
                        
                        <div>
                          <input name="subject" value={tempSubject} onChange={e => setTempSubject(e.target.value)} className="w-full text-lg font-black border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-1 placeholder-slate-300" placeholder="活動内容・教科" autoFocus />
                          
                          {!editingCell.isTemplate && editingCell.periodId.startsWith('p') && syllabusData.length > 0 && (
                            <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                               <div className="text-[10px] font-black text-indigo-800 mb-2 flex items-center gap-1"><span>💡</span> 進度・履歴からワンタップ入力</div>
                               <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                                 {syllabusData.map(subj => {
                                    if (subj.type === 'auto') {
                                       const unit = subj.units[subj.currentUnitIdx];
                                       const isFinished = !unit;
                                       const text = isFinished ? `${subj.name}（単元終了）` : `${subj.name}（${unit.name} ${subj.currentHour}/${unit.hours}）`;
                                       return (
                                         <div key={subj.id} className="flex items-center gap-1.5">
                                           <button type="button" onClick={() => setTempSubject(text)} className="flex-1 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 text-left truncate transition-colors shadow-sm">
                                             {text}
                                           </button>
                                           {!isFinished && (
                                             <div className="flex bg-white border border-indigo-200 rounded-lg shadow-sm overflow-hidden shrink-0">
                                               <button type="button" onClick={() => adjustSyllabusManual(subj.id, -1)} className="px-2.5 py-1 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 font-bold active:bg-indigo-100 transition-colors">-</button>
                                               <div className="w-px bg-indigo-100"></div>
                                               <button type="button" onClick={() => adjustSyllabusManual(subj.id, 1)} className="px-2.5 py-1 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 font-bold active:bg-indigo-100 transition-colors">+</button>
                                             </div>
                                           )}
                                         </div>
                                       )
                                    } else {
                                       return (
                                         <div key={subj.id} className="flex flex-col gap-1">
                                           <button type="button" onClick={() => setTempSubject(subj.name)} className="bg-white border border-emerald-200 text-emerald-700 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors shadow-sm">
                                             {subj.name}
                                           </button>
                                           {tempSubject.includes(subj.name) && subj.history && subj.history.length > 0 && (
                                              <div className="flex flex-wrap gap-1.5 pl-2 mt-0.5">
                                                {subj.history.map((h, i) => (
                                                  <button type="button" key={i} onClick={() => setTempSubject(`${subj.name}（${h}）`)} className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200 transition-colors shadow-sm">
                                                    {h}
                                                  </button>
                                                ))}
                                              </div>
                                           )}
                                         </div>
                                       )
                                    }
                                 })}
                               </div>
                               <div className="text-[8px] text-slate-400 mt-2 ml-1">※ 自動カウントの教科は、ここから選んで「保存」すると自動で1時間進みます。</div>
                            </div>
                          )}

                          {editingCell.periodId.startsWith('p') && templateClasses.length > 0 && (
                            <div className="mt-2.5 relative">
                              <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                                defaultValue=""
                                onChange={(e) => {
                                  const selectedIdx = e.target.value;
                                  if (selectedIdx !== "") {
                                    const tClass = templateClasses[selectedIdx];
                                    setTempSubject(tClass.subject);
                                    if (tClass.memo) setTempMemo(tClass.memo);
                                  }
                                  e.target.value = "";
                                }}
                              >
                                <option value="" disabled>💡 基本の時間割から選ぶ（月1 など）...</option>
                                {templateClasses.map((tClass, idx) => (
                                  <option key={idx} value={idx}>
                                    {tClass.label} : {tClass.subject}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 text-xs">▼</div>
                            </div>
                          )}
                        </div>

                        <textarea name="memo" value={tempMemo} onChange={e => setTempMemo(e.target.value)} rows="4" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none bg-slate-50 resize-none mt-2" placeholder="メモ・詳細..." />
                      </div>
                    )}
                  </form>
                </div>

                <div className="bg-white p-4 border-t border-slate-200 shrink-0 flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditingCell(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">キャンセル</button>
                  <button type="submit" form="edit-form" className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md">保存する</button>
                </div>
              </div>
            </div>
          )}

          {/* ▽▽ 手書き入力モーダル ▽▽ */}
          {showHandwritingPad && (
            <div className="fixed inset-0 bg-slate-900/90 z-[90] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-4 bg-slate-800 text-white shrink-0">
                <div className="font-black flex items-center gap-2">✏️ {handwritingMode === 'quick' ? 'クイックメモを作成' : '手書きメモ'}</div>
                <div className="flex gap-2">
                  <button onClick={clearHandwriting} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition">クリア</button>
                  <button onClick={() => { setShowHandwritingPad(false); setHandwritingMode('cell'); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition">戻る</button>
                  <button onClick={saveHandwriting} className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-xs font-bold transition">決定</button>
                </div>
              </div>
              <div className="flex-1 bg-slate-300 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative touch-none">
                 <canvas 
                   ref={canvasRef}
                   width={800} 
                   height={600} 
                   className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-auto aspect-[4/3] cursor-crosshair touch-none"
                   onPointerDown={startDrawing}
                   onPointerMove={draw}
                   onPointerUp={endDrawing}
                   onPointerCancel={endDrawing}
                   onPointerOut={endDrawing}
                   style={{ touchAction: 'none' }}
                 />
              </div>
            </div>
          )}

        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<TeacherPlanner />);
  </script>
</body>
</html>
