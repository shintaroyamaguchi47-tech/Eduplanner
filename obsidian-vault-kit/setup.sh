#!/usr/bin/env bash
# Obsidian Vault に Claude Code の「第二の脳」キットを展開する。
#
#   ./setup.sh ~/Documents/MyVault          # 既存ファイルは上書きしない
#   ./setup.sh ~/Documents/MyVault --force  # 既存ファイルも上書きする
#   ./setup.sh ~/Documents/MyVault --dry-run # 何が起きるか見るだけ

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/vault" && pwd)"
DEST="${1:-}"
FORCE=0
DRY=0

for arg in "${@:2}"; do
  case "$arg" in
    --force)   FORCE=1 ;;
    --dry-run) DRY=1 ;;
    *) echo "不明なオプション: $arg" >&2; exit 2 ;;
  esac
done

if [ -z "$DEST" ]; then
  cat >&2 <<'USAGE'
使い方: ./setup.sh <VaultのパスまたはVaultにしたい空フォルダ> [--force] [--dry-run]

例:
  ./setup.sh ~/Documents/SecondBrain
  ./setup.sh ~/Documents/SecondBrain --dry-run
USAGE
  exit 2
fi

DEST="${DEST/#\~/$HOME}"

if [ ! -d "$DEST" ]; then
  echo "フォルダがありません: $DEST"
  read -r -p "新しく作成しますか? [y/N] " ans
  [[ "$ans" =~ ^[yY]$ ]] || { echo "中止しました。"; exit 1; }
  [ "$DRY" -eq 1 ] || mkdir -p "$DEST"
fi

DEST="$(cd "$DEST" 2>/dev/null && pwd || echo "$DEST")"

if [ "$SRC" = "$DEST" ]; then
  echo "コピー元とコピー先が同じです。中止しました。" >&2
  exit 1
fi

echo "コピー元: $SRC"
echo "コピー先: $DEST"
[ "$DRY" -eq 1 ] && echo "(dry-run: 実際には書き込みません)"
echo

copied=0; skipped=0

# ドットファイル（.claude/）も含めて走査する
while IFS= read -r -d '' src; do
  rel="${src#"$SRC"/}"
  dst="$DEST/$rel"
  if [ -e "$dst" ] && [ "$FORCE" -eq 0 ]; then
    echo "  skip  $rel  (既に存在)"
    skipped=$((skipped + 1))
    continue
  fi
  echo "  copy  $rel"
  if [ "$DRY" -eq 0 ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
  copied=$((copied + 1))
done < <(find "$SRC" -type f -print0)

echo
echo "コピー: $copied 件 / スキップ: $skipped 件"

if [ "$skipped" -gt 0 ] && [ "$FORCE" -eq 0 ]; then
  echo "既存ファイルを上書きしたい場合は --force を付けてください。"
fi

if [ "$DRY" -eq 0 ]; then
  cat <<NEXT

次の手順:
  1. Obsidian で「フォルダを Vault として開く」→ $DEST
  2. ターミナルで:  cd "$DEST" && claude
  3. 最初に打つコマンド:  /daily

  ※ 各フォルダの README.md は説明用です。不要なら削除して構いません。
NEXT
fi
