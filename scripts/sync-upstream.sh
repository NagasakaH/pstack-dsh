#!/usr/bin/env bash
# 上流 https://github.com/cursor/plugins の pstack ディレクトリをこのリポジトリへ同期する。
# 使い方:  bash scripts/sync-upstream.sh [ref]   （既定: main）
set -euo pipefail
cd "$(dirname "$0")/.."

REF="${1:-main}"
SRC="vendor-src/plugins"

# 1) sparse clone（または更新）
if [ ! -d "$SRC/.git" ]; then
  mkdir -p vendor-src
  git clone --depth 1 --filter=blob:none --sparse "https://github.com/cursor/plugins.git" "$SRC"
fi
git -C "$SRC" fetch --depth 1 origin "$REF"
git -C "$SRC" checkout FETCH_HEAD
git -C "$SRC" sparse-checkout set pstack

# 2) 内容の同期（skills/agents/docs/assets + LICENSE、上流 README は docs/ に退避）
rsync -a --delete "$SRC/pstack/skills/"     skills/
rsync -a --delete "$SRC/pstack/agents/"     agents/
rsync -a --delete "$SRC/pstack/docs/"       docs/upstream/
rsync -a --delete "$SRC/pstack/assets/"     assets/
rsync -a --delete "$SRC/pstack/automations/" automations/
cp "$SRC/pstack/LICENSE" LICENSE
cp "$SRC/pstack/README.md" docs/upstream-README.md

# 3) バージョン記録
SHA="$(git -C "$SRC" rev-parse HEAD)"
VER="$(python3 -c "import json;print(json.load(open('$SRC/pstack/plugin.json'))['version'])")"
echo "upstream: cursor/plugins@$SHA (pstack $VER, ref $REF)"

echo
echo "同期完了。差分を確認してコミットしてください: git status"
