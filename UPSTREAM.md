# Upstream provenance / 上流の来歴

| 項目 | 値 |
| --- | --- |
| 上流リポジトリ | [cursor/plugins](https://github.com/cursor/plugins) — `pstack/` ディレクトリ |
| 同期したコミット | `6b0300214a09fd6029cfb7077043125758cd1fd2` (main) |
| 上流バージョン | pstack 0.15.36 |
| ライセンス | MIT（`LICENSE` を同梱。上流Copyrightを保持） |
| 作者 | Lauren Tan（上流記載どおり） |

- `skills/`, `agents/`, `docs/upstream/`, `automations/`, `assets/`, `LICENSE`,
  `docs/upstream-README.md` は上流の内容を**無変更**でコピーしたもの。
  DSH 向けの調整（frontmatter の書き換え等）は上流ファイルには一切加えていない。
  移植方針と Cursor 固有記述の読み替えは [PORTING.md](PORTING.md) を参照。
- 再同期は `bash scripts/sync-upstream.sh`（上流を `vendor-src/` に sparse clone して
  rsync する。`vendor-src/` は gitignore 済み）。
- 上流の `plugin.json` / `.cursor-plugin/`（Cursor プラグインマニフェスト）は
  持ち込まない。DSH 側の変換は `package.json` と `cordis.patch.yml` が担う。
