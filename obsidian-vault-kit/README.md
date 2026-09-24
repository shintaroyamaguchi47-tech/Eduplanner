# Obsidian × Claude Code 「第二の脳」キット

Obsidian の Vault を Claude Code の作業ディレクトリとして開き、
**ノートの規約・スキル・スラッシュコマンドを Vault の中に置いておく**ための一式です。

Obsidian の Vault は「Markdown ファイルが入ったただのフォルダ」です。
だから Claude Code をそのフォルダで起動するだけで、Claude はノート全体を
読み・書き・検索できるようになります。プラグインも API も要りません。

## 「スキルを Obsidian に保存しておく」ができます

Vault のルートに `.claude/skills/` を置くと、**その Vault で Claude Code を
起動したときだけ有効なスキル**になります。個人スキル（`~/.claude/skills/`）と違い、

- Vault ごとに違うスキルを持てる
- Vault を同期（iCloud / Dropbox / Git）すれば、他の端末でも同じスキルが使える
- Vault を Git 管理すれば、スキルの改訂履歴が残る

このキットには、その形で 5 つのスキルと 5 つのコマンドが入っています。

## 入っているもの

```
vault/
├── CLAUDE.md              ← Vault の憲法。フォルダ構成・命名規則・Claude の振る舞い
├── .gitignore             ← Vault を Git 管理する場合の除外設定
├── .claude/
│   ├── settings.json      ← 検索系コマンドを毎回許可せずに使うための設定
│   ├── skills/            ← ★ Obsidian に保存されるスキル
│   │   ├── note-capture/      断片を規約どおりのノートにして着地させる
│   │   ├── zettel-refine/     走り書き → 永久ノートへの昇格
│   │   ├── vault-search/      Vault の記述だけを根拠に答える（出典リンク必須）
│   │   ├── moc-builder/       テーマの地図ノート（MOC）を作る・更新する
│   │   └── lesson-log/        授業記録（中学校教員向け・匿名化を強制）
│   └── commands/          ← スラッシュコマンド
│       ├── daily.md           /daily         今日のノートを作る・追記する
│       ├── inbox.md           /inbox         Inbox を棚卸しする
│       ├── link.md            /link          孤立ノートにリンクを張る
│       ├── weekly-review.md   /weekly-review 1週間を振り返り次の一手を出す
│       └── ask.md             /ask           Vault を根拠に質問へ答える
├── 00_Inbox/     未整理の入口
├── 10_Daily/     デイリーノート
├── 20_Literature/文献ノート（他人の考え・出典必須）
├── 30_Permanent/ 永久ノート（自分の考え・1ノート1アイデア）
├── 40_MOC/       地図ノート
├── 50_Projects/  進行中の案件
├── 90_Archive/   完了・凍結（削除せずここへ）
└── 99_Templates/ Obsidian のテンプレート
```

## セットアップ

### 1. キットを Vault に展開する

```bash
git clone https://github.com/shintaroyamaguchi47-tech/eduplanner.git
cd eduplanner/obsidian-vault-kit

# まず何が起きるか確認（書き込みません）
./setup.sh ~/Documents/SecondBrain --dry-run

# 実行
./setup.sh ~/Documents/SecondBrain
```

- 既存の Vault に対しても安全です。**同名ファイルがあればスキップ**します
  （上書きしたいときだけ `--force`）。
- 指定したフォルダが無ければ、確認のうえ新規作成します。

手作業でやるなら、`vault/` の中身を Vault のルートにコピーするだけです
（`.claude/` と `.gitignore` の**隠しファイルを忘れずに**）。

### 2. Obsidian で開く

Obsidian → 「別の Vault を開く」→「フォルダを Vault として開く」→ 展開先を指定。

続いて、設定 → コアプラグイン から次を有効にしておくと噛み合います。

| プラグイン | 設定 |
|---|---|
| テンプレート | テンプレートフォルダ = `99_Templates` |
| デイリーノート | 保存先 = `10_Daily`、日付書式 = `YYYY-MM-DD`、テンプレート = `99_Templates/daily.md` |
| バックリンク | 有効（リンクの双方向性を目で確認できる） |

### 3. Claude Code を起動する

```bash
cd ~/Documents/SecondBrain
claude
```

起動時に Vault ルートの `CLAUDE.md` が読み込まれ、`.claude/skills/` と
`.claude/commands/` が有効になります。`/help` でコマンド一覧に
`/daily` `/inbox` `/link` `/weekly-review` `/ask` が出れば成功です。

### 4. 最初の一周

```
/daily                       今日のノートを作る
（本を読んだ内容を貼り付ける） → note-capture が 20_Literature に落とす
/inbox                       溜まってきたら棚卸し
/weekly-review               週末に振り返る
```

**この順で1〜2週間まわすと、`30_Permanent/` にノートが溜まり始めます。**
そこからが第二の脳の本番です。

## 使い方の勘所

- **`00_Inbox` を恐れない。** 分類に悩む時間より、放り込んで後で `/inbox` する方が速い。
- **永久ノートのタイトルは主張そのものにする。** `板書は記録ではなく思考の足場である.md`。
  これができると、ファイル一覧がそのまま自分の考えの一覧になります。
- **`/ask` は Vault の中だけで答えます。** 一般知識で埋めないので、
  「自分がまだ考えていないこと」がはっきり見えます。これが一番効きます。
- **リンクは双方向に。** `/link` は張られた側にも逆リンクを足します。

## 安全のための設計

このキットは、教員が使うことを前提に次を組み込んでいます。

- **生徒の個人情報は書かせない。** `CLAUDE.md` と `lesson-log` スキルの両方で、
  実名・住所・家庭状況・個票の点数を匿名化してから保存するよう指示しています。
- **既存ノートを黙って書き換えない。** 追記は自由、書き換え・削除は提案してから。
- **削除しない。** 不要になったノートは `90_Archive/` へ移動します。
  `.claude/settings.json` で `rm` を拒否しています。
- **一度に大量生成しない。** 1回の依頼で作る新規ノートは原則3件までです。

## カスタマイズ

このキットは**そのまま使うより、自分に合わせて削る**方がうまくいきます。

- フォルダ構成を変えたら、必ず `CLAUDE.md` の表も直してください。
  Claude はこの表を見て置き場所を決めています。
- 教員向けの記述（`lesson-log`、個人情報のルール）が不要なら、
  `vault/.claude/skills/lesson-log/` を削除し、`CLAUDE.md` の該当箇所を消します。
- 各フォルダの `README.md` は説明用です。慣れたら消して構いません。
- スキルを足したいときは `.claude/skills/<名前>/SKILL.md` を作るだけです。
  `name` と `description` のフロントマターを忘れずに。
  `description` は「どんなときに使うか」を具体的に書くほど、正しく発動します。

## Vault を Git で管理する場合

同期と履歴管理を兼ねられます。同梱の `.gitignore` が
`.obsidian/workspace.json`（端末ごとに変わる）と
`.claude/settings.local.json`（個人の許可設定）を除外します。

```bash
cd ~/Documents/SecondBrain
git init && git add -A && git commit -m "Vault の初期化"
```

**注意**: 授業記録を含む Vault を公開リポジトリに置かないでください。
private リポジトリを使うこと。

## EduPlanner との関係

このキットは EduPlanner 本体（`index.html`）とは独立していて、
アプリの動作には一切影響しません。週案データを Obsidian に書き出す連携は
まだ入っていません。必要になったら別途追加します。
