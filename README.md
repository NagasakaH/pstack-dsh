# dsh-pstack

[Cursor 公式プラグイン集 cursor/plugins の pstack](https://github.com/cursor/plugins/tree/main/pstack)
（作者: Lauren Tan、MIT）を **DSH (@deepseek-ai/dsh) のスキル**としてそのまま使えるように移植した
DSH バンドルプラグインです。

`poteto-mode` / `tdd` / `how` / `why` / `unslop` / `interrogate` / `swarm` / `arena` と、
`principle-*` 24 本を含む **57 スキル**を `ctx.skills` に登録します。ランタイム依存ゼロ
（Node 内蔵モジュールのみ・ビルド不要）。

## インストール

```sh
# 開発スタイル（推奨）: このチェックアウトへ symlink。スキル本文の編集が再起動なしで反映される
dsh plugin --profile web add link:/Users/example/git/pstck-dsh
```

```sh
# スナップショットコピーで入れる場合
dsh plugin --profile web add file:/Users/example/git/pstck-dsh
```

`dsh bundle` は `package.json` の `dsh.bundle.patch` を読み、`cordis.patch.yml` の
Loader 行（`id: pstack-skills`）を起動に挿入します。Web プロファイルはライブリロード
構成なので、通常は起動し直しなしで次のターンからスキルカタログに出ます。
反映が確認できない場合は該当プロセスの再起動だけ行ってください。

他のプロファイルに入れるのも同じです（`--profile tui` など）。

## 使い方

pstack のスキルは上流どおり **全 57 本が `disable-model-invocation: true`** です。
つまりモデルの自動発火はせず、**ユーザーがスラッシュで明示起動する**設計のまま移植されています
（上流 Cursor と同じ挙動）。

- 入力欄に `/poteto-mode`、`/tdd`、`/how …`、`/unslop` のように入力して起動
- 起動されたスキル本文はモデルへの指示として注入される
- 本文内の相対参照（`../<name>/SKILL.md`、`playbooks/…`、`references/…`）は
  DSH の resourceBase（＝スキル自身のディレクトリ絶対パス）経由でそのまま解決され、
  モデルは `read` ツールでリンク先スキル／プレイブックを読み進められる
  （上流が `~/.cursor/plugins` のファイル読みで同一ディレクトリのスキルをたどる設計の代替）

## 動作の確認

```sh
node scripts/test-provider.mjs   # プロバイダ契約と frontmatter 解析のオフライン検証
```

インストール後の実機確認は、DSH のセッションで
「使えるスキルの一覧を見せて」と聞くか、`/` を入力して補完に `poteto-mode` 等が
出れば OK です。

## ディレクトリ構成

| パス | 内容 |
| --- | --- |
| `lib/index.js` | スキルプロバイダ本体（`ctx.skills.registerProvider`） |
| `skills/` | 上流 `pstack/skills` の無変更コピー（58 ディレクトリ） |
| `agents/` | 上流のサブエージェント定義（参考資料。DSH への移植方法は PORTING.md） |
| `docs/upstream/` | 上流のガイド（`docs/guide`）等 |
| `automations/` | 上流の Benny 自動化テンプレ（参考資料） |
| `scripts/sync-upstream.sh` | 上流取り込み（sparse clone → rsync） |
| `UPSTREAM.md` | 同期した上流コミットの記録 |

## スキルの追加・無効化

- `skills/<name>/SKILL.md` を追加すると次のカタログ更新で自動的に出ます（プロバイダは
  カタログ取得ごとに `skills/` を再スキャンするため、link: インストールでは再起動不要）
- 一時的に出したくない場合はそのスキルの frontmatter に
  `disable-model-invocation: true` と `user-invocable: false` を両方立てるか、
  ディレクトリを `skills/` の外へ退避してください
- pstack のスキル名（`how`, `why` など）が自前のスキルとかね合った場合は、
  ユーザー／プロジェクト側のスキルが優先されます（rank が小さいほど優先）

## 移植の注意（要点）

Cursor 固有の記述（`Task` サブエージェント、`AskQuestion`、`~/.cursor/rules`、
`cursor-team-kit` の `deslop`/`control-*`、Benny 自動化）はそのままでは DSH に存在しません。
読み替え方針と未移植項目は [PORTING.md](PORTING.md) を参照してください。
上流ファイルの内容は一切書き換えていません。

## License

MIT（上流 pstack に従う）。[LICENSE](LICENSE) / [UPSTREAM.md](UPSTREAM.md)
