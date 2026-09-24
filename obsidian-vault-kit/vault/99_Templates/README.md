# 99_Templates — テンプレート

Obsidian のコアプラグイン「テンプレート」または Templater から挿入する雛形。

| ファイル | 用途 |
|---|---|
| `daily.md` | デイリーノート |
| `literature.md` | 文献ノート |
| `permanent.md` | 永久ノート |
| `moc.md` | 地図ノート |
| `lesson.md` | 授業記録 |

`{{date:YYYY-MM-DD}}` は Obsidian のテンプレート機能が展開する。
Claude Code から作るときは、`date +%Y-%m-%d` の実行結果で置き換えること
（日付を推測しない）。

**設定**: Obsidian → 設定 → コアプラグイン → テンプレート →
「テンプレートフォルダの場所」に `99_Templates` を指定する。
