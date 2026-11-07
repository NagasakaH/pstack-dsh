# PORTING.md — pstack を DSH に移植する際の読み替えと未移植項目

上流ファイル（`skills/`, `agents/`, `docs/upstream/`, `automations/`）の内容は**無変更**。
このファイルが「Cursor 固有の記述を DSH でどう読むか」の唯一の補足資料。

## 移植の対応表

| Cursor プラグイン | このパッケージ（DSH） |
| --- | --- |
| `plugin.json` / `.cursor-plugin/plugin.json` | `package.json`（`dsh.bundle.patch`）+ `cordis.patch.yml`（Loader 行 `pstack-skills`） |
| `skills/`（スキャン roots） | `lib/index.js` が `ctx.skills.registerProvider` で provider `pstack`（rank 600・source `bundled`）として提供。first-party の `dsh-skill-office` と同型 |
| frontmatter `disable-model-invocation` / `user-invocable` | 同名キーを DSH と同じ意味で解釈（`true/yes/on/1`・`false/no/off/0`）。DSH 側ではスラッシュ起動専用のスキルになる |
| frontmatter `icon` / `color` | DSH に相当なし。パースで無視（警告も出さない） |
| `agents/*.md`（Task で spawn するサブエージェント定義） | DSH はディスク上のエージェント定義を自動発見しない。`subagent` ツールに渡すプロンプト本文として使う（下記） |
| Benny 自動化（`automations/benny`） | Cursor の自動化基盤専用。参考資料として同梱するだけ（スキル登録しない） |
| `~/.cursor/plugins/...` からのファイル発見 | DSH の skill 起動で注入される resourceBase／パスがそのまま起点になる |

## DSH での読み替え（スキル本文内に登場する Cursor 固有語）

スキル本文は書き換えていないため、実行時に以下を自動で読み替えて動作する。

| 本文中の記述 | DSH での実体 |
| --- | --- |
| `Task` サブエージェント / subagent spawn | `subagent`（独立）/ `subagent_fork`（会話継続）ツール |
| `AskQuestion` | `ask_user_question` ツール |
| `~/.cursor/plugins/` 配下の SKILL.md 探索 | skill 起動で渡される絶対パス（`skills/` 直下は `../<name>/SKILL.md` で解決可） |
| `~/.cursor/rules/pstack-models.mdc`（ロール別モデル設定） | 未移植（`setup-pstack` 非公開化と合わせて下記） |
| `~/.cursor/projects/*/agent-transcripts`（会話履歴の証拠収集） | 未移植。DSH のセッションログ（`~/.dsh/sessions`）は形式が違い、上流スクリプトは読めない |
| `cursor-team-kit` プラグインの `deslop` / `control-cli` / `control-ui` | 別プラグイン。そもそも未同梱（言及箇所は単に実行不能な参照として残る） |
| `bugbot`・agentic security review | Cursor の PR レビュー機能。`references/bugbot-triage.md` は一般の PR レビュー対応資料として読める |

## 意図的に非公開・未移植にしたもの

1. **`skills/setup-pstack`** — 上流には存在するが登録しない（`lib/index.js` の `EXCLUDED`）。
   `~/.cursor/rules/pstack-models.mdc` を書き、Cursor のモデルスラッグ
   （`claude-opus-5-5-xhigh` 等）を選択させる Cursor 専用セットアップで、
   DSH では誤動作させるだけだから。ファイル自体は同期の簡便さのため `skills/` に残す。
   DSH でのモデル選択は通常の `/model` 設定やサブエージェント側の設定で行う。
2. **`agents/poteto-agent.md` / `agents/comment-sicko.md`** — DSH に「エージェント定義ファイルの
   自動登録」概念がないため、`agents/` に参考資料として同梱。使うには:

   ```text
   subagent の prompt に agents/poteto-agent.md の本文（+ 渡すタスク指示）をそのまま貼る。
   「poteto-mode の SKILL.md を絶対パスで読む」指示は、pstack スキルの resourceBase を
   親が伝えていればそのまま機能する。
   ```

   例: `/poteto-mode` 起動中のエージェントは本文の指示どおり、自身と同一ディレクトリの
   `../../agents/poteto-agent.md` を読んでサブエージェントへの指示に使える。
3. **Benny 自動化**（`automations/benny`）— 3 スキル＋テンプレは Cursor の自動化基盤向け。
   DSH には `schedule_*` リマインダがあるが対応表は作らない（素のドキュメントとして同梱）。
4. **`skills/statechart`・`skills/poteto-mode` の同梱スクリプト** — `.ts`（bun/tsx 前提）と
   `watch-pr` CLI。実行環境があればスキル本文どおり動かす（Java/TLC を使う formal
   verification 系は外部ツール同梱が前提）。DSH 側での事前セットアップはしない。

## frontmatter パーサについて

`lib/index.js` は依存ゼロを保つため YAML の部分実装（スカラー・引用符・
`| > >- |-` ブロックスカラ）で frontmatter を読む。解釈できない行は警告なしに読み飛ばし、
`name`／`description`／真偽値の不正は**そのスキルを警告付きでスキップ**する
（first-party の filesystem プロバイダと同じ方針）。
上流同期後に `node scripts/test-provider.mjs` を通せば、全スキルの frontmatter が
解釈できることは保証される（警告 0 件をアサート）。

## 名前衝突と優先順位

provider rank は first-party 同梱スキルと同じ 600。同名スキルが
プロジェクト（100/200）・`customSkillDirs`（300）・ユーザー（400/500）に存在する場合は
そちらが勝つ。`how` / `why` / `teach` / `tdd` といった一般語を含むので、上書きしたい場合は
`~/.dsh/skills/<name>/SKILL.md` を置くだけでよい。
