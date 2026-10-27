# EduPlanner

中学校の先生向けの週案・授業計画アプリです。年間行事から週案、日々のTODOやノートまでを1つの画面で管理し、Firebase でクラウドに保存して複数の端末から使えます。

## 主な機能

| タブ | できること |
|---|---|
| 今日 | 今日の時間割・行事・TODO をまとめて表示 |
| 現場 | 授業中に見やすい大きな表示（いまのコマ・次のコマ・TODO） |
| 年間 | 年間行事予定の入力。行事名から休業日・短縮日課などを推定 |
| 月間 | 月カレンダー。時刻つきの予定も入力できる |
| 週案 | 基本時間割をもとにした週ごとの授業記録・行事・メモ |
| 週予定 | 1週間のタイムライン表示 |
| 単元計画 | 単元と時数を登録し、週案のコマへ続きを自動で入れる |
| ノート | 書式・画像・手書きメモつきのノート |
| 資料 | よく使う資料へのリンク集 |
| 設定 | 基本時間割・日課・長期休業・新年度セットアップ・バックアップ |

ほかに、国民の祝日の自動計算（祝日法・春分秋分の近似式）、年度途中での時間割切り替え、Google カレンダー／ToDo との同期、JSON でのバックアップ書き出し・復元、学校のフィルタで何が止められているかを調べる接続チェックがあります。

## 構成

```
index.html            アプリ本体（編集元）。React + JSX を1枚にまとめている
src/calendar.js       祝日・年度・日付の計算（画面に依存しない関数）
src/sanitize.js       ノート・メモの HTML を画面に戻す前の無害化
scripts/build.mjs     公開用ビルド（dist/ を作る）
tests/                src/ の単体テスト（node:test）
firestore.rules       Firestore のセキュリティルール
vercel.json           Vercel のビルド設定とキャッシュ設定
```

`index.html` はそのままブラウザで開けば、CDN から React・Babel・Tailwind を読み込んで動きます。公開時は `scripts/build.mjs` が次を済ませた `dist/` を作るので、CDN が使えない学校の端末でも開けます。

- JSX を事前に変換して `/assets/app.<hash>.js` にする（Babel standalone は不要になる）
- 使っている Tailwind クラスだけの CSS を作る
- React / ReactDOM と `src/*.js` を同じサーバーから配る

`src/*.js` は通常の `<script>` で読み込んでおり、そのトップレベルの `const`（`getHolidayName`・`sanitizeHtml` など）はアプリ本体からそのまま使えます。

## 開発

Node.js 22 を使います。

```sh
npm ci          # 依存のインストール
npm test        # 単体テスト（祝日・年度送り・HTML の無害化）
npm run build   # dist/ を作る
npx serve dist  # ビルド結果をローカルで確認（任意の静的サーバーで可）
```

祝日や年度まわりを直すときは `src/calendar.js` を編集し、`tests/calendar.test.mjs` にケースを足してください。法改正で祝日が臨時に動く年は `HOLIDAY_OVERRIDES` に書けば計算結果より優先されます。

プルリクエストと `main` への push では、GitHub Actions（`.github/workflows/ci.yml`）がテストとビルドを実行します。

## デプロイ

Vercel にこのリポジトリをつなぐと、`vercel.json` の設定どおり `npm run build` を実行して `dist/` を公開します。`index.html` はキャッシュさせず、`/assets/` 以下はファイル名にハッシュが入るので長期キャッシュします。

## Firebase

- プロジェクト: `eduplanner-v2`（設定値は `index.html` の `FIREBASE_CONFIG`。Web 用の API キーは公開前提の値で、データはセキュリティルールで守る）
- 認証: メールアドレスとパスワード（パスワードは端末に保存しない）
- データ: `users/{uid}/teacherPlanner/{template | weekly | weekly_YYYY | weeklyIndex | todos | notes | syllabus | quickMemos | extra}`

### セキュリティルール

`firestore.rules` は「ログインした本人だけが自分の `users/{uid}` の下を読み書きできる」内容です。コンソール側のルールがこれと同じになっているか確認し、違えば次のどちらかで反映してください。

- Firebase コンソール → Firestore Database → ルール に `firestore.rules` の内容を貼って「公開」
- `npx firebase-tools deploy --only firestore:rules`（`.firebaserc` でプロジェクトを指定済み）

## データの保存と復元

- 変更は Firestore に保存され、同じアカウントでログインした端末どうしで同期されます
- 端末内にも控えを持ち、クラウドの読み込みが終わらないときはその控えを表示します
- 設定タブから全データを JSON で書き出し・復元できます。復元したノートやメモの HTML は、表示前に `sanitizeHtml` でスクリプトなどを取り除きます
